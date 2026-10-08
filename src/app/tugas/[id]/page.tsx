"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Clock, CheckCircle2, AlignLeft, Calendar } from "lucide-react";

export default function TugasDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        
        // We fetch all tasks and filter by ID, 
        // since we don't have a GET /tasks/:id endpoint yet, or we can just find it.
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks", {
          headers: { "Authorization": "Bearer " + token }
        });
        
        if (res.ok) {
          const data = await res.json();
          const t = data.find((x: any) => x.id === id);
          if (t) {
            setTask(t);
          }
        }
      } catch (err) {
        console.error("Failed to fetch task details", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Tugas" onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Memuat tugas...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Tugas" onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Tugas tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
      <TopBar title="Detail Tugas" onBack={() => router.back()} />

      <div className="px-6 pt-6 pb-20 flex flex-col gap-6">
        
        {/* Title Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <h1 className={`text-[18px] font-bold leading-snug ${task.completed ? "text-[#9CA3AF] line-through" : "text-[#111827]"}`}>
              {task.title}
            </h1>
            <div className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold ${task.type === 'group' ? 'bg-[#E5F0FF] text-[#2563EB]' : 'bg-[#E8F3EB] text-[#356E3B]'}`}>
              {task.type === 'group' ? 'Grup' : 'Personal'}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${task.completed ? 'bg-[#E8F3EB]' : 'bg-gray-100'}`}>
              <CheckCircle2 className={`w-4 h-4 ${task.completed ? 'text-[#356E3B]' : 'text-gray-400'}`} />
            </div>
            <span className={`text-[13px] font-medium ${task.completed ? 'text-[#356E3B]' : 'text-gray-500'}`}>
              {task.completed ? 'Sudah Selesai' : 'Belum Selesai'}
            </span>
          </div>
        </div>

        {/* Schedule & Notes */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-6">
          
          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide">Jadwal</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280]">
                  <Calendar className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] font-medium">Tanggal</p>
                  <p className="text-[14px] font-bold text-[#111827]">{task.date || "-"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280]">
                  <Clock className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280] font-medium">Waktu</p>
                  <p className="text-[14px] font-bold text-[#111827]">{task.time || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[1px] w-full bg-[#E5E7EB]" />

          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide flex items-center gap-2">
              <AlignLeft className="w-4 h-4" />
              Keterangan
            </h3>
            
            <div className="bg-[#F9FAFB] rounded-[16px] p-4 border border-[#E5E7EB]">
              <p className="text-[14px] text-[#4B5563] whitespace-pre-wrap leading-relaxed">
                {task.note ? task.note : <span className="italic text-gray-400">Tidak ada keterangan / catatan.</span>}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
