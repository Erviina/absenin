import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomTimePicker({ value, onChange, placeholder = "Pilih Waktu", className = "" }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [hour, setHour] = useState(value ? value.split(":")[0] : "08");
  const [minute, setMinute] = useState(value ? value.split(":")[1] : "00");

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHour(h);
      setMinute(m);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHourSelect = (h: string) => {
    setHour(h);
    onChange(`${h}:${minute}`);
  };

  const handleMinuteSelect = (m: string) => {
    setMinute(m);
    onChange(`${hour}:${m}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border ${isOpen ? 'border-[#356E3B] ring-1 ring-[#356E3B]' : 'border-[#E5E7EB]'} rounded-[14px] pl-10 pr-4 py-3.5 text-[14px] text-[#111827] bg-white font-medium cursor-pointer transition-all flex items-center`}
      >
        <Clock className="w-[18px] h-[18px] text-[#356E3B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
        <span className={value ? "text-[#111827]" : "text-[#9CA3AF]"}>
          {value || placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E7EB] p-3 z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2">
            {/* Hours Column */}
            <div className="flex-1 flex flex-col">
              <span className="text-[11px] font-bold text-center text-[#6B7280] mb-2 uppercase tracking-wider">Jam</span>
              <div className="h-[180px] overflow-y-auto px-1 flex flex-col gap-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                {hours.map(h => (
                  <button
                    key={`h-${h}`}
                    onClick={() => handleHourSelect(h)}
                    className={`py-2 text-[14px] rounded-lg transition-colors ${hour === h ? 'bg-[#F0FDF4] text-[#356E3B] font-bold' : 'hover:bg-[#F3F4F6] text-[#374151] font-medium'}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px bg-gray-100 my-4"></div>

            {/* Minutes Column */}
            <div className="flex-1 flex flex-col">
              <span className="text-[11px] font-bold text-center text-[#6B7280] mb-2 uppercase tracking-wider">Menit</span>
              <div className="h-[180px] overflow-y-auto px-1 flex flex-col gap-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                {minutes.map(m => (
                  <button
                    key={`m-${m}`}
                    onClick={() => handleMinuteSelect(m)}
                    className={`py-2 text-[14px] rounded-lg transition-colors ${minute === m ? 'bg-[#F0FDF4] text-[#356E3B] font-bold' : 'hover:bg-[#F3F4F6] text-[#374151] font-medium'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full mt-3 py-2 bg-[#356E3B] hover:bg-[#2b5930] text-white rounded-[10px] text-[13px] font-bold transition-colors"
          >
            Terapkan
          </button>
        </div>
      )}
    </div>
  );
}
