/**
 * Client-Side In-Memory Cache Helper for AbsenIN
 * Provides fast SWR (Stale-While-Revalidate) caching for card lists.
 * Isolated strictly per activeCompanyId and userId to prevent cross-tenant/cross-user data leakage.
 */

interface CacheEntry<T> {
  data: T;
  total?: number;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function buildCacheKey(
  scope: string,
  companyId: string | null | undefined,
  params?: string | Record<string, any>
): string {
  const comp = (companyId || "personal").trim();
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
  return `${scope}::${comp}::${paramStr}`;
}

export function getCachedData<T>(
  key: string,
  ttlMs: number = 45000
): { data: T; total?: number } | null {
  if (typeof window === "undefined") return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return { data: entry.data as T, total: entry.total };
}

export function setCachedData<T>(key: string, data: T, total?: number): void {
  if (typeof window === "undefined") return;
  memoryCache.set(key, {
    data,
    total,
    timestamp: Date.now(),
  });
}

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

// Invalidate all cache on auth session cleared or company changed
if (typeof window !== "undefined") {
  window.addEventListener("authSessionCleared", () => {
    memoryCache.clear();
  });
  window.addEventListener("companyChanged", () => {
    memoryCache.clear();
  });
}
