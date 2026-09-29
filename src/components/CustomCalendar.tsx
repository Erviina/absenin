import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  minDate?: string;
}

export function CustomCalendar({ selectedDate, onSelect, minDate }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="bg-white rounded-[24px] border border-[#E5E7EB] p-4 mt-4 shadow-sm">
      <div className="flex justify-between items-center mb-4 px-2">
        <button 
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#4B5563]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-bold text-[#111827] text-[15px]">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button 
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#4B5563]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[#9CA3AF] text-[11px] font-bold">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {padding.map(p => (
          <div key={`padding-${p}`} className="h-9" />
        ))}
        {days.map(day => {
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          
          // Check if disabled because it's before minDate
          // (String comparison works perfectly for YYYY-MM-DD format)
          const isDisabled = !!(minDate && dateStr < minDate);

          return (
            <button
              key={day}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(dateStr)}
              className={`
                h-9 flex items-center justify-center rounded-full text-[14px] font-medium transition-colors
                ${isDisabled 
                  ? "text-[#D1D5DB] cursor-not-allowed"
                  : isSelected 
                    ? "bg-[#2D5A3F] text-white shadow-sm" 
                    : isToday 
                      ? "bg-[#E8F3EB] text-[#2D5A3F]" 
                      : "text-[#374151] hover:bg-gray-100"}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
