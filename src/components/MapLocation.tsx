"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const getCustomIcon = (label: string) => new L.DivIcon({
  className: "custom-leaflet-icon",
  html: `
    <div class="flex flex-col items-center">
      <div class="w-[52px] h-[52px] bg-[#356E3B] rounded-[20px] rounded-bl-[6px] rotate-45 flex items-center justify-center shadow-lg border-[3px] border-white relative z-20">
        <div class="w-5 h-5 bg-white rounded-full -rotate-45"></div>
      </div>
      <div class="bg-[#2c3e35] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md mt-1 absolute top-[55px] whitespace-nowrap z-20">
        ${label}
      </div>
    </div>
  `,
  iconSize: [52, 80],
  iconAnchor: [26, 48], // Pointing the bottom-left corner of the rotated box to the center
});

interface MapLocationProps {
  center?: [number, number];
  label?: string;
}

export default function MapLocation({ 
  center = [-7.2564186, 112.4882029],
  label = "Posisi Anda"
}: MapLocationProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={16} 
        scrollWheelZoom={true} 
        style={{ width: "100%", height: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle 
          center={center} 
          radius={80} // Radius in meters
          pathOptions={{ 
            color: '#1E4738', 
            fillColor: '#1E4738', 
            fillOpacity: 0.1, 
            weight: 2, 
            dashArray: '5, 5' 
          }} 
        />
        <Marker position={center} icon={getCustomIcon(label)} />
      </MapContainer>
    </div>
  );
}
