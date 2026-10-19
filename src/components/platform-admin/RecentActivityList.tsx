"use client";

import { Activity, Clock, MapPin } from "lucide-react";

export interface ActivityItem {
  id: string;
  work_mode: string;
  check_in_time: string;
  user_name: string;
  user_avatar: string | null;
  company_name: string;
  is_late: boolean;
}

interface RecentActivityListProps {
  activities: ActivityItem[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return (
        d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB"
      );
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#356E3B]" />
          <h3 className="text-[16px] font-bold text-[#111827]">
            Aktivitas Presensi Terakhir Platform
          </h3>
        </div>
        <span className="text-[11.5px] font-semibold text-gray-500">
          Live Platform Stream
        </span>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-[12.5px]">
            Belum ada aktivitas presensi
          </div>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-[16px] bg-[#F9FBFA] border border-[#EEF5F0] hover:border-gray-200 transition-colors gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.user_avatar ? (
                  <img
                    src={item.user_avatar}
                    alt={item.user_name}
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#1E3F2B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {item.user_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[13px] text-gray-900 truncate">
                    {item.user_name}
                  </span>
                  <span className="text-[11px] text-[#5C786C] truncate font-medium">
                    {item.company_name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.work_mode === "WFH"
                      ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                      : "bg-[#EEF5F0] text-[#1E4738] border border-[#DCE9DF]"
                  }`}
                >
                  {item.work_mode}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.is_late
                      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  }`}
                >
                  {item.is_late ? "Terlambat" : "Disiplin"}
                </span>

                <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 font-medium pl-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{formatTime(item.check_in_time)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
