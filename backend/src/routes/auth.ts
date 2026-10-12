import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { profiles, companies, profileRoles } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req: Request, res: Response): Promise<any> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: ["idToken is required"],
      });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google ID Token",
        errors: [],
      });
    }

    const { email, name: fullName, picture: avatarUrl } = payload;

    // Check if profile exists
    let profileResult = await db.select().from(profiles).where(eq(profiles.email, email));
    let profile = profileResult[0];

    // Note: The scope says "Setelah token valid, proses user/profile sesuai alur authentication pada PRD dan struktur database yang sudah ada."
    // But since we can't create `auth.users` easily from here and don't know the exact mechanism, we just fetch profile based on email.
    // However, if the profile doesn't exist, do we create it? The PRD mentions "Halaman belum terdaftar / menunggu penempatan".
    // I will insert it if it doesn't exist, using a new UUID.
    
    if (!profile) {
      let userId = "";

      // 1. Try to create user via Supabase Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      });

      if (authError) {
        // If user already exists (e.g. email already registered), fetch existing user ID safely via SELECT
        if (authError.message.includes("already registered") || authError.status === 422 || authError.code?.includes("exists")) {
          const existingUserRes = await db.execute(sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`);
          if (existingUserRes.rows.length > 0) {
            userId = existingUserRes.rows[0].id as string;
          } else {
            throw new Error("User exists in Supabase but ID could not be retrieved.");
          }
        } else {
          throw new Error("Failed to create user in Supabase Auth: " + authError.message);
        }
      } else if (authData.user) {
        userId = authData.user.id;
      } else {
        throw new Error("Failed to create user: Auth data is empty.");
      }

      // 2. Manage public.profiles record
      // Try to update first (in case a database trigger already created an empty profile row during createUser)
      let profileResultRaw = await db.execute(sql`
        UPDATE profiles 
        SET full_name = ${fullName}, avatar_url = ${avatarUrl}, updated_at = now()
        WHERE id = ${userId}
        RETURNING *
      `);
      
      // If no row was updated, it means profile is missing (either trigger didn't exist, or user was pre-existing without profile)
      if (profileResultRaw.rows.length === 0) {
        profileResultRaw = await db.execute(sql`
          INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at)
          VALUES (${userId}, ${email}, ${fullName}, ${avatarUrl}, now(), now())
          RETURNING *
        `);
      }
      
      profile = profileResultRaw.rows[0] as any;
    }

    // Fetch active company
    let company = null;
    let targetCompanyId: string | null = null;
    const activeMemRes = await db.execute(sql`
      SELECT company_id, role
      FROM company_members
      WHERE profile_id = ${profile.id}
        AND status = 'active'
        AND deleted_at IS NULL
      ORDER BY joined_at DESC
      LIMIT 1
    `);
    if (activeMemRes.rows.length > 0) {
      targetCompanyId = activeMemRes.rows[0].company_id as string;
    } else if (profile.company_id) {
      const checkInactive = await db.execute(sql`
        SELECT status, deleted_at FROM company_members
        WHERE profile_id = ${profile.id} AND company_id = ${profile.company_id}
        LIMIT 1
      `);
      if (checkInactive.rows.length === 0) {
        targetCompanyId = profile.company_id;
      } else {
        await db.execute(sql`UPDATE profiles SET company_id = NULL WHERE id = ${profile.id}`);
        targetCompanyId = null;
      }
    }

    if (targetCompanyId) {
      const companyResult = await db.select().from(companies).where(eq(companies.id, targetCompanyId));
      if (companyResult.length > 0) {
        company = companyResult[0];
      }
    }

    // Fetch roles
    const rolesResult = await db.select().from(profileRoles).where(eq(profileRoles.profile_id, profile.id));
    const roles = rolesResult.map((r) => r.role) || []; // Empty array if no roles found

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = jwt.sign(
      {
        sub: profile.id,
        email: profile.email,
        role: "authenticated", // Supabase compatibility claim
      },
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any }
    );

    res.json({
      success: true,
      message: "Request berhasil",
      data: {
        accessToken,
        user: {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          avatarUrl: profile.avatar_url,
          company: company,
          roles: roles,
        },
      },
    });

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
      errors: [error.message],
    });
  }
});



router.get("/me", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    // Fetch profile
    const profileResult = await db.select().from(profiles).where(eq(profiles.id, userId));
    const profile = profileResult[0];

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        errors: [],
      });
    }

    // Resolve tenant for multi-tenancy
    const tenant = await resolveTenant(req, userId);
    let targetCompanyId = tenant?.companyId || null;

    if (!targetCompanyId && profile.company_id) {
      await db.execute(sql`UPDATE profiles SET company_id = NULL WHERE id = ${userId}`);
    }

    // Fetch company if available
    let company = null;
    if (targetCompanyId) {
      const companyResult = await db.select().from(companies).where(eq(companies.id, targetCompanyId));
      if (companyResult.length > 0) {
        company = companyResult[0];
      }
    }

    // Scoped roles based on active tenant
    let activeRole: string = "member";
    let roles: string[] = ["Employee"];

    if (tenant) {
      activeRole = tenant.role;
      if (tenant.role === "owner" || tenant.role === "admin") {
        roles = ["Admin", "Employee"];
      } else if (tenant.role === "manager") {
        roles = ["Manager", "Employee"];
      } else {
        roles = ["Employee"];
      }
    } else {
      // Fallback to profileRoles
      const rolesResult = await db.select().from(profileRoles).where(eq(profileRoles.profile_id, profile.id));
      roles = rolesResult.map((r) => r.role).filter((r): r is string => Boolean(r));
      if (roles.includes("Admin")) activeRole = "admin";
      else if (roles.includes("Manager")) activeRole = "manager";
    }

    res.json({
      success: true,
      message: "Berhasil mengambil data profile",
      data: {
        user: {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          avatarUrl: profile.avatar_url,
          company: company,
          roles: roles,
          activeRole: activeRole,
          isManagement: ["owner", "admin", "manager"].includes(activeRole),
        },
      },
    });

  } catch (error: any) {
    console.error("Get auth me error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;
