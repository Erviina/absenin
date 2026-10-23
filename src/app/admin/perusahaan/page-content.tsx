"use client";

import { ChevronLeft, Building2, Pencil, Clock, ChevronRight, MapPin, X, Save, Target, Calendar, UserPlus, QrCode, AlignLeft, Send, Copy, Camera, Users, Trash2, Phone, ExternalLink, Plus, Minus, Loader2, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomTimePicker } from "@/components/CustomTimePicker";
import { QRCodeSVG } from "qrcode.react";
import { CompanyQRCodeCard } from "@/components/CompanyQRCodeCard";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";
import { getApiUrl } from "@/lib/api";
import { CompanyProfileSkeleton } from "@/components/CardSkeleton";

const customIconMap = new Map<string, L.DivIcon>();

const getCustomIcon = (label: string) => {
  const safeLabel = label || "Perusahaan";
  if (customIconMap.has(safeLabel)) {
    return customIconMap.get(safeLabel)!;
  }
  const icon = new L.DivIcon({
    className: "custom-leaflet-icon",
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
    iconSize: [120, 75],
    iconAnchor: [60, 43],
  });
  customIconMap.set(safeLabel, icon);
  return icon;
};

function MapControls({ 
  targetLat, 
  targetLng,
  position = "top-right",
  onLocate,
  isLocating = false
}: { 
  targetLat: number; 
  targetLng: number;
  position?: "top-right" | "bottom-right";
  onLocate?: (flyToCoords: (lat: number, lng: number) => void) => void;
  isLocating?: boolean;
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
    if (onLocate) {
      onLocate((lat: number, lng: number) => {
        map.stop();
        if (currentZoom === targetZoom) {
          map.panTo([lat, lng], { animate: true, duration: 0.35 });
        } else {
          map.setView([lat, lng], targetZoom, { animate: true, duration: 0.35 });
        }
      });
      return;
    }
    if (currentZoom === targetZoom) {
      map.panTo([targetLat, targetLng], { animate: true, duration: 0.35 });
    } else {
      map.setView([targetLat, targetLng], targetZoom, { animate: true, duration: 0.35 });
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
        disabled={isLocating}
        title={onLocate ? (isLocating ? "Mendeteksi lokasi GPS..." : "Deteksi Lokasi GPS Saat Ini") : "Pusatkan ke Lokasi Target"}
        aria-label={onLocate ? "Deteksi Lokasi GPS Saat Ini" : "Pusatkan ke Lokasi Target"}
        className="w-8 h-8 bg-white/95 backdrop-blur-xs rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 border border-gray-200/80 transition-all active:scale-95 text-[#356E3B] hover:text-[#1E4738] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLocating ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#356E3B]" />
        ) : (
          <Target className="w-4 h-4 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
}

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

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  const isFirstRender = useRef(true);
  const lastTarget = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isNaN(lat) || isNaN(lng)) return;

    // Saat inisialisasi awal, MapContainer sudah terpusat di [lat, lng].
    // Hindari flyTo di render pertama yang menyebabkan getaran/glitch saat baru terbuka.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastTarget.current = { lat, lng };
      return;
    }

    // Jika perubahan koordinat sangat kecil, abaikan
    if (
      lastTarget.current &&
      Math.abs(lastTarget.current.lat - lat) < 0.00005 &&
      Math.abs(lastTarget.current.lng - lng) < 0.00005
    ) {
      return;
    }

    lastTarget.current = { lat, lng };
    map.panTo([lat, lng], { animate: true, duration: 0.35 });
  }, [lat, lng, map]);

  return null;
}

function ModalMapEvents({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Helper to perform address search using Nominatim with Geoapify fallback/priority
async function searchAddresses(query: string): Promise<Array<{ name: string; detail: string; formatted: string; lat: number; lon: number }>> {
  const q = query.trim();
  if (q.length < 3) return [];

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&filter=countrycode:id&format=json&apiKey=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((r: any) => ({
          name: r.address_line1 || r.name || r.formatted,
          detail: r.address_line2 || r.city || r.formatted,
          formatted: r.formatted,
          lat: r.lat,
          lon: r.lon
        }));
      }
    } catch (e) {
      console.warn("Geoapify search failed, falling back to Nominatim", e);
    }
  }

  // Free OpenStreetMap Nominatim fallback (requires no API key)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=id&limit=6&addressdetails=1`,
      { headers: { "Accept-Language": "id,en" } }
    );
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((r: any) => ({
        name: r.name || r.display_name.split(",")[0],
        detail: r.display_name,
        formatted: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon)
      }));
    }
  } catch (e) {
    console.error("Nominatim search failed", e);
  }

  return [];
}

// Helper to reverse geocode coordinate to human-readable address
async function reverseGeocodeCoord(lat: number, lon: number): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted;
      }
    } catch (e) {
      console.warn("Geoapify reverse failed, falling back to Nominatim", e);
    }
  }

  // Free OpenStreetMap Nominatim fallback (requires no API key)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { headers: { "Accept-Language": "id,en" } }
    );
    const data = await res.json();
    if (data && data.display_name) {
      return data.display_name;
    }
  } catch (e) {
    console.error("Nominatim reverse failed", e);
  }

  return null;
}

// Helper to normalize and ensure time format is strictly HH:mm (2 digits hour and 2 digits minute)
function formatTimeHHmm(timeStr?: string | null, fallback = "08:00"): string {
  if (!timeStr) return fallback;
  const parts = timeStr.trim().split(":");
  if (parts.length >= 2) {
    const h = (parts[0] || "08").padStart(2, "0");
    const m = (parts[1] || "00").padStart(2, "0");
    return `${h}:${m}`;
  }
  return timeStr;
}

export default function KelolaPerusahaanPage() {
  const router = useRouter();
  const { showToast, showConfirm } = useDialog();
  const { refreshMemberships, activeRole, isLoading: isCompanyLoading } = useCompany();

  const [initialData, setInitialData] = useState({ name: "", phone: "", address: "", latitude: -6.9175, longitude: 107.6191 });
  const [companyData, setCompanyData] = useState({ 
    name: "", phone: "", address: "", latitude: -6.9175, longitude: 107.6191, memberCount: 0, join_code: "",
    work_days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    work_start_time: "08:00",
    work_end_time: "17:00",
    category: null as any
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Edit Informasi Perusahaan (Nama & Kontak) State
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: "", phone: "" });

  // Search Address State in Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const skipSearch = React.useRef(false);

  // Auto geocoding address in main card
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const addressDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleAddressChange = (newAddress: string) => {
    setCompanyData(prev => ({ ...prev, address: newAddress }));

    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    if (newAddress.trim().length >= 3) {
      addressDebounceRef.current = setTimeout(async () => {
        setIsGeocodingAddress(true);
        try {
          const results = await searchAddresses(newAddress);
          if (results.length > 0) {
            const top = results[0];
            const newLatStr = top.lat.toFixed(6);
            const newLngStr = top.lon.toFixed(6);
            setLat(newLatStr);
            setLng(newLngStr);
            setCompanyData(prev => ({
              ...prev,
              latitude: top.lat,
              longitude: top.lon
            }));
          }
        } catch (err) {
          console.error("Auto geocoding address failed", err);
        } finally {
          setIsGeocodingAddress(false);
        }
      }, 800);
    }
  };

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://192.168.100.11:3000";
  const qrUrl = `${BASE_URL}/gabung-perusahaan?code=${companyData.join_code}`;

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAddresses(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: any) => {
    skipSearch.current = true;
    setTempLat(result.lat.toFixed(6));
    setTempLng(result.lon.toFixed(6));
    setSearchQuery(result.formatted || result.name || "");
    setSearchResults([]);
  };

  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setTempLat(clickedLat.toFixed(6));
    setTempLng(clickedLng.toFixed(6));
    setIsSearching(true);
    try {
      const addr = await reverseGeocodeCoord(clickedLat, clickedLng);
      if (addr) {
        skipSearch.current = true;
        setSearchQuery(addr);
      }
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isCompanyLoading && activeRole) {
      if (activeRole !== "owner" && activeRole !== "admin") {
        showToast("Akses ditolak: Hanya Admin yang dapat mengelola pengaturan perusahaan.", "error");
        router.replace("/admin/dashboard");
      }
    }
  }, [activeRole, isCompanyLoading, router, showToast]);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }
        const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
        const activeCompanyId = localStorage.getItem("activeCompanyId");
        if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

        const res = await fetch(getApiUrl("/companies/me"), {
          headers
        });
        const data = await res.json();
        
        if (res.status === 401) {
          showToast("Sesi tidak valid. Silakan login kembali.", "error");
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          showToast("Anda belum memiliki perusahaan.", "warning");
          setIsLoading(false);
          return;
        }
        if (data.success) {
          const fetchedWorkDays = Array.isArray(data.data.work_days) && data.data.work_days.length > 0 
            ? data.data.work_days 
            : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
          const fetchedStart = formatTimeHHmm(data.data.work_start_time, "08:00");
          const fetchedEnd = formatTimeHHmm(data.data.work_end_time, "17:00");

          setCompanyData({
            name: data.data.name || "",
            phone: data.data.phone || "",
            address: data.data.address || "",
            latitude: data.data.latitude || -6.9175,
            longitude: data.data.longitude || 107.6191,
            memberCount: data.data.memberCount || 0,
            join_code: data.data.join_code || "",
            work_days: fetchedWorkDays,
            work_start_time: fetchedStart,
            work_end_time: fetchedEnd,
            category: data.data.category || null
          });
          setInitialData({
            name: data.data.name || "",
            phone: data.data.phone || "",
            address: data.data.address || "",
            latitude: data.data.latitude || -6.9175,
            longitude: data.data.longitude || 107.6191,
          });
          setLat((data.data.latitude || -6.9175).toString());
          setLng((data.data.longitude || 107.6191).toString());
          setCompanyImage(data.data.avatar_company_url || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop");
        }
      } catch (error) {
        console.error("Error fetching company", error);
        showToast("Gagal memuat data perusahaan.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompany();
  }, [router, showToast]);

  const handleSimpanPerusahaan = async () => {
    if (isSaving) return;
    if (!companyData.name) {
      showToast("Nama perusahaan tidak boleh kosong", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(getApiUrl("/companies/me"), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ 
          name: companyData.name, 
          address: companyData.address, 
          phone: companyData.phone,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        })
      });
      const data = await res.json();
      if (res.status === 403) {
        showToast("Akses ditolak: Anda bukan Admin perusahaan ini.", "error");
      } else if (!data.success) {
        showToast(data.message || "Gagal menyimpan perubahan.", "error");
      } else {
        setInitialData(prev => ({ 
          ...prev, 
          name: companyData.name, 
          address: companyData.address, 
          phone: companyData.phone,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        }));
        await refreshMemberships().catch(console.error);
      }
    } catch (error) {
      console.error(error);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // State for the modal and data
  const [isUbahLokasiOpen, setIsUbahLokasiOpen] = useState(false);
  const [isModalMapMounted, setIsModalMapMounted] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isUbahLokasiOpen) {
      // Tunggu hingga animasi slide-in bottom sheet selesai (280ms) sebelum me-mount MapContainer.
      // Ini mencegah Leaflet menghitung ukuran viewport selama container sedang bergerak (transform translateY)
      // yang merupakan akar masalah dari glitch peta bergetar.
      timer = setTimeout(() => {
        setIsModalMapMounted(true);
      }, 280);
    } else {
      setIsModalMapMounted(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isUbahLokasiOpen]);
  
  // Image Upload State
  const [companyImage, setCompanyImage] = useState("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingImage) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file maksimal 2 MB", "warning");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Hanya format JPEG, PNG, dan WebP yang diizinkan", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Ganti Foto Perusahaan?",
      message: "Apakah Anda yakin ingin memperbarui foto profil perusahaan ini?",
      confirmText: "Ya, Ganti",
      cancelText: "Batal",
      type: "primary",
      icon: "info"
    });
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploadingImage(true);
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("avatar", file);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`
      };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(getApiUrl("/companies/avatar"), {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setCompanyImage(data.data.avatar_company_url);
        await refreshMemberships().catch(console.error);
      } else {
        showToast(data.message || "Gagal mengupload foto", "error");
      }
    } catch (err) {
      console.error("Upload company photo error:", err);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openEditInfo = () => {
    setInfoForm({
      name: companyData.name || "",
      phone: companyData.phone || ""
    });
    setIsEditInfoOpen(true);
  };

  const handleSaveInfo = async () => {
    if (isSaving) return;
    if (!infoForm.name.trim()) {
      showToast("Nama perusahaan tidak boleh kosong", "warning");
      return;
    }

    const confirmed = await showConfirm({
      title: "Simpan Informasi Perusahaan?",
      message: "Apakah Anda yakin ingin menyimpan perubahan nama dan nomor kontak perusahaan?",
      confirmText: "Ya, Simpan",
      cancelText: "Batal",
      type: "primary",
      icon: "check"
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(getApiUrl("/companies/me"), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ 
          name: infoForm.name.trim(), 
          phone: infoForm.phone.trim(),
          address: companyData.address,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        })
      });
      const data = await res.json();
      if (res.status === 403) {
        showToast("Akses ditolak: Anda bukan Admin perusahaan ini.", "error");
      } else if (!data.success) {
        showToast(data.message || "Gagal menyimpan perubahan.", "error");
      } else {
        setCompanyData(prev => ({ 
          ...prev, 
          name: infoForm.name.trim(), 
          phone: infoForm.phone.trim()
        }));
        setInitialData(prev => ({ 
          ...prev, 
          name: infoForm.name.trim(), 
          phone: infoForm.phone.trim()
        }));
        setIsEditInfoOpen(false);
        await refreshMemberships().catch(console.error);
      }
    } catch (error) {
      console.error(error);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Data state
  const [lat, setLat] = useState("-6.9175");
  const [lng, setLng] = useState("107.6191");

  // Temp state for modal inputs
  const [tempLat, setTempLat] = useState(lat);
  const [tempLng, setTempLng] = useState(lng);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Jadwal State
  const [isKelolaJadwalOpen, setIsKelolaJadwalOpen] = useState(false);
  const [jadwalForm, setJadwalForm] = useState({
    work_days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    work_start_time: "08:00",
    work_end_time: "17:00"
  });

  // Tambah Karyawan State
  const [isTambahKaryawanOpen, setIsTambahKaryawanOpen] = useState(false);

  const handleSaveJadwal = async () => {
    if (isSaving) return;
    const confirmed = await showConfirm({
      title: "Simpan Jam Kerja?",
      message: "Apakah Anda yakin ingin menerapkan hari dan jam operasional baru untuk perusahaan?",
      confirmText: "Ya, Simpan",
      cancelText: "Batal",
      type: "primary",
      icon: "check"
    });
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem("accessToken");
      const cleanStart = formatTimeHHmm(jadwalForm.work_start_time, "08:00");
      const cleanEnd = formatTimeHHmm(jadwalForm.work_end_time, "17:00");
      const requestBody = { 
        work_days: jadwalForm.work_days,
        work_start_time: cleanStart,
        work_end_time: cleanEnd
      };

      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(getApiUrl("/companies/me"), {
        method: "PATCH",
        headers,
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanyData(prev => ({ 
          ...prev, 
          work_days: jadwalForm.work_days,
          work_start_time: cleanStart,
          work_end_time: cleanEnd
        }));
        setIsKelolaJadwalOpen(false);
      } else {
        showToast(data.message || "Gagal menyimpan jadwal.", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetectCurrentLocation = (flyToMap?: (lat: number, lng: number) => void) => {
    if (isDetectingGps) return;

    if (typeof window === "undefined" || !navigator.geolocation) {
      showToast("Geolokasi tidak didukung oleh browser Anda.", "error");
      return;
    }

    setIsDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLatStr = latitude.toFixed(6);
        const newLngStr = longitude.toFixed(6);

        // Update form coordinates
        setTempLat(newLatStr);
        setTempLng(newLngStr);

        // Center map to detected coordinates
        if (flyToMap) {
          flyToMap(latitude, longitude);
        }

        // Reverse geocode to update address in the modal search bar
        setIsSearching(true);
        try {
          const addr = await reverseGeocodeCoord(latitude, longitude);
          if (addr) {
            skipSearch.current = true;
            setSearchQuery(addr);
          }
        } catch (e) {
          console.warn("Reverse geocode GPS coords failed:", e);
        } finally {
          setIsSearching(false);
          setIsDetectingGps(false);
        }
      },
      (error) => {
        setIsDetectingGps(false);
        let msg = "Gagal mendeteksi lokasi GPS.";
        if (error.code === 1 /* PERMISSION_DENIED */) {
          msg = "Izin akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.";
        } else if (error.code === 2 /* POSITION_UNAVAILABLE */) {
          msg = "Informasi lokasi GPS tidak tersedia. Pastikan GPS/layanan lokasi aktif pada perangkat Anda.";
        } else if (error.code === 3 /* TIMEOUT */) {
          msg = "Waktu pencarian lokasi GPS habis. Silakan klik tombol lagi.";
        }
        showToast(msg, "warning");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const openModal = () => {
    setIsDetectingGps(false);
    setTempLat(lat);
    setTempLng(lng);
    skipSearch.current = true;
    setSearchQuery(companyData.address || "");
    setSearchResults([]);
    setIsUbahLokasiOpen(true);
  };

  const handleSimpan = async () => {
    if (isSaving) return;
    const confirmed = await showConfirm({
      title: "Simpan Lokasi Kantor?",
      message: "Apakah Anda yakin ingin memperbarui titik koordinat dan alamat kantor perusahaan ini?",
      confirmText: "Ya, Simpan",
      cancelText: "Batal",
      type: "primary",
      icon: "check"
    });
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem("accessToken");
      const chosenAddress = searchQuery.trim() || companyData.address;
      const parsedLat = parseFloat(tempLat);
      const parsedLng = parseFloat(tempLng);
      const requestBody: any = { 
        latitude: parsedLat,
        longitude: parsedLng,
      };
      if (chosenAddress) {
        requestBody.address = chosenAddress;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(getApiUrl("/companies/me"), {
        method: "PATCH",
        headers,
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLat(tempLat);
        setLng(tempLng);
        setCompanyData(prev => ({ 
          ...prev, 
          latitude: parsedLat, 
          longitude: parsedLng,
          ...(chosenAddress ? { address: chosenAddress } : {})
        }));
        setInitialData(prev => ({ 
          ...prev, 
          latitude: parsedLat, 
          longitude: parsedLng,
          ...(chosenAddress ? { address: chosenAddress } : {})
        }));
        setIsUbahLokasiOpen(false);
      } else {
        showToast(data.message || "Gagal menyimpan lokasi.", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCompanyLoading && activeRole && activeRole !== "owner" && activeRole !== "admin") {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative">
        <TopBar title="Kelola Perusahaan" onBack={() => router.push("/admin/dashboard")} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-1">
            <X className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-[#111827] text-[16px] font-bold">Akses Ditolak</h2>
          <p className="text-gray-500 text-[13px] max-w-xs leading-relaxed">
            Hanya Admin atau Pemilik perusahaan yang memiliki hak akses untuk mengubah profil perusahaan, jam operasional, dan lokasi kantor.
          </p>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="mt-2 px-5 py-2.5 bg-[#356E3B] text-white rounded-full text-[13px] font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative">
      
      {/* Header */}
      <TopBar 
        title="Kelola Perusahaan" 
        onBack={() => router.push("/admin/dashboard")} 
      />

      {isLoading && !companyData.name ? (
        <CompanyProfileSkeleton />
      ) : (
      <>
      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 pb-24">
        
        {/* Profile Header */}
        <div className="flex items-center gap-5 pt-1 pb-2">
          <div className="relative">
            <div 
              className="w-[84px] h-[84px] rounded-full overflow-hidden border-[3px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm bg-gray-100 cursor-pointer active:scale-95 transition-transform"
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
            >
              <img src={companyImage} alt="Company" className="w-full h-full object-cover" />
            </div>
            <div 
              className="absolute bottom-0 right-0 w-[26px] h-[26px] bg-[#1E4738] rounded-full border-[3px] border-white flex items-center justify-center cursor-pointer hover:bg-[#153428] transition-colors"
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
            
            {/* Loading Overlay */}
            {isUploadingImage && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#356E3B]/20 border-t-[#356E3B] rounded-full animate-spin" />
              </div>
            )}

            <input 
              type="file" 
              accept="image/*"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>
          
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h1 className="text-[#111827] text-[20px] font-bold leading-tight truncate">
              {companyData.name || "Perusahaan"}
            </h1>
            <div className="flex items-center gap-1.5 text-[#356E3B]">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[13px] font-semibold">{companyData.memberCount} Anggota Terdaftar</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">
                {companyData.category?.name || "Organisasi / Perusahaan"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Group 1: Informasi Perusahaan */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[#111827] text-[15px] font-bold">Informasi Perusahaan</h2>
            </div>
            <button
              type="button"
              onClick={openEditInfo}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E4738] bg-[#E8F3EB] hover:bg-[#D5E8DA] px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Ubah</span>
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#F3F4F6]">
            {/* Nama Perusahaan */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Building2 className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Nama Perusahaan</span>
                  <span className="text-[#111827] text-[14px] font-bold">{companyData.name}</span>
                </div>
              </div>
            </div>

            {/* Kontak Perusahaan */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Phone className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Kontak / WhatsApp Resmi</span>
                  <span className="text-[#111827] text-[14px] font-bold">
                    {companyData.phone || <span className="text-gray-400 font-normal italic">Belum diatur</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Kode Undangan */}
            <div 
              onClick={() => setIsTambahKaryawanOpen(true)}
              className="p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <QrCode className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Kode Undangan & QR</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#111827] text-[14px] font-bold font-mono tracking-wider">
                      {companyData.join_code || "------"}
                    </span>
                    <span className="text-[10.5px] bg-[#E8F3EB] text-[#2D5A3F] font-bold px-2.5 py-0.5 rounded-full">
                      Lihat QR
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Card Group 2: Lokasi Perusahaan */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[#111827] text-[15px] font-bold">Lokasi Perusahaan</h2>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E4738] bg-[#E8F3EB] hover:bg-[#D5E8DA] px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Ubah</span>
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#F3F4F6]">
            {/* Koordinat */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Target className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Koordinat Titik Absen (Lat/Long)</span>
                  <span className="text-[#111827] text-[13.5px] font-mono font-bold">{lat}, {lng}</span>
                </div>
              </div>
            </div>

            {/* Alamat Lengkap */}
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 flex justify-center pt-0.5">
                <MapPin className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Alamat Lengkap</span>
                <span className="text-[#111827] text-[13.5px] font-medium leading-relaxed">
                  {companyData.address || <span className="text-gray-400 italic">Belum ada alamat kantor</span>}
                </span>
              </div>
            </div>

            {/* Peta Interaktif Preview & Link */}
            <div className="p-5 flex flex-col gap-3">
              <div className="relative w-full h-[180px] bg-[#f4f6f5] rounded-[16px] overflow-hidden border border-gray-200 shadow-inner z-0">
                {isMounted && (
                  <MapContainer
                    key="admin-company-preview-map"
                    center={[parseFloat(lat) || -6.9175, parseFloat(lng) || 107.6191]}
                    zoom={16}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    attributionControl={false}
                    className="w-full h-full"
                    style={{ width: "100%", height: "100%", zIndex: 0 }}
                  >
                    <MapResizer />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[parseFloat(lat) || -6.9175, parseFloat(lng) || 107.6191]} 
                      icon={getCustomIcon(companyData.name || "Perusahaan")} 
                    />
                    <MapControls 
                      targetLat={parseFloat(lat) || -6.9175} 
                      targetLng={parseFloat(lng) || 107.6191} 
                    />
                    <MapUpdater lat={parseFloat(lat) || -6.9175} lng={parseFloat(lng) || 107.6191} />
                  </MapContainer>
                )}
              </div>

              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#f8fafc] hover:bg-gray-100 text-[#4B5563] border border-gray-200 rounded-[14px] text-[12px] font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                <span>Buka di Google Maps</span>
              </a>
            </div>
          </div>
        </div>

        {/* Card Group 3: Jam & Hari Kerja */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
              </div>
              <h2 className="text-[#111827] text-[15px] font-bold">Jam Kerja</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setJadwalForm({
                  work_days: companyData.work_days,
                  work_start_time: formatTimeHHmm(companyData.work_start_time, "08:00"),
                  work_end_time: formatTimeHHmm(companyData.work_end_time, "17:00")
                });
                setIsKelolaJadwalOpen(true);
              }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E4738] bg-[#E8F3EB] hover:bg-[#D5E8DA] px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Kelola</span>
            </button>
          </div>

          <div className="flex flex-col divide-y divide-[#F3F4F6]">
            {/* Hari Kerja */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Calendar className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Hari Operasional</span>
                  <span className="text-[#111827] text-[14px] font-bold">
                    {companyData.work_days.length > 0 ? (companyData.work_days.length === 7 ? "Setiap Hari" : companyData.work_days.join(", ")) : "Belum diatur"}
                  </span>
                </div>
              </div>
            </div>

            {/* Jam Masuk & Pulang */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Clock className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Jam Masuk & Pulang</span>
                  <span className="text-[#111827] text-[14px] font-bold">
                    {formatTimeHHmm(companyData.work_start_time, "08:00")} - {formatTimeHHmm(companyData.work_end_time, "17:00")} WIB
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Ubah Informasi Perusahaan */}
      {isEditInfoOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => !isSaving && setIsEditInfoOpen(false)}
          />
          <div className="relative bg-white w-full sm:max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Ubah Informasi Perusahaan</h2>
              </div>
              <button 
                onClick={() => setIsEditInfoOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#111827]">Nama Perusahaan</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={infoForm.name}
                    onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                    className="text-[#111827] text-[14px] font-medium bg-[#fbfdfc] border border-gray-200 focus:border-[#356E3B] rounded-[14px] pl-10 pr-3.5 py-3 outline-none w-full transition-colors"
                    placeholder="Nama Perusahaan"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#111827]">Nomor Telepon / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="tel"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                    className="text-[#111827] text-[14px] font-medium bg-[#fbfdfc] border border-gray-200 focus:border-[#356E3B] rounded-[14px] pl-10 pr-3.5 py-3 outline-none w-full transition-colors"
                    placeholder="Contoh: 08123456789 atau (021) 555-1234"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveInfo}
                  disabled={isSaving}
                  className={`w-full font-bold text-[14px] py-3.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer ${
                    isSaving
                      ? "bg-gray-400 text-white cursor-wait pointer-events-none shadow-none"
                      : "bg-[#356E3B] hover:bg-[#2b5930] text-white"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Overlay */}
      {isUbahLokasiOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsUbahLokasiOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full sm:max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Ubah Lokasi</h2>
              </div>
              <button 
                onClick={() => setIsUbahLokasiOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5">
              
              {/* Search Field */}
              <div className="flex flex-col gap-2 relative">
                <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 bg-[#fbfdfc] focus-within:border-[#356E3B] focus-within:shadow-[0_2px_8px_rgba(53,110,59,0.08)] transition-all">
                  <MapPin className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari alamat atau tempat..."
                    className="flex-1 text-[14px] text-[#1E4738] placeholder-gray-400 outline-none bg-transparent font-medium"
                  />
                  {isSearching && (
                    <div className="animate-spin w-4 h-4 border-2 border-[#356E3B] border-t-transparent rounded-full ml-2 shrink-0"></div>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] z-50 max-h-[220px] overflow-y-auto">
                    {searchResults.map((res, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleSelectResult(res)}
                        className="px-5 py-3 hover:bg-[#f4f9f6] cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <p className="text-[13px] font-bold text-[#1E4738] truncate">{res.address_line1 || res.name || res.formatted}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{res.address_line2 || res.formatted}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Map */}
              <div className="relative w-full h-[220px] bg-[#f4f6f5] rounded-[24px] overflow-hidden border border-gray-100 flex-shrink-0 z-0">
                {(!isMounted || !isModalMapMounted) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#f4f6f5] text-gray-400 gap-2 select-none">
                    <Loader2 className="w-6 h-6 animate-spin text-[#356E3B]" />
                    <span className="text-[12px] font-semibold text-gray-500">Menyiapkan peta...</span>
                  </div>
                ) : (
                  <MapContainer 
                    center={[parseFloat(tempLat) || -6.9175, parseFloat(tempLng) || 107.6191]} 
                    zoom={16} 
                    scrollWheelZoom={true} 
                    style={{ width: "100%", height: "100%", zIndex: 0 }}
                    zoomControl={false}
                  >
                    <MapResizer />
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[parseFloat(tempLat) || -6.9175, parseFloat(tempLng) || 107.6191]} 
                      draggable={true}
                      eventHandlers={{
                        dragend: async (e) => {
                          const marker = e.target;
                          const position = marker.getLatLng();
                          setTempLat(position.lat.toFixed(6));
                          setTempLng(position.lng.toFixed(6));
                          setIsSearching(true);
                          try {
                            const addr = await reverseGeocodeCoord(position.lat, position.lng);
                            if (addr) {
                              skipSearch.current = true;
                              setSearchQuery(addr);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSearching(false);
                          }
                        }
                      }}
                      icon={getCustomIcon(companyData.name || "Perusahaan")}
                    />
                    <MapControls 
                      targetLat={parseFloat(tempLat) || -6.9175} 
                      targetLng={parseFloat(tempLng) || 107.6191} 
                      onLocate={handleDetectCurrentLocation}
                      isLocating={isDetectingGps}
                    />
                    <ModalMapEvents onLocationSelected={handleMapClick} />
                    <MapUpdater lat={parseFloat(tempLat) || -6.9175} lng={parseFloat(tempLng) || 107.6191} />
                  </MapContainer>
                )}
              </div>

              {/* Coordinates Inputs */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[#1E4738]">
                  <MapPin className="w-4 h-4" strokeWidth={2} />
                  <label className="text-[13px] font-bold">
                    Latitude & Longitude <span className="text-gray-400 font-normal">(Otomatis)</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={tempLat}
                    onChange={(e) => setTempLat(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-[#1E4738] font-medium outline-none focus:border-[#356E3B] transition-colors"
                  />
                  <input 
                    type="text" 
                    value={tempLng}
                    onChange={(e) => setTempLng(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-[#1E4738] font-medium outline-none focus:border-[#356E3B] transition-colors"
                  />
                </div>
              </div>

              {/* Save Button */}
              <PrimaryButton 
                onClick={handleSimpan}
                disabled={isSaving}
                isLoading={isSaving}
                loadingText="Menyimpan..."
                icon={<Save className="w-4 h-4" strokeWidth={2} />}
                className="w-full mt-2"
              >
                Simpan Lokasi
              </PrimaryButton>

            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Jadwal Jam Kerja */}
      {isKelolaJadwalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => !isSaving && setIsKelolaJadwalOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full sm:max-w-md mx-auto rounded-t-[32px] flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-start px-6 pt-4 pb-2">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-[#1E4738] text-[17px] font-bold leading-none mt-1">Kelola Jam Operasional</h2>
                  <p className="text-[#7d998c] text-[12px] leading-[1.4] pr-4">
                    Tentukan hari dan jam operasional perusahaan.
                  </p>
                </div>
              </div>
              <button 
                disabled={isSaving}
                onClick={() => setIsKelolaJadwalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-5 mt-2">
              
              <div className="flex flex-col gap-4">
                {/* Hari Kerja */}
                <div className="flex flex-col gap-2">
                  <label className="text-[#1E4738] text-[12px] font-bold">Hari Kerja</label>
                  <div className="flex flex-wrap gap-2">
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((hari) => {
                      const isSelected = jadwalForm.work_days.includes(hari);
                      return (
                        <button
                          key={hari}
                          onClick={() => {
                            if (isSelected) {
                              setJadwalForm(prev => ({ ...prev, work_days: prev.work_days.filter(d => d !== hari) }));
                            } else {
                              setJadwalForm(prev => ({ ...prev, work_days: [...prev.work_days, hari] }));
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${
                            isSelected ? "bg-[#356E3B] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {hari}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Jam Mulai */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">Jam Mulai</label>
                  <div className="relative">
                    <CustomTimePicker
                      value={jadwalForm.work_start_time}
                      onChange={(val) => setJadwalForm({ ...jadwalForm, work_start_time: val })}
                      placeholder="08:00"
                    />
                  </div>
                </div>

                {/* Jam Selesai */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#1E4738] text-[12px] font-bold">Jam Selesai</label>
                  <div className="relative">
                    <CustomTimePicker
                      value={jadwalForm.work_end_time}
                      onChange={(val) => setJadwalForm({ ...jadwalForm, work_end_time: val })}
                      placeholder="17:00"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <PrimaryButton 
                onClick={handleSaveJadwal}
                disabled={isSaving || jadwalForm.work_days.length === 0}
                isLoading={isSaving}
                loadingText="Menyimpan..."
                icon={<Save className="w-4 h-4" strokeWidth={2} />}
                className="w-full mt-2"
              >
                Simpan Perubahan
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}


      {/* Modal Tambah Karyawan (QR/Kode) */}
      {isTambahKaryawanOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsTambahKaryawanOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full sm:max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Drag handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#e6f0ea] rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#356E3B]" strokeWidth={2} />
                </div>
                <h2 className="text-[#1E4738] text-[17px] font-bold">Tambah Karyawan</h2>
              </div>
              <button 
                onClick={() => setIsTambahKaryawanOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col items-center">
              
              <p className="text-gray-500 text-[13px] text-center max-w-[280px] leading-relaxed mb-6 mt-2">
                Bagikan kode QR ini kepada karyawan untuk bergabung ke perusahaan Anda secara instan.
              </p>

              {/* QR Code Container & Join Code */}
              <div className="w-full max-w-[320px]">
                <CompanyQRCodeCard
                  qrUrl={qrUrl}
                  joinCode={companyData.join_code}
                  companyName={companyData.name}
                  size={190}
                  showJoinCodeBox={true}
                  instructionText="Arahkan kamera ke kode QR untuk bergabung instan"
                />
              </div>

            </div>
          </div>
        </div>
      )}

      </>
      )}

    </div>
  );
}
