"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { Plus, Minus, Target } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export interface MapMarkerPoint {
  lat: number;
  lng: number;
  label: string;
  type?: "check-in" | "check-out" | "default";
}

const getCustomIcon = (label: string, type: "check-in" | "check-out" | "default" = "default") => {
  const isCheckOut = type === "check-out";
  const pinBg = isCheckOut ? "#EA580C" : "#356E3B";
  const badgeBg = isCheckOut ? "#9A3412" : "#1E4738";

  return new L.DivIcon({
    className: "custom-leaflet-icon",
    html: `
      <div class="flex flex-col items-center justify-start w-[120px]">
        <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.35));">
          <path 
            d="M17 1C8.163 1 1 8.163 1 17C1 27.5 14.5 41.2 16.3 42.9C16.7 43.3 17.3 43.3 17.7 42.9C19.5 41.2 33 27.5 33 17C33 8.163 25.837 1 17 1Z" 
            fill="${pinBg}" 
            stroke="#FFFFFF" 
            stroke-width="2.5" 
            stroke-linejoin="round"
          />
          <circle cx="17" cy="17" r="6" fill="#FFFFFF" />
          <circle cx="17" cy="17" r="3" fill="${pinBg}" />
        </svg>
        <div class="w-3.5 h-1 bg-black/25 rounded-full blur-[1px] -mt-0.5"></div>
        ${label ? `
          <div class="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap z-20 pointer-events-none" style="background-color: ${badgeBg};">
            ${label}
          </div>
        ` : ""}
      </div>
    `,
    iconSize: [120, 75],
    iconAnchor: [60, 43],
  });
};

function getOffsetCenter(
  map: L.Map, 
  lat: number, 
  lng: number, 
  bottomOffsetPx: number = 0, 
  zoom?: number
): L.LatLng {
  if (!bottomOffsetPx || bottomOffsetPx <= 0) return L.latLng(lat, lng);
  try {
    const currentZoom = zoom ?? map.getZoom() ?? 16;
    const point = map.project([lat, lng], currentZoom);
    const targetPoint = L.point(point.x, point.y + bottomOffsetPx / 2);
    return map.unproject(targetPoint, currentZoom);
  } catch {
    return L.latLng(lat, lng);
  }
}

function MapViewUpdater({ 
  markers, 
  defaultCenter,
  bottomOffset = 0,
}: { 
  markers: MapMarkerPoint[]; 
  defaultCenter: [number, number];
  bottomOffset?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (markers.length === 0) {
      const center = getOffsetCenter(map, defaultCenter[0], defaultCenter[1], bottomOffset, 16);
      map.setView(center, 16);
    } else if (markers.length === 1) {
      const currentZoom = map.getZoom() || 16;
      const center = getOffsetCenter(map, markers[0].lat, markers[0].lng, bottomOffset, currentZoom);
      map.setView(center, currentZoom);
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, 50 + bottomOffset],
          maxZoom: 16
        });
      }
    }
  }, [map, markers, defaultCenter, bottomOffset]);

  return null;
}

interface CustomMapControlsProps {
  center: [number, number];
  markers: MapMarkerPoint[];
  showRecenter?: boolean;
  position?: "top-right" | "bottom-right";
  isLocating?: boolean;
  bottomOffset?: number;
  onRecenter?: () => void;
}

function CustomMapControls({
  center,
  markers,
  showRecenter = true,
  position = "top-right",
  isLocating = false,
  bottomOffset = 0,
  onRecenter,
}: CustomMapControlsProps) {
  const map = useMap();
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlsRef.current) {
      L.DomEvent.disableClickPropagation(controlsRef.current);
      L.DomEvent.disableScrollPropagation(controlsRef.current);
    }
  }, []);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.zoomIn();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    map.zoomOut();
  };

  const handleRecenter = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (markers && markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { 
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, 50 + bottomOffset],
          maxZoom: 17 
        });
      }
    } else if (markers && markers.length === 1) {
      const targetZoom = Math.max(map.getZoom(), 17);
      const targetCenter = getOffsetCenter(map, markers[0].lat, markers[0].lng, bottomOffset, targetZoom);
      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 0.8,
      });
    } else {
      const targetZoom = Math.max(map.getZoom(), 17);
      const targetCenter = getOffsetCenter(map, center[0], center[1], bottomOffset, targetZoom);
      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 0.8,
      });
    }

    if (onRecenter) {
      onRecenter();
    }
  };

  const posClass =
    position === "bottom-right"
      ? "bottom-3 right-3 flex flex-col gap-2"
      : "top-6 right-4 flex flex-col gap-3";

  return (
    <div
      ref={controlsRef}
      className={`absolute ${posClass} z-[1000] pointer-events-auto select-none`}
    >
      <div className="bg-white rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden border border-gray-100">
        <button
          type="button"
          onClick={handleZoomIn}
          onDoubleClick={(e) => e.stopPropagation()}
          title="Perbesar (Zoom in)"
          aria-label="Perbesar"
          className="w-[42px] h-[42px] flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 text-gray-700 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          onDoubleClick={(e) => e.stopPropagation()}
          title="Perkecil (Zoom out)"
          aria-label="Perkecil"
          className="w-[42px] h-[42px] flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      {showRecenter && (
        <button
          type="button"
          onClick={handleRecenter}
          onDoubleClick={(e) => e.stopPropagation()}
          title="Fokus ke lokasi saat ini"
          aria-label="Fokus ke lokasi saat ini"
          className="w-[42px] h-[42px] bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 border border-gray-100 transition-all active:scale-95 text-gray-700 hover:text-[#1E4738] cursor-pointer"
        >
          <Target
            className={`w-5 h-5 transition-transform ${
              isLocating ? "animate-spin text-[#356E3B]" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

export interface MapLocationProps {
  center?: [number, number];
  label?: string;
  markers?: MapMarkerPoint[];
  showControls?: boolean;
  showRecenter?: boolean;
  controlsPosition?: "top-right" | "bottom-right";
  isLocating?: boolean;
  bottomOffset?: number;
  onRecenter?: () => void;
}

export default function MapLocation({ 
  center = [-7.2564186, 112.4882029],
  label = "Posisi Anda",
  markers,
  showControls = true,
  showRecenter = true,
  controlsPosition = "top-right",
  isLocating = false,
  bottomOffset = 0,
  onRecenter,
}: MapLocationProps) {
  const activeMarkers: MapMarkerPoint[] =
    markers && markers.length > 0
      ? markers
      : [{ lat: center[0], lng: center[1], label, type: "default" }];

  const initialCenter: [number, number] =
    activeMarkers.length > 0
      ? [activeMarkers[0].lat, activeMarkers[0].lng]
      : center;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={initialCenter} 
        zoom={16} 
        scrollWheelZoom={true} 
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={false}
        maxZoom={19}
        minZoom={3}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater 
          markers={activeMarkers} 
          defaultCenter={center} 
          bottomOffset={bottomOffset} 
        />

        {showControls && (
          <CustomMapControls 
            center={initialCenter}
            markers={activeMarkers}
            showRecenter={showRecenter}
            position={controlsPosition}
            isLocating={isLocating}
            bottomOffset={bottomOffset}
            onRecenter={onRecenter}
          />
        )}

        {activeMarkers.map((marker, index) => {
          const isCheckOut = marker.type === "check-out";
          const circleColor = isCheckOut ? "#EA580C" : "#1E4738";

          return (
            <div key={`marker-group-${index}-${marker.lat}-${marker.lng}`}>
              <Circle 
                center={[marker.lat, marker.lng]} 
                radius={80}
                pathOptions={{ 
                  color: circleColor, 
                  fillColor: circleColor, 
                  fillOpacity: 0.1, 
                  weight: 2, 
                  dashArray: "5, 5" 
                }} 
              />
              <Marker 
                position={[marker.lat, marker.lng]} 
                icon={getCustomIcon(marker.label, marker.type)} 
              />
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
