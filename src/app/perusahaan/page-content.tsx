"use client";

import { 
  Building2, 
  Phone, 
  PhoneCall, 
  MessageCircle, 
  MapPin, 
  Clock, 
  Users, 
  QrCode, 
  Copy, 
  Calendar, 
  Shield, 
  LogOut, 
  AlertTriangle, 
  ChevronRight, 
  ExternalLink, 
  Settings, 
  Check, 
  X, 
  Info,
  CheckCircle2,
  Navigation,
  Plus,
  Minus,
  Target,
  Loader2,
  HelpCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDialog } from "@/context/DialogContext";
import { CompanyProfileSkeleton } from "@/components/CardSkeleton";
import { useCompany } from "@/context/CompanyContext";
import { CompanyQRCodeCard } from "@/components/CompanyQRCodeCard";
import { getActiveCompanyId, getApiUrl } from "@/lib/api";

function MapControls({ 
  targetLat, 
  targetLng,
  position = "top-right"
}: { 
  targetLat: number; 
  targetLng: number;
  position?: "top-right" | "bottom-right";
}) {
  const map = useMap();
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlsRef.current) {
      L.DomEvent.disableClickPropagation(controlsRef.current);
      L.DomEvent.disableScrollPropagation(controlsRef.current);
    }
  }, []);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.zoomOut();
  };

  const handleFocusTarget = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.stop();
    const currentZoom = map.getZoom();
    const targetZoom = Math.max(currentZoom, 16);
    if (currentZoom === targetZoom) {
      map.panTo([targetLat, targetLng], {
        animate: true,
        duration: 0.35,
      });
    } else {
      map.setView([targetLat, targetLng], targetZoom, {
        animate: true,
        duration: 0.35,
      });
    }
  };

  const posClass = position === "bottom-right" 
    ? "bottom-3 right-3 flex flex-col gap-1.5" 
    : "top-3 right-3 flex flex-col gap-1.5";

  return (
    <div
      ref={controlsRef}
      className={`absolute ${posClass} z-[1000] pointer-events-auto select-none`}
    >
      <div className="bg-white/95 backdrop-blur-xs rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden border border-gray-200/80">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Perbesar (Zoom in)"
          aria-label="Perbesar"
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 text-[#1E4738] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Perkecil (Zoom out)"
          aria-label="Perkecil"
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 text-[#1E4738] transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleFocusTarget}
        title="Pusatkan ke Lokasi Target"
        aria-label="Pusatkan ke Lokasi Target"
        className="w-8 h-8 bg-white/95 backdrop-blur-xs rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 border border-gray-200/80 transition-all active:scale-95 text-[#356E3B] hover:text-[#1E4738] cursor-pointer"
      >
        <Target className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}

const customIconMap = new Map<string, L.DivIcon>();

const getCustomIcon = (label: string) => {
  const safeLabel = label || "Perusahaan";
  if (customIconMap.has(safeLabel)) {
    return customIconMap.get(safeLabel)!;
  }
  const icon = new L.DivIcon({
    className: "custom-leaflet-icon",
    iconSize: [120, 68],
    iconAnchor: [60, 44],
    html: `
      <div class="flex flex-col items-center justify-start w-[120px]">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35));">
          <path 
            d="M17 1C8.163 1 1 8.163 1 17C1 27.5 14.5 41.2 16.3 42.9C16.7 43.3 17.3 43.3 17.7 42.9C19.5 41.2 33 27.5 33 17C33 8.163 25.837 1 17 1Z" 
            fill="#356E3B" 
            stroke="#FFFFFF" 
            stroke-width="2.5" 
            stroke-linejoin="round"
          />
          <circle cx="17" cy="17" r="6" fill="#FFFFFF" />
          <circle cx="17" cy="17" r="3" fill="#356E3B" />
        </svg>
        <div class="w-3.5 h-1 bg-black/25 rounded-full blur-[1px] -mt-0.5"></div>
        ${safeLabel ? `
          <div class="bg-[#1E4738] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap z-20 pointer-events-none">
            ${safeLabel}
          </div>
        ` : ""}
      </div>
    `,
  });
  customIconMap.set(safeLabel, icon);
  return icon;
};

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

const ALL_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function ProfilPerusahaanContent() {
  const router = useRouter();
  const { showToast, showConfirm } = useDialog();
  const { activeCompanyId, activeCompany, activeRole, refreshMemberships } = useCompany();

  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingExitRequest, setPendingExitRequest] = useState<any>(null);
  const [isCancellingExit, setIsCancellingExit] = useState(false);

  // Modal Ajukan Keluar
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);

  // Modal QR Code
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const activeFetchCompIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleCompanyChanged = () => {
      setCompany(null);
      setPendingExitRequest(null);
      setIsLoading(true);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  const fetchCompanyAndExitStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const compId = activeCompanyId || activeCompany?.id || getActiveCompanyId();
      activeFetchCompIdRef.current = compId;

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      // 1. Fetch Company Profile
      const compRes = await fetch(getApiUrl("/companies/me"), { headers });
      const compData = await compRes.json();

      if (compRes.status === 401) {
        showToast("Sesi tidak valid. Silakan login kembali.", "error");
        router.push("/login");
        return;
      }

      if (activeFetchCompIdRef.current !== compId) return;

      if (compData.success && compData.data) {
        setCompany(compData.data);

        // 2. Fetch User's Pending Exit Request for this company
        const targetId = compData.data.id || compId;
        if (targetId) {
          try {
            const exitRes = await fetch(
              getApiUrl(`/company/exit-requests/me?company_id=${targetId}`),
              { headers }
            );
            const exitData = await exitRes.json();
            if (activeFetchCompIdRef.current === compId) {
              if (exitData.success && exitData.data) {
                setPendingExitRequest(exitData.data);
              } else {
                setPendingExitRequest(null);
              }
            }
          } catch (err) {
            console.error("Error fetching exit request status:", err);
          }
        }
      }
    } catch (err) {
      console.error("Fetch company error:", err);
      showToast("Gagal memuat profil organisasi", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId, activeCompany?.id, router, showToast]);

  useEffect(() => {
    setCompany(null);
    setPendingExitRequest(null);
    setIsLoading(true);
    fetchCompanyAndExitStatus();
  }, [fetchCompanyAndExitStatus]);

  // Handle Cancel Exit Request
  const handleCancelExitRequest = async () => {
    if (isCancellingExit) return;
    const confirmed = await showConfirm({
      title: "Batalkan Permohonan Keluar?",
      message: "Apakah Anda yakin ingin membatalkan permohonan keluar dari organisasi ini?",
      confirmText: "Ya, Batalkan Permohonan",
      cancelText: "Kembali",
      type: "warning",
      icon: "alert"
    });

    if (!confirmed) return;

    try {
      setIsCancellingExit(true);
      const token = localStorage.getItem("accessToken");
      const companyId = company?.id || localStorage.getItem("activeCompanyId");

      const res = await fetch(getApiUrl("/company/exit-requests/cancel"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId || ""
        },
        body: JSON.stringify({ company_id: companyId })
      });

      const data = await res.json();
      if (data.success) {
        setPendingExitRequest(null);
      } else {
        showToast(data.message || "Gagal membatalkan permohonan", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsCancellingExit(false);
    }
  };

  // Handle Submit Exit Request
  const handleSubmitExitRequest = async () => {
    if (isSubmittingExit) return;
    setExitError(null);
    try {
      setIsSubmittingExit(true);
      const token = localStorage.getItem("accessToken");
      const companyId = company?.id || localStorage.getItem("activeCompanyId");

      const res = await fetch(getApiUrl("/company/exit-requests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId || ""
        },
        body: JSON.stringify({
          company_id: companyId,
          reason: exitReason.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsExitModalOpen(false);
        setExitReason("");
        setPendingExitRequest(data.data);
      } else {
        setExitError(data.message || "Gagal mengajukan permohonan keluar");
      }
    } catch (err) {
      console.error(err);
      setExitError("Terjadi kesalahan jaringan atau server");
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const isManagement = activeRole === "owner" || activeRole === "admin" || activeRole === "manager";
  const canManageCompany = activeRole === "owner" || activeRole === "admin";
  const isOwner = (company?.role || activeRole) === "owner";

  const getCategoryTitle = (code?: string, name?: string) => {
    if (name) return name;
    if (code === "community") return "Komunitas";
    if (code === "organization") return "Organisasi";
    return "Perusahaan / Bisnis";
  };

  const getRoleLabel = (role?: string) => {
    const r = (role || "").toLowerCase();
    if (r === "owner") return "Pemilik (Owner)";
    if (r === "admin") return "Admin";
    if (r === "manager") return "Manajer";
    return "Anggota / Karyawan";
  };

  const formatWhatsAppUrl = (phoneStr: string) => {
    let clean = phoneStr.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.substring(1);
    }
    return `https://wa.me/${clean}`;
  };

  if (isLoading && !company) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FBFDFC]">
        <TopBar title="Profil Perusahaan" onBack={() => router.back()} />
        <CompanyProfileSkeleton />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FBFDFC]">
        <TopBar title="Profil Perusahaan" onBack={() => router.back()} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mb-3" />
          <h2 className="text-[17px] font-bold text-gray-800 mb-1">Perusahaan Tidak Ditemukan</h2>
          <p className="text-[13px] text-gray-500 mb-6 max-w-xs">
            Anda belum tergabung ke dalam organisasi atau perusahaan aktif.
          </p>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 bg-[#356E3B] text-white rounded-full text-[13px] font-bold shadow-md shadow-[#356E3B]/20 active:scale-95 transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const workDays: string[] = Array.isArray(company.work_days) && company.work_days.length > 0 
    ? company.work_days 
    : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  const formatTimeHHmm = (timeStr?: string | null, fallback = "08:00"): string => {
    if (!timeStr) return fallback;
    const parts = timeStr.trim().split(":");
    if (parts.length >= 2) {
      const h = (parts[0] || "08").padStart(2, "0");
      const m = (parts[1] || "00").padStart(2, "0");
      return `${h}:${m}`;
    }
    return timeStr;
  };

  const startTime = formatTimeHHmm(company.work_start_time, "08:00");
  const endTime = formatTimeHHmm(company.work_end_time, "17:00");
  const lat = typeof company.latitude === "number" ? company.latitude : -6.9175;
  const lng = typeof company.longitude === "number" ? company.longitude : 107.6191;

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFDFC]">
      {/* TopBar */}
      <TopBar 
        title="Profil Perusahaan" 
        onBack={() => router.back()}
      />

      <div className="flex-1 flex flex-col p-5 gap-5 sm:max-w-md mx-auto w-full pb-24">
        
        {/* Hero Card: Company Header */}
        <div className="bg-gradient-to-br from-[#1E4738] via-[#2A5D44] to-[#356E3B] rounded-[24px] p-6 text-white shadow-lg shadow-[#1E4738]/15 relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Logo Avatar */}
            <div className="w-[84px] h-[84px] rounded-[22px] bg-white/15 backdrop-blur-md p-1.5 border-2 border-white/20 shadow-md mb-3 flex items-center justify-center">
              {company.logo_url || company.avatar_company_url ? (
                <img 
                  src={company.logo_url || company.avatar_company_url} 
                  alt={company.name} 
                  className="w-full h-full object-cover rounded-[18px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-white/20 rounded-[18px] flex items-center justify-center">
                  <Building2 className="w-9 h-9 text-white" strokeWidth={2.2} />
                </div>
              )}
            </div>

            {/* Company Name */}
            <h1 className="text-[20px] font-extrabold text-white tracking-tight leading-snug mb-1.5">
              {company.name}
            </h1>

            {/* Badges: Category & Role */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                {getCategoryTitle(company.category_code, company.category_name)}
              </span>
              <span className="bg-emerald-300/20 border border-emerald-300/30 text-emerald-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-200" />
                {getRoleLabel(company.role || activeRole || undefined)}
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2.5 w-full pt-3 border-t border-white/15">
              <div className="bg-black/15 backdrop-blur-sm rounded-[14px] p-2.5 flex flex-col items-center">
                <span className="text-[11px] text-white/75 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-200" /> Total Anggota
                </span>
                <span className="text-[15px] font-bold text-white mt-0.5">
                  {company.memberCount || 0} Orang
                </span>
              </div>
              <div className="bg-black/15 backdrop-blur-sm rounded-[14px] p-2.5 flex flex-col items-center">
                <span className="text-[11px] text-white/75 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-200" /> Jam Kerja
                </span>
                <span className="text-[15px] font-bold text-white mt-0.5">
                  {startTime} - {endTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Kontak Perusahaan (Nomor Telepon & Tombol Aksi) */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-[14px] font-bold leading-none">Kontak Perusahaan</h2>
              <span className="text-[11px] text-[#6B7280] mt-1">Saluran komunikasi resmi organisasi</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
            {company.phone ? (
              <>
                <div className="flex items-baseline justify-between bg-[#F8FAFC] border border-gray-100 p-3 rounded-[14px]">
                  <span className="text-[12px] text-gray-500 font-medium">Nomor Telepon</span>
                  <span className="text-[15px] font-bold text-[#111827] tracking-wide">{company.phone}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`tel:${company.phone}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#E8F3EB] text-[#2D5A3F] hover:bg-[#d8ebd9] rounded-[14px] text-[12px] font-bold transition-all active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Telepon Langsung</span>
                  </a>
                  <a
                    href={formatWhatsAppUrl(company.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#25D366]/10 text-[#1E7E34] hover:bg-[#25D366]/20 rounded-[14px] text-[12px] font-bold transition-all active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>Chat WhatsApp</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-[14px] text-center">
                <span className="text-[12px] text-gray-500 italic">
                  Nomor telepon belum dicantumkan oleh pengelola.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Detail Alamat & Lokasi Kantor (Detailing + Interactive Map) */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[#111827] text-[14px] font-bold leading-none">Detail Alamat & Lokasi</h2>
                <span className="text-[11px] text-[#6B7280] mt-1">Titik lokasi kantor perusahaan</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
            {/* Detailed text address */}
            <div className="bg-[#F8FAFC] border border-gray-100 p-3 rounded-[14px] flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Alamat Lengkap</span>
              <p className="text-[13px] text-gray-800 leading-relaxed font-medium">
                {company.address || "Alamat kantor belum diatur."}
              </p>
            </div>

            {/* Coordinates chip */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-[12px] text-[11px]">
              <span className="text-gray-500 font-medium">Koordinat GPS:</span>
              <span className="font-mono text-gray-700 font-semibold">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>

            {/* Leaflet Map Preview */}
            <div className="w-full h-[190px] rounded-[16px] overflow-hidden border border-gray-200 relative z-0 shadow-inner">
              <MapContainer
                center={[lat, lng]}
                zoom={16}
                scrollWheelZoom={false}
                zoomControl={false}
                attributionControl={false}
                className="w-full h-full"
              >
                <MapResizer />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={getCustomIcon(company.name)} />
                <MapControls targetLat={lat} targetLng={lng} />
              </MapContainer>
            </div>

            {/* Button Buka Google Maps */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-[14px] text-[12px] font-bold text-gray-700 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-[#356E3B]" />
              <span>Buka Petunjuk Arah di Google Maps</span>
              <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
            </a>
          </div>
        </div>

        {/* Section 3: Jadwal Kerja & Hari Operasional */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[#111827] text-[14px] font-bold leading-none">Jadwal Operasional</h2>
              <span className="text-[11px] text-[#6B7280] mt-1">Hari dan jam kerja resmi</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#F8FAFC] border border-gray-100 p-3 rounded-[14px]">
              <span className="text-[12px] text-gray-500 font-medium">Jam Masuk & Pulang</span>
              <span className="text-[13px] font-bold text-[#1E4738]">
                {startTime} - {endTime} WIB
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Hari Kerja Aktif ({workDays.length} Hari)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((day) => {
                  const isActive = workDays.includes(day);
                  return (
                    <div
                      key={day}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
                        isActive
                          ? "bg-[#356E3B] text-white shadow-sm"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isActive && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Kode Bergabung (Join Code) */}
        {company.join_code && (
          <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                <QrCode className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[#111827] text-[14px] font-bold leading-none">Kode Bergabung</h2>
                <span className="text-[11px] text-[#6B7280] mt-1">Kode untuk mengundang rekan kerja</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between bg-[#F8FAFC] border border-gray-100 p-3 rounded-[14px]">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 font-semibold uppercase">Kode Unik Organisasi</span>
                <span className="text-[18px] font-extrabold text-[#111827] tracking-wider font-mono">
                  {company.join_code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex items-center gap-1.5 py-2 px-3 bg-[#E8F3EB] text-[#2D5A3F] hover:bg-[#D4E8D9] rounded-[12px] text-[12px] font-bold transition-all active:scale-95 border border-[#C5DEC9]"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Lihat QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(company.join_code);
                  }}
                  className="flex items-center gap-1.5 py-2 px-3 bg-white border border-gray-200 text-gray-700 hover:text-[#356E3B] hover:border-[#356E3B] rounded-[12px] text-[12px] font-bold transition-all shadow-sm active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Bagian Keluar Perusahaan */}
        {/* Skenario A: Ada permohonan keluar yang berstatus pending */}
        {pendingExitRequest ? (
          <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="text-[14px] font-bold text-amber-900 leading-tight">
                  Permohonan Keluar Sedang Diproses
                </h3>
                <p className="text-[12px] text-amber-700 mt-1 leading-relaxed">
                  Anda telah mengajukan permohonan keluar dari organisasi ini. Menunggu persetujuan dari Admin atau Manajer.
                </p>
                {pendingExitRequest.reason && (
                  <div className="mt-2 bg-white/70 border border-amber-200/80 p-2.5 rounded-[10px] text-[11px] text-amber-800">
                    <span className="font-semibold block mb-0.5">Alasan pengajuan:</span>
                    <span className="italic">"{pendingExitRequest.reason}"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex justify-end">
              <button
                onClick={handleCancelExitRequest}
                disabled={isCancellingExit}
                className="w-full py-2.5 px-4 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-[14px] text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancellingExit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Membatalkan...</span>
                  </>
                ) : (
                  "Batalkan Permohonan Keluar"
                )}
              </button>
            </div>
          </div>
        ) : isOwner ? (
          /* Skenario B: User adalah Owner */
          <div className="bg-[#F8FAFC] border border-gray-200 rounded-[20px] p-5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[13px] font-bold text-gray-800 leading-tight">
                Status Pemilik (Owner)
              </h3>
              <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                Sebagai Pemilik (Owner), Anda tidak dapat keluar langsung. Anda dapat mengalihkan kepemilikan atau mengelola organisasi melalui menu pengaturan.
              </p>
            </div>
          </div>
        ) : (
          /* Skenario C: User biasa / Admin / Manager bukan owner -> Tombol Keluar dari Perusahaan */
          <div className="bg-red-50/50 border border-red-100 rounded-[20px] p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[14px] font-bold text-red-900 leading-none">Keluar dari Perusahaan</h3>
                <span className="text-[11px] text-red-700/80 mt-1">Melepaskan keanggotaan dari {company.name}</span>
              </div>
            </div>

            <p className="text-[12px] text-gray-600 leading-relaxed pt-1">
              Jika Anda keluar dari perusahaan, Anda tidak dapat lagi melakukan presensi kehadiran, mengakses agenda kerja, atau melihat tugas internal perusahaan ini.
            </p>

            <button
              onClick={() => {
                setExitError(null);
                setExitReason("");
                setIsExitModalOpen(true);
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-[16px] font-bold text-[13px] active:scale-95 transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Perusahaan</span>
            </button>
          </div>
        )}

      </div>

      {/* Modal / Dialog Pengajuan Keluar dari Perusahaan */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end flex-col sm:justify-center sm:items-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[24px] p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <h2 className="text-[16px] font-bold text-gray-900">Konfirmasi Keluar</h2>
              </div>
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin mengajukan keluar dari <span className="font-bold text-gray-800">{company.name}</span>? Permohonan Anda akan ditinjau oleh Admin atau Manajemen.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-gray-700">
                Alasan Keluar <span className="text-gray-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="Contoh: Mengundurkan diri, pindah kantor, masa kontrak selesai..."
                rows={3}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-[14px] text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#356E3B]/20 focus:border-[#356E3B] transition-all resize-none"
              />
            </div>

            {exitError && (
              <div className="text-red-600 text-[12px] bg-red-50 p-3 rounded-[12px] border border-red-200 text-center font-medium">
                {exitError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsExitModalOpen(false)}
                disabled={isSubmittingExit}
                className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-[13px] rounded-full transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitExitRequest}
                disabled={isSubmittingExit}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] rounded-full active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingExit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  "Kirim Pengajuan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Tampilkan QR Code */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setIsQrModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 z-10">
            <div className="w-full flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#E8F3EB] rounded-full flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h3 className="text-[#1E4738] text-[16px] font-bold">Kode QR Perusahaan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full">
              <CompanyQRCodeCard
                qrUrl={typeof window !== "undefined" ? `${window.location.origin}/gabung-perusahaan?code=${company.join_code}` : ""}
                joinCode={company.join_code}
                companyName={company.name}
                size={190}
                showJoinCodeBox={true}
                instructionText="Arahkan kamera ke kode QR untuk bergabung instan"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="mt-4 w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-bold active:scale-95 transition-all text-center"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
