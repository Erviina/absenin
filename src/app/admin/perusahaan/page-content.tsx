"use client";

import { ChevronLeft, Building2, Pencil, Clock, ChevronRight, MapPin, X, Save, Target, Calendar, UserPlus, QrCode, AlignLeft, Send, Copy, Camera, Users, Trash2, Phone, ExternalLink, Plus, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomTimePicker } from "@/components/CustomTimePicker";
import { QRCodeSVG } from "qrcode.react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDialog } from "@/context/DialogContext";
import { useCompany } from "@/context/CompanyContext";

const getCustomIcon = (label: string) => new L.DivIcon({
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
      ${label ? `
        <div class="bg-[#1E4738] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap z-20 pointer-events-none">
          ${label}
        </div>
      ` : ""}
    </div>
  `,
  iconSize: [120, 75],
  iconAnchor: [60, 43],
});

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
    const targetZoom = Math.max(map.getZoom(), 16);
    map.flyTo([targetLat, targetLng], targetZoom, {
      animate: true,
      duration: 0.8,
    });
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

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 1.5 });
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

export default function KelolaPerusahaanPage() {
  const router = useRouter();
  const { showToast } = useDialog();
  const { refreshMemberships } = useCompany();

  const [initialData, setInitialData] = useState({ name: "", phone: "", address: "", latitude: -6.9175, longitude: 107.6191 });
  const [companyData, setCompanyData] = useState({ 
    name: "", phone: "", address: "", latitude: -6.9175, longitude: 107.6191, memberCount: 0, join_code: "",
    work_days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    work_start_time: "08:00",
    work_end_time: "17:00"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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

        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
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
          const fetchedStart = data.data.work_start_time || "08:00";
          const fetchedEnd = data.data.work_end_time || "17:00";

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
            work_end_time: fetchedEnd
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

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
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
        showToast("Data perusahaan berhasil diperbarui.", "success");
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
  
  // Image Upload State
  const [companyImage, setCompanyImage] = useState("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/avatar", {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setCompanyImage(data.data.avatar_company_url);
        await refreshMemberships().catch(console.error);
        showToast("Foto profil perusahaan berhasil diperbarui!", "success");
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
  
  // Data state
  const [lat, setLat] = useState("-6.9175");
  const [lng, setLng] = useState("107.6191");

  // Temp state for modal inputs
  const [tempLat, setTempLat] = useState(lat);
  const [tempLng, setTempLng] = useState(lng);

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
    try {
      setIsSaving(true);
      const token = localStorage.getItem("accessToken");
      const requestBody = { 
        work_days: jadwalForm.work_days,
        work_start_time: jadwalForm.work_start_time,
        work_end_time: jadwalForm.work_end_time
      };

      const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) headers["x-company-id"] = activeCompanyId;

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        method: "PATCH",
        headers,
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanyData(prev => ({ 
          ...prev, 
          work_days: jadwalForm.work_days,
          work_start_time: jadwalForm.work_start_time,
          work_end_time: jadwalForm.work_end_time
        }));
        setIsKelolaJadwalOpen(false);
        showToast("Jadwal operasional berhasil diperbarui!", "success");
      } else {
        showToast(data.message || "Gagal menyimpan jadwal.", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setTempLat(lat);
    setTempLng(lng);
    skipSearch.current = true;
    setSearchQuery(companyData.address || "");
    setSearchResults([]);
    setIsUbahLokasiOpen(true);
  };

  const handleSimpan = async () => {
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

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
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
        showToast("Lokasi dan alamat berhasil diperbarui!", "success");
      } else {
        showToast(data.message || "Gagal menyimpan lokasi.", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative">
      
      {/* Header */}
      <TopBar 
        title="Kelola Perusahaan" 
        onBack={() => router.push("/admin/dashboard")} 
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#356E3B] border-t-transparent rounded-full"></div>
        </div>
      ) : (
      <>
      {/* Main Content */}
      <div className="flex-1 px-5 py-5 flex flex-col gap-4 z-10 pb-24">
        
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="relative cursor-pointer active:scale-95 transition-transform" onClick={() => !isUploadingImage && fileInputRef.current?.click()}>
            <div className="w-[84px] h-[84px] rounded-full overflow-hidden border-[3px] border-[#356E3B]/20 ring-2 ring-[#356E3B]/10 shadow-sm bg-gray-100">
              <img src={companyImage} alt="Company" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-[#1E4738] rounded-full border-[3px] border-white flex items-center justify-center">
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
          <div className="flex flex-col gap-0.5 flex-1">
            <input 
              type="text"
              value={companyData.name}
              onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
              className="text-[#111827] text-[17px] font-bold leading-tight bg-transparent border-b border-transparent focus:border-[#356E3B] outline-none w-full"
              placeholder="Nama Perusahaan"
            />
            <div className="flex items-center gap-1.5 text-[#356E3B] mt-1">
              <Users className="w-4 h-4" />
              <span className="text-[12px] font-bold">{companyData.memberCount} Anggota</span>
            </div>
          </div>
        </div>

        {/* Kontak Perusahaan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[#111827] text-[15px] font-bold">Kontak Perusahaan</h2>
              <p className="text-gray-400 text-[11px]">Nomor telepon atau WhatsApp resmi</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="tel"
                value={companyData.phone || ""}
                onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                className="text-[#111827] text-[14px] font-medium bg-[#fbfdfc] border border-gray-200 focus:border-[#356E3B] rounded-[14px] pl-10 pr-3.5 py-3 outline-none w-full transition-colors"
                placeholder="Contoh: 08123456789 atau (021) 555-1234"
              />
            </div>
          </div>
        </div>

        {/* Lokasi Perusahaan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Lokasi Perusahaan</h2>
          </div>

          <div className="bg-[#f4f6f5] rounded-[12px] p-3 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#7d998c]" />
              <span className="text-[#7d998c] text-[12px] font-mono">Lat/Long: <span className="font-bold text-[#111827]">{lat}, {lng}</span></span>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Alamat Perusahaan
              </label>
              {isGeocodingAddress && (
                <span className="text-[11px] text-[#356E3B] flex items-center gap-1 font-medium animate-pulse">
                  <div className="w-2.5 h-2.5 border-2 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
                  Menyesuaikan lokasi di peta...
                </span>
              )}
            </div>
            <textarea
              value={companyData.address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="text-[#111827] text-[13px] font-medium leading-relaxed w-full bg-[#fbfdfc] border border-gray-200 focus:border-[#356E3B] rounded-[14px] p-3 outline-none resize-none min-h-[54px] transition-colors"
              placeholder="Ketik alamat atau nama kota perusahaan..."
            />
          </div>

          {/* Real Leaflet Map Preview */}
          <div className="relative w-full h-[190px] bg-[#f4f6f5] rounded-[16px] overflow-hidden mb-4 border border-gray-200 shadow-inner z-0">
            {isMounted && (
              <MapContainer
                key={`admin-company-map-${lat}-${lng}`}
                center={[parseFloat(lat) || -6.9175, parseFloat(lng) || 107.6191]}
                zoom={16}
                scrollWheelZoom={false}
                zoomControl={false}
                attributionControl={false}
                className="w-full h-full"
                style={{ width: "100%", height: "100%", zIndex: 0 }}
              >
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

          <div className="flex flex-col gap-2.5">
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#f8fafc] hover:bg-gray-100 text-[#4B5563] border border-gray-200 rounded-[14px] text-[12px] font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              <span>Buka di Google Maps</span>
            </a>

            <button 
              onClick={openModal}
              className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-sm"
            >
              <Pencil className="w-4 h-4" strokeWidth={2} />
              Ubah Lokasi
            </button>
          </div>
        </div>

        {/* Jam Kerja Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[#111827] text-[15px] font-bold">Jam Kerja</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </div>

          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-1.5 text-[#7d998c]">
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-[12px] font-semibold">Jam Operasional</span>
            </div>
            
            <div className="flex flex-col gap-2.5 ml-5">
              <div className="flex justify-between items-center text-[13px] text-[#111827] font-bold gap-4">
                <span className="leading-tight flex-1">
                  {companyData.work_days.length > 0 ? (companyData.work_days.length === 7 ? "Setiap Hari" : companyData.work_days.join(", ")) : "Belum diatur"}
                </span>
                <span className="shrink-0 whitespace-nowrap">{companyData.work_start_time} - {companyData.work_end_time}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              setJadwalForm({
                work_days: companyData.work_days,
                work_start_time: companyData.work_start_time,
                work_end_time: companyData.work_end_time
              });
              setIsKelolaJadwalOpen(true);
            }}
            className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-sm"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
            Kelola
          </button>
        </div>

        {/* Kode Perusahaan Card */}
        <div 
          onClick={() => setIsTambahKaryawanOpen(true)}
          className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex items-center gap-4 cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <div className="w-[84px] h-[84px] bg-[#f4f6f5] rounded-[16px] flex items-center justify-center shrink-0 border border-gray-100">
             {companyData.join_code ? (
               <QRCodeSVG value={qrUrl} size={48} />
             ) : (
               <QrCode className="w-14 h-14 text-[#111827]" />
             )}
          </div>
          <div className="flex flex-col justify-center flex-1">
            <span className="text-[#7d998c] text-[11px] font-medium mb-1">Kode Perusahaan</span>
            <div className="flex items-center justify-between">
              <span className="text-[#111827] text-[20px] font-bold tracking-wider">{companyData.join_code || "------"}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(companyData.join_code);
                  showToast("Kode berhasil disalin!", "success");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#356E3B] transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Overlay */}
      {isUbahLokasiOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsUbahLokasiOpen(false)}
          />
          
          {/* Bottom Sheet */}
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
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
                {isMounted && (
                  <MapContainer 
                    center={[parseFloat(tempLat) || -6.9175, parseFloat(tempLng) || 107.6191]} 
                    zoom={16} 
                    scrollWheelZoom={true} 
                    style={{ width: "100%", height: "100%", zIndex: 0 }}
                    zoomControl={false}
                  >
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
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col max-h-[90dvh] animate-in slide-in-from-bottom-full duration-300">
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
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-300">
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

              {/* QR Code Container */}
              <div className="bg-[#f7fbf8] border border-[#eef5f0] w-full max-w-[280px] rounded-[24px] flex flex-col items-center py-8 mb-8 shadow-[0_2px_16px_rgba(0,0,0,0.02)]">
                <div className="w-[180px] h-[180px] bg-white rounded-[16px] shadow-sm flex items-center justify-center mb-6">
                  {companyData.join_code ? (
                    <QRCodeSVG value={qrUrl} size={140} />
                  ) : (
                    <QrCode className="w-24 h-24 text-[#356E3B]" strokeWidth={1} />
                  )}
                </div>
                <div className="bg-[#e6f0ea] px-4 py-1.5 rounded-full">
                  <span className="text-[#356E3B] text-[11px] font-bold tracking-wide">{companyData.name}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 w-full mb-6">
                <div className="h-[1px] bg-gray-100 flex-1"></div>
                <span className="text-gray-400 text-[11px] font-medium">atau via kode</span>
                <div className="h-[1px] bg-gray-100 flex-1"></div>
              </div>

              {/* Input Salin Kode */}
              <div className="w-full flex items-center justify-between border border-gray-200 rounded-[12px] p-2 bg-white transition-colors focus-within:border-[#356E3B]">
                <span className="text-gray-400 font-mono text-[14px] pl-3 tracking-widest">
                  {companyData.join_code || "------"}
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(companyData.join_code);
                    showToast("Kode berhasil disalin!", "success");
                  }}
                  className="bg-[#356E3B] hover:bg-[#2b5930] text-white text-[12px] font-bold px-5 py-2.5 rounded-[8px] transition-colors active:scale-95"
                >
                  Salin
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      </>
      )}

      {/* Floating Save Button */}
      {!isLoading && (companyData.name !== initialData.name || companyData.address !== initialData.address) && (
        <div className="fixed bottom-6 left-0 right-0 px-5 z-40 animate-in slide-in-from-bottom-5">
          <button 
            onClick={handleSimpanPerusahaan}
            disabled={isSaving}
            className="w-full max-w-md mx-auto bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[15px] py-4 rounded-[20px] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(53,110,59,0.3)] transition-all active:scale-[0.98]"
          >
            {isSaving ? "Menyimpan..." : (
              <>
                <Save className="w-5 h-5" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
