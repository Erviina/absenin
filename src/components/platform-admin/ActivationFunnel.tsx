"use client";

import { CheckCircle2, ChevronRight, Layers } from "lucide-react";

export interface FunnelStep {
  step: string;
  count: number;
  percent: number;
}

interface ActivationFunnelProps {
  data: FunnelStep[];
}

export function ActivationFunnel({ data }: ActivationFunnelProps) {
  return (
    <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#356E3B]" />
          <h3 className="text-[16px] font-bold text-[#111827]">
            Funnel Aktivasi Perusahaan
          </h3>
        </div>
        <span className="text-[11.5px] font-semibold text-[#5C786C] bg-[#EEF5F0] border border-[#DCE9DF] px-2.5 py-1 rounded-full">
          Onboarding Lifecycle
        </span>
      </div>

      <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">
        Mengukur tingkat konversi tenant baru sejak pendaftaran hingga adopsi aktif di platform Absenin.
      </p>

      <div className="space-y-3.5">
        {data.map((item, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === data.length - 1;

          return (
            <div key={item.step} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-bold ${
                      isFirst
                        ? "bg-[#1E3F2B] text-white"
                        : "bg-gray-100 text-gray-700 font-mono"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-gray-800">{item.step}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-extrabold text-[#111827]">{item.count}</span>
                  <span className="text-[11px] text-gray-400">({item.percent}%)</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLast
                      ? "bg-gradient-to-r from-emerald-500 to-[#1E3F2B]"
                      : "bg-emerald-600"
                  }`}
                  style={{ width: `${Math.max(item.percent, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
