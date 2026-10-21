import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { profiles } from "../db/schema";
import { eq } from "drizzle-orm";

// Default fallback list jika env belum dikonfigurasi, sesuai PRD Section 3.2
const DEFAULT_PLATFORM_OWNER_EMAILS = [
  "shakilaaulia@upi.edu",
  "nihaaprill@upi.edu",
  "ervinakusnanda@upi.edu",
  "nalifah@upi.edu",
];

export function getAuthorizedPlatformEmails(): string[] {
  const envEmails = process.env.PLATFORM_OWNER_EMAILS;
  if (envEmails && envEmails.trim().length > 0) {
    return envEmails
      .split(",")
      .map((e) => e.replace(/['"]/g, "").trim().toLowerCase())
      .filter((e) => e.length > 0);
  }
  return DEFAULT_PLATFORM_OWNER_EMAILS.map((e) => e.trim().toLowerCase());
}

export function isPlatformOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowlist = getAuthorizedPlatformEmails();
  return allowlist.includes(normalized);
}

export const authenticatePlatformOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan untuk mengakses Platform Admin",
      errors: ["Missing or invalid Bearer token"],
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured on the server");
    }

    const payload = jwt.verify(token, secret) as any;
    const userEmail = (payload.email || "").trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: "Sesi tidak valid: email tidak ditemukan dalam token",
        errors: ["Email claim missing from JWT"],
      });
    }

    // Periksa status is_developer langsung dari tabel profiles di database
    let isDev = false;
    let userFullName = userEmail.split("@")[0];
    let userAvatar: string | null = null;

    try {
      const profileRes = await db
        .select({
          id: profiles.id,
          email: profiles.email,
          fullName: profiles.full_name,
          avatarUrl: profiles.avatar_url,
          isDeveloper: profiles.is_developer,
        })
        .from(profiles)
        .where(eq(profiles.id, payload.sub))
        .limit(1);

      if (profileRes.length > 0) {
        const p = profileRes[0];
        if (p.isDeveloper === true) {
          isDev = true;
        }
        if (p.fullName) userFullName = p.fullName;
        if (p.avatarUrl) userAvatar = p.avatarUrl;
      }
    } catch (dbErr) {
      console.error("Gagal memeriksa is_developer dari database:", dbErr);
    }

    // Fallback: jika klaim token isDeveloper bernilai true atau masuk allowlist email dev
    if (!isDev) {
      if (payload.isDeveloper === true || isPlatformOwnerEmail(userEmail)) {
        isDev = true;
      }
    }

    if (!isDev) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak: Akun Anda tidak memiliki status Developer (isDeveloper) untuk mengakses Platform Admin.",
        errors: ["Forbidden: User is not a verified developer"],
      });
    }

    // Set context user dan platformOwner pada request
    (req as any).user = { id: payload.sub, email: userEmail, isDeveloper: true };
    (req as any).platformOwner = {
      id: payload.sub,
      email: userEmail,
      fullName: userFullName,
      avatarUrl: userAvatar,
      isDeveloper: true,
      role: "PLATFORM_OWNER",
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Sesi telah kedaluwarsa atau tidak valid",
      errors: [error.message || "Invalid token"],
    });
  }
};
