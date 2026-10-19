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
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Pilih...", 
  className = "", 
  variant = "default" 
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

  return (
    <div className={`relative min-w-0 ${variant === 'default' ? 'w-full' : 'w-auto'}`} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={
          variant === 'default'
            ? `w-full min-w-0 h-[46px] sm:h-[48px] border ${isOpen ? 'border-[#356E3B] ring-1 ring-[#356E3B]' : 'border-[#E5E7EB] hover:border-[#356E3B]'} rounded-[14px] pl-3.5 sm:pl-4 pr-8 sm:pr-9 text-[13px] sm:text-[14px] text-[#111827] bg-white font-medium cursor-pointer transition-all flex items-center justify-between select-none relative ${className}`
            : `flex items-center justify-center gap-1 font-bold text-[#111827] text-[15px] cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors select-none ${className}`
        }
      >
        <span className={`truncate leading-none text-left flex-1 ${selectedOption ? "text-[#111827]" : (variant === 'default' ? "text-[#9CA3AF]" : "text-[#111827]")}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`text-[#6B7280] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} ${variant === 'default' ? 'w-4 h-4 sm:w-4.5 sm:h-4.5 absolute right-3 sm:right-3.5' : 'w-4 h-4'}`} 
          strokeWidth={2.5} 
        />
      </div>

      {isOpen && (
        <div className={`absolute top-[calc(100%+6px)] ${variant === 'default' ? 'left-0 right-0 min-w-[140px]' : 'left-1/2 -translate-x-1/2 min-w-[120px]'} bg-white rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E7EB] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[250px] overflow-y-auto`}>
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-[12px] cursor-pointer transition-colors ${
                value === option.value ? 'bg-[#F0FDF4] text-[#356E3B]' : 'hover:bg-[#F3F4F6] text-[#374151]'
              }`}
            >
              <span className={`text-[13px] sm:text-[14px] truncate flex-1 text-left ${value === option.value ? 'font-bold' : 'font-medium'}`}>
                {option.label}
              </span>
              {value === option.value && <Check className="w-4 h-4 text-[#356E3B] shrink-0" strokeWidth={3} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
