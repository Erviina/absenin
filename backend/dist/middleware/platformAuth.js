"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatePlatformOwner = void 0;
exports.getAuthorizedPlatformEmails = getAuthorizedPlatformEmails;
exports.isPlatformOwnerEmail = isPlatformOwnerEmail;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Default fallback list jika env belum dikonfigurasi, sesuai PRD Section 3.2
const DEFAULT_PLATFORM_OWNER_EMAILS = [
    "shakilaaulia@upi.edu",
    "nihaaprill@upi.edu",
    "ervinakusnanda@upi.edu",
    "nalifah@upi.edu",
];
function getAuthorizedPlatformEmails() {
    const envEmails = process.env.PLATFORM_OWNER_EMAILS;
    if (envEmails && envEmails.trim().length > 0) {
        return envEmails
            .split(",")
            .map((e) => e.replace(/['"]/g, "").trim().toLowerCase())
            .filter((e) => e.length > 0);
    }
    return DEFAULT_PLATFORM_OWNER_EMAILS.map((e) => e.trim().toLowerCase());
}
function isPlatformOwnerEmail(email) {
    if (!email)
        return false;
    const normalized = email.trim().toLowerCase();
    const allowlist = getAuthorizedPlatformEmails();
    return allowlist.includes(normalized);
}
const authenticatePlatformOwner = (req, res, next) => {
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
        const payload = jsonwebtoken_1.default.verify(token, secret);
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
        req.user = { id: payload.sub, email: userEmail };
        req.platformOwner = {
            id: payload.sub,
            email: userEmail,
            role: "PLATFORM_OWNER",
        };
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Sesi telah kedaluwarsa atau tidak valid",
            errors: [error.message || "Invalid token"],
        });
    }
};
exports.authenticatePlatformOwner = authenticatePlatformOwner;
