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

// Геометрия Волго-Каспийского морского судоходного канала (188 км)
const VKMSK_SECTORS = {
  upper: [
    [46.3497, 48.0326], // 0 км (Астрахань)
    [46.1200, 47.8800], // 30 км
    [45.9600, 47.7200], // 50 км
    [45.7833, 47.5500], // 75 км (Порт Оля)
    [45.5600, 47.6200], // 110 км
    [45.4200, 47.6800], // 135 км
    [45.3000, 47.7100], // 151 км (начало лимитирующего бара)
  ] as L.LatLngExpression[],
  bar151_155: [
    [45.3000, 47.7100], // 151 км
    [45.2700, 47.7250], // 153 км
    [45.2400, 47.7400], // 155 км (конец лимитирующего бара)
  ] as L.LatLngExpression[],
  lower: [
    [45.2400, 47.7400], // 155 км
    [45.0600, 47.8000], // 170 км
    [44.8500, 47.8500], // 188 км (выход в открытое море)
  ] as L.LatLngExpression[],
};

export const CaspianMap: React.FC<CaspianMapProps> = ({
  ports,
  vessel,
  isCrisisActive,
  isSlotSynced,
  vkmskDepthMeters,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const canalLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Центрируем и приближаем на Северный Каспий и ВКМСК
    const map = L.map(mapContainerRef.current, {
      center: [44.6, 48.8],
      zoom: 6.8,
      zoomControl: true,
      attributionControl: true,
    });

    // Убираем флаг и префикс Leaflet, оставляем только атрибуцию Esri
    map.attributionControl.setPrefix('');

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      }
    ).addTo(map);

    const canalGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);
    const hazardGroup = L.layerGroup().addTo(map);

    canalLayerRef.current = canalGroup;
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = markersGroup;
    hazardLayerRef.current = hazardGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update dynamic layers (canal, routes, markers, hazard)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const canalGroup = canalLayerRef.current;
    const routeGroup = routeLayerRef.current;
    const markersGroup = markersLayerRef.current;
    const hazardGroup = hazardLayerRef.current;

    if (!map || !canalGroup || !routeGroup || !markersGroup || !hazardGroup) return;

    canalGroup.clearLayers();
    routeGroup.clearLayers();
    markersGroup.clearLayers();
    hazardGroup.clearLayers();

    // 1. Линия ВКМСК (0-188 км) с разметкой километров и раскраской глубин
    // Верхняя часть канала (0-151 км)
    const upperCanal = L.polyline(VKMSK_SECTORS.upper, {
      color: 'var(--accent)',
      weight: 3.5,
      opacity: 0.85,
    });
    upperCanal.bindTooltip(
      `<div class="px-2 py-1 rounded bg-surface border border-hairline text-text text-[10px] font-mono">
        ВКМСК (0–151 км): проходная глубина 4.40 м
      </div>`,
      { className: 'tactical-tooltip' }
    );
    canalGroup.addLayer(upperCanal);

    // Лимитирующий бар (151-155 км) — критический участок обмеления
    const barColor = isCrisisActive ? 'var(--critical)' : 'var(--warn)';
    const barWeight = isCrisisActive ? 6.5 : 4.5;
    const barLine = L.polyline(VKMSK_SECTORS.bar151_155, {
      color: barColor,
      weight: barWeight,
      opacity: 0.95,
      dashArray: isCrisisActive ? '6, 4' : undefined,
    });

    barLine.bindTooltip(
      `<div class="px-2 py-1.5 rounded bg-surface border ${
        isCrisisActive ? 'border-critical text-critical' : 'border-warn text-warn'
      } text-[10px] font-mono">
        Лимитирующий бар ВКМСК (151–155 км)<br/>
        Глубина: ${vkmskDepthMeters.toFixed(2)} м · Осадка: ${vessel.draftMeters.toFixed(2)} м<br/>
        ${isCrisisActive ? 'Внимание: сгон воды, риск мели!' : 'Минимальный запас (допущение)'}
      </div>`,
      { permanent: isCrisisActive, direction: 'right', className: 'tactical-tooltip' }
    );
    canalGroup.addLayer(barLine);

    // Нижняя морская часть канала (155-188 км)
    const lowerCanal = L.polyline(VKMSK_SECTORS.lower, {
      color: 'var(--accent)',
      weight: 3.5,
      opacity: 0.85,
    });
    lowerCanal.bindTooltip(
      `<div class="px-2 py-1 rounded bg-surface border border-hairline text-text text-[10px] font-mono">
        ВКМСК (155–188 км): выход в глубоководный Каспий
      </div>`,
      { className: 'tactical-tooltip' }
    );
    canalGroup.addLayer(lowerCanal);

    // Километровые пикеты ВКМСК
    const milestones = [
      { pos: [46.3497, 48.0326] as L.LatLngExpression, label: '0 км · Астрахань' },
      { pos: [45.7833, 47.5500] as L.LatLngExpression, label: '75 км · Оля' },
      { pos: [45.2700, 47.7250] as L.LatLngExpression, label: '151–155 км · Бар' },
      { pos: [44.8500, 47.8500] as L.LatLngExpression, label: '188 км · Море' },
    ];

    milestones.forEach((m) => {
      const milestoneIcon = L.divIcon({
        html: `
          <div class="px-1.5 py-0.5 rounded bg-surface border border-hairline text-text-2 text-[9px] font-mono whitespace-nowrap shadow select-none">
            ${m.label}
          </div>
        `,
        className: 'canal-milestone',
        iconSize: [80, 18],
        iconAnchor: [40, 9],
      });
      canalGroup.addLayer(L.marker(m.pos, { icon: milestoneIcon }));
    });

    // 2. Морские маршруты (МТК штатный vs Caspian Sync-Slot)
    const openSeaRoute: L.LatLngExpression[] = [
      [44.8500, 47.8500], // 188 км ВКМСК
      [43.6000, 48.6000],
      [40.5000, 50.0000],
      [37.4744, 49.4628], // Порт Энзели (терминал Каспиан)
    ];

    const syncSlotMakhachkalaRoute: L.LatLngExpression[] = [
      [45.45, 47.65], // Точка маневра судна (обход обмелевшего бара)
      [43.80, 47.80],
      [42.9833, 47.5000], // Порт Махачкала (причал №4, глубина 6.8 м)
      [40.0000, 49.8000],
      [37.4744, 49.4628], // Порт Энзели
    ];

    if (!isSlotSynced) {
      const seaLine = L.polyline(openSeaRoute, {
        color: isCrisisActive ? 'var(--critical)' : 'var(--accent)',
        weight: 2.5,
        opacity: isCrisisActive ? 0.6 : 0.8,
        dashArray: isCrisisActive ? '4, 6' : undefined,
      });
      routeGroup.addLayer(seaLine);
    } else {
      // Старый маршрут приглушен
      const oldLine = L.polyline(openSeaRoute, {
        color: 'var(--divider)',
        weight: 1.5,
        opacity: 0.4,
        dashArray: '3, 6',
      });
      // Новый согласованный маршрут через Махачкалу
      const syncLine = L.polyline(syncSlotMakhachkalaRoute, {
        color: 'var(--ok)',
        weight: 3.5,
        opacity: 0.95,
      });
      routeGroup.addLayer(oldLine);
      routeGroup.addLayer(syncLine);
    }

    // 3. Порты
    ports.forEach((port) => {
      const isAstrakhan = port.id === 'RU_AST' || port.id === 'RU_OLY';
      const isMakhachkala = port.id === 'RU_MCX';

      let dotColor = 'var(--ok)';
      let badge = '';

      if (isAstrakhan && isCrisisActive) {
        dotColor = 'var(--critical)';
        badge = 'Сгон';
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
        <div class="p-3 text-xs w-60 font-sans">
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
              <span>Загрузка порта:</span>
              <span class="font-mono text-text">${port.congestionPercent}%</span>
            </div>
            <div class="flex justify-between">
              <span>Ж/Д колея:</span>
              <span class="font-mono text-text-2">${port.railGauge}</span>
            </div>
          </div>
        </div>
      `);
      markersGroup.addLayer(marker);
    });

    // 4. Судно: расположено на 138-м км ВКМСК (на подходе к бару 151-155 км, не налезает на Астрахань)
    const vesselPos: L.LatLngExpression = isSlotSynced
      ? [43.40, 47.60] // Курс на Махачкалу
      : [vessel.lat, vessel.lon];

    const vesselColor =
      isCrisisActive && !isSlotSynced
        ? 'var(--critical)'
        : isSlotSynced
        ? 'var(--ok)'
        : 'var(--warn)';

    const vesselHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
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
      <div class="p-3 text-xs w-64 font-sans">
        <div class="border-b border-divider pb-2 mb-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-text">${vessel.name}</span>
            <span class="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded">${vessel.flag}</span>
          </div>
          <p class="text-[10px] text-text-2 font-mono mt-0.5">IMO ${vessel.imo} · ${vessel.currentLoadTeu}/${vessel.capacityTeu} TEU · ${vessel.cargoTonnage} т</p>
        </div>
        <div class="space-y-1 text-text-2 text-[11px]">
          <div class="flex justify-between">
            <span>Тип судна:</span>
            <span class="font-mono text-text">Volgo-Max (до 6% флота)</span>
          </div>
          <div class="flex justify-between">
            <span>Осадка судна:</span>
            <span class="font-mono text-warn font-semibold">${vessel.draftMeters.toFixed(2)} м</span>
          </div>
          <div class="flex justify-between">
            <span>Скорость:</span>
            <span class="font-mono text-text">${vessel.speedKnots} узлов</span>
          </div>
          <div class="flex justify-between">
            <span>Позиция:</span>
            <span class="font-mono text-text">${isSlotSynced ? 'Курс на Махачкалу' : 'ВКМСК, 138-й км'}</span>
          </div>
          <div class="pt-1 border-t border-divider text-[10px] text-text-2">
            <span>Назначение: </span>
            <span class="text-text">${vessel.destination}</span>
          </div>
        </div>
      </div>
    `);
    markersGroup.addLayer(vesselMarker);

    // Auto-pan if state changes
    if (isSlotSynced) {
      map.flyTo([43.2, 47.8], 7.0, { duration: 1.2 });
    } else if (isCrisisActive) {
      map.flyTo([45.35, 47.70], 8.0, { duration: 1.2 });
    }
  }, [isCrisisActive, isSlotSynced, vkmskDepthMeters, ports, vessel]);

  return (
    <div className="relative w-full h-full min-h-[580px] rounded-panel overflow-hidden border border-hairline bg-base shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[580px]" />

      {/* Floating Legend */}
      <div className="absolute bottom-5 left-5 z-[1000] glass-panel px-3.5 py-2.5 rounded-inner text-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-[11px] text-text font-medium">ВКМСК (0–188 км)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-warn" />
          <span className="text-[11px] text-warn font-medium">Бар 151–155 км</span>
        </div>
        {isCrisisActive && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-critical" />
            <span className="text-[11px] text-critical font-medium">Сгон воды (-0.60 м)</span>
          </div>
        )}
        {isSlotSynced && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ok" />
            <span className="text-[11px] text-ok font-medium">Слот: Махачкала (6.8 м)</span>
          </div>
        )}
      </div>
    </div>
  );
};
