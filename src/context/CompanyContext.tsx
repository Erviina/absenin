"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { clearPersonalModePreference } from "@/lib/personalMode";
import { getActiveCompanyId, setActiveCompanyId as setActiveCompanyIdStorage } from "@/lib/api";

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
  switchCompany: (companyId: string) => void;
  refreshMemberships: () => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<any | null>(null);

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

  // Hydrate from localStorage cache immediately after mounting on client (avoids SSR mismatch).
  // Cache hanya digunakan untuk tampilan sementara (optimistik) — isLoading tetap true
  // sampai fetchMemberships dari backend selesai, agar tidak ada keputusan routing berdasarkan data basi.
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch {}
      }
      const cached = localStorage.getItem(MEMBERSHIPS_CACHE_KEY);
      const storedActiveId = getActiveCompanyId();
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemberships(parsed);
          // Sengaja TIDAK memanggil setIsLoading(false) di sini.
          // isLoading hanya dimatikan oleh fetchMemberships setelah verifikasi backend.
        }
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

  const fetchMemberships = useCallback(async () => {
    setIsLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const profileId = getCurrentProfileId();

    try {
      let formatted: CompanyMembership[] = [];
      let backendLoaded = false;

      // 1. Try Backend API first (handles auto-sync and bypasses client RLS limitations)
      if (token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/memberships`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            formatted = json.data;
            backendLoaded = true;
          }
        } catch (apiErr) {
          console.warn("Backend /companies/memberships failed, trying direct Supabase:", apiErr);
        }
      }

      // 2. Direct Supabase query fallback (only if backend API failed or unavailable)
      if (!backendLoaded && profileId) {
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
        }
      }

      // CRITICAL: If both backend API and Supabase direct query failed to return data (e.g. temporary network error),
      // DO NOT wipe the active company or memberships cache! Retain existing state.
      if (!backendLoaded && formatted.length === 0) {
        console.warn("Unable to reach backend or Supabase for memberships. Retaining current active company state.");
        return;
      }

      // Filter only active, non-deleted memberships
      const activeList = formatted.filter((m: any) => m.status === "active" && !m.deleted_at);

      // If user has no active memberships at all, clear any cached company in local user
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

      // Validate activeCompanyId against active memberships
      const storedId = getActiveCompanyId();
      const matched = activeList.find((m) => m.company_id === storedId);

      if (storedId && matched) {
        // Active company is valid and confirmed by server
        setActiveCompanyId(storedId);
        setActiveCompanyIdStorage(storedId);
        // Sync local user object with verified active company
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
        // Previously chosen company is NO LONGER ACTIVE (membership revoked/deleted)
        // Per rules: Handle explicitly, do NOT silently select another company
        console.warn(`Previously selected company ${storedId} is no longer active for user.`);
        setActiveCompanyId(null);
        setActiveCompanyIdStorage(null);
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            u.company = null;
            localStorage.setItem("user", JSON.stringify(u));
            setCurrentUser(u);
          }
        } catch {}
      } else if (!storedId && activeList.length > 0) {
        // User had no stored choice yet (first login)
        const defaultId = activeList[0].company_id;
        setActiveCompanyId(defaultId);
        setActiveCompanyIdStorage(defaultId);
        try {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const u = JSON.parse(userStr);
            u.company = activeList[0].company;
            u.activeRole = activeList[0].role;
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
  }, [getCurrentProfileId]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

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
  }, [activeCompanyId]);

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
