"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Clock, CheckCircle2, AlignLeft, Calendar, Users, Share2, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { useDialog } from "@/context/DialogContext";
import { shareContent } from "@/lib/shareUtils";
import { Badge } from "@/components/Badge";

export default function TugasDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useDialog();
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleComplete = async () => {
    if (!task || isToggling) return;
    const nextCompleted = !task.completed;
    
    setIsToggling(true);
    // Optimistic update
    setTask((prev: any) => ({ ...prev, completed: nextCompleted }));

    try {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      };
      const activeCompanyId = localStorage.getItem("activeCompanyId");
      if (activeCompanyId) {
        headers["x-company-id"] = activeCompanyId;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completed: nextCompleted })
      });

      if (res.ok) {
        showToast(
          nextCompleted ? "Tugas berhasil diselesaikan! 🎉" : "Tugas ditandai belum selesai.",
          "success"
        );
      } else {
        // Revert on failure
        setTask((prev: any) => ({ ...prev, completed: !nextCompleted }));
        showToast("Gagal memperbarui status tugas.", "error");
      }
    } catch (err) {
      console.error("Error updating task completion:", err);
      setTask((prev: any) => ({ ...prev, completed: !nextCompleted }));
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsToggling(false);
    }
  };

  const handleShare = () => {
    if (!task) return;
    shareContent({
      title: task.title,
      text: task.title,
      path: `/tugas/${id}`,
      onToast: showToast,
    });
  };

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.replace(`/login?redirect=${encodeURIComponent(`/tugas/${id}`)}`);
          return;
        }
        
        const headers: Record<string, string> = { Authorization: "Bearer " + token };
        const activeCompanyId = localStorage.getItem("activeCompanyId");
        if (activeCompanyId) {
          headers["x-company-id"] = activeCompanyId;
        }

        let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${id}`, { headers });
        if (res.ok) {
          const t = await res.json();
          setTask(t);
        } else {
          // Fallback to fetch all tasks and find by id
          res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, { headers });
          if (res.ok) {
            const data = await res.json();
            const t = Array.isArray(data) ? data.find((x: any) => x.id === id) : null;
            if (t) setTask(t);
          }
        }
      } catch (err) {
        console.error("Failed to fetch task details", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTask();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Tugas" onBack={() => router.push("/tugas")} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Memuat tugas...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
        <TopBar title="Detail Tugas" onBack={() => router.push("/tugas")} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Tugas tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8]">
      <TopBar 
        title="Detail Tugas" 
        onBack={() => router.push("/tugas")} 
        rightAction={
          task ? (
            <button
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all"
              aria-label="Bagikan Tugas"
              title="Bagikan Tugas"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          ) : null
        }
      />

      <div className="px-6 pt-6 pb-28 flex flex-col gap-6">
        
        {/* Title Card */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <h1 className={`text-[18px] font-bold leading-snug ${task.completed ? "text-[#6B7280] line-through" : "text-[#111827]"}`}>
              {task.title}
            </h1>
            <Badge 
              variant={task.completed ? "success" : "neutral"} 
              size="sm"
              dot
            >
              {task.completed ? "Sudah Selesai" : "Belum Selesai"}
            </Badge>
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
                  <p className="text-[14px] font-bold text-[#111827]">{task.date ? formatDate(task.date) : "-"}</p>
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

        {/* Group Task Assignees Section */}
        {task.type === 'group' && (
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8F3EB] flex flex-col gap-4">
            <h3 className="text-[13px] font-bold text-[#374151] uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-[#356E3B]" />
              Anggota Ditugaskan ({task.assignees?.length || 0})
            </h3>

            {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
              <div className="flex flex-col divide-y divide-gray-100">
                {task.assignees.map((assignee: any, idx: number) => {
                  const name = assignee.name || assignee.full_name || "Anggota Tim";
                  const initial = name.charAt(0).toUpperCase();
                  const role = (assignee.role || "KARYAWAN").toUpperCase() === "MEMBER" ? "KARYAWAN" : (assignee.role || "KARYAWAN").toUpperCase();

                  return (
                    <div key={assignee.id || idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E8F3EB] text-[#356E3B] font-bold text-[14px] flex items-center justify-center shrink-0 overflow-hidden border border-[#D1E5D5]">
                        {assignee.avatar_url ? (
                          <img src={assignee.avatar_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[14px] font-bold text-[#111827] truncate">
                          {name}
                        </span>
                        <span className="text-[11px] text-[#6B7280] truncate">
                          {assignee.email || `@${name.toLowerCase().replace(/\s+/g, "_")}`}
                        </span>
                      </div>
                      <Badge variant="success" size="xs" uppercase>
                        {role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#F9FAFB] rounded-[16px] p-4 border border-[#E5E7EB] text-center">
                <p className="text-[13px] text-gray-500">
                  Tugas grup ini berlaku untuk seluruh anggota perusahaan.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Bottom Floating Complete Button */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full sm:max-w-md p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 sm:border-x sm:border-border/40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20">
        <div className="w-full">
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={isToggling}
            className={`w-full py-3.5 px-6 rounded-full font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] cursor-pointer ${
              isToggling
                ? "bg-gray-400 text-white cursor-wait pointer-events-none shadow-none"
                : task.completed
                ? "bg-[#E8F3EB] hover:bg-[#d7eadc] text-[#1E4738] border border-[#C1DFCD]"
                : "bg-[#356E3B] hover:bg-[#2b5930] text-white shadow-[#356E3B]/25"
            }`}
          >
            {isToggling ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{task.completed ? "Membatalkan..." : "Menyelesaikan..."}</span>
              </>
            ) : task.completed ? (
              <>
                <RotateCcw className="w-4 h-4 text-[#1E4738]" strokeWidth={2.5} />
                <span>Tandai Belum Selesai</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                <span>Selesaikan Tugas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
