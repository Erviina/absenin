"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Plus, User, Users, Calendar, Clock, CheckCircle2, Check, AtSign, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { SwipeableTaskItem } from "@/components/SwipeableTaskItem";
import { TopBar } from "@/components/TopBar";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CustomTimePicker } from "@/components/CustomTimePicker";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Badge } from "@/components/Badge";
import { ViewAllButton } from "@/components/ViewAllButton";

import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { getActiveCompanyId, getApiUrl } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardSkeleton";
import { buildCacheKey, getCachedData, setCachedData, invalidateCache } from "@/lib/clientCache";

export default function TugasPage() {
  const router = useRouter();
  const { activeCompanyId, activeCompany, isLoading: isCompanyLoading } = useCompany();
  const { showConfirm, showToast } = useDialog();
  
  const [activeTab, setActiveTab] = useState<"personal" | "group">("personal");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isViewingUpcoming, setIsViewingUpcoming] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [taskTime, setTaskTime] = useState("10:00");
  const [noteText, setNoteText] = useState("");

  // Group task mention / assignees states
  const [companyMembers, setCompanyMembers] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<any[]>(buildCacheKey("company_members", compId))?.data || [];
  });
  const [selectedAssignees, setSelectedAssignees] = useState<any[]>([]);
  const [searchMember, setSearchMember] = useState("");

  const [tasks, setTasks] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    const compId = getActiveCompanyId();
    return getCachedData<any[]>(buildCacheKey("tasks", compId))?.data || [];
  });
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const compId = getActiveCompanyId();
    return !getCachedData(buildCacheKey("tasks", compId))?.data;
  });

  const activeFetchCompanyIdRef = useRef<string | null>(null);
  const prevCompanyIdRef = useRef<string | null | undefined>(undefined);

  // Reset HANYA saat active company benar-benar berganti
  useEffect(() => {
    if (prevCompanyIdRef.current !== undefined && prevCompanyIdRef.current !== activeCompanyId) {
      setTasks([]);
      setCompanyMembers([]);
      setIsLoadingTasks(true);
    }
    prevCompanyIdRef.current = activeCompanyId;
  }, [activeCompanyId]);

  useEffect(() => {
    const handleCompanyChanged = () => {
      setTasks([]);
      setCompanyMembers([]);
      setIsLoadingTasks(true);
    };
    window.addEventListener("companyChanged", handleCompanyChanged);
    return () => window.removeEventListener("companyChanged", handleCompanyChanged);
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      if (isCompanyLoading) return;
      const compId = activeCompanyId || getActiveCompanyId();
      activeFetchCompanyIdRef.current = compId;
      if (!compId) {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      const cacheKey = buildCacheKey("tasks", compId);
      const cached = getCachedData<any[]>(cacheKey);
      if (cached) {
        setTasks(cached.data);
        setIsLoadingTasks(false);
      } else {
        setIsLoadingTasks(true);
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const headers: Record<string, string> = {
          "Authorization": "Bearer " + token,
        };
        if (compId) {
          headers["x-company-id"] = compId;
        }
        const res = await fetch(getApiUrl("/tasks"), {
          headers
        });
        if (activeFetchCompanyIdRef.current !== compId) return;

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTasks(data);
            setCachedData(cacheKey, data);
          }
        }
      } catch (err) {
        if (activeFetchCompanyIdRef.current !== compId) return;
        console.error("Failed to fetch tasks", err);
      } finally {
        if (activeFetchCompanyIdRef.current === compId) {
          setIsLoadingTasks(false);
        }
      }
    };
    fetchTasks();
  }, [activeCompanyId, isCompanyLoading]);

  // Fetch company members for mentions
  useEffect(() => {
    const fetchMembers = async () => {
      if (isCompanyLoading) return;
      const compId = activeCompanyId || getActiveCompanyId();
      if (!compId) return;

      const memKey = buildCacheKey("company_members", compId);
      const cachedMems = getCachedData<any[]>(memKey);
      if (cachedMems) {
        setCompanyMembers(cachedMems.data);
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const headers: Record<string, string> = {
          Authorization: "Bearer " + token,
        };
        if (compId) {
          headers["x-company-id"] = compId;
        }
        const res = await fetch(getApiUrl("/companies/members"), {
          headers,
        });
        if (activeFetchCompanyIdRef.current !== compId) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setCompanyMembers(json.data);
            setCachedData(memKey, json.data);
          }
        }
      } catch (err) {
        if (activeFetchCompanyIdRef.current !== compId) return;
        console.error("Failed to fetch company members", err);
      }
    };

    fetchMembers();
  }, [activeCompanyId, isCompanyLoading]);

  const toggleTask = async (id: string) => {
    const compId = activeCompanyId || getActiveCompanyId();
    if (!compId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    
    // Optimistic update
    setTasks(tasks.map(x => x.id === id ? { ...x, completed: !x.completed } : x));
    invalidateCache("tasks");
    invalidateCache("dashboard_tasks");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("accessToken")
      };
      if (compId) {
        headers["x-company-id"] = compId;
      }
      await fetch(getApiUrl("/tasks/" + id), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completed: !t.completed })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu untuk membuat tugas.", "warning");
      return;
    }
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDate(new Date().toISOString().split("T")[0]);
    setTaskTime("10:00");
    setNoteText("");
    setSelectedAssignees([]);
    setSearchMember("");
    setIsAddingTask(true);
  };

  const handleEditTask = (id: string) => {
    if (!activeCompanyId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    const t = tasks.find(x => x.id === id);
    if (t) {
      setTaskTitle(t.title);
      setTaskDate(t.date || new Date().toISOString().split("T")[0]);
      setTaskTime(t.time || "10:00");
      setNoteText(t.note || "");
      if (Array.isArray(t.assignees)) {
        setSelectedAssignees(
          t.assignees.map((a: any) => ({
            id: a.id,
            name: a.name || a.full_name || "Anggota",
            avatar_url: a.avatar_url,
            role: a.role,
          }))
        );
      } else {
        setSelectedAssignees([]);
      }
      setSearchMember("");
      setEditingTaskId(t.id);
      setIsAddingTask(true);
    }
  };

  const toggleAssignee = (member: { id: string; name: string; avatar_url?: string | null; role?: string | null }) => {
    if (selectedAssignees.some(a => a.id === member.id)) {
      setSelectedAssignees(selectedAssignees.filter(a => a.id !== member.id));
    } else {
      setSelectedAssignees([...selectedAssignees, member]);
    }
  };

  const filteredMembers = companyMembers.filter(m => {
    if (!searchMember.trim()) return true;
    const q = searchMember.toLowerCase().replace(/^@/, "");
    return (
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  const handleDeleteTask = async (id: string) => {
    const compId = activeCompanyId || getActiveCompanyId();
    if (!compId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    const taskToDelete = tasks.find(t => t.id === id);
    const confirmed = await showConfirm({
      title: "Hapus Tugas?",
      message: `Apakah Anda yakin ingin menghapus tugas "${taskToDelete?.title || 'ini'}"?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      type: "danger",
      icon: "trash",
    });
    if (!confirmed) return;

    setTasks(tasks.filter(t => t.id !== id));
    try {
      const headers: Record<string, string> = {
        "Authorization": "Bearer " + localStorage.getItem("accessToken")
      };
      if (compId) {
        headers["x-company-id"] = compId;
      }
      const res = await fetch(getApiUrl("/tasks/" + id), {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        invalidateCache("tasks");
        invalidateCache("dashboard_tasks");
        showToast("Tugas berhasil dihapus", "success");
      } else {
        showToast("Gagal menghapus tugas dari server", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  const handleSaveTask = async () => {
    if (isSaving) return;
    const compId = activeCompanyId || getActiveCompanyId();
    if (!compId) {
      showToast("Silakan bergabung atau pilih perusahaan terlebih dahulu.", "warning");
      return;
    }
    if (!taskTitle.trim()) return;

    if (activeTab === "group" && !compId) {
      showToast("Pilih perusahaan terlebih dahulu untuk membuat tugas grup", "error");
      return;
    }

    setIsSaving(true);

    const method = editingTaskId ? "PATCH" : "POST";
    const url = editingTaskId ? `/tasks/${editingTaskId}` : "/tasks";

    const payload: any = {
      title: taskTitle,
      date: taskDate,
      time: taskTime,
      note: noteText,
      type: activeTab, // "personal" or "group"
    };

    if (compId) {
      payload.company_id = compId;
    }

    if (activeTab === "group") {
      payload.assignees = selectedAssignees;
      if (selectedAssignees.length > 0) {
        payload.assigned_to = selectedAssignees[0].id;
      }
    }

    try {
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("accessToken")
      };
      if (compId) {
        headers["x-company-id"] = compId;
      }

      const res = await fetch(getApiUrl(url), {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        invalidateCache("tasks");
        invalidateCache("dashboard_tasks");
        const savedTask = await res.json();
        if (editingTaskId) {
          setTasks(tasks.map(t => t.id === editingTaskId ? savedTask : t));
          showToast("Tugas berhasil diperbarui", "success");
        } else {
          setTasks([savedTask, ...tasks]);
          showToast("Tugas baru berhasil ditambahkan", "success");
        }
        setIsAddingTask(false);
        setEditingTaskId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || data.message || data.errors?.[0] || `HTTP ${res.status}`;
        showToast(`Gagal menyimpan: ${errorMsg}`, "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast("Terjadi kesalahan jaringan saat menyimpan tugas", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTasks = tasks.filter(t => t.type === activeTab);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const isTodayTask = (dateStr: string | null | undefined) => {
    if (!dateStr) return true;
    return dateStr.startsWith(todayStr);
  };

  const todayTasks = filteredTasks.filter(t => isTodayTask(t.date));
  const upcomingTasks = filteredTasks.filter(t => !isTodayTask(t.date));
  const activeTodayCount = todayTasks.filter(t => !t.completed).length;

  const uncompletedPersonalCount = tasks.filter(t => t.type === "personal" && !t.completed).length;
  const uncompletedGroupCount = tasks.filter(t => t.type === "group" && !t.completed).length;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title={isAddingTask ? (editingTaskId ? "Ubah Tugas" : "Tambah Tugas") : isViewingUpcoming ? "Semua Tugas Mendatang" : "Daftar Tugas"}
        onBack={() => {
          if (isAddingTask) {
            setIsAddingTask(false);
          } else if (isViewingUpcoming) {
            setIsViewingUpcoming(false);
          } else {
            router.push("/dashboard");
          }
        }}
        rightAction={
          (!isAddingTask && !isViewingUpcoming) ? (
            <button 
              onClick={handleOpenAdd}
              className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
              aria-label="Tambah Tugas"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          ) : null
        }
      />

      <div className="px-6 pt-6 flex flex-col gap-6">
        
        {/* Tabs */}
        {!isAddingTask && !isViewingUpcoming && (
          <div className="bg-white border border-[#E8F3EB] rounded-full p-1.5 flex shadow-sm">
            <div 
              onClick={() => setActiveTab("personal")}
              className={`flex-1 rounded-full py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors ${activeTab === "personal" ? "bg-[#356E3B] shadow-sm" : "hover:bg-gray-50"}`}
            >
              <User className={`w-4 h-4 ${activeTab === "personal" ? "text-white" : "text-[#6B7280]"}`} strokeWidth={2.5} />
              <span className={`text-[14px] font-bold ${activeTab === "personal" ? "text-white" : "text-[#4B5563]"}`}>Personal</span>
              <div className={`min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ${activeTab === "personal" ? "bg-[#5C8966]" : "bg-[#F3F4F6]"}`}>
                <span className={`text-[11px] font-bold ${activeTab === "personal" ? "text-white" : "text-[#6B7280]"}`}>{uncompletedPersonalCount}</span>
              </div>
            </div>
            
            <div 
              onClick={() => setActiveTab("group")}
              className={`flex-1 rounded-full py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors ${activeTab === "group" ? "bg-[#356E3B] shadow-sm" : "hover:bg-gray-50"}`}
            >
              <Users className={`w-4 h-4 ${activeTab === "group" ? "text-white" : "text-[#6B7280]"}`} strokeWidth={2.5} />
              <span className={`text-[14px] font-bold ${activeTab === "group" ? "text-white" : "text-[#4B5563]"}`}>Grup</span>
              <div className={`min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ${activeTab === "group" ? "bg-[#5C8966]" : "bg-[#F3F4F6]"}`}>
                <span className={`text-[11px] font-bold ${activeTab === "group" ? "text-white" : "text-[#6B7280]"}`}>{uncompletedGroupCount}</span>
              </div>
            </div>
          </div>
        )}

        {isAddingTask ? (
          /* ADD / EDIT TASK FORM */
          <div className="flex flex-col gap-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#E8F3EB] flex flex-col gap-5">
              
              {/* Nama Tugas */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Nama Tugas <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Contoh: Review sprint backlog dengan Tim Dev" 
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all placeholder:text-[#9CA3AF]"
                />
              </div>

              {/* Batas Waktu */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-[#374151]">
                  Batas Waktu (Deadline) <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex gap-2.5 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <CustomDatePicker 
                      value={taskDate}
                      onChange={setTaskDate}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CustomTimePicker
                      value={taskTime}
                      onChange={setTaskTime}
                      placeholder="Pilih Waktu"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[13px] font-bold text-[#374151]">
                    Catatan Tambahan
                  </label>
                  <span className="text-[11px] font-bold text-[#9CA3AF]">
                    {noteText.length}/200
                  </span>
                </div>
                <textarea 
                  rows={4}
                  maxLength={200}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Tuliskan catatan atau instruksi khusus bila diperlukan..." 
                  className="w-full border border-[#E5E7EB] rounded-[14px] px-4 py-3.5 text-[14px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all placeholder:text-[#9CA3AF] resize-none"
                />
              </div>

              {/* Form Mention Anggota (Hanya untuk Tugas Grup) */}
              {activeTab === "group" && (
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[#F0F5F1]">
                  <div className="flex justify-between items-center">
                    <label className="text-[13px] font-bold text-[#374151] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#356E3B]" />
                      Tugaskan Kepada (Mention)
                    </label>
                    <span className="text-[11px] font-bold text-[#356E3B]">
                      {selectedAssignees.length} anggota dipilih
                    </span>
                  </div>

                  {/* Selected Assignees Chips */}
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {selectedAssignees.map((assignee) => (
                        <div
                          key={assignee.id}
                          className="bg-[#E8F3EB] text-[#356E3B] rounded-full pl-1.5 pr-2.5 py-1 flex items-center gap-1.5 text-[12px] font-bold shadow-xs"
                        >
                          <div className="w-5 h-5 rounded-full bg-white text-[#356E3B] text-[10px] font-bold flex items-center justify-center overflow-hidden border border-[#D1E5D5] shrink-0">
                            {assignee.avatar_url ? (
                              <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (assignee.name || "?").charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="truncate max-w-[120px]">@{assignee.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleAssignee(assignee)}
                            className="w-4 h-4 rounded-full bg-[#356E3B]/10 hover:bg-[#356E3B]/25 text-[#356E3B] flex items-center justify-center text-[10px] ml-0.5 transition-colors"
                            aria-label={`Hapus ${assignee.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search / Mention Filter Input */}
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text"
                      value={searchMember}
                      onChange={(e) => setSearchMember(e.target.value)}
                      placeholder="Cari nama anggota untuk di-mention..."
                      className="w-full border border-[#E5E7EB] rounded-[14px] pl-9.5 pr-4 py-2.5 text-[13px] text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all placeholder:text-[#9CA3AF] bg-[#FAFCFA]"
                    />
                  </div>

                  {/* Member Selection List */}
                  <div className="max-h-44 overflow-y-auto rounded-[14px] border border-[#E5E7EB] bg-white divide-y divide-gray-50 shadow-inner">
                    {filteredMembers.length === 0 ? (
                      <div className="p-4 text-center text-[12px] text-gray-400">
                        {companyMembers.length === 0 
                          ? "Tidak ada anggota aktif di perusahaan" 
                          : "Tidak ada anggota yang cocok dengan pencarian"}
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedAssignees.some((a) => a.id === member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() =>
                              toggleAssignee({
                                id: member.id,
                                name: member.full_name,
                                avatar_url: member.avatar_url,
                                role: member.role,
                              })
                            }
                            className={`p-2.5 px-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-[#F0F8F2]" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#E8F3EB] text-[#356E3B] text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden border border-[#D1E5D5]">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (member.full_name || "?").charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-bold text-[#111827] truncate">
                                  {member.full_name}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate">
                                  {(member.role || "KARYAWAN").toUpperCase() === "MEMBER" ? "KARYAWAN" : (member.role || "KARYAWAN").toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected ? "bg-[#356E3B] border-[#356E3B]" : "border-gray-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>

            <PrimaryButton 
              onClick={handleSaveTask}
              disabled={!taskTitle.trim() || isSaving}
              isLoading={isSaving}
              loadingText={editingTaskId ? "Menyimpan Perubahan..." : "Menyimpan Tugas..."}
              icon={<CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2.5} />}
            >
              Simpan Tugas
            </PrimaryButton>
          </div>
        ) : isLoadingTasks && tasks.length === 0 ? (
          <div className="flex flex-col gap-3">
            <CardListSkeleton count={3} type="task" />
          </div>
        ) : isViewingUpcoming ? (
          /* ALL UPCOMING TASKS VIEW */
          <div className="flex flex-col">
            {upcomingTasks.length === 0 && (
              isLoadingTasks ? (
                <CardListSkeleton count={3} type="task" />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas mendatang.</p>
              )
            )}
            {upcomingTasks.map(task => (
              <SwipeableTaskItem 
                key={`task-${task.id}`}
                task={task}
                onToggle={toggleTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onClick={(id) => router.push(`/tugas/${id}`)}
              />
            ))}
          </div>
        ) : (
          /* TASK LIST */
          <>
            {/* TUGAS HARI INI */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#374151] text-[12px] font-bold uppercase tracking-widest">
                  Tugas Hari Ini
                </h2>
                <Badge variant="success" size="sm">
                  {activeTodayCount} Aktif
                </Badge>
              </div>
              
              <div className="flex flex-col">
                {todayTasks.length === 0 && (
                  isLoadingTasks ? (
                    <CardListSkeleton count={2} type="task" />
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas untuk hari ini.</p>
                  )
                )}
                {todayTasks.map(task => (
                  <SwipeableTaskItem 
                    key={`task-${task.id}`}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onClick={(id) => router.push(`/tugas/${id}`)}
                  />
                ))}
              </div>
            </div>

            {/* TUGAS MENDATANG */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#374151] text-[12px] font-bold uppercase tracking-widest">
                  Tugas Mendatang
                </h2>
                <ViewAllButton onClick={() => setIsViewingUpcoming(true)} />
              </div>
              
              <div className="flex flex-col">
                {upcomingTasks.length === 0 && (
                  isLoadingTasks ? (
                    <CardListSkeleton count={2} type="task" />
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas mendatang.</p>
                  )
                )}
                {upcomingTasks.slice(0, 3).map(task => ( // Hanya tampil 3 teratas di tampilan ringkas
                  <SwipeableTaskItem 
                    key={`task-${task.id}`}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onClick={(id) => router.push(`/tugas/${id}`)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      <BottomNav activeTab="tugas" />
    </div>
  );
}
