"use client";

import { useState } from "react";
import { ChevronLeft, Plus, User, Users, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { SwipeableTaskItem } from "@/components/SwipeableTaskItem";
import { TopBar } from "@/components/TopBar";
import { CustomDatePicker } from "@/components/CustomDatePicker";

export default function TugasPage() {
  const router = useRouter();
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("2026-09-18");
  const [taskTime, setTaskTime] = useState("10:00 WIB");
  const [noteText, setNoteText] = useState("");

  // Dummy data
  const [tasks, setTasks] = useState([
    { id: "1", title: "Review sprint backlog dengan Tim Dev", time: "10:00 WIB", completed: true, section: "today", note: "" },
    { id: "2", title: "Kirim draft laporan absensi mingguan", time: "15:30 WIB", completed: false, section: "today", note: "" },
    { id: "3", title: "Belanja perlengkapan pantry kantor", time: "14:00 WIB", date: "2026-09-25", completed: false, section: "upcoming", note: "" },
    { id: "4", title: "Meeting mingguan bersama Klien", time: "09:00 WIB", date: "2026-09-26", completed: false, section: "upcoming", note: "" },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleOpenAdd = () => {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskDate("");
    setTaskTime("");
    setNoteText("");
    setIsAddingTask(true);
  };

  const handleEditTask = (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (t) {
      setTaskTitle(t.title);
      setTaskDate(t.date || "2026-09-18");
      setTaskTime(t.time);
      setNoteText(t.note || "");
      setEditingTaskId(t.id);
      setIsAddingTask(true);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleSaveTask = () => {
    if (!taskTitle.trim()) return;

    if (editingTaskId) {
      // Update existing task
      setTasks(tasks.map(t => 
        t.id === editingTaskId 
          ? { ...t, title: taskTitle, date: taskDate, time: taskTime, note: noteText } 
          : t
      ));
    } else {
      // Create new task
      const newTask = {
        id: Date.now().toString(),
        title: taskTitle,
        date: taskDate,
        time: taskTime,
        note: noteText,
        completed: false,
        section: "upcoming" // New tasks default to upcoming
      };
      setTasks([...tasks, newTask]);
    }

    setIsAddingTask(false);
    setEditingTaskId(null);
  };

  const todayTasks = tasks.filter(t => t.section === "today");
  const upcomingTasks = tasks.filter(t => t.section === "upcoming");
  const activeTodayCount = todayTasks.filter(t => !t.completed).length;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F7F9F8] relative pb-32">
      {/* Header */}
      <TopBar 
        title={isAddingTask && editingTaskId ? "Ubah Tugas" : "Daftar Tugas"}
        onBack={() => isAddingTask ? setIsAddingTask(false) : router.back()}
        rightAction={
          !isAddingTask ? (
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
        <div className="bg-white border border-[#E8F3EB] rounded-full p-1.5 flex shadow-sm">
          <div className="flex-1 bg-[#356E3B] rounded-full py-2.5 flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <User className="w-4 h-4 text-white" strokeWidth={2.5} />
            <span className="text-white text-[14px] font-bold">Personal</span>
            <div className="w-5 h-5 rounded-full bg-[#5C8966] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">{tasks.length}</span>
            </div>
          </div>
          
          <div className="flex-1 rounded-full py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <Users className="w-4 h-4 text-[#6B7280]" strokeWidth={2.5} />
            <span className="text-[#4B5563] text-[14px] font-bold">Grup</span>
            <div className="w-5 h-5 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <span className="text-[#6B7280] text-[11px] font-bold">1</span>
            </div>
          </div>
        </div>

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
                {todayTasks.map(task => (
                  <SwipeableTaskItem 
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
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
                <button className="text-[#6EA874] text-[12px] font-bold hover:text-[#356E3B] transition-colors">
                  Lihat Semua
                </button>
              </div>
              
              <div className="flex flex-col">
                {upcomingTasks.map(task => (
                  <SwipeableTaskItem 
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {!isAddingTask && <BottomNav activeTab="tugas" />}
    </div>
  );
}
