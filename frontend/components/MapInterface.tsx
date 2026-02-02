'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PolygonPoint } from '@/types';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

interface MapInterfaceProps {
    onPolygonChange: (points: PolygonPoint[]) => void;
    onAreaChange: (area: number) => void;
    initialPolygon?: PolygonPoint[];
}

const MapInterface: React.FC<MapInterfaceProps> = ({ onPolygonChange, onAreaChange, initialPolygon = [] }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const polygonRef = useRef<L.Polygon | null>(null);
    const satelliteLayerRef = useRef<L.TileLayer | null>(null);
    const streetLayerRef = useRef<L.TileLayer | null>(null);
    const locationMarkerRef = useRef<L.Marker | null>(null);
    const locationCircleRef = useRef<L.Circle | null>(null);
    const measurementLabelsRef = useRef<L.Marker[]>([]);
    const drawingVerticesRef = useRef<{ lat: number, lng: number }[]>([]);

    const [locating, setLocating] = useState(false);
    const [mapType, setMapType] = useState<'reality' | 'clean'>('reality');

    const calculateDistance = React.useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, []);

    const formatDistance = React.useCallback((meters: number): string => {
        if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
        return `${meters.toFixed(1)} m`;
    }, []);

    const clearMeasurementLabels = React.useCallback(() => {
        measurementLabelsRef.current.forEach(label => {
            if (mapRef.current && label) mapRef.current.removeLayer(label);
        });
        measurementLabelsRef.current = [];
    }, []);

    const createMeasurementLabel = React.useCallback((p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) => {
        if (!mapRef.current) return;
        const midLat = (p1.lat + p2.lat) / 2;
        const midLng = (p1.lng + p2.lng) / 2;
        const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

        const label = L.marker([midLat, midLng], {
            icon: L.divIcon({
                className: 'measurement-label',
                html: `<div style="
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          background: rgba(59, 130, 246, 0.9);
          padding: 2px 6px;
          border-radius: 4px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          white-space: nowrap;
          pointer-events: none;
          transform: translate(-50%, -50%);
        ">${formatDistance(distance)}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            }),
            interactive: false,
            zIndexOffset: 1000
        }).addTo(mapRef.current);

        measurementLabelsRef.current.push(label);
        return distance;
    }, [calculateDistance, formatDistance]);

    const updateMeasurementLabels = React.useCallback((layer: L.Polygon) => {
        if (!mapRef.current || !layer || typeof layer.getLatLngs !== 'function') return;
        clearMeasurementLabels();
        const latlngs = layer.getLatLngs() as L.LatLng[] | L.LatLng[][];
        const coords = Array.isArray(latlngs[0]) ? (latlngs[0] as L.LatLng[]) : (latlngs as L.LatLng[]);
        if (!coords || coords.length < 2) return;

        for (let i = 0; i < coords.length; i++) {
            const p1 = coords[i];
            const p2 = coords[(i + 1) % coords.length];
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

            const label = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'measurement-label',
                    html: `<div style="
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5);
            white-space: nowrap;
            pointer-events: none;
            transform: translate(-50%, -50%);
          ">${formatDistance(distance)}</div>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                }),
                interactive: false,
                zIndexOffset: 1000
            }).addTo(mapRef.current);
            measurementLabelsRef.current.push(label);
        }
    }, [calculateDistance, formatDistance, clearMeasurementLabels]);

    const calculatePolygonArea = React.useCallback((coords: L.LatLng[]) => {
        if (coords.length < 3) return 0;
        const toRad = (deg: number) => deg * Math.PI / 180;
        const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
        const latRad = toRad(avgLat);
        const WGS84_A = 6378137.0;
        const WGS84_E2 = 0.00669437999014;
        const sinLat = Math.sin(latRad);
        const cosLat = Math.cos(latRad);
        const metersPerDegLng = (Math.PI / 180) * WGS84_A * cosLat / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
        const metersPerDegLat = (Math.PI / 180) * WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5);

        let area = 0;
        for (let i = 0; i < coords.length; i++) {
            const j = (i + 1) % coords.length;
            const x1 = coords[i].lng * metersPerDegLng;
            const y1 = coords[i].lat * metersPerDegLat;
            const x2 = coords[j].lng * metersPerDegLng;
            const y2 = coords[j].lat * metersPerDegLat;
            area += (x1 * y2) - (x2 * y1);
        }
        return Math.abs(area / 2);
    }, []);

    const updateMetrics = React.useCallback((layer: L.Polygon) => {
        if (!layer || typeof layer.getLatLngs !== 'function') return;
        const latlngs = layer.getLatLngs() as L.LatLng[] | L.LatLng[][];
        const actual = Array.isArray(latlngs[0]) ? (latlngs[0] as L.LatLng[]) : (latlngs as L.LatLng[]);
        const points = actual.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
        const area = calculatePolygonArea(actual);
        onPolygonChange(points);
        onAreaChange(area);
        updateMeasurementLabels(layer);
    }, [calculatePolygonArea, onPolygonChange, onAreaChange, updateMeasurementLabels]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const karnatakaCenter: [number, number] = [12.9716, 77.5946];
        mapRef.current = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView(karnatakaCenter, 14);

        satelliteLayerRef.current = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            });

        streetLayerRef.current = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        (mapType === 'reality' ? satelliteLayerRef.current : streetLayerRef.current).addTo(mapRef.current);

        (mapRef.current as L.Map & { pm: { setGlobalOptions: (options: Record<string, unknown>) => void } }).pm.setGlobalOptions({
            allowSelfIntersection: false,
            snappable: true,
            snapDistance: 20,
            finishOn: 'dblclick',
            cursorMarker: true,
            editable: true,
            templineStyle: { color: '#3b82f6', weight: 2 },
            hintlineStyle: { color: '#3b82f6', dashArray: '5,5', weight: 1 },
        });

        (mapRef.current as L.Map & { pm: { addControls: (options: Record<string, unknown>) => void } }).pm.addControls({
            position: 'topleft',
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: true,
            drawRectangle: true,
            drawPolygon: true,
            editMode: true,
            dragMode: true,
            removalMode: true,
        });

        const attachEvents = (layer: L.Polygon) => {
        const events = ['pm:edit', 'pm:dragend', 'pm:vertexadded', 'pm:vertexremoved', 'pm:markerdragend'];
        events.forEach(evt => {
            layer.on(evt, () => updateMetrics(layer));
        });
    };

        if (initialPolygon.length >= 3) {
            const latlngs = initialPolygon.map(p => [p.lat, p.lng]);
            const restored = L.polygon(latlngs as L.LatLngExpression[], { color: '#3b82f6', fillOpacity: 0.25 }).addTo(mapRef.current);
            polygonRef.current = restored;
            attachEvents(restored);
            updateMeasurementLabels(restored);
            mapRef.current.fitBounds(restored.getBounds(), { padding: [50, 50] });
        }

        mapRef.current.on('pm:drawstart', (e: { workingLayer?: L.Layer }) => {
            drawingVerticesRef.current = [];
            clearMeasurementLabels();
            const workingLayer = e.workingLayer as L.Polygon | undefined;
            if (workingLayer) {
                workingLayer.on('pm:vertexadded', () => {
                    const latlngs = workingLayer.getLatLngs();
                    const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                    if (coords.length > 0) {
                        const latestCoord = coords[coords.length - 1];
                        const newVertex = { lat: latestCoord.lat, lng: latestCoord.lng };
                        if (drawingVerticesRef.current.length > 0) {
                            const prevVertex = drawingVerticesRef.current[drawingVerticesRef.current.length - 1];
                            if (prevVertex.lat !== newVertex.lat || prevVertex.lng !== newVertex.lng) {
                                createMeasurementLabel(prevVertex, newVertex);
                            }
                        }
                        if (!drawingVerticesRef.current.some(v => v.lat === newVertex.lat && v.lng === newVertex.lng)) {
                            drawingVerticesRef.current.push(newVertex);
                        }
                    }
                });
            }
        });

        mapRef.current.on('pm:create', (e: { layer: L.Polygon }) => {
            if (polygonRef.current && polygonRef.current !== e.layer) {
                mapRef.current.removeLayer(polygonRef.current);
            }
            polygonRef.current = e.layer;
            attachEvents(e.layer);
            updateMetrics(e.layer);
            clearMeasurementLabels();
            updateMeasurementLabels(e.layer);
        });

        mapRef.current.on('pm:remove', (e: { layer: L.Layer }) => {
            if (e.layer === polygonRef.current) {
                polygonRef.current = null;
                clearMeasurementLabels();
                onPolygonChange([]);
                onAreaChange(0);
            }
        });

        return () => {
            clearMeasurementLabels();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [calculatePolygonArea, createMeasurementLabel, initialPolygon, mapType, onAreaChange, onPolygonChange, updateMeasurementLabels, updateMetrics, clearMeasurementLabels]);

    // Handle initialPolygon changes (for loading saved parcels)
    useEffect(() => {
        if (!mapRef.current) return;

        // Always remove existing polygon and labels when initialPolygon changes
        if (polygonRef.current) {
            mapRef.current.removeLayer(polygonRef.current);
            polygonRef.current = null;
            clearMeasurementLabels();
        }

        if (initialPolygon.length < 3) {
            // If we're resetting to empty, also notify parent just in case
            // (though parents usually trigger this change)
            return;
        }

        const latlngs = initialPolygon.map(p => [p.lat, p.lng]);
        const restored = L.polygon(latlngs as L.LatLngExpression[], { color: '#3b82f6', fillOpacity: 0.25 }).addTo(mapRef.current);
        polygonRef.current = restored;

        // Attach edit events
        const events = ['pm:edit', 'pm:dragend', 'pm:vertexadded', 'pm:vertexremoved', 'pm:markerdragend'];
        events.forEach(evt => {
            restored.on(evt, () => updateMetrics(restored));
        });

        updateMeasurementLabels(restored);
        mapRef.current.fitBounds(restored.getBounds(), { padding: [50, 50] });
    }, [initialPolygon, updateMeasurementLabels, updateMetrics, clearMeasurementLabels]);

    useEffect(() => {
        if (!mapRef.current) return;
        if (mapType === 'reality') {
            if (streetLayerRef.current) mapRef.current.removeLayer(streetLayerRef.current);
            satelliteLayerRef.current.addTo(mapRef.current);
        } else {
            if (satelliteLayerRef.current) mapRef.current.removeLayer(satelliteLayerRef.current);
            streetLayerRef.current.addTo(mapRef.current);
        }
    }, [mapType]);


    const locateUser = () => {
        if (!mapRef.current) return;
        setLocating(true);
        mapRef.current.locate({ setView: true, maxZoom: 18 });
        mapRef.current.once('locationfound', (e: { latlng: L.LatLng; accuracy: number }) => {
            setLocating(false);
            if (locationMarkerRef.current) mapRef.current.removeLayer(locationMarkerRef.current);
            if (locationCircleRef.current) mapRef.current.removeLayer(locationCircleRef.current);
            locationCircleRef.current = L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3b82f6', weight: 1, fillOpacity: 0.15 }).addTo(mapRef.current);
            locationMarkerRef.current = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'flex items-center justify-center',
                    html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
                    iconSize: [16, 16]
                })
            }).addTo(mapRef.current);
        });
        mapRef.current.once('locationerror', () => { setLocating(false); alert("Position not found."); });
    };

    return (
        <div className="relative w-full h-full group">
            <div ref={mapContainerRef} className="h-full w-full z-0" />
            <div className="absolute bottom-6 left-6 z-[1000] flex flex-col space-y-3 pointer-events-none">
                <div className="flex flex-col space-y-2 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-xl border border-gray-100 flex items-center gap-1">
                        <button onClick={() => setMapType('reality')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mapType === 'reality' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Reality</button>
                        <button onClick={() => setMapType('clean')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mapType === 'clean' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Clean</button>
                    </div>
                    <button onClick={locateUser} className={`w-10 h-10 bg-white rounded-xl shadow-xl border border-gray-100 flex items-center justify-center transition-all ${locating ? 'bg-blue-50' : 'hover:bg-gray-50 active:scale-95'}`}>
                        <svg className={`w-4 h-4 ${locating ? 'animate-spin text-blue-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div className="absolute top-6 right-6 z-[1000] pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg border border-white/20 text-[9px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse`}></div>
                    <span>{mapType === 'reality' ? 'REALITY VIEW' : 'SCHEMATIC LAYOUT'}</span>
                </div>
            </div>
        </div>
    );
};

export default MapInterface;
