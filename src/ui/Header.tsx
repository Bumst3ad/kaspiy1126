import React from 'react';
import { Anchor, RefreshCw } from 'lucide-react';

export type ScenarioPresetMode = 'nominal' | 'sgon' | 'june2026';
export type UiMode = 'demo' | 'dispatcher';

interface HeaderProps {
  vkmskDepthMeters: number;
  windSpeedMs: number;
  windRumb: string;
  presetMode: ScenarioPresetMode;
  onSelectPresetMode: (mode: ScenarioPresetMode) => void;
  uiMode: UiMode;
  onSelectUiMode: (mode: UiMode) => void;
  isSlotSynced: boolean;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vkmskDepthMeters,
  windSpeedMs,
  windRumb,
  presetMode,
  onSelectPresetMode,
  uiMode,
  onSelectUiMode,
  isSlotSynced,
  onReset,
}) => {
  return (
    <header className="h-16 px-6 border-b border-hairline bg-surface/80 backdrop-blur-md flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Mission */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-inner bg-accent-muted text-accent flex items-center justify-center">
          <Anchor className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-text">
              Smart Caspian Transit
            </span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-2 text-text-2 border border-hairline">
              Демо-данные
            </span>
          </div>
          <p className="text-xs text-text-2">
            Цифровой двойник МТК «Север–Юг» · КЦФ 2026
          </p>
        </div>
      </div>

      {/* Переключатель режима экрана: Демо (по умолчанию) | Диспетчер (клавиша D) */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-inner bg-surface border border-hairline flex items-center gap-1 text-xs">
          <button
            onClick={() => onSelectUiMode('demo')}
            className={`px-3 py-1.5 rounded-inner font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              uiMode === 'demo'
                ? 'bg-surface-2 text-text border border-hairline shadow-sm font-semibold'
                : 'text-text-2 hover:text-text'
            }`}
            title="Демо-режим (клавиша D)"
          >
            <span>Демо</span>
            <kbd className="text-[10px] px-1 py-0.2 rounded bg-surface border border-hairline text-text-2 font-mono">
              D
            </kbd>
          </button>
          <button
            onClick={() => onSelectUiMode('dispatcher')}
            className={`px-3 py-1.5 rounded-inner font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              uiMode === 'dispatcher'
                ? 'bg-surface-2 text-text border border-hairline shadow-sm font-semibold'
                : 'text-text-2 hover:text-text'
            }`}
            title="Диспетчерский режим полного экрана"
          >
            <span>Диспетчер</span>
          </button>
        </div>
      </div>

      {/* ВКМСК Telemetry Badge (Шрифты без font-mono для прозы, только числа) */}
      <div className="hidden xl:flex items-center gap-3 px-4 py-1.5 rounded-inner bg-surface border border-hairline text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isSlotSynced ? 'bg-ok' : presetMode !== 'nominal' ? 'bg-critical' : 'bg-ok'
            }`}
          />
          <span className="text-text-2">ВКМСК бар 151 км:</span>
          <span
            className={`font-semibold tabular-nums font-mono ${
              isSlotSynced ? 'text-ok' : presetMode !== 'nominal' ? 'text-critical' : 'text-text'
            }`}
          >
            {isSlotSynced ? 'Обход (Махачкала 6.8 м)' : `${vkmskDepthMeters.toFixed(2)} м`}
          </span>
          {!isSlotSynced && (
            <span className="text-xs text-text-2">
              (паспорт 4.50 м)
            </span>
          )}
          <span className="text-xs text-text-2 font-mono tabular-nums">
            · {windSpeedMs.toFixed(1)} м/с {windRumb}
          </span>
        </div>
      </div>

      {/* Apple-style Segmented Control: Штатно | Сгон | Июнь 2026 */}
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-inner bg-surface border border-hairline flex items-center gap-1 text-xs">
          <button
            onClick={() => onSelectPresetMode('nominal')}
            className={`px-3 py-1.5 rounded-inner font-medium transition-all cursor-pointer ${
              presetMode === 'nominal'
                ? 'bg-surface-2 text-text border border-hairline shadow-sm'
                : 'text-text-2 hover:text-text'
            }`}
          >
            Штатно
          </button>
          <button
            onClick={() => onSelectPresetMode('sgon')}
            className={`px-3 py-1.5 rounded-inner font-medium transition-all cursor-pointer ${
              presetMode === 'sgon'
                ? 'bg-surface-2 text-text border border-hairline shadow-sm'
                : 'text-text-2 hover:text-text'
            }`}
          >
            Сгон (СЗ 14.5 м/с)
          </button>
          <button
            onClick={() => onSelectPresetMode('june2026')}
            className={`px-3 py-1.5 rounded-inner font-medium transition-all cursor-pointer ${
              presetMode === 'june2026'
                ? 'bg-surface-2 text-text border border-hairline shadow-sm'
                : 'text-text-2 hover:text-text'
            }`}
          >
            Июнь 2026 (Минтранс)
          </button>
        </div>

        {presetMode !== 'nominal' && (
          <button
            onClick={onReset}
            className="w-8 h-8 rounded-inner bg-surface hover:bg-surface-2 border border-hairline text-text-2 hover:text-text flex items-center justify-center transition-all cursor-pointer"
            title="Сброс к штатному состоянию"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
};
