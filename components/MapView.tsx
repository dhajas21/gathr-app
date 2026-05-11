'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// All markers use divIcon below — no default marker images needed (and unpkg.com is not in our CSP).

const createPin = (emoji: string) => L.divIcon({
  html: `<div style="
    background: #1C241C;
    border: 2px solid #E8B84B;
    border-radius: 50% 50% 50% 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "><span style="transform: rotate(45deg); display: block;">${emoji}</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
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

const catEmoji = (cat: string) => {
  const map: Record<string, string> = { Music: '🎸', Fitness: '🏃', 'Food & Drink': '🍺', Tech: '💻', Outdoors: '🥾' }
  return map[cat] || '🎉'
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
          icon={createPin(catEmoji(event.category))}
          eventHandlers={{ click: () => onSelect(event) }}
        />
      ))}
    </MapContainer>
  )
}
