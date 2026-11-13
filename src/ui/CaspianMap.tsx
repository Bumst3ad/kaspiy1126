import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PortData, VesselData } from '../data/types';

interface CaspianMapProps {
  ports: PortData[];
  vessel: VesselData;
  isCrisisActive: boolean;
  isSlotSynced: boolean;
  vkmskDepthMeters: number;
}

// Релевантные порты с постоянными подписями по ТЗ
const RELEVANT_PORT_IDS = new Set(['RU_AST', 'RU_OLY', 'RU_MCX', 'IR_ANZ', 'IR_AMI']);

// Геометрия Волго-Каспийского морского судоходного канала (188 км)
const VKMSK_SECTORS = {
  upper: [
    [46.3497, 48.0326], // 0 км (Астрахань)
    [46.1200, 47.8800], // 30 км
    [45.9600, 47.7200], // 50 км
    [45.7833, 47.5500], // 75 км (Порт Оля)
    [45.5600, 47.6200], // 110 км
    [45.4200, 47.6800], // 135 км
    [45.3000, 47.7100], // 151 км (северный край лимитирующего бара)
  ] as L.LatLngExpression[],
  bar151_155: [
    [45.3000, 47.7100], // 151 км
    [45.2700, 47.7250], // 153 км
    [45.2400, 47.7400], // 155 км (южный край лимитирующего бара)
  ] as L.LatLngExpression[],
  lower: [
    [45.2400, 47.7400], // 155 км
    [45.0600, 47.8000], // 170 км
    [44.8500, 47.8500], // 188 км (морской вход в канал)
  ] as L.LatLngExpression[],
};

// Границы режима «Канал»: охватывает весь канал ВКМСК, порт Оля и глубоководную Махачкалу
const CANAL_BOUNDS = L.latLngBounds([
  [42.85, 47.10], // Порт Махачкала (южный опорный хаб)
  [46.65, 48.40], // Порт Астрахань (северный вход)
]);

function getCaspianActiveBounds(isSlotSynced: boolean, vessel: VesselData) {
  const points: L.LatLngExpression[] = [
    [46.3497, 48.0326], // Астрахань
    [45.7833, 47.5500], // Оля
    [42.9833, 47.5000], // Махачкала
    [37.4744, 49.4628], // Энзели
    [36.8522, 53.3761], // Амирабад
    isSlotSynced ? [43.60, 47.65] : [vessel.lat, vessel.lon],
  ];
  return L.latLngBounds(points);
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
  const canalLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [viewScope, setViewScope] = useState<'canal' | 'caspian'>('canal');

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      minZoom: 5,
      maxBounds: [
        [36.0, 46.0],
        [48.0, 56.0],
      ],
      maxBoundsViscosity: 1.0,
    });

    map.invalidateSize();
    console.warn('[CaspianMap] Initial CANAL_BOUNDS:', CANAL_BOUNDS.toBBoxString());

    map.fitBounds(CANAL_BOUNDS, {
      paddingTopLeft: [40, 80],
      paddingBottomRight: [40, 80],
    });

    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>'
    );

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

    canalLayerRef.current = canalGroup;
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Переключение масштаба: Канал / Весь Каспий
  const handleScopeChange = (scope: 'canal' | 'caspian') => {
    setViewScope(scope);
    const map = mapInstanceRef.current;
    if (!map) return;

    map.invalidateSize();

    if (scope === 'canal') {
      console.warn('[CaspianMap] Scope "canal" bounds:', CANAL_BOUNDS.toBBoxString());
      map.fitBounds(CANAL_BOUNDS, {
        paddingTopLeft: [40, 80],
        paddingBottomRight: [40, 80],
        duration: 0.8,
      });
    } else {
      const caspianBounds = getCaspianActiveBounds(isSlotSynced, vessel);
      console.warn('[CaspianMap] Scope "caspian" bounds:', caspianBounds.toBBoxString());
      map.fitBounds(caspianBounds, {
        paddingTopLeft: [60, 70],
        paddingBottomRight: [60, 60],
        maxZoom: 7,
        duration: 0.8,
      });
    }
  };

  // Update dynamic layers (canal, routes, markers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const canalGroup = canalLayerRef.current;
    const routeGroup = routeLayerRef.current;
    const markersGroup = markersLayerRef.current;

    if (!map || !canalGroup || !routeGroup || !markersGroup) return;

    canalGroup.clearLayers();
    routeGroup.clearLayers();
    markersGroup.clearLayers();

    // 1. Трасса ВКМСК (0-188 км)
    const upperCanal = L.polyline(VKMSK_SECTORS.upper, {
      color: 'var(--accent)',
      weight: 3.5,
      opacity: 0.85,
    });
    upperCanal.bindTooltip(
      `<div class="text-[13px] leading-snug">
        <span class="font-medium text-text">ВКМСК (0–151 км):</span>
        <span class="text-text-2"> проходная глубина </span>
        <span class="font-mono text-text tabular-nums">4.40 м</span>
      </div>`,
      { className: 'glass-panel' }
    );
    canalGroup.addLayer(upperCanal);

    // Лимитирующий бар (151-155 км): Тултип <=260px, направление left (не перекрывает порты и переключатель)
    const barColor = isCrisisActive ? 'var(--critical)' : 'var(--warn)';
    const barWeight = isCrisisActive ? 6.5 : 4.5;
    const barLine = L.polyline(VKMSK_SECTORS.bar151_155, {
      color: barColor,
      weight: barWeight,
      opacity: 0.95,
      dashArray: isCrisisActive ? '6, 4' : undefined,
    });

    barLine.bindTooltip(
      `<div class="max-w-[240px] text-[12px] leading-snug">
        <div class="font-semibold ${isCrisisActive ? 'text-critical' : 'text-warn'}">
          Лимитирующий бар (151–155 км)
        </div>
        <div class="text-text mt-0.5">
          Глубина: <span class="font-mono font-bold tabular-nums">${vkmskDepthMeters.toFixed(2)} м</span>
          · Осадка: <span class="font-mono tabular-nums">${vessel.draftMeters.toFixed(2)} м</span>
        </div>
        <div class="text-text-2 text-[11px] mt-0.5">
          ${isCrisisActive ? 'Сгон воды! Риск мели' : 'Проход под контролем (допущение)'}
        </div>
      </div>`,
      { permanent: isCrisisActive, direction: 'left', className: 'glass-panel', offset: [-12, 0] }
    );
    canalGroup.addLayer(barLine);

    // Нижняя морская часть канала (155-188 км)
    const lowerCanal = L.polyline(VKMSK_SECTORS.lower, {
      color: 'var(--accent)',
      weight: 3.5,
      opacity: 0.85,
    });
    canalGroup.addLayer(lowerCanal);

    // Километровые пикеты ВКМСК и внешний рейд (без наложений на линию и маркеры)
    const milestones = [
      { pos: [45.2700, 47.7250] as L.LatLngExpression, label: '151–155 км · Бар', anchor: [-18, 10], width: 120 },
      { pos: [44.8500, 47.8500] as L.LatLngExpression, label: '188 км · Вход в канал', anchor: [136, 10], width: 120 },
      { pos: [44.6800, 48.0200] as L.LatLngExpression, label: '188+ км · Внешний рейд (9.5 м)', anchor: [-16, 10], width: 160 },
    ];

    milestones.forEach((m) => {
      const milestoneIcon = L.divIcon({
        html: `
          <div class="px-2 py-0.5 rounded bg-surface/90 border border-hairline text-text-2 text-[11px] whitespace-nowrap shadow select-none">
            ${m.label}
          </div>
        `,
        className: 'canal-milestone',
        iconSize: [m.width, 20],
        iconAnchor: m.anchor as L.PointExpression,
      });
      canalGroup.addLayer(L.marker(m.pos, { icon: milestoneIcon }));
    });

    // 2. Морские маршруты (Входящий рейс из Ирана)
    const plannedInboundRoute: L.LatLngExpression[] = [
      [36.8522, 53.3761], // Порт Амирабад (Иран)
      [40.5000, 50.8000], // Открытое Каспийское море
      [44.7500, 47.9200], // Внешний рейд ВКМСК (км 188+)
      [44.8500, 47.8500], // Вход в канал 188 км
      [45.2700, 47.7250], // Бар 151-155 км
      [45.7833, 47.5500], // Порт Оля (75 км)
      [46.3497, 48.0326], // Порт Астрахань (0 км)
    ];

    const syncSlotMakhachkalaRoute: L.LatLngExpression[] = [
      [44.7500, 47.9200], // Внешний глубоководный рейд ВКМСК (глубина 9.5 м)
      [43.8000, 47.7500], // Глубоководный морской переход (>18 м)
      [42.9833, 47.5000], // Порт Махачкала (причал B-4, глубина 6.8 м)
    ];

    if (!isSlotSynced) {
      const seaLine = L.polyline(plannedInboundRoute, {
        color: isCrisisActive ? 'var(--critical)' : 'var(--accent)',
        weight: 2.5,
        opacity: isCrisisActive ? 0.6 : 0.8,
        dashArray: isCrisisActive ? '4, 6' : undefined,
      });
      routeGroup.addLayer(seaLine);
    } else {
      const oldLine = L.polyline(plannedInboundRoute.slice(2), {
        color: 'var(--divider)',
        weight: 1.5,
        opacity: 0.35,
        dashArray: '3, 6',
      });
      const syncLine = L.polyline(syncSlotMakhachkalaRoute, {
        color: 'var(--ok)',
        weight: 3.5,
        opacity: 0.95,
      });
      routeGroup.addLayer(oldLine);
      routeGroup.addLayer(syncLine);
    }

    // 3. Порты: подписи только у релевантных портов, остальные — нейтральная точка с подписью по hover
    // В режиме «Канал» скрываем удаленные порты вне коридора (Актау, Баку, Туркменбаши), убирая неподписанные точки
    ports.forEach((port) => {
      const isAstrakhan = port.id === 'RU_AST';
      const isMakhachkala = port.id === 'RU_MCX';
      const isRelevant = RELEVANT_PORT_IDS.has(port.id);

      if (viewScope === 'canal' && !isRelevant) {
        return;
      }

      let dotColor = 'var(--ok)';
      let badge = '';

      if (isAstrakhan && isCrisisActive) {
        dotColor = 'var(--critical)';
        badge = 'Сгон'; // Единственный бейдж «Сгон» на портах (только Астрахань/ВКМСК)
      } else if (isMakhachkala && isSlotSynced) {
        dotColor = 'var(--ok)';
        badge = 'Слот';
      } else if (port.congestionPercent > 70) {
        dotColor = 'var(--warn)';
      }

      if (isRelevant) {
        // Релевантные порты (Астрахань, Оля, Махачкала, Энзели, Амирабад) с постоянной плашкой
        // Smart-offset для исключения взаимных наложений
        const isLeftAnchor = port.id === 'RU_OLY' || port.id === 'IR_AMI';
        const iconAnchor: [number, number] = isLeftAnchor ? [105, 13] : [15, 13];

        const html = `
          <div class="relative cursor-pointer select-none">
            <div class="px-2.5 py-1 rounded-full bg-surface border border-hairline flex items-center gap-1.5 whitespace-nowrap shadow">
              <span class="w-2 h-2 rounded-full" style="background-color: ${dotColor}"></span>
              <span class="text-[11px] font-medium text-text">${port.name}</span>
              <span class="text-[10px] text-text-2 tabular-nums font-mono">${port.currentDraftMeters}м</span>
            </div>
            ${badge ? `<div class="absolute -top-2.5 left-6 px-1.5 text-[8px] font-bold rounded bg-critical text-text shadow">${badge}</div>` : ''}
          </div>
        `;

        const icon = L.divIcon({
          html,
          className: 'port-marker',
          iconSize: [120, 26],
          iconAnchor,
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
            </div>
          </div>
        `);
        markersGroup.addLayer(marker);
      } else {
        // Нерелевантные порты (Баку, Актау, Туркменбаши): нейтральная серая точка (не зеленая!), подпись по hover
        const html = `
          <div class="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none" title="${port.name}">
            <div class="w-2.5 h-2.5 rounded-full bg-surface-2 border border-text-2/60 shadow-sm hover:scale-150 hover:border-accent transition-transform"></div>
          </div>
        `;

        const icon = L.divIcon({
          html,
          className: 'port-dot-marker',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });

        const marker = L.marker([port.lat, port.lon], { icon });
        marker.bindTooltip(
          `<div class="text-[11px] font-medium text-text">${port.name} (${port.country}) · ${port.currentDraftMeters}м</div>`,
          { className: 'glass-panel', direction: 'top' }
        );
        markersGroup.addLayer(marker);
      }
    });

    // 4. Судно: на внешнем рейде ВКМСК (км 188+)
    const vesselPos: L.LatLngExpression = isSlotSynced
      ? [43.60, 47.65]
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
    vesselMarker.bindTooltip(
      `<div class="text-[11px] font-semibold text-text whitespace-nowrap">${vessel.name} · ${vessel.draftMeters.toFixed(2)}м</div>`,
      { permanent: true, direction: 'top', className: 'glass-panel', offset: [0, -16] }
    );
    vesselMarker.bindPopup(`
      <div class="p-3 text-xs w-64 font-sans">
        <div class="border-b border-divider pb-2 mb-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-text">${vessel.name}</span>
            <span class="text-[10px] font-mono text-text-2 bg-surface-2 px-1.5 py-0.5 rounded">${vessel.flag}</span>
          </div>
          <p class="text-[10px] text-text-2 mt-0.5">Входящий рейс · IMO ${vessel.imo} · ${vessel.currentLoadTeu} TEU · ${vessel.cargoTonnage} т</p>
        </div>
        <div class="space-y-1 text-text-2 text-[11px]">
          <div class="flex justify-between">
            <span>Осадка судна:</span>
            <span class="font-mono text-warn font-semibold">${vessel.draftMeters.toFixed(2)} м</span>
          </div>
          <div class="flex justify-between">
            <span>Скорость:</span>
            <span class="font-mono text-text">${vessel.speedKnots} узлов</span>
          </div>
          <div class="flex justify-between">
            <span>Текущая позиция:</span>
            <span class="font-mono text-text">${isSlotSynced ? 'Переход в Махачкалу' : 'Внешний рейд (км 188+)'}</span>
          </div>
          <div class="flex justify-between">
            <span>ETA на бар (151 км):</span>
            <span class="font-mono ${isCrisisActive && !isSlotSynced ? 'text-critical font-bold' : 'text-ok'}">T+20ч (${isCrisisActive && !isSlotSynced ? 'Мель!' : 'Норма'})</span>
          </div>
          <div class="pt-1 border-t border-divider text-[10px] text-text-2">
            <span>Назначение: </span>
            <span class="text-text">${vessel.destination}</span>
          </div>
        </div>
      </div>
    `);
    markersGroup.addLayer(vesselMarker);

    // Автоматический пересчет fitBounds при смене режима, сценария и после «Применить»
    map.invalidateSize();
    if (viewScope === 'caspian') {
      const caspianBounds = getCaspianActiveBounds(isSlotSynced, vessel);
      console.warn('[CaspianMap] Auto fitBounds "caspian":', caspianBounds.toBBoxString());
      map.fitBounds(caspianBounds, {
        paddingTopLeft: [60, 70],
        paddingBottomRight: [60, 60],
        maxZoom: 7,
        duration: 0.8,
      });
    } else {
      if (isSlotSynced) {
        // При переходе на Махачкалу охватываем канал и порт назначения
        const syncedCanalBounds = L.latLngBounds([
          [42.85, 47.10], // Махачкала
          [46.65, 48.40], // Астрахань
        ]);
        console.warn('[CaspianMap] Auto fitBounds "canal (synced)":', syncedCanalBounds.toBBoxString());
        map.fitBounds(syncedCanalBounds, {
          paddingTopLeft: [40, 80],
          paddingBottomRight: [40, 80],
          duration: 0.8,
        });
      } else {
        console.warn('[CaspianMap] Auto fitBounds "canal":', CANAL_BOUNDS.toBBoxString());
        map.fitBounds(CANAL_BOUNDS, {
          paddingTopLeft: [40, 80],
          paddingBottomRight: [40, 80],
          duration: 0.8,
        });
      }
    }
  }, [isCrisisActive, isSlotSynced, vkmskDepthMeters, ports, vessel, viewScope]);

  return (
    <div className="relative w-full h-full min-h-[260px] rounded-panel overflow-hidden border border-hairline bg-base shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[260px]" />

      {/* Переключатель охвата карты: Канал / Весь Каспий (в правом верхнем углу, не перекрывает маркеры) */}
      <div className="absolute top-3 right-3 z-[1000] p-1 rounded-inner bg-surface/90 backdrop-blur-md border border-hairline flex items-center gap-1 text-xs shadow-lg">
        <button
          onClick={() => handleScopeChange('canal')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
            viewScope === 'canal'
              ? 'bg-surface-2 text-text border border-hairline'
              : 'text-text-2 hover:text-text'
          }`}
        >
          Канал (ВКМСК)
        </button>
        <button
          onClick={() => handleScopeChange('caspian')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
            viewScope === 'caspian'
              ? 'bg-surface-2 text-text border border-hairline'
              : 'text-text-2 hover:text-text'
          }`}
        >
          Весь Каспий
        </button>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-6 right-3 z-[1000] glass-panel px-3 py-1.5 rounded-inner text-xs flex flex-wrap items-center gap-2.5 shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-[10px] text-text font-medium">ВКМСК (188 км)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warn" />
          <span className="text-[10px] text-warn font-medium">Бар 151–155 км</span>
        </div>
        {isCrisisActive && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-critical" />
            <span className="text-[10px] text-critical font-medium">Сгон на баре</span>
          </div>
        )}
        {isSlotSynced && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-ok" />
            <span className="text-[10px] text-ok font-medium">Махачкала (6.8 м)</span>
          </div>
        )}
      </div>
    </div>
  );
};
