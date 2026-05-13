'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// All markers use divIcon below — no default marker images needed (and unpkg.com is not in our CSP).
// Hoisted outside the component so the same object is reused on every render.
const PIN = L.divIcon({
  html: `<div style="
    background: #1C241C;
    border: 2px solid #E8B84B;
    border-radius: 50% 50% 50% 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(-45deg);
    box-shadow: 0 3px 12px rgba(232,184,75,0.35);
  ">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg);display:block;">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

function FitBounds({ events }: { events: any[] }) {
  const map = useMap()
  useEffect(() => {
    if (events.length === 0) return
    if (events.length === 1) {
      map.setView([events[0].latitude, events[0].longitude], 14)
      return
    }
    const bounds = L.latLngBounds(events.map(e => [e.latitude, e.longitude]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [events, map])
  return null
}

export default function MapView({ events, onSelect }: { events: any[], onSelect: (e: any) => void }) {
  const center: [number, number] = events.length > 0
    ? [events[0].latitude, events[0].longitude]
    : [48.7519, -122.4787]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', background: '#0D110D' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <FitBounds events={events} />
      {events.map(event => (
        <Marker
          key={event.id}
          position={[event.latitude, event.longitude]}
          icon={PIN}
          eventHandlers={{ click: () => onSelect(event) }}
        />
      ))}
    </MapContainer>
  )
}
