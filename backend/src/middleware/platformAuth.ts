import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

export const authenticatePlatformOwner = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
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

    // Validasi ketat terhadap email allowlist di sisi server
    if (!isPlatformOwnerEmail(userEmail)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak: Akun Anda tidak memiliki wewenang Platform Owner Absenin.",
        errors: ["Forbidden: Email is not authorized for Platform Admin access"],
      });
    }

    // Set context user dan platformOwner pada request
    (req as any).user = { id: payload.sub, email: userEmail };
    (req as any).platformOwner = {
      id: payload.sub,
      email: userEmail,
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
