"use client";

import { TopBar } from "@/components/TopBar";
import { 
  User, 
  Building2, 
  Camera, 
  Mail, 
  Phone, 
  Lock, 
  LogOut, 
  LogIn, 
  ChevronRight 
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fbfdfc] pb-8">
      <TopBar title="Profil" onBack={() => router.back()} />

      <div className="px-6 pt-6 flex flex-col gap-6">
        
        {/* Profile Header section */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-[84px] h-[84px] bg-[#C1DFCD] rounded-full flex items-center justify-center">
              {/* Avatar placeholder if needed */}
            </div>
            <div className="absolute bottom-0 right-0 w-[26px] h-[26px] bg-[#1E4738] rounded-full border-[3px] border-white flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <h1 className="text-[#111827] text-[20px] font-bold leading-tight">Shakila</h1>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <User className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">Karyawan</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[13px] font-medium">PT Teknologi Nusantara</span>
            </div>
          </div>
        </div>

        {/* Informasi Pribadi Card */}
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-[#F3F4F6]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#E8F3EB] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#2D5A3F]" strokeWidth={2.5} />
            </div>
            <h2 className="text-[#111827] text-[15px] font-bold">Informasi Pribadi</h2>
          </div>

          <div className="flex flex-col">
            {/* Nama Lengkap */}
            <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6] active:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <User className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Nama Lengkap</span>
                  <span className="text-[#111827] text-[14px] font-bold">Shakila</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>

            {/* Email */}
            <div className="p-5 flex items-center justify-between border-b border-[#F3F4F6] active:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Mail className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#111827] text-[14px] font-bold">shakila@email.com</span>
                    <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>

            {/* Nomor HP */}
            <div className="p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 flex justify-center">
                  <Phone className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9CA3AF] text-[11px] font-medium mb-0.5">Nomor HP</span>
                  <span className="text-[#111827] text-[14px] font-bold">+62 812 3456 7890</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Keluar dari Akun Card */}
        <div 
          onClick={() => {/* logic logout */}}
          className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 flex justify-center">
              <LogOut className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
            </div>
            <span className="text-[#111827] text-[14px] font-bold">Keluar dari Akun</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
        </div>

        {/* Masuk Manajemen Card */}
        <div 
          onClick={() => router.push("/admin/dashboard")}
          className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm p-5 flex items-center justify-between active:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-9 flex justify-center">
              <LogIn className="w-[22px] h-[22px] text-[#356E3B]" strokeWidth={2} />
            </div>
            <span className="text-[#111827] text-[14px] font-bold">Masuk Manajemen</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
        </div>

      </div>
    </div>
  );
}
