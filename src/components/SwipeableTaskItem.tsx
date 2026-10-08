"use client";

import { useState, useRef } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  date?: string; // For upcoming tasks
}

interface SwipeableTaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}

export function SwipeableTaskItem({ task, onToggle, onEdit, onDelete, onClick }: SwipeableTaskItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const startDragTime = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    startDragTime.current = Date.now();
    if ('touches' in e) {
      touchStartX.current = e.touches[0].clientX;
    } else {
      touchStartX.current = e.clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartX.current === null) return;
    
    let currentX = 0;
    if ('touches' in e) {
      currentX = e.touches[0].clientX;
    } else {
      currentX = e.clientX;
    }

    const diff = currentX - touchStartX.current;
    
    // Only allow left swipe (negative diff) up to -140px (70px per button)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -140));
    } else if (translateX < 0) {
      // Allow swiping back right to close
      setTranslateX(Math.min(0, translateX + diff));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(false);
    
    // Check if it's a tap/click
    if (touchStartX.current !== null && onClick) {
      let currentX = 0;
      if ('changedTouches' in e) {
        currentX = e.changedTouches[0].clientX;
      } else {
        currentX = (e as React.MouseEvent).clientX;
      }
      const diff = Math.abs(currentX - touchStartX.current);
      const timeDiff = Date.now() - startDragTime.current;
      
      // If moved less than 10px and took less than 500ms, it's a click
      if (diff < 10 && timeDiff < 500 && translateX === 0) {
        onClick(task.id);
      }
    }

    if (translateX < -50) {
      setTranslateX(-140); // Snap open
    } else {
      setTranslateX(0); // Snap closed
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative w-full h-[88px] mb-3">
      {/* Background Actions */}
      <div 
        className="absolute inset-y-0 right-0 flex rounded-r-[20px] overflow-hidden"
        style={{ visibility: translateX === 0 && !isDragging ? 'hidden' : 'visible' }}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
            setTranslateX(0);
          }}
          className="w-[70px] h-full bg-[#356E3B] flex flex-col items-center justify-center text-white"
        >
          <Pencil className="w-5 h-5 mb-1" strokeWidth={2} />
          <span className="text-[11px] font-bold">Ubah</span>
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
            setTranslateX(0);
          }}
          className="w-[70px] h-full bg-[#FF0000] flex flex-col items-center justify-center text-white"
        >
          <Trash2 className="w-5 h-5 mb-1" strokeWidth={2} />
          <span className="text-[11px] font-bold">Hapus</span>
        </button>
      </div>

      {/* Foreground Task Card */}
      <div 
        className={`absolute inset-0 bg-white border border-[#E8F3EB] rounded-[20px] shadow-sm flex justify-between items-center px-4 ${isDragging ? "" : "transition-transform ease-out duration-300"} ${onClick && translateX === 0 ? "cursor-pointer" : ""}`}
        style={{ transform: `translateX(${translateX}px)`, zIndex: 10 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={(e) => touchStartX.current !== null && handleTouchMove(e)}
        onMouseUp={handleTouchEnd}
        onMouseLeave={(e) => touchStartX.current !== null && handleTouchEnd(e)}
      >
        <div className="flex flex-col flex-1 pr-4">
          <span className={`text-[14px] font-bold leading-tight mb-1 ${task.completed ? "text-[#9CA3AF] line-through" : "text-[#111827]"}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-1.5">
            {task.date ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#6EA874]">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            ) : (
              <div className={`w-1.5 h-1.5 rounded-full ${task.completed ? "bg-[#D1D5DB]" : "bg-[#6EA874]"}`} />
            )}
            <span className={`text-[11px] font-medium ${task.completed ? "text-[#D1D5DB]" : "text-[#6B7280]"}`}>
              {task.date ? `${task.date}, ${task.time}` : `Pukul ${task.time}`}
            </span>
          </div>
        </div>
        
        {/* Checkbox */}
        <button 
          onClick={(e) => {
            e.stopPropagation(); // Prevent interfering with swipe logic
            onToggle(task.id);
          }}
          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
            task.completed 
              ? "bg-[#2D5A3F] border-[#2D5A3F]" 
              : "bg-white border-[#E8F3EB]"
          }`}
        >
          {task.completed && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
}
