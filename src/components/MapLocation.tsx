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
      <div class="flex flex-col items-center">
        <div class="w-[52px] h-[52px] rounded-[20px] rounded-bl-[6px] rotate-45 flex items-center justify-center shadow-lg border-[3px] border-white relative z-20" style="background-color: ${pinBg}">
          <div class="w-5 h-5 bg-white rounded-full -rotate-45 flex items-center justify-center">
            <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${pinBg}"></div>
          </div>
        </div>
        <div class="text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md mt-1 absolute top-[55px] whitespace-nowrap z-20 pointer-events-none" style="background-color: ${badgeBg}">
          ${label}
        </div>
      </div>
    `,
    iconSize: [52, 80],
    iconAnchor: [26, 48],
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
