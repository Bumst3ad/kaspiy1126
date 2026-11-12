import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { PortData, VesselData } from '../data/types';

interface CaspianMapProps {
  ports: PortData[];
  vessel: VesselData;
  isCrisisActive: boolean;
  isSlotSynced: boolean;
  vkmskDepthMeters: number;
}

export const CaspianMap: React.FC<CaspianMapProps> = ({
  ports,
  vessel,
  isCrisisActive,
  isSlotSynced,
  vkmskDepthMeters,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [42.0, 50.3],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      }
    ).addTo(map);

    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const hazardGroup = L.layerGroup().addTo(map);

    routeLayerRef.current = routeGroup;
    markersLayerRef.current = markersGroup;
    hazardLayerRef.current = hazardGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update dynamic layers (markers, lines, hazard circle)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerRef.current;
    const markersGroup = markersLayerRef.current;
    const hazardGroup = hazardLayerRef.current;

    if (!map || !routeGroup || !markersGroup || !hazardGroup) return;

    routeGroup.clearLayers();
    markersGroup.clearLayers();
    hazardGroup.clearLayers();

    // 1. VKMSK Hazard zone during crisis
    if (isCrisisActive) {
      const circle = L.circle([45.7833, 47.55], {
        radius: 38000,
        color: 'var(--critical)',
        fillColor: 'var(--critical)',
        fillOpacity: 0.18,
        weight: 1.5,
        dashArray: '4, 6',
      });

      circle.bindTooltip(
        `<div class="px-2 py-1 rounded bg-surface border border-critical text-text text-[11px] font-mono">
          ВКМСК 145 км: глубина ${vkmskDepthMeters.toFixed(2)} м
        </div>`,
        { permanent: true, direction: 'top', className: 'tactical-tooltip' }
      );
      hazardGroup.addLayer(circle);
    }

    // 2. Fairway Lines
    const originalRoute: L.LatLngExpression[] = [
      [46.3497, 48.0326],
      [45.7833, 47.55],
      [44.5, 48.8],
      [41.0, 50.5],
      [37.4744, 49.4628],
    ];

    const syncSlotRoute: L.LatLngExpression[] = [
      [46.12, 48.01],
      [42.9833, 47.5],
      [40.0, 49.8],
      [37.4744, 49.4628],
    ];

    if (!isSlotSynced) {
      const line = L.polyline(originalRoute, {
        color: isCrisisActive ? 'var(--critical)' : 'var(--accent)',
        weight: 2.5,
        opacity: isCrisisActive ? 0.9 : 0.8,
        dashArray: isCrisisActive ? '5, 5' : undefined,
      });
      routeGroup.addLayer(line);
    } else {
      const oldLine = L.polyline(originalRoute.slice(0, 3), {
        color: 'var(--divider)',
        weight: 1.5,
        opacity: 0.5,
        dashArray: '3, 6',
      });
      const newLine = L.polyline(syncSlotRoute, {
        color: 'var(--ok)',
        weight: 3.5,
        opacity: 0.95,
      });
      routeGroup.addLayer(oldLine);
      routeGroup.addLayer(newLine);
    }

    // 3. Port Markers
    ports.forEach((port) => {
      const isAstrakhan = port.id === 'RU_AST' || port.id === 'RU_OLY';
      const isMakhachkala = port.id === 'RU_MCX';

      let dotColor = 'var(--ok)';
      let badge = '';

      if (isAstrakhan && isCrisisActive) {
        dotColor = 'var(--critical)';
        badge = 'Мель';
      } else if (isMakhachkala && isSlotSynced) {
        dotColor = 'var(--ok)';
        badge = 'Слот';
      } else if (port.congestionPercent > 70) {
        dotColor = 'var(--warn)';
      }

      const html = `
        <div class="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none">
          <div class="px-2.5 py-1 rounded-full bg-surface border border-hairline flex items-center gap-1.5 whitespace-nowrap shadow">
            <span class="w-2 h-2 rounded-full" style="background-color: ${dotColor}"></span>
            <span class="text-[11px] font-medium text-text">${port.name}</span>
            <span class="text-[10px] text-text-2 tabular-nums font-mono">${port.currentDraftMeters}м</span>
          </div>
          ${badge ? `<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 text-[8px] font-bold rounded bg-critical text-text">${badge}</div>` : ''}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'port-marker',
        iconSize: [110, 26],
        iconAnchor: [55, 13],
      });

      const marker = L.marker([port.lat, port.lon], { icon });
      marker.bindPopup(`
        <div class="p-3 text-xs w-56 font-sans">
          <div class="flex items-center justify-between border-b border-divider pb-2 mb-2">
            <span class="font-semibold text-text">${port.name}</span>
            <span class="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded">${port.country}</span>
          </div>
          <div class="space-y-1 text-text-2 text-[11px]">
            <div class="flex justify-between">
              <span>Проходная глубина:</span>
              <span class="font-mono text-text">${port.currentDraftMeters} м</span>
            </div>
            <div class="flex justify-between">
              <span>Свободных причалов:</span>
              <span class="font-mono text-ok">${port.berthsAvailable}</span>
            </div>
            <div class="flex justify-between">
              <span>Загрузка:</span>
              <span class="font-mono text-text">${port.congestionPercent}%</span>
            </div>
          </div>
        </div>
      `);
      markersGroup.addLayer(marker);
    });

    // 4. Vessel Marker
    const vesselPos: L.LatLngExpression = isSlotSynced
      ? [43.6, 48.1]
      : [vessel.lat, vessel.lon];

    const vesselColor = isCrisisActive && !isSlotSynced ? 'var(--critical)' : isSlotSynced ? 'var(--ok)' : 'var(--accent)';

    const vesselHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="w-6 h-6 rounded-full flex items-center justify-center border border-text shadow" style="background-color: ${vesselColor}">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
            <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
          </svg>
        </div>
      </div>
    `;

    const vesselIcon = L.divIcon({
      html: vesselHtml,
      className: 'vessel-marker',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const vesselMarker = L.marker(vesselPos, { icon: vesselIcon });
    vesselMarker.bindPopup(`
      <div class="p-3 text-xs w-60 font-sans">
        <div class="border-b border-divider pb-2 mb-2">
          <span class="font-semibold text-text">${vessel.name}</span>
          <p class="text-[10px] text-text-2 font-mono">IMO ${vessel.imo} · ${vessel.currentLoadTeu}/${vessel.capacityTeu} TEU</p>
        </div>
        <div class="space-y-1 text-text-2 text-[11px]">
          <div class="flex justify-between">
            <span>Осадка судна:</span>
            <span class="font-mono text-warn">${vessel.draftMeters} м</span>
          </div>
          <div class="flex justify-between">
            <span>Скорость:</span>
            <span class="font-mono text-text">${vessel.speedKnots} узлов</span>
          </div>
          <div class="flex justify-between">
            <span>Маршрут:</span>
            <span class="font-mono text-text">${isSlotSynced ? 'Махачкала -> Иран' : 'ВКМСК -> Энзели'}</span>
          </div>
        </div>
      </div>
    `);
    markersGroup.addLayer(vesselMarker);

    // Auto-pan smoothly if state changes
    if (isSlotSynced) {
      map.flyTo([42.9833, 47.5], 7, { duration: 1.2 });
    } else if (isCrisisActive) {
      map.flyTo([45.7833, 47.55], 7, { duration: 1.2 });
    }
  }, [isCrisisActive, isSlotSynced, vkmskDepthMeters, ports, vessel]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-panel overflow-hidden border border-hairline bg-base shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      {/* Floating Legend */}
      <div className="absolute bottom-5 left-5 z-[1000] glass-panel px-3.5 py-2 rounded-inner text-xs flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-[11px] text-text font-medium">Маршрут МТК</span>
        </div>
        {isCrisisActive && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-critical" />
            <span className="text-[11px] text-critical font-medium">Сгон ВКМСК</span>
          </div>
        )}
        {isSlotSynced && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ok" />
            <span className="text-[11px] text-ok font-medium">Слот согласован</span>
          </div>
        )}
      </div>
    </div>
  );
};
