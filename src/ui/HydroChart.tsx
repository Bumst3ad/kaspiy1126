import React from 'react';
import { Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { HydroProfileForecast, HydroTimelinePoint } from '../domain/hydroProfile';

interface HydroChartProps {
  profile: HydroProfileForecast;
  currentPoint: HydroTimelinePoint;
  currentHour: number;
  onHourChange: (hour: number) => void;
  isSlotSynced: boolean;
}

export const HydroChart: React.FC<HydroChartProps> = ({
  profile,
  currentPoint,
  currentHour,
  onHourChange,
  isSlotSynced,
}) => {
  const { timeline, riskWindow } = profile;

  // Координатная сетка SVG (ViewBox 0 0 760 120)
  const xMin = 40;
  const xMax = 720;
  const xSpan = xMax - xMin;

  const yMin = 15; // 4.80 м
  const yMax = 95; // 3.20 м
  const ySpan = yMax - yMin;

  const getX = (h: number) => xMin + (Math.max(0, Math.min(72, h)) / 72) * xSpan;
  const getY = (d: number) => yMin + ((4.80 - Math.max(3.20, Math.min(4.80, d))) / 1.60) * ySpan;

  // Линия осадки судна (4.15 м)
  const draftY = getY(4.15);

  // Построение пути кривой глубины
  const depthPath = timeline.reduce((acc, pt, idx) => {
    const x = getX(pt.hour);
    const y = getY(pt.depthMeters);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // Полигон закрашенного окна риска (где глубина <= осадки 4.15 м)
  const riskStartX = getX(riskWindow.startHour);
  const riskEndX = getX(riskWindow.endHour);
  const bottomY = getY(3.55);

  const riskPolygonPoints = `
    ${riskStartX},${draftY}
    ${riskEndX},${draftY}
    ${riskEndX},${bottomY}
    ${riskStartX},${bottomY}
  `;

  // Текущая точка бегунка
  const cursorX = getX(currentHour);
  const cursorY = getY(currentPoint.depthMeters);

  const presets = [
    { label: 'T+0ч (Норма)', hour: 0 },
    { label: 'T+15ч (Вход в риск)', hour: 15 },
    { label: 'T+24ч (Пик мели)', hour: 24 },
    { label: 'T+48ч (Спад ветра)', hour: 48 },
    { label: 'T+72ч (Штат)', hour: 72 },
  ];

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
              Гидрологический профиль ВКМСК (151–155 км) vs Осадка судна
            </span>
            <p className="text-[10px] text-text-2">
              Предиктивная модель сгонного уровня воды на лимитирующем баре (прогноз на 72 ч)
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isSlotSynced ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-ok bg-ok-muted text-ok flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" strokeWidth={1.5} />
              Слот переведён на Махачкалу (6.8 м)
            </span>
          ) : currentPoint.isRisk ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-critical bg-critical-muted text-critical flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              Окно риска: мель ({currentPoint.clearanceMeters} м)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-hairline bg-surface-2 text-text-2">
              Запас под килем: +{currentPoint.clearanceMeters.toFixed(2)} м
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Area */}
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

          {/* Закрашенное окно риска (где глубина канала < осадки 4.15 м) */}
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
            fontSize="9"
            textAnchor="middle"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ОКНО РИСКА ПОСАДКИ НА МЕЛЬ
          </text>

          {/* Горизонтальная линия осадки судна (4.15 м) */}
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
            Осадка судна: 4.15 м
          </text>

          {/* Кривая прогноза глубины канала */}
          <path
            d={depthPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Вертикальный бегунок (Scrubber Cursor) */}
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
            r="4.5"
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

      {/* Interactive Scrubber Slider and Quick Preset Buttons */}
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

        {/* Quick jump presets */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.hour}
                onClick={() => onHourChange(p.hour)}
                className={`px-2 py-0.5 rounded bg-surface border transition-all cursor-pointer ${
                  currentHour === p.hour
                    ? 'border-accent text-accent'
                    : 'border-hairline text-text-2 hover:text-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Dynamic KPI readout at current scrubber position */}
          <div className="flex items-center gap-3 text-text-2">
            <span>
              Глубина: <strong className="text-text font-mono">{currentPoint.depthMeters.toFixed(2)} м</strong>
            </span>
            <span>
              Ветер: <strong className="text-text font-mono">{currentPoint.windSpeedMs} м/с {currentPoint.windRumb}</strong>
            </span>
            <span>
              Демередж: <strong className="text-text font-mono">${currentPoint.demurrageUsd.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
