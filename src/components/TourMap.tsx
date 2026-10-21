import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { pointName, type TourLanguage, type TourPageMapPoint } from '../content/tour-pages'

const ISTANBUL: L.LatLngTuple = [41.03, 29.0]

// Interactive map with numbered pins drawn by the site (OpenStreetMap tiles, no API key).
// A route connects the pins in order; onMapClick lets the admin place a new pin.
export default function TourMap({ points, route = false, language, onMapClick, className = '' }: {
  points: TourPageMapPoint[]; route?: boolean; language: TourLanguage; onMapClick?: (latitude: number, longitude: number) => void; className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const clickHandler = useRef(onMapClick)
  useEffect(() => { clickHandler.current = onMapClick }, [onMapClick])

  const fit = useCallback(() => {
    if (!map.current) return
    if (points.length === 1) map.current.setView([points[0].latitude, points[0].longitude], 15)
    else if (points.length > 1) map.current.fitBounds(L.latLngBounds(points.map(point => [point.latitude, point.longitude])), { padding: [40, 40], maxZoom: 15 })
    else map.current.setView(ISTANBUL, 12)
  }, [points])

  useEffect(() => {
    if (!container.current) return
    const instance = L.map(container.current, { center: ISTANBUL, zoom: 12, scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(instance)
    instance.on('click', event => clickHandler.current?.(event.latlng.lat, event.latlng.lng))
    layer.current = L.layerGroup().addTo(instance)
    map.current = instance
    // The map is created before its container has its final size (e.g. inside a grid); keep tiles aligned.
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => { observer.disconnect(); instance.remove(); map.current = null; layer.current = null }
  }, [])

  useEffect(() => {
    if (!layer.current) return
    layer.current.clearLayers()
    if (route && points.length > 1)
      L.polyline(points.map(point => [point.latitude, point.longitude]), { color: '#1f478c', weight: 3, opacity: .8, dashArray: '6 8' }).addTo(layer.current)
    points.forEach((point, index) => {
      const icon = L.divIcon({ className: '', html: `<span class="tour-map-pin${index === 0 ? ' is-first' : ''}">${index + 1}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] })
      // Names come from the admin: pass a text node so they are never parsed as HTML.
      const label = document.createElement('span'); label.textContent = pointName(point, language)
      L.marker([point.latitude, point.longitude], { icon, keyboard: false }).bindTooltip(label, { direction: 'top', offset: [0, -14] }).addTo(layer.current!)
    })
    fit()
  }, [points, route, language, fit])

  return <div className={`tour-map ${className}`}>
    <div ref={container} className="tour-map__canvas" />
    {points.length > 0 && <button type="button" className="tour-map__recenter" onClick={fit}><LocateFixed size={15} />{language === 'tr' ? 'Yeniden ortala' : 'Recenter'}</button>}
  </div>
}
