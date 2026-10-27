"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, X } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
  minTime?: string; // HH:mm format
}

export function CustomTimePicker({ 
  value, 
  onChange, 
  placeholder = "Pilih Waktu", 
  className = "",
  minTime
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to ensure HH:mm formatting
  const formatTimeHHmm = (t?: string | null): string => {
    if (!t) return "";
    const parts = t.trim().split(":");
    if (parts.length >= 2) {
      const h = (parts[0] || "08").padStart(2, "0");
      const m = (parts[1] || "00").padStart(2, "0");
      return `${h}:${m}`;
    }
    return t;
  };

  const displayValue = formatTimeHHmm(value);

  const initialHour = value ? (value.split(":")[0] || "08").padStart(2, "0") : "08";
  const initialMinute = value ? (value.split(":")[1] || "00").padStart(2, "0") : "00";

  const [tempHour, setTempHour] = useState(initialHour);
  const [tempMinute, setTempMinute] = useState(initialMinute);

  const hourButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const minuteButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const isHourDisabled = (h: string) => {
    if (!minTime) return false;
    const [minH] = minTime.split(":").map(Number);
    return Number(h) < minH;
  };

  const isMinuteDisabled = (m: string) => {
    if (!minTime) return false;
    const [minH, minM] = minTime.split(":").map(Number);
    const currentH = Number(tempHour);
    if (currentH < minH) return true;
    if (currentH === minH && Number(m) <= minM) return true;
    return false;
  };

  const isSelectedTimeDisabled = () => {
    if (!minTime) return false;
    const [minH, minM] = minTime.split(":").map(Number);
    const currentH = Number(tempHour);
    const currentM = Number(tempMinute);
    return currentH < minH || (currentH === minH && currentM <= minM);
  };

  useEffect(() => {
    if (value) {
      const parts = value.split(":");
      setTempHour((parts[0] || "08").padStart(2, "0"));
      setTempMinute((parts[1] || "00").padStart(2, "0"));
    }
  }, [value]);

  // When modal opens, sync temp with current value and auto-scroll into view
  useEffect(() => {
    if (isOpen) {
      const parts = value ? value.split(":") : ["08", "00"];
      let targetHour = (parts[0] || "08").padStart(2, "0");
      let targetMinute = (parts[1] || "00").padStart(2, "0");

      if (minTime) {
        const [minH, minM] = minTime.split(":").map(Number);
        const curH = Number(targetHour);
        const curM = Number(targetMinute);
        if (curH < minH || (curH === minH && curM <= minM)) {
          if (minM < 59) {
            targetHour = String(minH).padStart(2, "0");
            targetMinute = String(minM + 1).padStart(2, "0");
          } else if (minH < 23) {
            targetHour = String(minH + 1).padStart(2, "0");
            targetMinute = "00";
          }
        }
      }

      setTempHour(targetHour);
      setTempMinute(targetMinute);

      const timer = setTimeout(() => {
        if (hourButtonRefs.current[targetHour]) {
          hourButtonRefs.current[targetHour]?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        if (minuteButtonRefs.current[targetMinute]) {
          minuteButtonRefs.current[targetMinute]?.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 80);

      return () => clearTimeout(timer);
    }
  }, [isOpen, value, minTime]);

  const handleSelectHour = (h: string) => {
    if (isHourDisabled(h)) return;
    setTempHour(h);
    if (minTime) {
      const [minH, minM] = minTime.split(":").map(Number);
      if (Number(h) === minH && Number(tempMinute) <= minM) {
        if (minM < 59) {
          setTempMinute(String(minM + 1).padStart(2, "0"));
        }
      }
    }
  };

  const handleSelectMinute = (m: string) => {
    if (isMinuteDisabled(m)) return;
    setTempMinute(m);
  };

  const handleApply = () => {
    if (isSelectedTimeDisabled()) return;
    onChange(`${tempHour}:${tempMinute}`);
    setIsOpen(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className={`relative min-w-0 ${className}`}>
      {/* Input Display Button */}
      <div 
        onClick={() => setIsOpen(true)}
        className={`w-full min-w-0 h-[46px] sm:h-[48px] border rounded-[14px] pl-9 sm:pl-10 pr-3 sm:pr-4 flex items-center cursor-pointer transition-all bg-white select-none relative ${
          isOpen ? "border-[#356E3B] ring-1 ring-[#356E3B]" : "border-[#E5E7EB] hover:border-[#356E3B]"
        }`}
      >
        <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#356E3B] absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" strokeWidth={2.5} />
        <span className={`truncate text-[13px] sm:text-[14px] font-medium leading-none ${displayValue ? "text-[#111827]" : "text-[#9CA3AF]"}`}>
          {displayValue || placeholder}
        </span>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="relative w-full max-w-[320px] bg-white rounded-[24px] shadow-2xl border border-gray-100 p-5 z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E8F3EB] flex items-center justify-center text-[#356E3B]">
                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <span className="text-[15px] font-bold text-[#1E4738]">Pilih Waktu</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Time Preview Display */}
            <div className="bg-[#f4f9f6] border border-[#eef5f0] rounded-[16px] py-3 px-4 flex items-center justify-center gap-3">
              <div className="text-[30px] font-extrabold text-[#1E4738] tracking-wider font-mono">
                {tempHour}
              </div>
              <span className="text-[26px] font-bold text-[#356E3B] animate-pulse">:</span>
              <div className="text-[30px] font-extrabold text-[#1E4738] tracking-wider font-mono">
                {tempMinute}
              </div>
            </div>

            {/* Columns (Jam & Menit) */}
            <div className="flex gap-3">
              {/* Hours Column */}
              <div className="flex-1 flex flex-col">
                <span className="text-[11px] font-bold text-center text-[#5C786C] mb-1.5 uppercase tracking-wider">
                  Jam
                </span>
                <div 
                  className="h-[180px] overflow-y-auto px-1 flex flex-col gap-1 rounded-xl bg-gray-50/70 p-1.5 border border-gray-100 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {hours.map(h => {
                    const disabled = isHourDisabled(h);
                    return (
                      <button
                        key={`h-${h}`}
                        type="button"
                        disabled={disabled}
                        ref={el => { hourButtonRefs.current[h] = el; }}
                        onClick={() => handleSelectHour(h)}
                        className={`py-2 text-[14px] rounded-lg transition-all ${
                          disabled
                            ? 'text-gray-300 opacity-40 cursor-not-allowed pointer-events-none'
                            : tempHour === h 
                              ? 'bg-[#356E3B] text-white font-bold shadow-sm active:scale-95' 
                              : 'hover:bg-gray-100 text-gray-600 font-medium active:scale-95'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div className="flex-1 flex flex-col">
                <span className="text-[11px] font-bold text-center text-[#5C786C] mb-1.5 uppercase tracking-wider">
                  Menit
                </span>
                <div 
                  className="h-[180px] overflow-y-auto px-1 flex flex-col gap-1 rounded-xl bg-gray-50/70 p-1.5 border border-gray-100 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {minutes.map(m => {
                    const disabled = isMinuteDisabled(m);
                    return (
                      <button
                        key={`m-${m}`}
                        type="button"
                        disabled={disabled}
                        ref={el => { minuteButtonRefs.current[m] = el; }}
                        onClick={() => handleSelectMinute(m)}
                        className={`py-2 text-[14px] rounded-lg transition-all ${
                          disabled
                            ? 'text-gray-300 opacity-40 cursor-not-allowed pointer-events-none'
                            : tempMinute === m 
                              ? 'bg-[#356E3B] text-white font-bold shadow-sm active:scale-95' 
                              : 'hover:bg-gray-100 text-gray-600 font-medium active:scale-95'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 text-[13px] font-bold transition-colors active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isSelectedTimeDisabled()}
                className={`flex-1 py-2.5 rounded-full text-[13px] font-bold shadow-sm transition-all active:scale-95 ${
                  isSelectedTimeDisabled()
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                    : "bg-[#356E3B] hover:bg-[#2b5930] text-white"
                }`}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
