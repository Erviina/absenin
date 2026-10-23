/**
 * Client-Side In-Memory Cache Helper for AbsenIN
 * Provides fast SWR (Stale-While-Revalidate) caching for card lists and dashboard views.
 * Isolated strictly per activeCompanyId and userId to prevent cross-tenant/cross-user data leakage.
 */

interface CacheEntry<T> {
  data: T;
  total?: number;
  timestamp: number;
}

export interface CachedDataResult<T> {
  data: T;
  total?: number;
  isStale: boolean;
  ageMs: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Builds a deterministic cache key scoped by namespace, company, user, and query params.
 */
export function buildCacheKey(
  scope: string,
  companyId: string | null | undefined,
  params?: string | Record<string, any>,
  userId?: string | null | undefined
): string {
  const comp = (companyId || "personal").trim();
  const userSegment = userId ? `::u_${userId.trim()}` : "";
  let paramStr = "";
  if (typeof params === "string") {
    paramStr = params;
  } else if (params && typeof params === "object") {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        q.append(k, String(v));
      }
    });
    paramStr = q.toString();
  }
  return `${scope}::${comp}${userSegment}::${paramStr}`;
}

/**
 * Retrieves cached data with true Stale-While-Revalidate semantics.
 * - If younger than freshTtlMs: returns fresh data.
 * - If older than freshTtlMs but within maxStaleTtlMs: returns data with isStale=true (instant UI rendering while revalidating).
 * - If older than maxStaleTtlMs: deleted and returns null.
 */
export function getCachedData<T>(
  key: string,
  freshTtlMs: number = 45000,
  maxStaleTtlMs: number = 600000 // 10 minutes max stale window
): CachedDataResult<T> | null {
  if (typeof window === "undefined") return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > maxStaleTtlMs) {
    memoryCache.delete(key);
    return null;
  }

  return {
    data: entry.data as T,
    total: entry.total,
    isStale: age > freshTtlMs,
    ageMs: age,
  };
}

/**
 * Stores data into client memory cache.
 */
export function setCachedData<T>(key: string, data: T, total?: number): void {
  if (typeof window === "undefined") return;
  memoryCache.set(key, {
    data,
    total,
    timestamp: Date.now(),
  });
}

/**
 * Invalidates cache by exact prefix or clears all if scopePrefix is omitted.
 */
export function invalidateCache(scopePrefix?: string): void {
  if (!scopePrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${scopePrefix}::`)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Deduplicates concurrent identical requests across components.
 */
export function deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

// Invalidate all cache and in-flight promises on auth session cleared, updated, or company changed
if (typeof window !== "undefined") {
  const clearAll = () => {
    memoryCache.clear();
    inFlightRequests.clear();
  };
  window.addEventListener("authSessionCleared", clearAll);
  window.addEventListener("authSessionUpdated", clearAll);
  window.addEventListener("companyChanged", clearAll);

  const clearRoleCaches = () => {
    // Invalidate dashboard and role-specific caches so fresh role data loads immediately
    invalidateCache("dashboard_stats");
    invalidateCache("dashboard_leave");
    invalidateCache("dashboard_act");
    invalidateCache("admin_dashboard_comp");
    invalidateCache("admin_dashboard_stats");
    invalidateCache("admin_dashboard_leave");
    invalidateCache("admin_dashboard_act");
    invalidateCache("dashboard_news");
    invalidateCache("dashboard_tasks");
    invalidateCache("dashboard_agendas");
    invalidateCache("dashboard_attendance");
    invalidateCache("dashboard_notif");
    invalidateCache("notifications");
  };
  window.addEventListener("roleChanged", clearRoleCaches);
}
