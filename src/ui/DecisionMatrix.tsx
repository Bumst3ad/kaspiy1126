import React, { useState } from 'react';
import {
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  DollarSign,
  Leaf,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  Anchor,
  AlertTriangle
} from 'lucide-react';
import { DecisionScenario } from '../domain/scenarioDecision';

interface DecisionMatrixProps {
  scenarios: DecisionScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: 'wait' | 'makhachkala' | 'lighten') => void;
  onApplySyncSlot: () => void;
  isSlotSynced: boolean;
  isSyncing: boolean;
}

export const DecisionMatrix: React.FC<DecisionMatrixProps> = ({
  scenarios,
  onApplySyncSlot,
  isSlotSynced,
  isSyncing,
}) => {
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedScenarioId((prev) => (prev === id ? null : id));
  };

  const isPassOnly = scenarios.length === 1 && scenarios[0].id === 'pass';

  // Рекомендованный сценарий выносим на первое место
  const recommendedScenario = scenarios.find((s) => s.isRecommended) || scenarios[0];
  const secondaryScenarios = scenarios.filter((s) => s !== recommendedScenario);

  return (
    <div className="glass-panel rounded-panel p-4 flex flex-col gap-3 text-text select-none border border-hairline">
      {/* Sticky Panel Header: Сплошной непрозрачный фон surface + hairline, контент не просвечивает */}
      <div className="sticky top-0 bg-surface z-20 flex items-center justify-between border-b border-hairline pb-2.5 pt-1 -mt-1 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent shrink-0">
            <Zap className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-text block">
              Панель поддержки решений
            </span>
            <p className="text-[11px] text-text-2">
              Динамический выбор маршрута (осадка, наносы, ETA)
            </p>
          </div>
        </div>

        <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-text-2 border border-hairline shrink-0">
          {isPassOnly ? 'Штатно' : `${scenarios.length} варианта`}
        </span>
      </div>

      {/* Case 1: Pass without incident */}
      {isPassOnly && (
        <div className="p-3.5 rounded-inner border border-ok bg-ok-muted space-y-2.5">
          <div className="flex items-start gap-2.5 text-ok">
            {scenarios[0].title.includes('контролем') ? (
              <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" strokeWidth={1.5} />
            )}
            <div>
              <div className="font-semibold text-xs text-text">
                {scenarios[0].title}
              </div>
              <p className="text-[11px] text-text-2 mt-0.5">
                {scenarios[0].subtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-surface p-2.5 rounded-inner border border-hairline text-[11px]">
            <div className="flex items-center justify-between col-span-2">
              <span className="text-text-2">Осадка:</span>
              <span className="text-ok flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" />
                <span>{scenarios[0].feasibility.draftDetail}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Причал/кран:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Готов</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-2">Нитка РЖД:</span>
              <span className="text-ok flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>RZD-Slot-A04</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Risk occurs -> Recommended Large Card + Collapsed Alternatives */}
      {!isPassOnly && (
        <div className="flex flex-col gap-2.5">
          {/* 1. КРУПНЫЙ ПЕРВЫЙ РЕКОМЕНДОВАННЫЙ ВАРИАНТ */}
          <div className="p-3.5 rounded-inner border-2 border-accent bg-surface-2 shadow-lg space-y-2.5">
            {/* Header: Заголовок в одну строку, бейдж «Рекомендовано», «Формулы» — иконка-кнопка */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-text truncate">
                  {recommendedScenario.title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ok-muted border border-ok text-ok shrink-0">
                  Рекомендовано
                </span>
              </div>

              <button
                onClick={() => toggleExpand(recommendedScenario.id)}
                className="w-7 h-7 rounded bg-surface border border-hairline text-text-2 hover:text-accent flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Формулы расчёта"
                aria-label="Формулы расчёта"
              >
                <HelpCircle className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[11px] text-text-2 leading-tight">
              {recommendedScenario.subtitle}
            </p>

            {/* Delta Metrics Row: 3 компактные карточки */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-surface p-1.5 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 text-[10px]">
                  <Clock className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ Время
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-xs">
                  +{recommendedScenario.deltaHours} ч
                </span>
              </div>

              <div className="bg-surface p-1.5 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 text-[10px]">
                  <DollarSign className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ Затраты
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-xs">
                  +${recommendedScenario.deltaCostUsd.toLocaleString()}
                </span>
              </div>

              <div className="bg-surface p-1.5 rounded-inner border border-hairline flex flex-col items-center justify-center">
                <span className="text-text-2 flex items-center gap-1 text-[10px]">
                  <Leaf className="w-3 h-3 text-text-2" strokeWidth={1.5} />
                  Δ CO2
                </span>
                <span className="font-semibold text-text font-mono tabular-nums text-xs">
                  +{recommendedScenario.deltaCo2Tons} т
                </span>
              </div>
            </div>

            {/* Expandable Formulas Box */}
            {expandedScenarioId === recommendedScenario.id && (
              <div className="p-2.5 rounded bg-surface border border-accent text-[11px] space-y-1 text-text-2">
                <div className="text-accent font-semibold flex items-center gap-1 text-xs">
                  Математический расчёт:
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
                <div>
                  <span className="text-text">Вероятность риска:</span> P(глубина &lt; осадка) = Φ((осадка − μ) / σ), σ = (P90 − P10) / 2.563
                </div>
              </div>
            )}

            {/* 4-Item Compact Checklist */}
            <div className="grid grid-cols-2 gap-1.5 bg-surface p-2 rounded-inner border border-hairline text-[11px]">
              <div className="flex items-center justify-between col-span-2">
                <span className="text-text-2">Осадка:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{recommendedScenario.feasibility.draftDetail}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Причал/кран:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>B-4 / KR-2</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">РЖД/тяга:</span>
                <span className="text-ok flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>A-17 / LOC-41</span>
                </span>
              </div>
            </div>

            {/* Action Button for Recommended Option: Visible without scrolling on 1366x768 */}
            {recommendedScenario.id === 'makhachkala' && !isSlotSynced && (
              <button
                onClick={onApplySyncSlot}
                disabled={isSyncing}
                className="w-full py-2 px-3 rounded-inner bg-accent hover:opacity-90 active:opacity-100 text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Применить Caspian Sync-Slot (Махачкала)</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}

            {recommendedScenario.id === 'wait' && (
              <div className="p-2 rounded bg-ok-muted border border-ok text-ok text-xs font-medium flex items-center gap-2">
                <Anchor className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Подтверждена кратковременная стоянка на внешнем рейде</span>
              </div>
            )}

            {isSlotSynced && (
              <div className="p-2 rounded bg-ok-muted border border-ok text-ok text-xs font-medium flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Сценарий активирован: переход в глубоководный порт Махачкала</span>
              </div>
            )}
          </div>

          {/* 2. НЕРЕАЛИЗУЕМЫЕ И ВТОРОСТЕПЕННЫЕ ВАРИАНТЫ (СВЕРНУТЫ В ОДНУ СТРОКУ) */}
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[11px] text-text-2 block px-0.5">
              Альтернативные варианты:
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
                    onClick={() => toggleExpand(scenario.id)}
                    className="p-2.5 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text text-[11px]">
                        {scenario.title}
                      </span>
                      <span className="text-text-2 font-mono tabular-nums text-[10px]">
                        +{scenario.deltaHours} ч · +${scenario.deltaCostUsd.toLocaleString()} · +{scenario.deltaCo2Tons} т CO2
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {scenario.rejectionReason ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-surface border border-hairline text-text-2 font-medium flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-critical shrink-0" strokeWidth={1.5} />
                          <span>{scenario.id === 'wait' ? 'Срыв слота >6 ч' : 'Нет плавкрана'}</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-2 border border-hairline text-text-2">
                          Менее выгодно
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-text-2" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-text-2" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details: Все 3 дельты + риск */}
                  {isExpanded && (
                    <div className="p-2.5 border-t border-hairline bg-surface-2 text-xs space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="p-1 rounded bg-surface border border-hairline">
                          <span className="text-text-2 block">Δ Время</span>
                          <span className="font-mono font-semibold text-text tabular-nums">+{scenario.deltaHours} ч</span>
                        </div>
                        <div className="p-1 rounded bg-surface border border-hairline">
                          <span className="text-text-2 block">Δ Затраты</span>
                          <span className="font-mono font-semibold text-text tabular-nums">+${scenario.deltaCostUsd.toLocaleString()}</span>
                        </div>
                        <div className="p-1 rounded bg-surface border border-hairline">
                          <span className="text-text-2 block">Δ CO2</span>
                          <span className="font-mono font-semibold text-text tabular-nums">+{scenario.deltaCo2Tons} т</span>
                        </div>
                      </div>

                      <p className="text-text-2 text-[11px] leading-relaxed">
                        {scenario.subtitle}
                      </p>
                      {scenario.rejectionReason && (
                        <div className="p-2 rounded bg-surface border border-hairline text-text-2 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-critical shrink-0" strokeWidth={1.5} />
                          <span><strong>Фактор отказа:</strong> {scenario.rejectionReason}</span>
                        </div>
                      )}
                      <div className="space-y-1 bg-surface p-2 rounded text-[11px] text-text-2">
                        <div className="flex justify-between">
                          <span>Осадка:</span>
                          <span className={scenario.feasibility.draft ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.draftDetail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Причал и кран:</span>
                          <span className={scenario.feasibility.berthAndCrane ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.berthAndCraneDetail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Нитка РЖД:</span>
                          <span className={scenario.feasibility.rzdSlot ? 'text-ok' : 'text-critical'}>
                            {scenario.feasibility.rzdSlotDetail}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
