"use client";

import { ChevronLeft, Building2, Pencil, Clock, ChevronRight, MapPin, X, Save, Target, Calendar, UserPlus, QrCode, AlignLeft, Send, Copy, Camera, Users, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomTimePicker } from "@/components/CustomTimePicker";
import { QRCodeSVG } from "qrcode.react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const getCustomIcon = (label: string) => new L.DivIcon({
  className: "custom-leaflet-icon",
  html: `
    <div class="flex flex-col items-center">
      <div class="w-[52px] h-[52px] bg-[#356E3B] rounded-[20px] rounded-bl-[6px] rotate-45 flex items-center justify-center shadow-lg border-[3px] border-white relative z-20">
        <div class="w-5 h-5 bg-white rounded-full -rotate-45"></div>
      </div>
      <div class="bg-[#2c3e35] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md mt-1 absolute top-[55px] whitespace-nowrap z-20">
        ${label}
      </div>
    </div>
  `,
  iconSize: [52, 80],
  iconAnchor: [26, 48],
});

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export default function KelolaPerusahaanPage() {
  const router = useRouter();

  const [initialData, setInitialData] = useState({ name: "", address: "", latitude: -6.9175, longitude: 107.6191 });
  const [companyData, setCompanyData] = useState({ 
    name: "", address: "", latitude: -6.9175, longitude: 107.6191, memberCount: 0, join_code: "",
    work_days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    work_start_time: "08:00",
    work_end_time: "17:00"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Search Address State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const skipSearch = React.useRef(false);

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://192.168.100.11:3000";
  const qrUrl = `${BASE_URL}/gabung-perusahaan?code=${companyData.join_code}`;

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
      if (!apiKey) {
        alert("API key Geoapify belum dikonfigurasi pada NEXT_PUBLIC_GEOAPIFY_API_KEY");
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(searchQuery)}&filter=countrycode:id&format=json&apiKey=${apiKey}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: any) => {
    skipSearch.current = true;
    setTempLat(result.lat.toString());
    setTempLng(result.lon.toString());
    setSearchQuery(result.formatted || "");
    setSearchResults([]);
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
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.status === 401) {
          alert("Sesi tidak valid. Silakan login kembali.");
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          alert("Anda belum memiliki perusahaan.");
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
        alert("Gagal memuat data perusahaan.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompany();
  }, [router]);

  const handleSimpanPerusahaan = async () => {
    if (!companyData.name) {
      alert("Nama perusahaan tidak boleh kosong");
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name: companyData.name, address: companyData.address })
      });
      const data = await res.json();
      if (res.status === 403) {
        alert("Akses ditolak: Anda bukan Admin perusahaan ini.");
      } else if (!data.success) {
        alert(data.message || "Gagal menyimpan perubahan.");
      } else {
        alert("Data perusahaan berhasil diperbarui.");
        setInitialData(prev => ({ ...prev, name: companyData.name, address: companyData.address }));
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan.");
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
      alert("Ukuran file maksimal 2 MB");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Hanya format JPEG, PNG, dan WebP yang diizinkan");
      return;
    }

    setIsUploadingImage(true);
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        setCompanyImage(data.data.avatar_company_url);
      } else {
        alert(data.message || "Gagal mengupload foto");
      }
    } catch (err) {
      console.error("Upload company photo error:", err);
      alert("Terjadi kesalahan jaringan.");
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
  const [radius, setRadius] = useState(100);

  // Temp state for modal inputs
  const [tempLat, setTempLat] = useState(lat);
  const [tempLng, setTempLng] = useState(lng);
  const [tempRadius, setTempRadius] = useState(radius);

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

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
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
        alert("Jadwal operasional berhasil diperbarui!");
      } else {
        alert(data.message || "Gagal menyimpan jadwal.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    setTempLat(lat);
    setTempLng(lng);
    setTempRadius(radius);
    setIsUbahLokasiOpen(true);
  };

  const handleSimpan = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem("accessToken");
      const requestBody = { 
        latitude: parseFloat(tempLat),
        longitude: parseFloat(tempLng),
        ...(searchQuery ? { address: searchQuery } : {})
      };

      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/companies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLat(tempLat);
        setLng(tempLng);
        setRadius(tempRadius);
        setCompanyData(prev => ({ 
          ...prev, 
          latitude: parseFloat(tempLat), 
          longitude: parseFloat(tempLng),
          ...(searchQuery ? { address: searchQuery } : {})
        }));
        setInitialData(prev => ({ 
          ...prev, 
          latitude: parseFloat(tempLat), 
          longitude: parseFloat(tempLng),
          ...(searchQuery ? { address: searchQuery } : {})
        }));
        setIsUbahLokasiOpen(false);
        alert("Lokasi berhasil diperbarui!");
      } else {
        alert(data.message || "Gagal menyimpan lokasi.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#fbfdfc] relative">
      
      {/* Header */}
      <TopBar title="Kelola Perusahaan" />

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
            <div className="w-[84px] h-[84px] rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100">
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

        {/* Lokasi Perusahaan Card */}
        <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#eef5f0] flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#e6f0ea] rounded-full flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#356E3B]" strokeWidth={1.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Lokasi Perusahaan</h2>
          </div>

          <div className="bg-[#f4f6f5] rounded-[12px] p-3 flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#7d998c]" />
            <span className="text-[#7d998c] text-[12px] font-mono">Lat/Long: <span className="font-bold text-[#111827]">{lat}, {lng}</span></span>
          </div>

          <textarea
            value={companyData.address}
            onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
            className="text-[#4B5563] text-[13px] leading-relaxed mb-4 w-full bg-transparent border-b border-transparent focus:border-[#356E3B] outline-none resize-none min-h-[60px]"
            placeholder="Alamat Perusahaan"
          />

          {/* Mock Map */}
          <div className="relative w-full h-[120px] bg-[#eef5f0] rounded-[16px] overflow-hidden mb-4 border border-[#dce9df]">
            {/* SVG Roads / Paths */}
            <svg className="absolute inset-0 w-full h-full text-[#cce0d4]" preserveAspectRatio="none" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg">
              <path d="M-20,70 Q100,40 180,90 T320,60" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
              <path d="M220,-20 Q240,60 200,160" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
              <path d="M100,-20 Q120,60 80,160" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
            </svg>
            {/* Center Radius */}
            <div className="absolute top-[55%] left-[55%] -translate-x-1/2 -translate-y-1/2 bg-[#356E3B]/15 rounded-full border border-[#356E3B]/30 flex items-center justify-center transition-all duration-300" style={{ width: `80px`, height: `80px` }}>
              {/* Pin */}
              <div className="w-[14px] h-[14px] bg-[#1E4738] rounded-full border-2 border-white shadow-sm ring-4 ring-[#1E4738]/20 relative">
                <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-1 h-2 bg-[#1E4738]/40 blur-sm rounded-full"></div>
              </div>
            </div>
          </div>

          <button 
            onClick={openModal}
            className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-semibold text-[13px] py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-sm"
          >
            <Pencil className="w-4 h-4" strokeWidth={2} />
            Ubah Lokasi
          </button>
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
                  alert("Kode berhasil disalin!");
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
                    <Circle 
                      center={[parseFloat(tempLat) || -6.9175, parseFloat(tempLng) || 107.6191]}
                      radius={tempRadius}
                      pathOptions={{ color: '#1E4738', fillColor: '#1E4738', fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }}
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
                          
                          const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
                          if (apiKey) {
                            try {
                              const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${position.lat}&lon=${position.lng}&format=json&apiKey=${apiKey}`);
                              const data = await res.json();
                              if (data.results && data.results.length > 0) {
                                skipSearch.current = true;
                                setSearchQuery(data.results[0].formatted);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }
                      }}
                      icon={getCustomIcon(companyData.name || "Perusahaan")}
                    />
                    <MapUpdater lat={parseFloat(tempLat) || -6.9175} lng={parseFloat(tempLng) || 107.6191} />
                  </MapContainer>
                )}

                {/* Badge Bottom Right */}
                <div className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border-[3px] border-[#356E3B] z-10">
                  <span className="text-[10px] font-bold text-[#1E4738]">{tempRadius}m</span>
                </div>
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

              {/* Radius Input */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[#1E4738]">
                  <Target className="w-4 h-4" strokeWidth={2} />
                  <label className="text-[13px] font-bold">Radius Lokasi</label>
                </div>
                <div className="text-[14px] font-bold text-[#1E4738] mt-1 pl-6 border-l-2 border-[#356E3B]/30 ml-2">
                  {tempRadius} meter
                </div>
                
                {/* Custom Slider */}
                <div className="flex items-center gap-4 mt-4">
                  <input
                    type="range"
                    min="10"
                    max="500"
                    value={tempRadius}
                    onChange={(e) => setTempRadius(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#356E3B]"
                    style={{
                      background: `linear-gradient(to right, #356E3B 0%, #356E3B ${(tempRadius - 10) / 490 * 100}%, #e5e7eb ${(tempRadius - 10) / 490 * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-[12px] font-medium text-gray-400 w-8">{tempRadius}m</span>
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={handleSimpan}
                disabled={isSaving}
                className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.2)] disabled:opacity-50"
              >
                <Save className="w-4 h-4" strokeWidth={2} />
                {isSaving ? "Menyimpan..." : "Simpan Lokasi"}
              </button>

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
              <button 
                onClick={handleSaveJadwal}
                disabled={isSaving || jadwalForm.work_days.length === 0}
                className="w-full bg-[#356E3B] hover:bg-[#2b5930] text-white font-bold text-[14px] py-4 rounded-xl flex items-center justify-center gap-2 mt-2 transition-transform active:scale-[0.98] shadow-[0_4px_12px_rgba(53,110,59,0.2)] disabled:opacity-50 disabled:active:scale-100"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" strokeWidth={2} />
                    Simpan Perubahan
                  </>
                )}
              </button>
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
                    alert("Kode berhasil disalin!");
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
