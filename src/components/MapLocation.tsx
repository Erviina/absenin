"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
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
          <div class="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap z-20 pointer-events-none border border-white/20" style="background-color: ${badgeBg};">
            ${label}
          </div>
        ` : ""}
      </div>
    `,
    iconSize: [120, 75],
    iconAnchor: [60, 43],
  });
};

function MapViewUpdater({ markers, defaultCenter }: { markers: MapMarkerPoint[]; defaultCenter: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (markers.length === 0) {
      map.setView(defaultCenter, 16);
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 16);
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16
        });
      }
    }
  }, [map, markers, defaultCenter]);

  return null;
}

export interface MapLocationProps {
  center?: [number, number];
  label?: string;
  markers?: MapMarkerPoint[];
}

export default function MapLocation({ 
  center = [-7.2564186, 112.4882029],
  label = "Posisi Anda",
  markers
}: MapLocationProps) {
  const activeMarkers: MapMarkerPoint[] =
    markers && markers.length > 0
      ? markers
      : [{ lat: center[0], lng: center[1], label, type: "default" }];

  const initialCenter: [number, number] =
    activeMarkers.length > 0
      ? [activeMarkers[0].lat, activeMarkers[0].lng]
      : center;

  const mapKey = activeMarkers
    .map((m) => `${m.lat.toFixed(5)},${m.lng.toFixed(5)}_${m.type || "def"}`)
    .join("|");

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        key={mapKey}
        center={initialCenter} 
        zoom={16} 
        scrollWheelZoom={true} 
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater markers={activeMarkers} defaultCenter={center} />

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
