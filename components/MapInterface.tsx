
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
  const measurementLabelsRef = useRef<any[]>([]); // Store measurement label markers
  const drawingVerticesRef = useRef<{ lat: number, lng: number }[]>([]); // Track vertices during drawing

  const [locating, setLocating] = useState(false);
  const [mapType, setMapType] = useState<'reality' | 'clean'>('reality');

  // Calculate distance between two lat/lng points in meters (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(1)} m`;
  };

  // Clear all measurement labels from the map
  const clearMeasurementLabels = () => {
    measurementLabelsRef.current.forEach(label => {
      if (mapRef.current && label) {
        mapRef.current.removeLayer(label);
      }
    });
    measurementLabelsRef.current = [];
  };

  // Create a single measurement label between two points
  const createMeasurementLabel = (p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) => {
    if (!mapRef.current) return;

    // Calculate midpoint of the edge
    const midLat = (p1.lat + p2.lat) / 2;
    const midLng = (p1.lng + p2.lng) / 2;

    // Calculate distance
    const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

    // Create a marker with a divIcon for the label
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
  };

  // Create measurement labels for each edge of the polygon
  const updateMeasurementLabels = (layer: any) => {
    if (!mapRef.current || !layer) return;

    // Clear existing labels
    clearMeasurementLabels();

    const latlngs = layer.getLatLngs();

    const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;

    if (coords.length < 2) return;

    // Create a label for each edge
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];

      // Calculate midpoint of the edge
      const midLat = (p1.lat + p2.lat) / 2;
      const midLng = (p1.lng + p2.lng) / 2;

      // Calculate distance
      const distance = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);

      // Calculate angle for rotation (to align text with edge)
      const angle = Math.atan2(p2.lat - p1.lat, p2.lng - p1.lng) * 180 / Math.PI;

      // Create a marker with a divIcon for the label
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
  };

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
      templineStyle: { color: '#3b82f6', weight: 2 },
      hintlineStyle: { color: '#3b82f6', dashArray: '5,5', weight: 1 },
    });

    mapRef.current.pm.addControls({
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
      updateMeasurementLabels(restored); // Add labels for restored polygon
      mapRef.current.fitBounds(restored.getBounds(), { padding: [50, 50] });
    }

    // REAL-TIME VERTEX TRACKING DURING DRAWING
    // When drawing starts, clear previous vertices and attach to workingLayer
    mapRef.current.on('pm:drawstart', (e: any) => {
      console.log('=== DRAWING STARTED ===', e.shape);
      drawingVerticesRef.current = [];
      clearMeasurementLabels();

      // Access the workingLayer directly from the event
      const workingLayer = e.workingLayer;
      if (workingLayer) {
        console.log('WorkingLayer found, attaching vertex listener');

        // Listen to vertex additions on the working layer
        workingLayer.on('pm:vertexadded', (evt: any) => {
          // Get the latest coordinate from the working layer's coordinates
          const latlngs = workingLayer.getLatLngs();
          const coords = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;

          if (coords.length > 0) {
            const latestCoord = coords[coords.length - 1];
            const newVertex = { lat: latestCoord.lat, lng: latestCoord.lng };

            console.log(`=== VERTEX ADDED (from workingLayer) ===`);
            console.log(`New vertex: (${newVertex.lat.toFixed(6)}, ${newVertex.lng.toFixed(6)})`);
            console.log(`Coords in workingLayer: ${coords.length}`);
            console.log(`Our tracked vertices: ${drawingVerticesRef.current.length}`);

            // If we have at least one previous vertex (and this is a new one), calculate distance
            if (drawingVerticesRef.current.length > 0) {
              const prevVertex = drawingVerticesRef.current[drawingVerticesRef.current.length - 1];
              // Only add label if this is actually a new vertex (not a duplicate)
              if (prevVertex.lat !== newVertex.lat || prevVertex.lng !== newVertex.lng) {
                createMeasurementLabel(prevVertex, newVertex);
              }
            }

            // Add the new vertex to our tracking array if not duplicate
            const isDuplicate = drawingVerticesRef.current.some(
              v => v.lat === newVertex.lat && v.lng === newVertex.lng
            );
            if (!isDuplicate) {
              drawingVerticesRef.current.push(newVertex);
            }
          }
        });
      }
    });

    // Track each vertex as it's added during drawing
    mapRef.current.on('pm:drawend', (e: any) => {
      console.log('=== DRAWING ENDED ===');
      console.log('Final vertices tracked:', drawingVerticesRef.current.length);
    });

    mapRef.current.on('pm:create', (e: any) => {
      if (polygonRef.current && polygonRef.current !== e.layer) {
        mapRef.current.removeLayer(polygonRef.current);
      }
      polygonRef.current = e.layer;
      attachEvents(e.layer);
      updateMetrics(e.layer);

      // Clear the real-time labels and create final labels based on actual layer coordinates
      clearMeasurementLabels();
      updateMeasurementLabels(e.layer); // Add labels for new polygon
    });

    mapRef.current.on('pm:remove', (e: any) => {
      if (e.layer === polygonRef.current) {
        polygonRef.current = null;
        clearMeasurementLabels(); // Clear labels when polygon is removed
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
    updateMeasurementLabels(layer); // Update edge measurements on edit
  };

  // WGS84 Ellipsoid parameters for accurate geodetic calculations
  const WGS84_A = 6378137.0; // Semi-major axis (equatorial radius) in meters
  const WGS84_B = 6356752.314245; // Semi-minor axis (polar radius) in meters
  const WGS84_E2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_A * WGS84_A); // Eccentricity squared

  const calculatePolygonArea = (coords: any[]) => {
    if (coords.length < 3) return 0;

    // Convert to radians
    const toRad = (deg: number) => deg * Math.PI / 180;

    // Method 1: Accurate Spherical Excess Formula (Karney's method simplified)
    // This gives much more accurate results for geodetic polygons

    const ringArea = (coordinates: any[]): number => {
      const n = coordinates.length;
      if (n < 3) return 0;

      let total = 0;

      for (let i = 0; i < n; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[(i + 1) % n];
        const p3 = coordinates[(i + 2) % n];

        const lat1 = toRad(p1.lat);
        const lat2 = toRad(p2.lat);
        const lat3 = toRad(p3.lat);
        const lng1 = toRad(p1.lng);
        const lng2 = toRad(p2.lng);
        const lng3 = toRad(p3.lng);

        // Spherical excess formula
        total += (lng3 - lng1) * Math.sin(lat2);
      }

      // Use mean radius based on WGS84 ellipsoid
      const meanLat = coords.reduce((sum, c) => sum + c.lat, 0) / n;
      const latRad = toRad(meanLat);

      // Calculate the local radius of curvature (more accurate than simple sphere)
      const sinLat = Math.sin(latRad);
      const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat); // Radius of curvature in prime vertical
      const M = WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5); // Radius of curvature in meridian

      // Effective radius for area calculations at this latitude
      const effectiveRadius = Math.sqrt(N * M);

      // Apply the spherical formula with the effective radius
      const sphericalArea = Math.abs(total * effectiveRadius * effectiveRadius / 2);

      return sphericalArea;
    };

    // Method 2: Alternative using Shoelace with geodetic corrections
    // Calculate area using geographic coordinates with proper scaling
    const shoelaceGeodesicArea = (coordinates: any[]): number => {
      const n = coordinates.length;
      if (n < 3) return 0;

      // Calculate centroid latitude for scaling
      const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / n;
      const latRad = toRad(avgLat);

      // Calculate scaling factors based on WGS84 ellipsoid at this latitude
      const sinLat = Math.sin(latRad);
      const cosLat = Math.cos(latRad);

      // Meters per degree of longitude (varies with latitude)
      const metersPerDegLng = (Math.PI / 180) * WGS84_A * cosLat / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);

      // Meters per degree of latitude (fairly constant, ~111km)
      const metersPerDegLat = (Math.PI / 180) * WGS84_A * (1 - WGS84_E2) / Math.pow(1 - WGS84_E2 * sinLat * sinLat, 1.5);

      // Apply Shoelace formula with proper scaling
      let area = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;

        // Convert lat/lng differences to meters
        const x1 = coordinates[i].lng * metersPerDegLng;
        const y1 = coordinates[i].lat * metersPerDegLat;
        const x2 = coordinates[j].lng * metersPerDegLng;
        const y2 = coordinates[j].lat * metersPerDegLat;

        area += (x1 * y2) - (x2 * y1);
      }

      return Math.abs(area / 2);
    };

    // Use the shoelace geodesic method as it's more reliable for smaller polygons
    // (typical land parcels)
    return shoelaceGeodesicArea(coords);
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
