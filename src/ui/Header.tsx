import React from 'react';
import { Anchor, RefreshCw, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  vkmskDepthMeters: number;
  windSpeedMs: number;
  isCrisisActive: boolean;
  isSlotSynced: boolean;
  onToggleCrisis: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vkmskDepthMeters,
  windSpeedMs,
  isCrisisActive,
  isSlotSynced,
  onToggleCrisis,
  onReset,
}) => {
  return (
    <header className="fixed top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none select-none">
      {/* Brand & Mission */}
      <div className="pointer-events-auto flex items-center gap-3 glass-panel px-4 py-2.5 rounded-panel">
        <div className="w-8 h-8 rounded-inner bg-accent-muted text-accent flex items-center justify-center">
          <Anchor className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-text">
              Smart Caspian Transit
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-text-2 border border-hairline">
              Демо-данные
            </span>
          </div>
          <p className="text-[11px] text-text-2">
            Цифровой двойник МТК Север–Юг · КЦФ 2026
          </p>
        </div>
      </div>

      {/* ВКМСК Telemetry Badge */}
      <div className="pointer-events-auto hidden md:flex items-center gap-4 glass-panel px-5 py-2.5 rounded-panel text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isCrisisActive && !isSlotSynced ? 'bg-critical' : 'bg-ok'
            }`}
          />
          <span className="text-text-2">ВКМСК:</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              isCrisisActive && !isSlotSynced ? 'text-critical' : 'text-text'
            }`}
          >
            {vkmskDepthMeters.toFixed(2)} м
          </span>
          <span className="text-[11px] text-text-2 tabular-nums">
            ({windSpeedMs.toFixed(1)} м/с {isCrisisActive ? 'СВ сгон' : 'ЮЗ'})
          </span>
        </div>
      </div>

      {/* Incident Simulation & Reset Controls */}
      <div className="pointer-events-auto flex items-center gap-2 glass-panel p-1.5 rounded-panel">
        <button
          onClick={onToggleCrisis}
          className={`px-3.5 py-1.5 rounded-inner text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
            isCrisisActive
              ? 'bg-critical text-text'
              : 'bg-surface-2 hover:bg-divider text-text'
          }`}
        >
          <AlertTriangle
            className={`w-3.5 h-3.5 ${isCrisisActive ? 'text-text' : 'text-warn'}`}
            strokeWidth={1.5}
          />
          <span>
            {isCrisisActive ? 'Сгон ВКМСК активен' : 'Симулировать сгон ВКМСК'}
          </span>
        </button>

        {(isCrisisActive || isSlotSynced) && (
          <button
            onClick={onReset}
            className="w-8 h-8 rounded-inner bg-surface-2 hover:bg-divider text-text-2 hover:text-text flex items-center justify-center transition-all cursor-pointer"
            title="Сброс к штатному состоянию"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
};
