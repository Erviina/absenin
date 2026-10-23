import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { profiles, companies, profileRoles } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { authenticate } from "../middleware/auth";
import { resolveTenant } from "../utils/tenant";
import { 
  getUserConsent, 
  recordUserConsent, 
  getUserConsentHistory, 
  CURRENT_PRIVACY_POLICY_VERSION 
} from "../utils/consent";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req: Request, res: Response): Promise<any> => {
  try {
    const { idToken, accessToken: googleAccessToken, consent_accepted, policy_version } = req.body;

    if (!idToken && !googleAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: ["idToken or accessToken is required"],
      });
    }


    let email = "";
    let fullName = "";
    let avatarUrl = "";

    if (idToken) {
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

      email = payload.email;
      fullName = payload.name || "";
      avatarUrl = payload.picture || "";
    } else if (googleAccessToken) {
      // Verify Google Access Token via Google userinfo endpoint
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      if (!userInfoRes.ok) {
        return res.status(401).json({
          success: false,
          message: "Token Google tidak valid",
          errors: [],
        });
      }

      const userInfo = await userInfoRes.json();
      if (!userInfo || !userInfo.email) {
        return res.status(401).json({
          success: false,
          message: "Data profil Google tidak memiliki email",
          errors: [],
        });
      }

      email = userInfo.email;
      fullName = userInfo.name || "";
      avatarUrl = userInfo.picture || "";
    }

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

      // Catat persetujuan pengguna baru hanya jika consent_accepted bernilai true
      if (consent_accepted === true) {
        try {
          await recordUserConsent({
            profileId: profile.id,
            policyVersion: policy_version || CURRENT_PRIVACY_POLICY_VERSION,
            isAccepted: true,
            ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || (req.socket?.remoteAddress as string),
            userAgent: req.headers["user-agent"] as string,
          });
        } catch (consentErr) {
          console.error("Gagal mencatat consent pengguna baru:", consentErr);
        }
      }
    } else {
      // Pengguna lama: jika mencentang persetujuan pada login, catat/perbarui persetujuannya
      if (consent_accepted === true) {
        try {
          await recordUserConsent({
            profileId: profile.id,
            policyVersion: policy_version || CURRENT_PRIVACY_POLICY_VERSION,
            isAccepted: true,
            ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || (req.socket?.remoteAddress as string),
            userAgent: req.headers["user-agent"] as string,
          });
        } catch (consentErr) {
          console.error("Gagal mencatat consent pengguna lama:", consentErr);
        }
      }
    }


    // Fetch active company — prioritaskan profile.company_id jika status aktif di company_members
    let company = null;
    let targetCompanyId: string | null = null;
    let targetRole: string | null = null;

    if (profile.company_id) {
      const currentMemCheck = await db.execute(sql`
        SELECT company_id, role
        FROM company_members
        WHERE profile_id = ${profile.id}
          AND company_id = ${profile.company_id}
          AND status = 'active'
          AND deleted_at IS NULL
        LIMIT 1
      `);
      if (currentMemCheck.rows.length > 0) {
        targetCompanyId = profile.company_id;
        targetRole = (currentMemCheck.rows[0].role as string || "member").toLowerCase();
      }
    }

    if (!targetCompanyId) {
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
        targetRole = (activeMemRes.rows[0].role as string || "member").toLowerCase();
      }
    }

    if (!targetCompanyId) {
      const createdCheck = await db.execute(sql`
        SELECT id FROM companies WHERE created_by = ${profile.id} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1
      `);
      if (createdCheck.rows.length > 0) {
        targetCompanyId = createdCheck.rows[0].id as string;
        targetRole = "owner";
      }
    }

    // Check if user is the company creator (legacy support)
    if (targetCompanyId && !targetRole) {
      const ownerCheck = await db.execute(sql`
        SELECT id FROM companies WHERE id = ${targetCompanyId} AND created_by = ${profile.id} AND deleted_at IS NULL LIMIT 1
      `);
      if (ownerCheck.rows.length > 0) {
        targetRole = "owner";
      }
    }

    // Auto-sync company_members row to ensure consistency across endpoints
    if (targetCompanyId && targetRole) {
      await db.execute(sql`
        INSERT INTO company_members (id, company_id, profile_id, role, status, joined_at)
        VALUES (gen_random_uuid(), ${targetCompanyId}, ${profile.id}, ${targetRole}, 'active', now())
        ON CONFLICT (company_id, profile_id) DO UPDATE SET role = ${targetRole}, status = 'active', deleted_at = NULL
      `).catch(console.error);
    }

    if (targetCompanyId) {
      const companyResult = await db.select().from(companies).where(eq(companies.id, targetCompanyId));
      if (companyResult.length > 0) {
        company = companyResult[0];
      }
      if (profile.company_id !== targetCompanyId) {
        await db.execute(sql`UPDATE profiles SET company_id = ${targetCompanyId} WHERE id = ${profile.id}`);
      }
    } else if (profile.company_id) {
      await db.execute(sql`UPDATE profiles SET company_id = NULL WHERE id = ${profile.id}`);
    }

    // Roles based on active company membership (source of truth: company_members.role)
    let activeRole: string = "member";
    let roles: string[] = ["Employee"];

    if (targetRole) {
      activeRole = targetRole;
      if (targetRole === "owner") {
        roles = ["Owner", "Admin", "Employee"];
      } else if (targetRole === "admin") {
        roles = ["Admin", "Employee"];
      } else if (targetRole === "manager") {
        roles = ["Manager", "Employee"];
      } else {
        roles = ["Employee"];
      }
    } else {
      activeRole = "member";
      roles = ["Employee"];
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = jwt.sign(
      {
        sub: profile.id,
        email: profile.email,
        isDeveloper: profile.is_developer === true,
        role: "authenticated", // Supabase compatibility claim
      },
      jwtSecret,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "24h") as any }
    );

    // Check consent status
    const consentStatus = await getUserConsent(profile.id);

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
          activeRole: activeRole,
          isManagement: ["owner", "admin", "manager"].includes(activeRole),
          isDeveloper: profile.is_developer === true,
          consent: {
            hasConsented: consentStatus.hasConsented,
            policyVersion: consentStatus.activePolicyVersion,
            consentedAt: consentStatus.consentedAt,
          },
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
    let tenant = await resolveTenant(req, userId);

    // Jika header x-company-id yang dikirim tidak valid untuk user ini (misal sisa sesi lama),
    // coba selesaikan tenant tanpa header usang tersebut agar user tetap menerima company aktif yang sah
    if (!tenant) {
      const headerCompanyId = req.headers["x-company-id"] as string | undefined;
      if (headerCompanyId) {
        const reqWithoutHeader = { ...req, headers: { ...req.headers } };
        delete (reqWithoutHeader.headers as any)["x-company-id"];
        tenant = await resolveTenant(reqWithoutHeader as any, userId);
      }
    }

    let targetCompanyId = tenant?.companyId || null;

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
      // Ambil permanent membership role untuk mengetahui seluruh opsi role yang berhak diakses user
      const memCheck = await db.execute(sql`
        SELECT role FROM company_members
        WHERE profile_id = ${userId} AND company_id = ${tenant.companyId} AND status = 'active' AND deleted_at IS NULL
        LIMIT 1
      `);
      const baseRole = (memCheck.rows.length > 0 ? (memCheck.rows[0].role as string || "member") : tenant.role).toLowerCase();

      const prRes = await db.execute(sql`SELECT role FROM profile_roles WHERE profile_id = ${userId}`);
      const prRoles = prRes.rows.map((r: any) => (r.role as string || "").toLowerCase());

      const availableRolesSet = new Set<string>(["Employee"]);
      if (baseRole === "owner") {
        availableRolesSet.add("Owner");
        availableRolesSet.add("Admin");
        availableRolesSet.add("Manager");
      } else if (baseRole === "admin" || prRoles.includes("admin")) {
        availableRolesSet.add("Admin");
      }
      if (baseRole === "manager" || prRoles.includes("manager")) {
        availableRolesSet.add("Manager");
      }
      roles = Array.from(availableRolesSet);
    } else {
      activeRole = "member";
      roles = ["Employee"];
    }

    // Check consent status
    const consentStatus = await getUserConsent(profile.id);

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
          isDeveloper: profile.is_developer === true,
          consent: {
            hasConsented: consentStatus.hasConsented,
            policyVersion: consentStatus.activePolicyVersion,
            consentedAt: consentStatus.consentedAt,
          },
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

/**
 * GET /api/auth/consent
 * Mengambil status persetujuan pemrosesan data pengguna saat ini
 */
router.get("/consent", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const consent = await getUserConsent(userId);
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil status persetujuan pengguna",
      data: consent,
    });
  } catch (error: any) {
    console.error("Get consent error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

/**
 * POST /api/auth/consent
 * Mencatat persetujuan pemrosesan data pribadi secara sah
 */
router.post("/consent", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const { consent_accepted, policy_version } = req.body;

    if (consent_accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Persetujuan pemrosesan data pribadi wajib disetujui (checkbox harus dicentang).",
        errors: ["consent_accepted must be true"],
      });
    }

    const versionToRecord = policy_version || CURRENT_PRIVACY_POLICY_VERSION;
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || (req.socket?.remoteAddress as string);
    const ua = (req.headers["user-agent"] as string) || null;

    const record = await recordUserConsent({
      profileId: userId,
      policyVersion: versionToRecord,
      isAccepted: true,
      ipAddress: ip,
      userAgent: ua,
    });

    return res.status(200).json({
      success: true,
      message: "Persetujuan pemrosesan data pribadi berhasil dicatat",
      data: {
        hasConsented: true,
        policyVersion: record.policy_version,
        consentedAt: record.consented_at,
      },
    });
  } catch (error: any) {
    console.error("Post consent error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

/**
 * GET /api/auth/consent/history
 * Mengambil riwayat persetujuan kebijakan privasi pengguna (audit trail)
 */
router.get("/consent/history", authenticate, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;
    const history = await getUserConsentHistory(userId);
    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil riwayat persetujuan",
      data: history,
    });
  } catch (error: any) {
    console.error("Get consent history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [error.message],
    });
  }
});

export default router;

