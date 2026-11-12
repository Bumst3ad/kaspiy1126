import React from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle2, Navigation, Layers, Anchor } from 'lucide-react';
import { HydroProfileForecast, HydroTimelinePoint } from '../domain/hydroProfile';

interface HydroChartProps {
  profile: HydroProfileForecast;
  currentPoint: HydroTimelinePoint;
  currentHour: number;
  onHourChange: (hour: number) => void;
  vesselDraft: number;
  onVesselDraftChange: (draft: number) => void;
  siltationMeters: number;
  onSiltationChange: (siltation: number) => void;
  vesselEtaBarHour: number;
  onEtaHourChange: (etaHour: number) => void;
  isSlotSynced: boolean;
}

export const HydroChart: React.FC<HydroChartProps> = ({
  profile,
  currentPoint,
  currentHour,
  onHourChange,
  vesselDraft,
  onVesselDraftChange,
  siltationMeters,
  onSiltationChange,
  vesselEtaBarHour,
  onEtaHourChange,
  isSlotSynced,
}) => {
  const {
    timeline,
    riskWindow,
    isEtaInRiskWindow,
    depthAtArrivalMeters,
    clearanceAtArrivalMeters,
    isSafePass,
  } = profile;

  // Координатная сетка SVG (ViewBox 0 0 760 120)
  const xMin = 40;
  const xMax = 720;
  const xSpan = xMax - xMin;

  const yMin = 18; // 4.80 м
  const yMax = 95; // 3.20 м
  const ySpan = yMax - yMin;

  const getX = (h: number) => xMin + (Math.max(0, Math.min(72, h)) / 72) * xSpan;
  const getY = (d: number) => yMin + ((4.80 - Math.max(3.20, Math.min(4.80, d))) / 1.60) * ySpan;

  // Линия осадки судна
  const draftY = getY(vesselDraft);

  // Построение пути кривой глубины
  const depthPath = timeline.reduce((acc, pt, idx) => {
    const x = getX(pt.hour);
    const y = getY(pt.depthMeters);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Полигон закрашенного окна риска (где глубина <= осадки)
  const hasRisk = riskWindow.hasRisk && riskWindow.startHour !== -1;
  const riskStartX = hasRisk ? getX(riskWindow.startHour) : 0;
  const riskEndX = hasRisk ? getX(riskWindow.endHour) : 0;
  const bottomY = getY(3.55);

  const riskPolygonPoints = hasRisk
    ? `
    ${riskStartX},${draftY}
    ${riskEndX},${draftY}
    ${riskEndX},${bottomY}
    ${riskStartX},${bottomY}
  `
    : '';

  // Текущая точка бегунка
  const cursorX = getX(currentHour);
  const cursorY = getY(currentPoint.depthMeters);

  // Точка планового прибытия судна на бар (ETA)
  const etaX = getX(vesselEtaBarHour);
  const etaY = getY(depthAtArrivalMeters);

  return (
    <div className="glass-panel rounded-panel p-4 flex flex-col gap-3 text-text select-none border border-hairline mt-3">
      {/* Header with Title and Current Status */}
      <div className="flex items-center justify-between border-b border-divider pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent">
            <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-xs text-text flex items-center gap-1.5">
              Гидрологическая реконструкция ВКМСК (по данным Минтранса РФ)
            </span>
            <p className="text-[10px] text-text-2">
              Совокупность донных наносов после паводка и ветрового сгона vs Осадка судна
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center gap-2">
          {isSlotSynced ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-ok bg-ok-muted text-ok flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              Слот переведён на Махачкалу (6.8 м)
            </span>
          ) : isSafePass ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-ok bg-ok-muted text-ok flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              Проход обеспечен (+{clearanceAtArrivalMeters.toFixed(2)} м) · Действий не требуется
            </span>
          ) : isEtaInRiskWindow ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-critical bg-critical-muted text-critical flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              ETA (T+{vesselEtaBarHour}ч) в окне риска! Дефицит: {clearanceAtArrivalMeters.toFixed(2)} м
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-warn bg-warn-muted text-warn flex items-center gap-1.5 font-semibold">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              Подход вне пика сгона · Ожидание спада воды
            </span>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar: Draft Selector, Siltation Slider, ETA Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2.5 bg-surface rounded-inner border border-hairline text-[10px] font-mono">
        {/* 1. Селектор осадки судна */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1">
              <Anchor className="w-3 h-3 text-accent" strokeWidth={1.5} />
              Осадка судна:
            </span>
            <span className="font-semibold text-text tabular-nums">{vesselDraft.toFixed(2)} м</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVesselDraftChange(3.40)}
              className={`flex-1 py-1 px-1.5 rounded text-[9px] border transition-all cursor-pointer ${
                vesselDraft === 3.40
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              3.40 м (Типичная)
            </button>
            <button
              onClick={() => onVesselDraftChange(4.15)}
              className={`flex-1 py-1 px-1.5 rounded text-[9px] border transition-all cursor-pointer ${
                vesselDraft === 4.15
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              4.15 м (Volgo-Max)
            </button>
          </div>
        </div>

        {/* 2. Ползунок «Наносы паводка» (по Минтрансу РФ) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-warn" strokeWidth={1.5} />
              Наносы перекатов (Минтранс):
            </span>
            <span className="font-semibold text-text tabular-nums">-{siltationMeters.toFixed(2)} м</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.55"
            step="0.05"
            value={siltationMeters}
            onChange={(e) => onSiltationChange(Number(e.target.value))}
            className="scrubber-slider"
          />
        </div>

        {/* 3. Селектор ETA подхода на бар */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-accent" strokeWidth={1.5} />
              ETA судна на бар:
            </span>
            <span className="font-semibold text-text tabular-nums">T+{vesselEtaBarHour}ч</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEtaHourChange(10)}
              className={`flex-1 py-1 px-1 rounded text-[9px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 10
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+10ч (До)
            </button>
            <button
              onClick={() => onEtaHourChange(20)}
              className={`flex-1 py-1 px-1 rounded text-[9px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 20
                  ? 'border-critical bg-surface-2 text-critical font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+20ч (Пик)
            </button>
            <button
              onClick={() => onEtaHourChange(58)}
              className={`flex-1 py-1 px-1 rounded text-[9px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 58
                  ? 'border-ok bg-surface-2 text-ok font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+58ч (Хвост)
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Area with ETA Marker & Risk Window */}
      <div className="relative w-full h-[125px] bg-surface rounded-inner border border-hairline overflow-hidden pt-1">
        <svg viewBox="0 0 760 115" className="w-full h-full" preserveAspectRatio="none">
          {/* Сетка глубин Y */}
          <line x1={xMin} y1={getY(4.50)} x2={xMax} y2={getY(4.50)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />
          <line x1={xMin} y1={getY(4.00)} x2={xMax} y2={getY(4.00)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />
          <line x1={xMin} y1={getY(3.50)} x2={xMax} y2={getY(3.50)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />

          {/* Метки оси Y */}
          <text x={xMin - 6} y={getY(4.50) + 3} fill="var(--text-2)" fontSize="8" textAnchor="end" fontFamily="monospace">4.50</text>
          <text x={xMin - 6} y={getY(4.00) + 3} fill="var(--text-2)" fontSize="8" textAnchor="end" fontFamily="monospace">4.00</text>
          <text x={xMin - 6} y={getY(3.50) + 3} fill="var(--text-2)" fontSize="8" textAnchor="end" fontFamily="monospace">3.50</text>

          {/* Закрашенное окно риска обмеления */}
          {hasRisk && (
            <>
              <polygon
                points={riskPolygonPoints}
                fill="var(--critical-muted)"
                stroke="var(--critical)"
                strokeWidth="1"
                strokeDasharray="3, 3"
              />
              <text
                x={(riskStartX + riskEndX) / 2}
                y={(draftY + bottomY) / 2 + 3}
                fill="var(--critical)"
                fontSize="8"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ОКНО РИСКА МЕЛИ (T+{riskWindow.startHour}ч .. T+{riskWindow.endHour}ч)
              </text>
            </>
          )}

          {/* Горизонтальная линия осадки судна */}
          <line
            x1={xMin}
            y1={draftY}
            x2={xMax}
            y2={draftY}
            stroke="var(--warn)"
            strokeWidth="1.5"
            strokeDasharray="4, 3"
          />
          <text
            x={xMax - 8}
            y={draftY - 4}
            fill="var(--warn)"
            fontSize="9"
            textAnchor="end"
            fontFamily="monospace"
          >
            Осадка: {vesselDraft.toFixed(2)} м
          </text>

          {/* Кривая прогноза глубины канала */}
          <path
            d={depthPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Маркер ETA судна на бар 151-155 км */}
          <line
            x1={etaX}
            y1={yMin}
            x2={etaX}
            y2={yMax + 10}
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="1.8"
            strokeDasharray="4, 3"
          />
          {/* Флажок ETA */}
          <rect
            x={etaX - 58}
            y={2}
            width={116}
            height={15}
            rx={4}
            fill="var(--surface-2)"
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="1"
          />
          <text
            x={etaX}
            y={12}
            fill={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            fontSize="8"
            textAnchor="middle"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ETA: T+{vesselEtaBarHour}ч {isSafePass ? '(ПРОХОД)' : isEtaInRiskWindow ? '(МЕЛЬ!)' : '(ОЖИДАНИЕ)'}
          </text>
          <circle
            cx={etaX}
            cy={etaY}
            r="4.5"
            fill={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            stroke="var(--text)"
            strokeWidth="1.5"
          />

          {/* Вертикальный интерактивный бегунок (Scrubber Cursor) */}
          <line
            x1={cursorX}
            y1={yMin}
            x2={cursorX}
            y2={yMax + 10}
            stroke="var(--text)"
            strokeWidth="1.5"
          />
          <circle
            cx={cursorX}
            cy={cursorY}
            r="4"
            fill="var(--text)"
            stroke="var(--accent)"
            strokeWidth="2"
          />

          {/* Метки оси X (время T+h) */}
          <text x={getX(0)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+0ч</text>
          <text x={getX(12)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+12ч</text>
          <text x={getX(24)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+24ч</text>
          <text x={getX(36)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+36ч</text>
          <text x={getX(48)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+48ч</text>
          <text x={getX(60)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+60ч</text>
          <text x={getX(72)} y="112" fill="var(--text-2)" fontSize="8" textAnchor="middle" fontFamily="monospace">T+72ч</text>
        </svg>
      </div>

      {/* Interactive Scrubber Slider and Telemetry Readout */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Clock className="w-3.5 h-3.5 text-text-2 shrink-0" strokeWidth={1.5} />
          <input
            type="range"
            min="0"
            max="72"
            step="1"
            value={currentHour}
            onChange={(e) => onHourChange(Number(e.target.value))}
            className="scrubber-slider"
          />
          <span className="font-mono text-xs text-text font-semibold w-14 text-right tabular-nums">
            T+{currentHour}ч
          </span>
        </div>

        {/* Telemetry info row */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-text-2">
          <span>
            Глубина на баре: <strong className="text-text font-mono">{currentPoint.depthMeters.toFixed(2)} м</strong>
          </span>
          <span>
            Ветер: <strong className="text-text font-mono">{currentPoint.windSpeedMs} м/с {currentPoint.windRumb}</strong>
          </span>
          <span>
            Позиция: <strong className="text-text font-mono flex items-center gap-1 inline-flex">
              <Navigation className="w-2.5 h-2.5" />
              {currentHour >= vesselEtaBarHour ? '151-й км (бар)' : `км ${Math.round(188 - (currentHour / vesselEtaBarHour) * 37)}`}
            </strong>
          </span>
          <span>
            Демередж: <strong className="text-text font-mono">${currentPoint.demurrageUsd.toLocaleString()}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
