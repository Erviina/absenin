"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, User, Users, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { SwipeableTaskItem } from "@/components/SwipeableTaskItem";
import { TopBar } from "@/components/TopBar";
import { CustomDatePicker } from "@/components/CustomDatePicker";

export default function TugasPage() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"personal" | "group">("personal");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isViewingUpcoming, setIsViewingUpcoming] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split("T")[0]);
  const [taskTime, setTaskTime] = useState("10:00");
  const [noteText, setNoteText] = useState("");

  const [tasks, setTasks] = useState<any[]>([
    { id: "dummy-1", title: "Review sprint backlog dengan Tim Dev", time: "10:00", completed: true, type: "personal", date: new Date().toISOString().split("T")[0], note: "" },
    { id: "dummy-2", title: "Kirim draft laporan absensi mingguan", time: "15:30", completed: false, type: "personal", date: new Date().toISOString().split("T")[0], note: "" },
    { id: "dummy-3", title: "Belanja perlengkapan pantry kantor", time: "14:00", completed: false, type: "personal", date: "2026-12-25", note: "" },
    { id: "dummy-4", title: "Meeting mingguan bersama Klien", time: "09:00", completed: false, type: "group", date: "2026-12-26", note: "" },
  ]);
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setTasks(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tasks", err);
      }
    };
    fetchTasks();
  }, []);

  const toggleTask = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    
    // Optimistic update
    setTasks(tasks.map(x => x.id === id ? { ...x, completed: !x.completed } : x));

    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks/" + id, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("accessToken")
        },
        body: JSON.stringify({ completed: !t.completed })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDate(new Date().toISOString().split("T")[0]);
    setTaskTime("10:00");
    setNoteText("");
    setIsAddingTask(true);
  };

  const handleEditTask = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (t) {
      setTaskTitle(t.title);
      setTaskDate(t.date || new Date().toISOString().split("T")[0]);
      setTaskTime(t.time || "10:00");
      setNoteText(t.note || "");
      setEditingTaskId(t.id);
      setIsAddingTask(true);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + "/tasks/" + id, {
        method: "DELETE",
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("accessToken")
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return;

    const method = editingTaskId ? "PATCH" : "POST";
    const url = editingTaskId ? `/tasks/${editingTaskId}` : "/tasks";

    const payload = {
      title: taskTitle,
      date: taskDate,
      time: taskTime,
      note: noteText,
      type: activeTab, // Use current tab
    };

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("accessToken")
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const savedTask = await res.json();
        if (editingTaskId) {
          setTasks(tasks.map(t => t.id === editingTaskId ? savedTask : t));
        } else {
          setTasks([savedTask, ...tasks]);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const errorMsg = data.error || data.message || data.errors?.[0] || `HTTP ${res.status}`;
        alert(`Gagal menyimpan: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Terjadi kesalahan jaringan saat menyimpan tugas.");
    }

    setIsAddingTask(false);
    setEditingTaskId(null);
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
            router.back();
          }
        }}
        rightAction={
          (!isAddingTask && !isViewingUpcoming) ? (
            <button 
              onClick={handleOpenAdd}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/30"
            >
              <Plus className="w-6 h-6" />
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
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeTab === "personal" ? "bg-[#5C8966]" : "bg-[#F3F4F6]"}`}>
                <span className={`text-[11px] font-bold ${activeTab === "personal" ? "text-white" : "text-[#6B7280]"}`}>{tasks.filter(t => t.type === "personal").length}</span>
              </div>
            </div>
            
            <div 
              onClick={() => setActiveTab("group")}
              className={`flex-1 rounded-full py-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors ${activeTab === "group" ? "bg-[#356E3B] shadow-sm" : "hover:bg-gray-50"}`}
            >
              <Users className={`w-4 h-4 ${activeTab === "group" ? "text-white" : "text-[#6B7280]"}`} strokeWidth={2.5} />
              <span className={`text-[14px] font-bold ${activeTab === "group" ? "text-white" : "text-[#4B5563]"}`}>Grup</span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeTab === "group" ? "bg-[#5C8966]" : "bg-[#F3F4F6]"}`}>
                <span className={`text-[11px] font-bold ${activeTab === "group" ? "text-white" : "text-[#6B7280]"}`}>{tasks.filter(t => t.type === "group").length}</span>
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
                <div className="flex gap-3">
                  <CustomDatePicker 
                    value={taskDate}
                    onChange={setTaskDate}
                  />
                  <div className="flex-1 relative">
                    <Clock className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
                    <input 
                      type="time" 
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                      className="w-full border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 py-3.5 text-[14px] font-medium text-[#111827] focus:outline-none focus:border-[#356E3B] focus:ring-1 focus:ring-[#356E3B] transition-all bg-white [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
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

            </div>

            <button 
              onClick={handleSaveTask}
              className={`w-full hover:bg-[#2A582F] text-white rounded-full py-4 flex items-center justify-center gap-2 font-bold text-[15px] shadow-sm transition-colors active:scale-[0.98] ${
                taskTitle.trim() ? "bg-[#356E3B]" : "bg-gray-300 pointer-events-none"
              }`}
            >
              <CheckCircle2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
              Simpan Tugas
            </button>
          </div>
        ) : isViewingUpcoming ? (
          /* ALL UPCOMING TASKS VIEW */
          <div className="flex flex-col">
            {upcomingTasks.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas mendatang.</p>
            )}
            {upcomingTasks.map(task => (
              <SwipeableTaskItem 
                key={task.id}
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
                <div className="bg-[#E8F3EB] px-2.5 py-1 rounded-full border border-[#D1E5D5]">
                  <span className="text-[#356E3B] text-[11px] font-bold">{activeTodayCount} Aktif</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                {todayTasks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas untuk hari ini.</p>
                )}
                {todayTasks.map(task => (
                  <SwipeableTaskItem 
                    key={task.id}
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
                <button 
                  onClick={() => setIsViewingUpcoming(true)}
                  className="text-[#6EA874] text-[12px] font-bold hover:text-[#356E3B] transition-colors"
                >
                  Lihat Semua
                </button>
              </div>
              
              <div className="flex flex-col">
                {upcomingTasks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Belum ada tugas mendatang.</p>
                )}
                {upcomingTasks.slice(0, 3).map(task => ( // Hanya tampil 3 teratas di tampilan ringkas
                  <SwipeableTaskItem 
                    key={task.id}
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
