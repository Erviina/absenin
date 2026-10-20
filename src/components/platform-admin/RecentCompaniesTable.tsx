"use client";

import Link from "next/link";
import { Building2, Users, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";

export interface CompanySummaryItem {
  id: string;
  name: string;
  created_at: string;
  avatar_company_url: string | null;
  member_count: number;
  attendance_count: number;
}

interface RecentCompaniesTableProps {
  companies: CompanySummaryItem[];
}

export function RecentCompaniesTable({ companies }: RecentCompaniesTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#356E3B]" />
          <h3 className="text-[16px] font-bold text-[#111827]">
            Perusahaan Baru Terdaftar
          </h3>
        </div>
        <Link
          href="/platform-admin/companies"
          className="text-[12px] font-bold text-[#1E3F2B] hover:text-[#356E3B] flex items-center gap-1 transition-colors"
        >
          <span>Lihat Semua</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <th className="pb-3 pl-1">Perusahaan</th>
              <th className="pb-3 text-center">Anggota</th>
              <th className="pb-3 text-center">Presensi</th>
              <th className="pb-3 text-right pr-1">Terdaftar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-[13px]">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400 text-[12.5px]">
                  Belum ada perusahaan terdaftar
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="py-3 pl-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[12px] bg-[#EEF5F0] text-[#1E4738] flex items-center justify-center shrink-0 font-bold text-[13px] overflow-hidden border border-[#DCE9DF]">
                        {c.avatar_company_url ? (
                          <img
                            src={c.avatar_company_url}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          c.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 truncate group-hover:text-[#1E3F2B] transition-colors">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono truncate">
                          ID: {c.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span>{c.member_count}</span>
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[11.5px] font-bold border border-emerald-100">
                      <span>{c.attendance_count}</span>
                    </span>
                  </td>

                  <td className="py-3 text-right pr-1 text-gray-500 text-[12px] font-medium">
                    {formatDate(c.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
