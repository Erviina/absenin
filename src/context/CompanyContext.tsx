"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { clearPersonalModePreference } from "@/lib/personalMode";
import { getActiveCompanyId, setActiveCompanyId as setActiveCompanyIdStorage, clearAuthSession } from "@/lib/api";

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

    // Batalkan request in-flight sebelumnya jika ada
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (!silent) {
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/memberships`, {
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

      // Filter hanya membership yang aktif dan tidak dihapus
      const activeList = formatted.filter((m: any) => m.status === "active" && !m.deleted_at);

      // Jika user tidak memiliki membership aktif sama sekali, bersihkan info perusahaan di user lokal
      if (activeList.length === 0 && typeof window !== "undefined") {
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            if (u.company) {
              u.company = null;
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
      const storedId = getActiveCompanyId();
      const matched = activeList.find((m) => m.company_id === storedId);

      if (storedId && matched) {
        // Perusahaan aktif masih valid dan dikonfirmasi oleh server
        setActiveCompanyId(storedId);
        setActiveCompanyIdStorage(storedId);
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            u.company = matched.company;
            u.activeRole = matched.role;
            localStorage.setItem("user", JSON.stringify(u));
            setCurrentUser(u);
          }
        } catch {}
      } else if (storedId && !matched) {
        // Perusahaan yang tersimpan sudah TIDAK AKTIF (membership dicabut/dihapus)
        // Jangan diam-diam memilih perusahaan lain bagi pengguna multi-perusahaan
        console.warn(`Perusahaan tersimpan ${storedId} tidak lagi aktif untuk user.`);
        setActiveCompanyId(null);
        setActiveCompanyIdStorage(null);
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            u.company = null;
            u.activeRole = null;
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
      setMemberships([]);
      setActiveCompanyId(null);
      setCurrentUser(null);
      setIsLoading(false);
      setCompanyError(null);
    };

    const handleSessionUpdated = (e: any) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const newUser = e?.detail?.user || null;
      if (newUser) {
        setCurrentUser(newUser);
      }
      const newCompanyId = newUser?.company?.id || null;
      setActiveCompanyId(newCompanyId);
      setCompanyError(null);
      fetchMemberships();
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

  // Global 403 fetch interceptor to catch any permission revocations on API calls
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).__fetch403Patched) {
      (window as any).__fetch403Patched = true;
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        if (response.status === 403) {
          window.dispatchEvent(new CustomEvent("unauthorizedAccess", { detail: { url: args[0] } }));
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
          localStorage.setItem("user", JSON.stringify(u));
          setCurrentUser(u);
        }
      } catch {}

      window.dispatchEvent(new CustomEvent("companyChanged", { detail: { companyId } }));

      const isTargetManagement = ["owner", "admin", "manager"].includes(target.role);
      const currentPath = window.location.pathname;

      if (currentPath.startsWith("/admin") && !isTargetManagement) {
        window.location.replace("/dashboard");
        return;
      }

      window.location.reload();
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
    return activeMembership ? activeMembership.company : null;
  }, [activeMembership]);

  const activeRole = useMemo(() => {
    return activeMembership ? activeMembership.role : null;
  }, [activeMembership]);

  // Role authorization helper
  const canCreate = useCallback((feature: "agendas" | "news"): boolean => {
    if (!activeRole) return false;
    return ["owner", "admin", "manager"].includes(activeRole);
  }, [activeRole]);

  const clearCacheAndRefresh = useCallback(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const value = useMemo(
    () => ({
      memberships,
      activeCompanyId,
      activeMembership,
      activeCompany,
      activeRole,
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
