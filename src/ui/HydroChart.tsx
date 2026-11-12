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

  // Автоплей демо: воспроизведение сценария для презентации на проекторе
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

  // Координатная сетка SVG (ViewBox 0 0 760 145)
  // Увеличенная высота для крупного шрифта (>=13px) на проекторе
  const xMin = 50;
  const xMax = 710;
  const xSpan = xMax - xMin;

  const yMin = 22; // 4.80 м
  const yMax = 105; // 3.20 м
  const ySpan = yMax - yMin;

  const getX = (h: number) => xMin + (Math.max(0, Math.min(72, h)) / 72) * xSpan;
  const getY = (d: number) => yMin + ((4.80 - Math.max(3.20, Math.min(4.80, d))) / 1.60) * ySpan;

  // Линия осадки судна
  const draftY = getY(vesselDraft);

  // Кривая среднего прогноза глубины
  const depthPath = timeline.reduce((acc, pt, idx) => {
    const x = getX(pt.hour);
    const y = getY(pt.depthMeters);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Полоса неопределенности P10-P90 (доверительный интервал ансамбля)
  const p90Points = timeline.map((pt) => `${getX(pt.hour).toFixed(1)},${getY(pt.p90DepthMeters).toFixed(1)}`);
  const p10PointsReverse = [...timeline]
    .reverse()
    .map((pt) => `${getX(pt.hour).toFixed(1)},${getY(pt.p10DepthMeters).toFixed(1)}`);
  const uncertaintyRibbonPoints = `${p90Points.join(' ')} ${p10PointsReverse.join(' ')}`;

  // Полигон закрашенного окна риска (где глубина <= осадки)
  const hasRisk = riskWindow.hasRisk && riskWindow.startHour !== -1;
  const riskStartX = hasRisk ? getX(riskWindow.startHour) : 0;
  const riskEndX = hasRisk ? getX(riskWindow.endHour) : 0;
  const bottomY = getY(3.30);

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
          <div className="w-8 h-8 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent">
            <Activity className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-sm text-text flex items-center gap-2">
              Гидрологическая реконструкция ВКМСК (Минтранс РФ) vs Осадка
            </span>
            <p className="text-xs text-text-2">
              Наносы паводка + Ветровой сгон + Полоса P10–P90 + Проверка часа ETA
            </p>
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center gap-2">
          {isSlotSynced ? (
            <span className="px-3 py-1 rounded-full text-xs border border-ok bg-ok-muted text-ok flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Слот переведён на Махачкалу (глубина 6.8 м)
            </span>
          ) : isSafePass ? (
            <span className="px-3 py-1 rounded-full text-xs border border-ok bg-ok-muted text-ok flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              Проход обеспечен (+{clearanceAtArrivalMeters.toFixed(2)} м) · Действий не требуется
            </span>
          ) : isEtaInRiskWindow ? (
            <span className="px-3 py-1 rounded-full text-xs border border-critical bg-critical-muted text-critical flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
              ETA (T+{vesselEtaBarHour}ч) в окне риска! Дефицит: {clearanceAtArrivalMeters.toFixed(2)} м
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs border border-warn bg-warn-muted text-warn flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              Подход вне пика сгона · Ожидание спада воды
            </span>
          )}
        </div>
      </div>

      {/* Interactive Controls Bar: Draft Selector, Siltation Slider, ETA Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-surface rounded-inner border border-hairline text-xs">
        {/* 1. Селектор осадки судна */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1.5 text-text">
              <Anchor className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              Осадка судна:
            </span>
            <span className="font-semibold text-text font-mono tabular-nums">{vesselDraft.toFixed(2)} м</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onVesselDraftChange(3.40)}
              className={`flex-1 py-1.5 px-2 rounded-inner text-xs border transition-all cursor-pointer ${
                vesselDraft === 3.40
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              3.40 м (Типичная)
            </button>
            <button
              onClick={() => onVesselDraftChange(4.15)}
              className={`flex-1 py-1.5 px-2 rounded-inner text-xs border transition-all cursor-pointer ${
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1.5 text-text">
              <Layers className="w-3.5 h-3.5 text-warn" strokeWidth={1.5} />
              Наносы перекатов (Минтранс):
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-text-2">
            <span className="flex items-center gap-1.5 text-text">
              <Clock className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              ETA судна на бар:
            </span>
            <span className="font-semibold text-text font-mono tabular-nums">T+{vesselEtaBarHour}ч</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEtaHourChange(10)}
              className={`flex-1 py-1.5 px-1.5 rounded-inner text-xs border transition-all cursor-pointer ${
                vesselEtaBarHour === 10
                  ? 'border-accent bg-surface-2 text-accent font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+10ч (До)
            </button>
            <button
              onClick={() => onEtaHourChange(20)}
              className={`flex-1 py-1.5 px-1.5 rounded-inner text-xs border transition-all cursor-pointer ${
                vesselEtaBarHour === 20
                  ? 'border-critical bg-surface-2 text-critical font-semibold'
                  : 'border-hairline bg-surface text-text-2 hover:text-text'
              }`}
            >
              T+20ч (Пик)
            </button>
            <button
              onClick={() => onEtaHourChange(58)}
              className={`flex-1 py-1.5 px-1.5 rounded-inner text-xs border transition-all cursor-pointer ${
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

      {/* SVG Chart Area: Крупные шрифты (>=13px) и полоса неопределенности P10-P90 */}
      <div className="relative w-full h-[145px] bg-surface rounded-inner border border-hairline overflow-hidden pt-1">
        <svg viewBox="0 0 760 140" className="w-full h-full" preserveAspectRatio="none">
          {/* Сетка глубин Y */}
          <line x1={xMin} y1={getY(4.50)} x2={xMax} y2={getY(4.50)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />
          <line x1={xMin} y1={getY(4.00)} x2={xMax} y2={getY(4.00)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />
          <line x1={xMin} y1={getY(3.50)} x2={xMax} y2={getY(3.50)} stroke="var(--hairline)" strokeWidth="1" strokeDasharray="2, 4" />

          {/* Метки оси Y (шрифт 13px для отличной читаемости на проекторе) */}
          <text x={xMin - 8} y={getY(4.50) + 4} fill="var(--text-2)" fontSize="13" textAnchor="end" fontFamily="monospace">4.50</text>
          <text x={xMin - 8} y={getY(4.00) + 4} fill="var(--text-2)" fontSize="13" textAnchor="end" fontFamily="monospace">4.00</text>
          <text x={xMin - 8} y={getY(3.50) + 4} fill="var(--text-2)" fontSize="13" textAnchor="end" fontFamily="monospace">3.50</text>

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
              <text
                x={(riskStartX + riskEndX) / 2}
                y={(draftY + bottomY) / 2 + 5}
                fill="var(--critical)"
                fontSize="13"
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
          <text
            x={xMax - 8}
            y={draftY - 7}
            fill="var(--warn)"
            fontSize="13"
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
            y2={yMax + 14}
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="2"
            strokeDasharray="4, 3"
          />
          {/* Флажок ETA (размещен так, чтобы не налезать на кривую) */}
          <rect
            x={etaX - 68}
            y={2}
            width={136}
            height={18}
            rx={5}
            fill="var(--surface)"
            stroke={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            strokeWidth="1.5"
          />
          <text
            x={etaX}
            y={15}
            fill={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            fontSize="12"
            textAnchor="middle"
            fontWeight="bold"
          >
            ETA: T+{vesselEtaBarHour}ч {isSafePass ? '(ПРОХОД)' : isEtaInRiskWindow ? '(МЕЛЬ!)' : '(ОЖИДАНИЕ)'}
          </text>
          <circle
            cx={etaX}
            cy={etaY}
            r="5"
            fill={isSafePass ? 'var(--ok)' : isEtaInRiskWindow ? 'var(--critical)' : 'var(--warn)'}
            stroke="var(--text)"
            strokeWidth="1.5"
          />

          {/* Вертикальный интерактивный бегунок (Scrubber Cursor) */}
          <line
            x1={cursorX}
            y1={yMin}
            x2={cursorX}
            y2={yMax + 14}
            stroke="var(--text)"
            strokeWidth="1.8"
          />
          <circle
            cx={cursorX}
            cy={cursorY}
            r="4.5"
            fill="var(--text)"
            stroke="var(--accent)"
            strokeWidth="2"
          />

          {/* Метки оси X (время T+h, шрифт 13px) */}
          <text x={getX(0)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+0ч</text>
          <text x={getX(12)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+12ч</text>
          <text x={getX(24)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+24ч</text>
          <text x={getX(36)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+36ч</text>
          <text x={getX(48)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+48ч</text>
          <text x={getX(60)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+60ч</text>
          <text x={getX(72)} y="132" fill="var(--text-2)" fontSize="13" textAnchor="middle" fontFamily="monospace">T+72ч</text>
        </svg>
      </div>

      {/* Interactive Scrubber Slider, Playback Controls and Telemetry Readout */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* Кнопка Автоплея для демо */}
          <button
            onClick={togglePlayback}
            className={`px-3 py-1.5 rounded-inner text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
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
            className="w-8 h-8 rounded-inner bg-surface hover:bg-surface-2 border border-hairline text-text-2 hover:text-text flex items-center justify-center transition-all cursor-pointer shrink-0"
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
          <span className="font-mono text-xs text-text font-semibold w-16 text-right tabular-nums">
            T+{currentHour}ч
          </span>
        </div>

        {/* Telemetry info row (Только числа в monospace, подписи обычным текстом) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-2">
          <span>
            Глубина на баре: <strong className="text-text font-mono tabular-nums">{currentPoint.depthMeters.toFixed(2)} м</strong>
          </span>
          <span>
            Полоса P10–P90: <span className="font-mono tabular-nums text-text">{currentPoint.p10DepthMeters.toFixed(2)}..{currentPoint.p90DepthMeters.toFixed(2)} м</span>
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
      </div>
    </div>
  );
};
