"use client";

import { useState } from "react";
import { TrendingUp, Users, Building2, CalendarDays } from "lucide-react";

export interface TrendItem {
  date: string;
  label: string;
  companies: number;
  users: number;
  attendances: number;
}

interface GrowthChartProps {
  data: TrendItem[];
  isLoading?: boolean;
}

type MetricType = "attendances" | "users" | "companies";

export function GrowthChart({ data, isLoading = false }: GrowthChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("attendances");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metricConfigs: Record<
    MetricType,
    { label: string; color: string; bgFill: string; icon: any }
  > = {
    attendances: {
      label: "Presensi Harian",
      color: "#10B981",
      bgFill: "#ECFDF5",
      icon: CalendarDays,
    },
    users: {
      label: "Pengguna Baru",
      color: "#3B82F6",
      bgFill: "#EFF6FF",
      icon: Users,
    },
    companies: {
      label: "Perusahaan Baru",
      color: "#8B5CF6",
      bgFill: "#F5F3FF",
      icon: Building2,
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  // Ekstraksi nilai untuk grafik
  const values = data.map((d) => d[activeMetric]);
  const maxValue = Math.max(...values, 4); // Minimal skala 4 agar grafik tidak flat jika data kecil
  const totalValue = values.reduce((acc, curr) => acc + curr, 0);

  // Perhitungan path SVG untuk grafik area halus
  const chartHeight = 160;
  const chartWidth = 600;
  const paddingX = 20;
  const paddingY = 20;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const points = data.map((d, index) => {
    const x =
      data.length > 1
        ? paddingX + (index / (data.length - 1)) * plotWidth
        : chartWidth / 2;
    const y =
      chartHeight - paddingY - (d[activeMetric] / maxValue) * plotHeight;
    return { x, y, value: d[activeMetric], label: d.label, date: d.date };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
      : "";

  return (
    <div className="bg-white border border-[#E8F0EA] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#356E3B]" />
            <h3 className="text-[16px] font-bold text-[#111827]">
              Tren Pertumbuhan Platform
            </h3>
          </div>
          <span className="text-[12px] text-[#6B7280]">
            Total dalam periode terpilih:{" "}
            <strong className="text-[#111827] font-extrabold">{totalValue}</strong>{" "}
            {currentConfig.label.toLowerCase()}
          </span>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-[14px] shrink-0 self-start sm:self-auto">
          {(Object.keys(metricConfigs) as MetricType[]).map((key) => {
            const conf = metricConfigs[key];
            const Icon = conf.icon;
            const isTabActive = activeMetric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveMetric(key);
                  setHoveredIndex(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isTabActive ? conf.color : undefined }} />
                <span>{conf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative w-full h-[180px] mt-2 select-none">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[12.5px] text-gray-400">
            Tidak ada data pada periode ini
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="#F3F4F6"
                strokeWidth="1.5"
              />
              <line
                x1={paddingX}
                y1={chartHeight / 2}
                x2={chartWidth - paddingX}
                y2={chartHeight / 2}
                stroke="#F3F4F6"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Area fill */}
              <path d={areaD} fill={`url(#gradient-${activeMetric})`} />

              {/* Stroke line */}
              <path
                d={pathD}
                fill="none"
                stroke={currentConfig.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Dots & Hover Triggers */}
              {points.map((p, idx) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <g key={idx}>
                    {/* Invisible hover trigger column */}
                    <rect
                      x={p.x - 15}
                      y={0}
                      width={30}
                      height={chartHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Point Circle */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : p.value > 0 ? 3 : 2}
                      fill={isHovered ? currentConfig.color : "#FFFFFF"}
                      stroke={currentConfig.color}
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150 pointer-events-none"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Popup */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div
                className="absolute -top-3 z-20 pointer-events-none transform -translate-x-1/2 bg-[#111827] text-white text-[11px] py-1.5 px-3 rounded-[12px] shadow-lg flex flex-col items-center gap-0.5 animate-in fade-in duration-150"
                style={{
                  left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                }}
              >
                <span className="text-white/60 text-[10px]">{points[hoveredIndex].label}</span>
                <span className="font-bold">
                  {points[hoveredIndex].value} {currentConfig.label}
                </span>
                <div className="absolute -bottom-1 w-2 h-2 bg-[#111827] rotate-45 transform" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Date Axis Labels */}
      <div className="flex items-center justify-between text-[10.5px] text-gray-400 font-medium px-2 pt-2 border-t border-gray-100">
        <span>{data[0]?.label || "Mulai"}</span>
        <span>{data[Math.floor(data.length / 2)]?.label || "Tengah"}</span>
        <span>{data[data.length - 1]?.label || "Hari Ini"}</span>
      </div>
    </div>
  );
}
