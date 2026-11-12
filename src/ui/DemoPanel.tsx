import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Leaf,
  Zap,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Anchor,
  HelpCircle,
} from 'lucide-react';
import { VesselData, CargoManifest } from '../data/types';
import { HydroProfileForecast } from '../domain/hydroProfile';
import { DecisionScenario } from '../domain/scenarioDecision';
import { SyncSlotPanel } from './SyncSlotPanel';
import { CargoCard } from './CargoCard';

interface DemoPanelProps {
  vessel: VesselData;
  hydroForecast: HydroProfileForecast;
  scenarios: DecisionScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: 'wait' | 'makhachkala' | 'lighten') => void;
  onApplySyncSlot: () => void;
  isSlotSynced: boolean;
  isSyncing: boolean;
  waitScenario: DecisionScenario;
  cargo: CargoManifest;
  isPreCleared: boolean;
  onPreClear: () => void;
  vkmskDepthMeters: number;
  isCrisisActive: boolean;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({
  vessel,
  hydroForecast,
  scenarios,
  onApplySyncSlot,
  isSlotSynced,
  isSyncing,
  waitScenario,
  cargo,
  isPreCleared,
  onPreClear,
  vkmskDepthMeters,
  isCrisisActive,
}) => {
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  const toggleScenario = (id: string) => {
    setExpandedScenarioId((prev) => (prev === id ? null : id));
  };

  const isGroundingRisk = isCrisisActive && !isSlotSynced && hydroForecast.arrivalGroundingProbabilityPercent > 0;
  const recommendedScenario = scenarios.find((s) => s.isRecommended) || scenarios[0];
  const secondaryScenarios = scenarios.filter((s) => s !== recommendedScenario);

  return (
    <div className="flex flex-col gap-4 text-text select-none">
      {/* (а) КРУПНЫЙ ЗАГОЛОВОК 28-32px (critical цвет ТОЛЬКО здесь во время риска) */}
      <div className="pt-1">
        {isSlotSynced ? (
          <h1 className="text-[28px] font-bold text-ok leading-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-8 h-8 text-ok shrink-0" strokeWidth={2} />
            <span>Слот подтверждён: судно, порт и РЖД синхронизированы</span>
          </h1>
        ) : isGroundingRisk ? (
          <h1 className="text-[28px] font-bold text-critical leading-tight">
            {vessel.name} сядет на мель на баре 151 км через {hydroForecast.vesselEtaBarHour} ч — вероятность {hydroForecast.arrivalGroundingProbabilityPercent}%
          </h1>
        ) : (
          <h1 className="text-[28px] font-bold text-ok leading-tight flex items-center gap-2.5">
            <CheckCircle2 className="w-8 h-8 text-ok shrink-0" strokeWidth={2} />
            <span>{vessel.name}: проход обеспечен по графику</span>
          </h1>
        )}
      </div>

      {/* СОСТОЯНИЕ 1: ДО СИНХРОНИЗАЦИИ (РЕЖИМ РЕШЕНИЯ) */}
      {!isSlotSynced && (
        <>
          {/* (б) ОДНА РЕКОМЕНДОВАННАЯ КАРТОЧКА «Перенаправить в Махачкалу» */}
          <div className="glass-panel p-5 rounded-panel border border-hairline flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-text-2 uppercase tracking-wider font-semibold">
                  Рекомендованное решение
                </span>
                <h2 className="text-lg font-bold text-text mt-0.5">
                  {recommendedScenario.title}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-ok-muted border border-ok text-ok">
                Рекомендовано
              </span>
            </div>

            <p className="text-sm text-text-2 leading-relaxed">
              {recommendedScenario.subtitle}
            </p>

            {/* Три крупных KPI (20–28px, моно только для чисел) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-inner bg-surface border border-hairline flex flex-col items-center justify-center">
                <span className="text-xs text-text-2 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-text-2" strokeWidth={1.5} />
                  Δ Время
                </span>
                <span className="text-[24px] font-bold text-text font-mono tabular-nums leading-none">
                  +{recommendedScenario.deltaHours} ч
                </span>
              </div>

              <div className="p-3 rounded-inner bg-surface border border-hairline flex flex-col items-center justify-center">
                <span className="text-xs text-text-2 flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-text-2" strokeWidth={1.5} />
                  Δ Затраты
                </span>
                <span className="text-[24px] font-bold text-text font-mono tabular-nums leading-none">
                  +${recommendedScenario.deltaCostUsd.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-inner bg-surface border border-hairline flex flex-col items-center justify-center">
                <span className="text-xs text-text-2 flex items-center gap-1 mb-1">
                  <Leaf className="w-3.5 h-3.5 text-text-2" strokeWidth={1.5} />
                  Δ CO2
                </span>
                <span className="text-[24px] font-bold text-text font-mono tabular-nums leading-none">
                  +{recommendedScenario.deltaCo2Tons} т
                </span>
              </div>
            </div>

            {/* Строка «Если ничего не делать» */}
            <div className="p-3 rounded-inner bg-surface-2 border border-hairline text-xs text-text-2 flex items-center justify-between">
              <span>Если ничего не делать:</span>
              <span className="font-mono tabular-nums font-semibold text-text text-sm">
                +{waitScenario.deltaHours} ч · +${waitScenario.deltaCostUsd.toLocaleString()}
              </span>
            </div>

            {/* Кнопка «Применить» */}
            {recommendedScenario.id === 'makhachkala' && (
              <button
                onClick={onApplySyncSlot}
                disabled={isSyncing}
                className="w-full py-3 px-4 rounded-inner bg-accent hover:opacity-90 active:opacity-100 text-text font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <Zap className="w-4 h-4" strokeWidth={2} />
                <span>Применить Caspian Sync-Slot (Махачкала)</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            )}

            {recommendedScenario.id === 'wait' && (
              <div className="p-3 rounded-inner bg-ok-muted border border-ok text-ok text-sm font-medium flex items-center gap-2">
                <Anchor className="w-4 h-4" strokeWidth={1.5} />
                <span>Ожидание на внешнем рейде обеспечено</span>
              </div>
            )}
          </div>

          {/* (в) «ДРУГИЕ ВАРИАНТЫ (2)» — по одной строке с чипом причины (серо-нейтральный с красной иконкой) */}
          {secondaryScenarios.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-text-2 font-medium px-1">
                Другие варианты ({secondaryScenarios.length}):
              </span>

              {secondaryScenarios.map((scenario) => {
                const isExpanded = expandedScenarioId === scenario.id;

                return (
                  <div
                    key={scenario.id}
                    className="rounded-inner border border-hairline bg-surface hover:bg-surface-2 transition-all overflow-hidden"
                  >
                    {/* Collapsed One-Line Row */}
                    <div
                      onClick={() => toggleScenario(scenario.id)}
                      className="p-3 flex items-center justify-between cursor-pointer text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-text text-sm">
                          {scenario.title}
                        </span>
                        <span className="text-text-2 font-mono tabular-nums text-xs">
                          +{scenario.deltaHours} ч · +${scenario.deltaCostUsd.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {scenario.rejectionReason && (
                          <span className="px-2 py-0.5 rounded text-xs bg-surface-2 border border-hairline text-text-2 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-critical shrink-0" strokeWidth={1.5} />
                            <span>{scenario.id === 'wait' ? 'Срыв слота >6 ч' : 'Нет плавкрана'}</span>
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-text-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-2" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="p-3 border-t border-hairline bg-surface-2 text-xs space-y-2 text-text-2">
                        <p className="text-sm text-text-2 leading-relaxed">
                          {scenario.subtitle}
                        </p>
                        {scenario.rejectionReason && (
                          <div className="p-2 rounded bg-surface border border-hairline text-text-2 text-xs flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-critical shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>
                              <strong>Причина отказа:</strong> {scenario.rejectionReason}
                            </span>
                          </div>
                        )}
                        <div className="space-y-1 bg-surface p-2.5 rounded border border-hairline text-xs">
                          <div className="flex justify-between">
                            <span>Осадка:</span>
                            <span className="text-text">{scenario.feasibility.draftDetail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Причал и кран:</span>
                            <span className="text-text">{scenario.feasibility.berthAndCraneDetail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Нитка РЖД:</span>
                            <span className="text-text">{scenario.feasibility.rzdSlotDetail}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* (г) «ПОДРОБНОСТИ ▾» (карточка судна, UKC, формулы) свёрнуто */}
          <div className="rounded-inner border border-hairline bg-surface overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full p-3 flex items-center justify-between text-xs font-medium text-text-2 hover:text-text cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                <span>Подробности (судно, UKC, формулы)</span>
              </span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDetails && (
              <div className="p-3 border-t border-hairline bg-surface-2 space-y-3">
                <button
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{showFormulas ? 'Скрыть математические формулы' : 'Показать формулы расчёта'}</span>
                </button>

                {showFormulas && (
                  <div className="p-3 rounded bg-surface border border-accent text-xs space-y-1.5 text-text-2">
                    <div className="font-semibold text-text text-sm">
                      Формулы модели принятия решений:
                    </div>
                    <div>
                      <span className="text-text">Вероятность мели:</span> {recommendedScenario.calculationDetails.groundingProbabilityFormula || 'P(глубина < осадка) = Φ((осадка - μ) / σ), где σ = (P90 - P10) / 2.563'}
                    </div>
                    <div>
                      <span className="text-text">Время:</span> {recommendedScenario.calculationDetails.timeFormula}
                    </div>
                    <div>
                      <span className="text-text">Затраты:</span> {recommendedScenario.calculationDetails.costFormula}
                    </div>
                    <div>
                      <span className="text-text">Эмиссия:</span> {recommendedScenario.calculationDetails.co2Formula}
                    </div>
                  </div>
                )}

                <SyncSlotPanel
                  vessel={vessel}
                  vkmskDepthMeters={vkmskDepthMeters}
                  isSlotSynced={isSlotSynced}
                  isCrisisActive={isCrisisActive}
                  waitScenario={waitScenario}
                  selectedScenario={recommendedScenario}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* СОСТОЯНИЕ 2: ПОСЛЕ «ПРИМЕНИТЬ» (СИНХРОНИЗИРОВАНО) */}
      {isSlotSynced && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Плавно раскрывается блок синхронизации слота */}
          <SyncSlotPanel
            vessel={vessel}
            vkmskDepthMeters={vkmskDepthMeters}
            isSlotSynced={isSlotSynced}
            isCrisisActive={false}
            waitScenario={waitScenario}
            selectedScenario={recommendedScenario}
          />

          {/* Манифест с ESG и pre-clearance */}
          <CargoCard
            cargo={cargo}
            isPreCleared={isPreCleared}
            onPreClear={onPreClear}
            isSlotSynced={isSlotSynced}
          />
        </div>
      )}
    </div>
  );
};
