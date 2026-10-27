import { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { CustomCalendar } from "./CustomCalendar";
import { formatDate } from "@/lib/dateUtils";

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
}

export function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "Pilih Tanggal",
  className = "",
  minDate
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayDate = value ? formatDate(value) : placeholder;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full min-w-0 flex-1 ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-w-0 h-[46px] sm:h-[48px] border rounded-[14px] pl-9 sm:pl-10 ${value ? 'pr-8 sm:pr-9' : 'pr-3 sm:pr-4'} flex items-center cursor-pointer transition-all bg-white select-none relative ${
          isOpen ? "border-[#356E3B] ring-1 ring-[#356E3B]" : "border-[#E5E7EB] hover:border-[#356E3B]"
        }`}
      >
        <Calendar 
          className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#356E3B] absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" 
          strokeWidth={2.5} 
        />
        <span className={`truncate text-[13px] sm:text-[14px] font-medium leading-none flex-1 text-left ${!value ? "text-[#9CA3AF]" : "text-[#111827]"}`}>
          {displayDate}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Hapus tanggal"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-[340px] z-10 animate-in zoom-in-95 duration-200">
            <CustomCalendar 
              selectedDate={value} 
              minDate={minDate}
              onSelect={(date) => {
                onChange(date);
                setIsOpen(false);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
