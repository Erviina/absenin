"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { clearPersonalModePreference } from "@/lib/personalMode";
import { getActiveCompanyId, setActiveCompanyId as setActiveCompanyIdStorage, clearAuthSession, getApiUrl } from "@/lib/api";

export type CompanyCategoryCode = "community" | "organization" | "business";

export interface CompanyCategory {
  id: string;
  code: CompanyCategoryCode;
  name: string;
  description?: string | null;
}

export type CompanyRole = "owner" | "admin" | "manager" | "member";

export interface CompanyDetails {
  id: string;
  name: string;
  category_id?: string | null;
  avatar_company_url?: string | null;
  category?: CompanyCategory | null;
}

export interface CompanyMembership {
  id: string;
  company_id: string;
  profile_id: string;
  role: CompanyRole;
  status: string;
  joined_at?: string | null;
  deleted_at?: string | null;
  company: CompanyDetails;
}

interface CompanyContextType {
  memberships: CompanyMembership[];
  activeCompanyId: string | null;
  activeMembership: CompanyMembership | null;
  activeCompany: CompanyDetails | null;
  activeRole: CompanyRole | null;
  isManagement: boolean;
  isLoading: boolean;
  isCompanyLoading: boolean;
  companyError: string | null;
  switchCompany: (companyId: string) => void;
  refreshMemberships: (silent?: boolean) => Promise<void>;
  canCreate: (feature: "agendas" | "news") => boolean;
  clearCacheAndRefresh: () => void;
  currentUser: any | null;
  setCurrentUser: (user: any) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const MEMBERSHIPS_CACHE_KEY = "companyMemberships";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(getActiveCompanyId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const inFlightTokenRef = useRef<string | null>(null);

  const updateCurrentUser = useCallback((user: any) => {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      if (user) {
        try {
          localStorage.setItem("user", JSON.stringify(user));
        } catch {}
      } else {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Hydrate from localStorage cache immediately after mounting on client.
  // Cache hanya digunakan jika sesuai dengan profile_id sesi yang sedang aktif.
  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        setCurrentUser(null);
        setMemberships([]);
        setActiveCompanyId(null);
        setIsLoading(false);
        return;
      }

      const userStr = localStorage.getItem("user");
      let parsedUser: any = null;
      if (userStr) {
        try {
          parsedUser = JSON.parse(userStr);
          setCurrentUser(parsedUser);
        } catch {}
      }

      const cached = localStorage.getItem(MEMBERSHIPS_CACHE_KEY);
      const storedActiveId = getActiveCompanyId();
      if (cached && parsedUser?.id) {
        try {
          const parsed = JSON.parse(cached);
          // Validasi ketat: pastikan cache membership milik akun yang sedang login!
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].profile_id === parsedUser.id) {
            setMemberships(parsed);
          } else {
            // Cache milik akun lain/lama, hapus segera agar tidak bocor
            localStorage.removeItem(MEMBERSHIPS_CACHE_KEY);
          }
        } catch {}
      }
      if (storedActiveId) {
        setActiveCompanyId(storedActiveId);
      }
    } catch (e) {
      console.error("Failed to load company cache:", e);
    }
  }, []);

  // Load user profile ID
  const getCurrentProfileId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        return u.id || null;
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    return null;
  }, []);

  const fetchMemberships = useCallback(async (silent: boolean = false) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setMemberships([]);
      setActiveCompanyId(null);
      setCurrentUser(null);
      setIsLoading(false);
      setCompanyError(null);
      return;
    }

    // Jika request dengan token yang sama sedang berjalan, reuse promise tersebut
    if (inFlightPromiseRef.current && inFlightTokenRef.current === token) {
      return inFlightPromiseRef.current;
    }

    // Batalkan request in-flight sebelumnya hanya jika token berbeda (pergantian akun)
    if (abortControllerRef.current && inFlightTokenRef.current !== token) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    inFlightTokenRef.current = token;

    const runFetch = async () => {
      // Hanya aktifkan full blocking loading jika belum ada data membership atau user sama sekali
      const hasExistingData = memberships.length > 0 || Boolean(currentUser);
      if (!silent && !hasExistingData) {
        setIsLoading(true);
      }
      setCompanyError(null);
      const tokenAtStart = token;
      const profileId = getCurrentProfileId();

      try {
        let formatted: CompanyMembership[] = [];
        let backendLoaded = false;
        let isNetworkOrServerError = false;

        // 1. Coba Endpoint Backend terlebih dahulu
        try {
          const res = await fetch(getApiUrl("/companies/memberships"), {
            headers: { Authorization: `Bearer ${token}` },
            signal: abortController.signal,
          });

          const currentToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
          if (currentToken !== tokenAtStart) {
            // Token berubah di tengah request (pergantian akun), abaikan hasil lama
            return;
          }

          if (res.status === 401) {
            clearAuthSession();
            return;
          }

          const json = await res.json();
          if (res.ok && json.success && Array.isArray(json.data)) {
            formatted = json.data;
            backendLoaded = true;
          } else {
            isNetworkOrServerError = true;
          }
        } catch (apiErr: any) {
          if (apiErr.name === "AbortError") {
            return;
          }
          console.warn("Backend /companies/memberships failed, trying direct Supabase:", apiErr);
          isNetworkOrServerError = true;
        }

        // 2. Direct Supabase query fallback (hanya jika backend tidak merespons)
        if (!backendLoaded && profileId) {
          try {
            const { data, error } = await supabase
              .from("company_members")
              .select(`
                id,
                company_id,
                profile_id,
                role,
                status,
                joined_at,
                deleted_at,
                companies:company_id (
                  id,
                  name,
                  category_id,
                  avatar_company_url,
                  deleted_at,
                  company_categories:category_id (
                    id,
                    code,
                    name,
                    description
                  )
                )
              `)
              .eq("profile_id", profileId)
              .eq("status", "active")
              .is("deleted_at", null);

            const currentToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
            if (currentToken !== tokenAtStart) return;

            if (!error && data && data.length > 0) {
              formatted = (data || [])
                .filter((item: any) => item.companies && !item.companies.deleted_at)
                .map((item: any) => {
                  const comp = item.companies;
                  const cat = comp.company_categories;

                  let normRole: CompanyRole = "member";
                  const r = (item.role || "").toLowerCase();
                  if (r === "owner") normRole = "owner";
                  else if (r === "admin") normRole = "admin";
                  else if (r === "manager") normRole = "manager";
                  else normRole = "member";

                  return {
                    id: item.id,
                    company_id: item.company_id,
                    profile_id: item.profile_id,
                    role: normRole,
                    status: item.status,
                    joined_at: item.joined_at,
                    deleted_at: item.deleted_at,
                    company: {
                      id: comp.id,
                      name: comp.name || "Perusahaan",
                      category_id: comp.category_id,
                      avatar_company_url: comp.avatar_company_url,
                      category: cat
                        ? {
                            id: cat.id,
                            code: cat.code as CompanyCategoryCode,
                            name: cat.name,
                            description: cat.description,
                          }
                        : null,
                    },
                  };
                });
              backendLoaded = true;
              isNetworkOrServerError = false;
            } else if (error) {
              isNetworkOrServerError = true;
            }
          } catch {
            isNetworkOrServerError = true;
          }
        }

        // Jika terjadi kesalahan jaringan atau server sementara:
        // JANGAN hapus perusahaan aktif atau cache secara permanen!
        if (!backendLoaded && formatted.length === 0 && isNetworkOrServerError) {
          console.warn("Gagal menghubungi server untuk memvalidasi membership. Mempertahankan state saat ini.");
          setCompanyError("Gagal menghubungi server untuk memvalidasi status perusahaan.");
          return;
        }

        // Proteksi pergantian akun di tengah request: pastikan token masih sama persis
        const currentTokenCheck = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (currentTokenCheck !== tokenAtStart) return;

        // Filter hanya membership yang aktif, tidak dihapus, dan strictly milik profil user saat ini
        const currentProfileId = getCurrentProfileId();
        const activeList = formatted.filter(
          (m: any) => m.status === "active" && !m.deleted_at && (!currentProfileId || m.profile_id === currentProfileId)
        );

        // Jika user tidak memiliki membership aktif sama sekali, bersihkan info perusahaan di user lokal
        if (activeList.length === 0 && typeof window !== "undefined") {
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              if (u.company) {
                u.company = null;
                u.activeRole = null;
                u.isManagement = false;
                u.roles = ["Employee"];
                localStorage.setItem("user", JSON.stringify(u));
                setCurrentUser(u);
              }
            }
          } catch (e) {
            console.error("Local user company cleanup error:", e);
          }
        }

        if (typeof window !== "undefined") {
          if (activeList.length > 0) {
            localStorage.setItem(MEMBERSHIPS_CACHE_KEY, JSON.stringify(activeList));
            clearPersonalModePreference(profileId);
          } else {
            localStorage.removeItem(MEMBERSHIPS_CACHE_KEY);
          }
        }

        setMemberships(activeList);

        // Validasi activeCompanyId terhadap membership yang benar-benar aktif
        const storedId = activeCompanyId || getActiveCompanyId();
        let matched = storedId ? activeList.find((m) => m.company_id === storedId) : null;

        // Jika storedId tidak cocok dengan membership user saat ini (misal sisa sesi akun lain),
        // coba cocokkan dengan company_id dari profil user saat ini
        if (!matched && activeList.length > 0) {
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              const userCompId = u?.company?.id;
              if (userCompId) {
                const profileMatched = activeList.find((m) => m.company_id === userCompId);
                if (profileMatched) {
                  matched = profileMatched;
                }
              }
            }
          } catch {}

          // Jika user hanya memiliki 1 membership aktif yang sah, gunakan membership tersebut
          if (!matched && activeList.length === 1) {
            matched = activeList[0];
          }
        }

        if (matched) {
          // Perusahaan aktif valid dan dikonfirmasi oleh server
          const matchedId = matched.company_id;
          setActiveCompanyId(matchedId);
          setActiveCompanyIdStorage(matchedId);
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              u.company = matched.company;
              u.activeRole = matched.role;
              u.isManagement = ["owner", "admin", "manager"].includes((matched.role || "").toLowerCase());
              u.roles = u.isManagement
                ? [matched.role.charAt(0).toUpperCase() + matched.role.slice(1), "Employee"]
                : ["Employee"];
              localStorage.setItem("user", JSON.stringify(u));
              setCurrentUser(u);
            }
          } catch {}
        } else if (storedId && !matched) {
          // Perusahaan yang tersimpan sudah TIDAK AKTIF dan user memiliki multi-perusahaan tanpa pilihan pasti
          console.warn(`Perusahaan tersimpan ${storedId} tidak lagi aktif untuk user.`);
          setActiveCompanyId(null);
          setActiveCompanyIdStorage(null);
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              u.company = null;
              u.activeRole = null;
              u.isManagement = false;
              u.roles = ["Employee"];
              localStorage.setItem("user", JSON.stringify(u));
              setCurrentUser(u);
            }
          } catch {}
        } else if (!storedId && activeList.length > 0) {
          // Belum ada pilihan tersimpan (misal sesi awal atau login pertama kali):
          let defaultChoice = activeList[0];
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              const userCompId = u?.company?.id;
              const profileMatched = userCompId ? activeList.find((m) => m.company_id === userCompId) : null;
              if (profileMatched) {
                defaultChoice = profileMatched;
              }
            }
          } catch {}

          const defaultId = defaultChoice.company_id;
          setActiveCompanyId(defaultId);
          setActiveCompanyIdStorage(defaultId);
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const u = JSON.parse(userStr);
              u.company = defaultChoice.company;
              u.activeRole = defaultChoice.role;
              u.isManagement = ["owner", "admin", "manager"].includes((defaultChoice.role || "").toLowerCase());
              u.roles = u.isManagement
                ? [defaultChoice.role.charAt(0).toUpperCase() + defaultChoice.role.slice(1), "Employee"]
                : ["Employee"];
              localStorage.setItem("user", JSON.stringify(u));
              setCurrentUser(u);
            }
          } catch {}
        } else {
          setActiveCompanyId(null);
          setActiveCompanyIdStorage(null);
        }
      } catch (err) {
        console.error("Exception fetching memberships:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const promise = runFetch();
    inFlightPromiseRef.current = promise;
    try {
      await promise;
    } finally {
      if (inFlightPromiseRef.current === promise) {
        inFlightPromiseRef.current = null;
        inFlightTokenRef.current = null;
      }
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [getCurrentProfileId]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  // Listener event sesi (logout & login dari tab manapun atau komponen lain)
  useEffect(() => {
    const handleSessionCleared = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      inFlightPromiseRef.current = null;
      inFlightTokenRef.current = null;
      setMemberships([]);
      setActiveCompanyId(null);
      setCurrentUser(null);
      setIsLoading(false);
      setCompanyError(null);
    };

    const handleSessionUpdated = (e: any) => {
      const currentToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      // Batalkan fetch in-flight hanya jika request aktif berasal dari token akun yang berbeda
      if (abortControllerRef.current && inFlightTokenRef.current && inFlightTokenRef.current !== currentToken) {
        abortControllerRef.current.abort();
        inFlightPromiseRef.current = null;
        inFlightTokenRef.current = null;
      }
      const newUser = e?.detail?.user || null;
      if (newUser) {
        setCurrentUser(newUser);
      }
      const newCompanyId = newUser?.company?.id || e?.detail?.companyId || null;
      setActiveCompanyId(newCompanyId);
      setCompanyError(null);

      // Jika belum ada fetch in-flight untuk token ini, lakukan pemuatan membership
      if (!inFlightPromiseRef.current || inFlightTokenRef.current !== currentToken) {
        setIsLoading(true);
        setMemberships([]);
        fetchMemberships();
      }
    };

    window.addEventListener("authSessionCleared", handleSessionCleared);
    window.addEventListener("authSessionUpdated", handleSessionUpdated);

    const handleUnauthorizedAccess = () => {
      fetchMemberships(true);
    };
    window.addEventListener("unauthorizedAccess", handleUnauthorizedAccess);

    return () => {
      window.removeEventListener("authSessionCleared", handleSessionCleared);
      window.removeEventListener("authSessionUpdated", handleSessionUpdated);
      window.removeEventListener("unauthorizedAccess", handleUnauthorizedAccess);
    };
  }, [fetchMemberships]);

  // Global fetch interceptor untuk 401 (sesi tidak valid) dan 403 (revokasi izin)
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).__fetchAuthPatched) {
      (window as any).__fetchAuthPatched = true;
      const originalFetch = window.fetch;
      let isRedirectingToLogin = false;

      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        if (response.status === 403) {
          // HTTP 403: Pembatasan izin / forbidden - jangan logout otomatis
          window.dispatchEvent(new CustomEvent("unauthorizedAccess", { detail: { url: args[0] } }));
        } else if (response.status === 401) {
          const rawUrl = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
          const hasToken = typeof window !== "undefined" ? Boolean(localStorage.getItem("accessToken")) : false;
          const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

          // Pengecualian endpoint autentikasi dan halaman publik untuk mencegah redirect loop
          const isAuthEndpoint = rawUrl.includes("/auth/google") || rawUrl.includes("/auth/login");
          const isPublicPage = ["/login", "/login/onboard", "/unauthorized", "/"].includes(currentPath);

          if (hasToken && !isAuthEndpoint && !isPublicPage && !isRedirectingToLogin) {
            isRedirectingToLogin = true;
            clearAuthSession();

            const redirectTarget = currentPath + (window.location.search || "");
            const loginUrl = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
            window.location.href = loginUrl;
          }
        }

        return response;
      };
    }
  }, []);

  // Handle company switch
  const switchCompany = useCallback((companyId: string) => {
    if (companyId === activeCompanyId) return;

    const target = memberships.find((m) => m.company_id === companyId && m.status === "active");
    if (!target) {
      console.warn(`Cannot switch to company ${companyId}: Not an active member.`);
      return;
    }

    if (typeof window !== "undefined") {
      setActiveCompanyIdStorage(companyId);
      setActiveCompanyId(companyId);

      // Sync local user object immediately with selected company
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          u.company = target.company;
          u.activeRole = target.role;
          u.isManagement = ["owner", "admin", "manager"].includes((target.role || "").toLowerCase());
          u.roles = u.isManagement
            ? [target.role.charAt(0).toUpperCase() + target.role.slice(1), "Employee"]
            : ["Employee"];
          localStorage.setItem("user", JSON.stringify(u));
          setCurrentUser(u);
        }
      } catch {}

      window.dispatchEvent(new CustomEvent("companyChanged", { detail: { companyId } }));

      const isTargetManagement = ["owner", "admin", "manager"].includes((target.role || "").toLowerCase());
      const currentPath = window.location.pathname;

      if (currentPath.startsWith("/admin") && !isTargetManagement) {
        window.location.replace("/dashboard");
        return;
      }
    }
  }, [memberships, activeCompanyId]);

  // Realtime subscription management on activeCompanyId change
  useEffect(() => {
    if (!activeCompanyId) return;

    // Connect to Supabase Realtime for the active company context
    const channel = supabase.channel(`company-context-${activeCompanyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          filter: `company_id=eq.${activeCompanyId}`,
        },
        (payload) => {
          // Notify any listener about realtime updates for this company
          window.dispatchEvent(
            new CustomEvent("companyRealtimeUpdate", {
              detail: { companyId: activeCompanyId, payload },
            })
          );

          // If membership or company member is updated, refresh memberships silently
          if (payload.table === "company_members") {
            fetchMemberships(true);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Connected to realtime
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, fetchMemberships]);

  // Realtime subscription for current user's company memberships
  useEffect(() => {
    const profileId = currentUser?.id || getCurrentProfileId();
    if (!profileId) return;

    const channel = supabase.channel(`user-memberships-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_members",
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          fetchMemberships(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, getCurrentProfileId, fetchMemberships]);

  const activeMembership = useMemo(() => {
    return memberships.find((m) => m.company_id === activeCompanyId) || null;
  }, [memberships, activeCompanyId]);

  const activeCompany = useMemo(() => {
    if (activeMembership) return activeMembership.company;
    if (currentUser?.company) {
      if (!activeCompanyId || currentUser.company.id === activeCompanyId) {
        return currentUser.company;
      }
    }
    return null;
  }, [activeMembership, currentUser, activeCompanyId]);

  const activeRole = useMemo(() => {
    if (activeMembership) return activeMembership.role;
    if (currentUser?.activeRole) {
      if (!activeCompanyId || !currentUser?.company?.id || currentUser.company.id === activeCompanyId) {
        return currentUser.activeRole as CompanyRole;
      }
    }
    return null;
  }, [activeMembership, currentUser, activeCompanyId]);

  const isManagement = useMemo(() => {
    const role = activeRole || (currentUser?.company?.id === activeCompanyId ? currentUser?.activeRole : null);
    if (role && typeof role === "string") {
      return ["owner", "admin", "manager"].includes(role.toLowerCase());
    }
    return Boolean(currentUser?.isManagement);
  }, [activeRole, currentUser, activeCompanyId]);

  // Role authorization helper
  const canCreate = useCallback((feature: "agendas" | "news"): boolean => {
    const role = activeRole || currentUser?.activeRole;
    if (!role || typeof role !== "string") return false;
    return ["owner", "admin", "manager"].includes(role.toLowerCase());
  }, [activeRole, currentUser]);

  const clearCacheAndRefresh = useCallback(() => {
    fetchMemberships(true);
  }, [fetchMemberships]);

  const value = useMemo(
    () => ({
      memberships,
      activeCompanyId,
      activeMembership,
      activeCompany,
      activeRole,
      isManagement,
      isLoading,
      isCompanyLoading: isLoading,
      companyError,
      switchCompany,
      refreshMemberships: fetchMemberships,
      canCreate,
      clearCacheAndRefresh,
      currentUser,
      setCurrentUser: updateCurrentUser,
    }),
    [
      memberships,
      activeCompanyId,
      activeMembership,
      activeCompany,
      activeRole,
      isManagement,
      isLoading,
      companyError,
      switchCompany,
      fetchMemberships,
      canCreate,
      clearCacheAndRefresh,
      currentUser,
      updateCurrentUser,
    ]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
