
import React, { useEffect, useRef, useState } from 'react';
import { PolygonPoint } from '../types';

declare const L: any;

interface MapInterfaceProps {
  onPolygonChange: (points: PolygonPoint[]) => void;
  onAreaChange: (area: number) => void;
  initialPolygon?: PolygonPoint[];
}

const MapInterface: React.FC<MapInterfaceProps> = ({ onPolygonChange, onAreaChange, initialPolygon = [] }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const satelliteLayerRef = useRef<any>(null);
  const streetLayerRef = useRef<any>(null);
  const locationMarkerRef = useRef<any>(null);
  const locationCircleRef = useRef<any>(null);
  
  const [locating, setLocating] = useState(false);
  const [mapType, setMapType] = useState<'reality' | 'clean'>('reality');

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

    // Global Geoman Settings
    mapRef.current.pm.setGlobalOptions({
      allowSelfIntersection: false,
      snappable: true,
      snapDistance: 20,
      cursorMarker: true,
      editable: true,
      // Precision drawing: Right click to delete vertices is default in PM
      // but we ensure hintlines look clean
      templineStyle: { color: '#3b82f6', weight: 2 },
      hintlineStyle: { color: '#3b82f6', dashArray: '5,5', weight: 1 },
    });

    mapRef.current.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: true, // Allow for complex paths
      drawRectangle: true,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      removalMode: true,
    });

    const attachEvents = (layer: any) => {
      const events = ['pm:edit', 'pm:dragend', 'pm:vertexadded', 'pm:vertexremoved', 'pm:markerdragend'];
      events.forEach(evt => {
        layer.on(evt, () => updateMetrics(layer));
      });
    };

    // Restore persistence
    if (initialPolygon.length >= 3) {
      const latlngs = initialPolygon.map(p => [p.lat, p.lng]);
      const restored = L.polygon(latlngs, { color: '#3b82f6', fillOpacity: 0.25 }).addTo(mapRef.current);
      polygonRef.current = restored;
      attachEvents(restored);
      mapRef.current.fitBounds(restored.getBounds(), { padding: [50, 50] });
    }

    mapRef.current.on('pm:create', (e: any) => {
      if (polygonRef.current && polygonRef.current !== e.layer) {
        mapRef.current.removeLayer(polygonRef.current);
      }
      polygonRef.current = e.layer;
      attachEvents(e.layer);
      updateMetrics(e.layer);
    });

    mapRef.current.on('pm:remove', (e: any) => {
      if (e.layer === polygonRef.current) {
        polygonRef.current = null;
        onPolygonChange([]);
        onAreaChange(0);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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

  const updateMetrics = (layer: any) => {
    const latlngs = layer.getLatLngs();
    const actual = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    const points = actual.map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
    const area = calculatePolygonArea(actual);
    onPolygonChange(points);
    onAreaChange(area);
  };

  const calculatePolygonArea = (coords: any[]) => {
    // Robust spherical area implementation
    const radius = 6378137;
    let area = 0;
    if (coords.length > 2) {
      for (let i = 0; i < coords.length; i++) {
        const p1 = coords[i];
        const p2 = coords[(i + 1) % coords.length];
        area += (p2.lng - p1.lng) * (Math.PI / 180) * (2 + Math.sin(p1.lat * (Math.PI / 180)) + Math.sin(p2.lat * (Math.PI / 180)));
      }
      area = area * radius * radius / 2.0;
    }
    return Math.abs(area);
  };

  const locateUser = () => {
    if (!mapRef.current) return;
    setLocating(true);
    mapRef.current.locate({ setView: true, maxZoom: 18 });
    mapRef.current.once('locationfound', (e: any) => {
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
      
      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col space-y-3 pointer-events-none">
        <div className="flex flex-col space-y-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-xl border border-gray-100 flex items-center gap-1">
            <button 
              onClick={() => setMapType('reality')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mapType === 'reality' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >Reality</button>
            <button 
              onClick={() => setMapType('clean')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mapType === 'clean' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >Clean</button>
          </div>
          
          <button 
            onClick={locateUser}
            className={`w-10 h-10 bg-white rounded-xl shadow-xl border border-gray-100 flex items-center justify-center transition-all ${locating ? 'bg-blue-50' : 'hover:bg-gray-50 active:scale-95'}`}
          >
            <svg className={`w-4 h-4 ${locating ? 'animate-spin text-blue-600' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Indicator */}
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
