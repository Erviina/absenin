import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "inline";
  size?: "sm" | "md";
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Pilih...", 
  className = "", 
  variant = "default",
  size = "md"
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSmall = size === "sm";

  return (
    <div className={`relative min-w-0 ${isOpen ? 'z-30' : 'z-10'} ${variant === 'default' ? 'w-full' : 'w-auto'}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === 'default'
            ? isSmall
              ? `w-full min-w-0 h-[38px] border ${isOpen ? 'border-[#356E3B] ring-1 ring-[#356E3B]' : 'border-[#E5E7EB] hover:border-[#356E3B]'} rounded-xl pl-3 pr-7 text-xs text-[#111827] bg-white font-medium cursor-pointer transition-all flex items-center justify-between select-none relative ${className}`
              : `w-full min-w-0 h-[46px] sm:h-[48px] border ${isOpen ? 'border-[#356E3B] ring-1 ring-[#356E3B]' : 'border-[#E5E7EB] hover:border-[#356E3B]'} rounded-[14px] pl-3.5 sm:pl-4 pr-8 sm:pr-9 text-[13px] sm:text-[14px] text-[#111827] bg-white font-medium cursor-pointer transition-all flex items-center justify-between select-none relative ${className}`
            : `flex items-center justify-center gap-1 font-bold text-[#111827] text-[15px] cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors select-none ${className}`
        }
      >
        <span className={`truncate leading-none text-left flex-1 ${selectedOption ? "text-[#111827]" : (variant === 'default' ? "text-[#9CA3AF]" : "text-[#111827]")}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`text-[#6B7280] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} ${variant === 'default' ? (isSmall ? 'w-3.5 h-3.5 absolute right-2.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5 absolute right-3 sm:right-3.5') : 'w-4 h-4'}`} 
          strokeWidth={2.5} 
        />
      </div>

      {isOpen && (
        <div className={`absolute top-[calc(100%+6px)] ${variant === 'default' ? 'left-0 right-0 min-w-[140px]' : 'left-1/2 -translate-x-1/2 min-w-[120px]'} bg-white ${isSmall ? 'rounded-xl p-1' : 'rounded-[16px] p-1.5'} shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E7EB] z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto`}>
          {options.length === 0 ? (
            <div className={`p-3 text-center text-gray-400 ${isSmall ? 'text-xs' : 'text-[13px]'} font-medium`}>
              Tidak ada pilihan
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between gap-2 ${isSmall ? 'p-2 rounded-lg' : 'p-2.5 rounded-[12px]'} cursor-pointer transition-colors ${
                  value === option.value ? 'bg-[#F0FDF4] text-[#356E3B]' : 'hover:bg-[#F3F4F6] text-[#374151]'
                }`}
              >
                <span className={`${isSmall ? 'text-xs' : 'text-[13px] sm:text-[14px]'} truncate flex-1 text-left ${value === option.value ? 'font-bold' : 'font-medium'}`}>
                  {option.label}
                </span>
                {value === option.value && <Check className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-[#356E3B] shrink-0`} strokeWidth={3} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
