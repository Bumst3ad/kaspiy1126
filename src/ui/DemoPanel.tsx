import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Leaf,
  Clock,
  DollarSign,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { DecisionScenario } from '../domain/scenarioDecision';
import { VesselData, CargoManifest } from '../data/types';
import { SyncSlotPanel } from './SyncSlotPanel';
import { CargoCard } from './CargoCard';

interface DemoPanelProps {
  vessel: VesselData;
  cargo: CargoManifest;
  scenarios: DecisionScenario[];
  recommendedScenario: DecisionScenario;
  waitScenario: DecisionScenario;
  isSlotSynced: boolean;
  isSyncing: boolean;
  isCrisisActive: boolean;
  onApplySyncSlot: () => void;
  vkmskDepthMeters: number;
  currentHour: number;
  groundingProbability: number;
  isPreCleared: boolean;
  onPreClear: () => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  vessel,
  cargo,
  scenarios,
  recommendedScenario,
  waitScenario,
  isSlotSynced,
  isSyncing,
  isCrisisActive,
  onApplySyncSlot,
  vkmskDepthMeters,
  groundingProbability,
  isPreCleared,
  onPreClear,
}) => {
  const [isAlternativesOpen, setIsAlternativesOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [expandedAlternativeId, setExpandedAlternativeId] = useState<string | null>(null);

  const isPassOnly = scenarios.length === 1 && scenarios[0].id === 'pass';
  const secondaryScenarios = scenarios.filter((s) => s.id !== recommendedScenario.id && s.id !== 'pass');

  // Запас под килем UKC
  const clearanceMeters = Number((vkmskDepthMeters - vessel.draftMeters).toFixed(2));

  return (
    <div className="flex flex-col gap-4 text-text select-none">
      {/* (а) ЗАГОЛОВОК 28–32px: critical цвет ТОЛЬКО здесь при риске */}
      <div className="px-1 pt-1">
        {isSlotSynced ? (
          <h1 className="text-[28px] lg:text-[30px] font-bold text-ok tracking-tight leading-tight">
            Слот подтверждён: судно, порт и РЖД синхронизированы
          </h1>
        ) : isCrisisActive && groundingProbability > 5 ? (
          <h1 className="text-[28px] lg:text-[30px] font-bold text-critical tracking-tight leading-tight">
            {vessel.name} сядет на мель на баре 151 км через 20 ч — вероятность {groundingProbability}%
          </h1>
        ) : (
          <h1 className="text-[28px] lg:text-[30px] font-bold text-ok tracking-tight leading-tight">
            Проход обеспечен: бар 151 км свободен, задержек нет
          </h1>
        )}
        <p className="text-text-2 text-xs mt-1">
          {isSlotSynced
            ? 'Перенаправление в Махачкалу активно · Причал B-4 · Нитка RZD-Slot-A17'
            : isCrisisActive
            ? 'Прогноз гидродинамической модели ВКМСК (151–155 км) с учетом сгона и наносов'
            : 'Фактическая глубина достаточна для безопасного следования'}
        </p>
      </div>

      {/* (б) ОДНА РЕКОМЕНДОВАННАЯ КАРТОЧКА «Перенаправить в Махачкалу» */}
      {!isPassOnly ? (
        <div className="glass-panel p-4 rounded-panel border border-hairline flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" strokeWidth={1.5} />
              <span className="font-semibold text-sm text-text">
                {recommendedScenario.title}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-ok-muted border border-ok text-ok">
              Рекомендовано
            </span>
          </div>

          <p className="text-xs text-text-2 leading-relaxed">
            {recommendedScenario.subtitle}
          </p>

          {/* Три крупных KPI (Δ время, Δ $, Δ CO₂) */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div className="p-2.5 rounded-inner bg-surface border border-hairline flex flex-col">
              <div className="flex items-center gap-1 text-text-2 text-xs mb-0.5">
                <Clock className="w-3 h-3 text-accent" strokeWidth={1.5} />
                <span>Δ Время</span>
              </div>
              <span className="text-[22px] font-bold font-mono tabular-nums text-text">
                {recommendedScenario.deltaHours >= 0 ? `+${recommendedScenario.deltaHours}` : recommendedScenario.deltaHours} ч
              </span>
              <span className="text-[10px] text-text-2">к расписанию</span>
            </div>

            <div className="p-2.5 rounded-inner bg-surface border border-hairline flex flex-col">
              <div className="flex items-center gap-1 text-text-2 text-xs mb-0.5">
                <DollarSign className="w-3 h-3 text-accent" strokeWidth={1.5} />
                <span>Δ Затраты</span>
              </div>
              <span className="text-[22px] font-bold font-mono tabular-nums text-text">
                +${recommendedScenario.deltaCostUsd.toLocaleString()}
              </span>
              <span className="text-[10px] text-text-2">ж/д плечо РЖД</span>
            </div>

            <div className="p-2.5 rounded-inner bg-surface border border-hairline flex flex-col">
              <div className="flex items-center gap-1 text-text-2 text-xs mb-0.5">
                <Leaf className="w-3 h-3 text-ok" strokeWidth={1.5} />
                <span>Δ CO₂</span>
              </div>
              <span className="text-[22px] font-bold font-mono tabular-nums text-text">
                +{recommendedScenario.deltaCo2Tons} т
              </span>
              <span className="text-[10px] text-text-2">ISO 14083</span>
            </div>
          </div>

          {/* Строка «Если ничего не делать» */}
          <div className="flex items-center justify-between text-xs text-text-2 bg-surface p-2.5 rounded-inner border border-hairline">
            <span>Если ничего не делать (демередж на рейде):</span>
            <span className="font-mono tabular-nums text-text font-semibold">
              +{waitScenario.deltaHours} ч · +${waitScenario.deltaCostUsd.toLocaleString()}
            </span>
          </div>

          {/* Кнопка «Применить» */}
          {!isSlotSynced ? (
            <button
              onClick={onApplySyncSlot}
              disabled={isSyncing}
              className="w-full py-3 px-4 rounded-inner bg-accent hover:bg-accent-hover text-text font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Zap className="w-4 h-4" strokeWidth={1.5} />
              <span>{isSyncing ? 'Синхронизация слотов...' : 'Применить: Синхронизировать слот РЖД ⇄ Порт'}</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-4 rounded-inner bg-ok-muted border border-ok text-ok font-semibold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-ok" strokeWidth={1.5} />
              <span>Слот RZD-Slot-A17 подтвержден · Задержка устранена</span>
            </div>
          )}
        </div>
      ) : (
        /* Штатный проход */
        <div className="glass-panel p-4 rounded-panel border border-ok bg-ok-muted flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ok font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            <span>{scenarios[0].title}</span>
          </div>
          <p className="text-xs text-text-2">
            {scenarios[0].subtitle}
          </p>
        </div>
      )}

      {/* (в) «ДРУГИЕ ВАРИАНТЫ (2)» — по одной строке, по умолчанию свёрнуты */}
      {!isPassOnly && secondaryScenarios.length > 0 && (
        <div className="glass-panel rounded-panel border border-hairline overflow-hidden">
          <button
            onClick={() => setIsAlternativesOpen((prev) => !prev)}
            className="w-full p-3.5 flex items-center justify-between text-xs text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <span className="font-semibold">
              Другие варианты ({secondaryScenarios.length})
            </span>
            <div className="flex items-center gap-1.5 text-text-2">
              <span>{isAlternativesOpen ? 'Скрыть' : 'Показать'}</span>
              {isAlternativesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </div>
          </button>

          {isAlternativesOpen && (
            <div className="p-3 pt-0 flex flex-col gap-2 border-t border-hairline">
              {secondaryScenarios.map((scenario) => {
                const isExpanded = expandedAlternativeId === scenario.id;
                return (
                  <div
                    key={scenario.id}
                    className="p-3 rounded-inner bg-surface border border-hairline flex flex-col gap-2"
                  >
                    <div
                      onClick={() =>
                        setExpandedAlternativeId((prev) => (prev === scenario.id ? null : scenario.id))
                      }
                      className="flex items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-xs text-text truncate">
                          {scenario.title}
                        </span>
                        <span className="text-[11px] text-text-2 font-mono tabular-nums whitespace-nowrap">
                          +{scenario.deltaHours} ч · +${scenario.deltaCostUsd.toLocaleString()}
                        </span>
                      </div>

                      {/* Серо-нейтральный чип отказа с красной иконкой (Пункт 3) */}
                      {scenario.rejectionReason && (
                        <div className="px-2 py-0.5 rounded bg-surface border border-hairline text-text-2 text-[10px] flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-critical shrink-0" strokeWidth={1.5} />
                          <span className="truncate max-w-[170px]">{scenario.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-hairline text-xs text-text-2 space-y-1.5">
                        <p>{scenario.subtitle}</p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-text-2">Причал/кран:</span>
                            <span className={scenario.feasibility.berthAndCrane ? 'text-ok' : 'text-text-2'}>
                              {scenario.feasibility.berthAndCrane ? 'Да' : 'Нет'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-text-2">Нитка РЖД:</span>
                            <span className={scenario.feasibility.rzdSlot ? 'text-ok' : 'text-text-2'}>
                              {scenario.feasibility.rzdSlot ? 'Да' : 'Нет'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* (д) ПОСЛЕ «ПРИМЕНИТЬ»: плавно раскрывается блок синхронизации и манифест груза */}
      {isSlotSynced && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <SyncSlotPanel
            vessel={vessel}
            vkmskDepthMeters={vkmskDepthMeters}
            isSlotSynced={isSlotSynced}
            isCrisisActive={false}
            waitScenario={waitScenario}
            selectedScenario={recommendedScenario}
          />

          <CargoCard
            cargo={cargo}
            isPreCleared={isPreCleared}
            onPreClear={onPreClear}
            isSlotSynced={isSlotSynced}
          />
        </div>
      )}

      {/* (г) «ПОДРОБНОСТИ ▾» (карточка судна, UKC, формулы) — свёрнуто */}
      {!isSlotSynced && (
        <div className="glass-panel rounded-panel border border-hairline overflow-hidden">
          <button
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="w-full p-3.5 flex items-center justify-between text-xs text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              <span className="font-semibold">Подробности судна, UKC и формулы</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-2">
              <span>{isDetailsOpen ? 'Скрыть' : 'Раскрыть'}</span>
              {isDetailsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
            </div>
          </button>

          {isDetailsOpen && (
            <div className="p-4 pt-2 flex flex-col gap-3 border-t border-hairline text-xs">
              <div className="grid grid-cols-2 gap-2 text-text-2">
                <div className="p-2 rounded bg-surface border border-hairline flex justify-between">
                  <span>Осадка судна:</span>
                  <span className="font-mono text-text tabular-nums font-semibold">{vessel.draftMeters.toFixed(2)} м</span>
                </div>
                <div className="p-2 rounded bg-surface border border-hairline flex justify-between">
                  <span>Глубина канала:</span>
                  <span className="font-mono text-text tabular-nums font-semibold">{vkmskDepthMeters.toFixed(2)} м</span>
                </div>
                <div className="p-2 rounded bg-surface border border-hairline flex justify-between col-span-2">
                  <span>Запас под килем (UKC):</span>
                  <span className={`font-mono tabular-nums font-bold ${clearanceMeters < 0 ? 'text-critical' : clearanceMeters < 0.5 ? 'text-warn' : 'text-ok'}`}>
                    {clearanceMeters >= 0 ? `+${clearanceMeters.toFixed(2)}` : clearanceMeters.toFixed(2)} м (норма ≥ 0.50 м, допущение)
                  </span>
                </div>
              </div>

              {/* Формулы */}
              <div className="p-3 rounded bg-surface border border-hairline text-text-2 space-y-1.5 text-[11px]">
                <div className="font-semibold text-text flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                  <span>Формула риска и вероятности мели</span>
                </div>
                <p>
                  P(глубина &lt; осадка) = Φ((осадка − μ) / σ), где σ = (P90 − P10) / 2.563, μ — медианная глубина.
                </p>
                <p>
                  ΔCO₂ = ISO 14083 / GLEC v3.0: экономия мультимодального маршрута относительно автодоставки 1221.9 т.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};