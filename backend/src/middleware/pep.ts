import { Request, Response, NextFunction } from "express";
import { resolveTenant, TenantContext } from "../utils/tenant";
import { getUserConsent } from "../utils/consent";

export interface ProtectedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  tenant?: TenantContext;
}

/**
 * PEP: Policy Enforcement Point - Memastikan pengguna memiliki membership aktif di perusahaan (tenant)
 */
export async function enforceTenantMembership(
  req: ProtectedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan",
      errors: ["User session is missing or unauthenticated"],
    });
  }

  const tenant = await resolveTenant(req, userId);
  if (!tenant) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda tidak memiliki akses ke perusahaan atau tenant ini",
      errors: ["Tenant boundary enforcement failed"],
    });
  }

  req.tenant = tenant;
  next();
}

/**
 * PEP: Policy Enforcement Point - Memastikan pengguna memiliki peran Manajemen (Owner, Admin, Manager)
 */
export async function enforceManagementRole(
  req: ProtectedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan",
      errors: ["User session is missing or unauthenticated"],
    });
  }

  const tenant = req.tenant || (await resolveTenant(req, userId));
  if (!tenant) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Anda tidak terhubung ke organisasi atau perusahaan ini",
      errors: ["Tenant context not found"],
    });
  }

  req.tenant = tenant;

  if (!tenant.isManagement) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Hanya peran Manajemen (Owner, Admin, Manager) yang diizinkan mengakses data ini.",
      errors: ["Role authorization failed: insufficient privileges"],
    });
  }

  next();
}

/**
 * PEP: Policy Enforcement Point - Memastikan pengguna telah memberikan persetujuan (consent) terhadap Kebijakan Privasi aktif
 */
export async function enforceActiveConsent(
  req: ProtectedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan",
      errors: ["User session is missing or unauthenticated"],
    });
  }

  const consent = await getUserConsent(userId);
  if (!consent.hasConsented) {
    return res.status(403).json({
      success: false,
      message: "Persetujuan pemrosesan data pribadi diperlukan sebelum melanjutkan operasi ini.",
      errors: ["Active privacy policy consent required"],
      data: {
        consentRequired: true,
        activePolicyVersion: consent.activePolicyVersion,
      },
    });
  }

  next();
}
