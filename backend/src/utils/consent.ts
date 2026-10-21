import { db } from "../db";
import { userConsents } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const CURRENT_PRIVACY_POLICY_VERSION = "v1.0";

export interface UserConsentStatus {
  hasConsented: boolean;
  activePolicyVersion: string;
  consentedAt: string | null;
  consentType: string;
}

/**
 * Checks if a user has consented to the current (or specified) policy version.
 */
export async function getUserConsent(
  profileId: string,
  policyVersion: string = CURRENT_PRIVACY_POLICY_VERSION
): Promise<UserConsentStatus> {
  try {
    const res = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.profile_id, profileId),
          eq(userConsents.policy_version, policyVersion),
          eq(userConsents.is_accepted, true)
        )
      )
      .orderBy(desc(userConsents.consented_at))
      .limit(1);

    if (res.length > 0) {
      return {
        hasConsented: true,
        activePolicyVersion: policyVersion,
        consentedAt: res[0].consented_at ? new Date(res[0].consented_at).toISOString() : null,
        consentType: res[0].consent_type,
      };
    }

    return {
      hasConsented: false,
      activePolicyVersion: policyVersion,
      consentedAt: null,
      consentType: "data_processing_and_privacy",
    };
  } catch (error) {
    console.error("Error checking user consent:", error);
    return {
      hasConsented: false,
      activePolicyVersion: policyVersion,
      consentedAt: null,
      consentType: "data_processing_and_privacy",
    };
  }
}

/**
 * Records an immutable user consent event in the database.
 */
export async function recordUserConsent(params: {
  profileId: string;
  policyVersion?: string;
  consentType?: string;
  isAccepted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const policyVersion = params.policyVersion || CURRENT_PRIVACY_POLICY_VERSION;
  const consentType = params.consentType || "data_processing_and_privacy";

  const [inserted] = await db
    .insert(userConsents)
    .values({
      profile_id: params.profileId,
      policy_version: policyVersion,
      consent_type: consentType,
      is_accepted: params.isAccepted,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      consented_at: sql`now()`,
      created_at: sql`now()`,
    })
    .returning();

  return inserted;
}

/**
 * Fetches the user's consent audit trail (for privacy compliance & transparency).
 */
export async function getUserConsentHistory(profileId: string) {
  return await db
    .select({
      id: userConsents.id,
      policyVersion: userConsents.policy_version,
      consentType: userConsents.consent_type,
      isAccepted: userConsents.is_accepted,
      consentedAt: userConsents.consented_at,
    })
    .from(userConsents)
    .where(eq(userConsents.profile_id, profileId))
    .orderBy(desc(userConsents.consented_at));
}
