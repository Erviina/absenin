import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { CustomCalendar } from "./CustomCalendar";

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function CustomDatePicker({ value, onChange, placeholder = "Pilih Tanggal" }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return placeholder;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

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
    <div className="relative flex-1" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-[14px] pl-10 pr-4 py-3.5 flex items-center cursor-pointer transition-all bg-white ${
          isOpen ? "border-[#356E3B] ring-1 ring-[#356E3B]" : "border-[#E5E7EB] hover:border-[#356E3B]"
        }`}
      >
        <Calendar className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
        <span className={`text-[14px] font-medium ${!value ? "text-[#9CA3AF]" : "text-[#111827]"}`}>
          {formatDate(value)}
        </span>
      </div>
      
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-[340px] z-10 animate-in zoom-in-95 duration-200">
            <CustomCalendar 
              selectedDate={value} 
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
