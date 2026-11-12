import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Layers,
  Anchor,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
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
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    timeline,
    riskWindow,
    isEtaInRiskWindow,
    depthAtArrivalMeters,
    clearanceAtArrivalMeters,
    isSafePass,
  } = profile;

  // Автоплей демо
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (currentHour >= 72) {
        setIsPlaying(false);
      } else {
        onHourChange(currentHour + 1);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [isPlaying, currentHour, onHourChange]);

  const togglePlayback = () => {
    if (currentHour >= 72) {
      onHourChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Автоматический динамический диапазон оси Y:
  // от min(P10, осадка) - 0.15 м до max(паспорт 4.50, осадка) + 0.10 м
  const minP10 = Math.min(...timeline.map((pt) => pt.p10DepthMeters));
  const passportDepth = 4.50;
  const yAxisMinDepth = Number((Math.min(minP10, vesselDraft) - 0.15).toFixed(2));
  const yAxisMaxDepth = Number((Math.max(passportDepth, vesselDraft) + 0.10).toFixed(2));
  const depthRange = Math.max(0.60, yAxisMaxDepth - yAxisMinDepth);

  // Координатная сетка SVG (ViewBox 0 0 760 120)
  const xMin = 48;
  const xMax = 712;
  const xSpan = xMax - xMin;

  const yMin = 18; // px for top (yAxisMaxDepth)
  const yMax = 94; // px for bottom (yAxisMinDepth)
  const ySpan = yMax - yMin;

  const getX = (h: number) => xMin + (Math.max(0, Math.min(72, h)) / 72) * xSpan;
  const getY = (d: number) => {
    const clampedD = Math.max(yAxisMinDepth, Math.min(yAxisMaxDepth, d));
    return yMin + ((yAxisMaxDepth - clampedD) / depthRange) * ySpan;
  };

  // Линия осадки судна
  const draftY = getY(vesselDraft);

  // Кривая среднего прогноза глубины
  const depthPath = timeline.reduce((acc, pt, idx) => {
    const x = getX(pt.hour);
    const y = getY(pt.depthMeters);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Полоса неопределенности P10-P90
  const p90Points = timeline.map((pt) => `${getX(pt.hour).toFixed(1)},${getY(pt.p90DepthMeters).toFixed(1)}`);
  const p10PointsReverse = [...timeline]
    .reverse()
    .map((pt) => `${getX(pt.hour).toFixed(1)},${getY(pt.p10DepthMeters).toFixed(1)}`);
  const uncertaintyRibbonPoints = `${p90Points.join(' ')} ${p10PointsReverse.join(' ')}`;

  // Полигон закрашенного окна риска
  const hasRisk = riskWindow.hasRisk && riskWindow.startHour !== -1;
  const riskStartX = hasRisk ? getX(riskWindow.startHour) : 0;
  const riskEndX = hasRisk ? getX(riskWindow.endHour) : 0;
  const bottomY = getY(yAxisMinDepth);

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

  // Сетка глубин по оси Y
  const yTicks = [4.50, 4.00, 3.50, 3.00].filter(
    (val) => val >= yAxisMinDepth && val <= yAxisMaxDepth
  );

  return (
    <div className="glass-panel rounded-panel p-3.5 flex flex-col gap-2.5 text-text select-none border border-hairline">
      {/* Header with Title and Current Status */}
      <div className="flex items-center justify-between border-b border-divider pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent shrink-0">
            <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-xs tracking-tight text-text">
              Гидрологическая реконструкция ВКМСК (Минтранс РФ) vs Осадка
            </span>
            <p className="text-[10px] text-text-2">
              Наносы паводка + Ветровой сгон + Полоса P10–P90
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div>
          {isSlotSynced ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] border border-ok bg-ok-muted text-ok flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              Слот: Махачкала (6.8 м)
            </span>
          ) : isSafePass ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] border border-ok bg-ok-muted text-ok flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              Проход (+{clearanceAtArrivalMeters.toFixed(2)} м)
            </span>
          ) : isEtaInRiskWindow ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] border border-critical bg-critical-muted text-critical flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              ETA (T+{vesselEtaBarHour}ч) в риске · P(мель) {profile.arrivalGroundingProbabilityPercent}%
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[11px] border border-warn bg-warn-muted text-warn flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              Подход вне пика сгона
            </span>
          )}
        </div>
      </div>

      {/* Компактная строка метрик в шапке таймлайна */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-inner bg-surface border border-hairline text-[11px] text-text-2">
        <span>
          Глубина: <strong className="text-text font-mono tabular-nums">{currentPoint.depthMeters.toFixed(2)} м</strong>
        </span>
        <span>
          P10–P90: <span className="font-mono tabular-nums text-text">{currentPoint.p10DepthMeters.toFixed(2)}..{currentPoint.p90DepthMeters.toFixed(2)} м</span>
        </span>
        <span>
          Ветер: <strong className="text-text font-mono tabular-nums">{currentPoint.windSpeedMs} м/с</strong> ({currentPoint.windRumb})
        </span>
        <span>
          Позиция: <strong className="text-text inline-flex items-center gap-1">
            <Navigation className="w-3 h-3 text-accent" />
            {currentHour >= vesselEtaBarHour ? '151-й км (бар)' : `км ${Math.round(188 - (currentHour / vesselEtaBarHour) * 37)}`}
          </strong>
        </span>
        <span>
          Демередж: <strong className="text-text font-mono tabular-nums">${currentPoint.demurrageUsd.toLocaleString()}</strong>
        </span>
      </div>

      {/* Interactive Controls Bar: Draft Selector, Siltation Slider, ETA Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2 bg-surface rounded-inner border border-hairline text-xs">
        {/* 1. Селектор осадки судна */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-text-2 text-[11px]">
            <span className="flex items-center gap-1 text-text">
              <Anchor className="w-3 h-3 text-accent" strokeWidth={1.5} />
              Осадка:
            </span>
            <span className="font-semibold text-text font-mono tabular-nums">{vesselDraft.toFixed(2)} м</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onVesselDraftChange(3.40)}
              className={`flex-1 py-1 px-1.5 rounded text-[11px] border transition-all cursor-pointer ${
                vesselDraft === 3.40
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              3.40 м (Типичная)
            </button>
            <button
              onClick={() => onVesselDraftChange(4.15)}
              className={`flex-1 py-1 px-1.5 rounded text-[11px] border transition-all cursor-pointer ${
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
          <div className="flex items-center justify-between text-text-2 text-[11px]">
            <span className="flex items-center gap-1 text-text">
              <Layers className="w-3 h-3 text-warn" strokeWidth={1.5} />
              Наносы:
            </span>
            <span className="font-semibold text-text font-mono tabular-nums">-{siltationMeters.toFixed(2)} м</span>
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
          <div className="flex items-center justify-between text-text-2 text-[11px]">
            <span className="flex items-center gap-1 text-text">
              <Clock className="w-3 h-3 text-accent" strokeWidth={1.5} />
              ETA судна на бар:
            </span>
            <span className="font-semibold text-text font-mono tabular-nums">T+{vesselEtaBarHour}ч</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEtaHourChange(10)}
              className={`flex-1 py-1 px-1 rounded text-[11px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 10
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+10ч
            </button>
            <button
              onClick={() => onEtaHourChange(20)}
              className={`flex-1 py-1 px-1 rounded text-[11px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 20
                  ? 'border-critical bg-surface-2 text-critical font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+20ч (Пик)
            </button>
            <button
              onClick={() => onEtaHourChange(58)}
              className={`flex-1 py-1 px-1 rounded text-[11px] border transition-all cursor-pointer ${
                vesselEtaBarHour === 58
                  ? 'border-ok bg-surface-2 text-ok font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+58ч
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Area: Шрифты >=12px, полоса P10-P90, подписи над линией */}
      <div className="relative w-full h-[120px] bg-surface rounded-inner border border-hairline overflow-hidden pt-1">
        <svg viewBox="0 0 760 120" className="w-full h-full" preserveAspectRatio="none">
          {/* Сетка глубин Y (динамические деления) */}
          {yTicks.map((tick) => (
            <React.Fragment key={tick}>
              <line
                x1={xMin}
                y1={getY(tick)}
                x2={xMax}
                y2={getY(tick)}
                stroke="var(--hairline)"
                strokeWidth="1"
                strokeDasharray="2, 4"
              />
              <text
                x={xMin - 6}
                y={getY(tick) + 4}
                fill="var(--text-2)"
                fontSize="12"
                textAnchor="end"
                fontFamily="monospace"
              >
                {tick.toFixed(2)}
              </text>
            </React.Fragment>
          ))}

          {/* Полоса неопределенности P10-P90 (доверительный интервал) */}
          <polygon
            points={uncertaintyRibbonPoints}
            fill="var(--accent-muted)"
            opacity="0.45"
          />

          {/* Закрашенное окно риска обмеления */}
          {hasRisk && (
            <>
              <polygon
                points={riskPolygonPoints}
                fill="var(--critical-muted)"
                stroke="var(--critical)"
                strokeWidth="1.2"
                strokeDasharray="4, 4"
              />
              {/* Подпись «ОКНО РИСКА» по центру над красной зоной (не пересекает кривую) */}
              <text
                x={(riskStartX + riskEndX) / 2}
                y={Math.min(draftY - 6, yMax - 8)}
                fill="var(--critical)"
                fontSize="12"
                textAnchor="middle"
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
            strokeWidth="1.8"
            strokeDasharray="5, 4"
          />
          {/* Подпись «Осадка» справа над линией (не пересекает кривую) */}
          <text
            x={xMax - 6}
            y={draftY - 5}
            fill="var(--warn)"
            fontSize="12"
            textAnchor="end"
            fontWeight="bold"
          >
            Осадка: {vesselDraft.toFixed(2)} м
          </text>

          {/* Кривая среднего прогноза глубины канала */}
          <path
            d={depthPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Маркер ETA судна на бар 151-155 км */}
          <line
            x1={etaX}
            y1={yMin}
            x2={etaX}
            y2={yMax + 10}
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="2"
            strokeDasharray="4, 3"
          />
          {/* Флажок ETA */}
          <rect
            x={etaX - 60}
            y={2}
            width={120}
            height={16}
            rx={4}
            fill="var(--surface)"
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="1.2"
          />
          <text
            x={etaX}
            y={13}
            fill={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            fontSize="11"
            textAnchor="middle"
            fontWeight="bold"
          >
            ETA: T+{vesselEtaBarHour}ч {isSafePass ? '(ПРОХОД)' : isEtaInRiskWindow ? `(РИСК ${profile.arrivalGroundingProbabilityPercent}%)` : '(ОЖИДАНИЕ)'}
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
            strokeWidth="1.8"
          />
          <circle
            cx={cursorX}
            cy={cursorY}
            r="4"
            fill="var(--text)"
            stroke="var(--accent)"
            strokeWidth="2"
          />

          {/* Метки оси X (время T+h, шрифт 12px) */}
          <text x={getX(0)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+0ч</text>
          <text x={getX(12)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+12ч</text>
          <text x={getX(24)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+24ч</text>
          <text x={getX(36)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+36ч</text>
          <text x={getX(48)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+48ч</text>
          <text x={getX(60)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+60ч</text>
          <text x={getX(72)} y="112" fill="var(--text-2)" fontSize="12" textAnchor="middle" fontFamily="monospace">T+72ч</text>
        </svg>
      </div>

      {/* Interactive Scrubber Slider and Playback Controls (Без дублирующего ряда чипов T+0..T+72) */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlayback}
          className={`px-2.5 py-1 rounded-inner text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
            isPlaying
              ? 'bg-accent text-text border-accent'
              : 'bg-surface hover:bg-surface-2 text-text border-hairline'
          }`}
          title="Воспроизвести сценарий во времени"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Пауза</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Автоплей</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            onHourChange(0);
          }}
          className="w-7 h-7 rounded-inner bg-surface hover:bg-surface-2 border border-hairline text-text-2 hover:text-text flex items-center justify-center transition-all cursor-pointer shrink-0"
          title="Сброс на T+0ч"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <input
          type="range"
          min="0"
          max="72"
          step="1"
          value={currentHour}
          onChange={(e) => onHourChange(Number(e.target.value))}
          className="scrubber-slider flex-1"
        />
        <span className="font-mono text-xs text-text font-semibold w-14 text-right tabular-nums">
          T+{currentHour}ч
        </span>
      </div>
    </div>
  );
};
