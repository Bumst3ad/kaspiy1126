import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, Check, Cpu, Leaf } from 'lucide-react';
import { CargoManifest } from '../data/types';
import { compareRouteEsg, EsgComparisonResult } from '../domain/esgCalculator';
import { generatePreClearanceHash } from '../domain/preClearance';

interface CargoCardProps {
  cargo: CargoManifest;
  isPreCleared: boolean;
  onPreClear: () => void;
}

export const CargoCard: React.FC<CargoCardProps> = ({
  cargo,
  isPreCleared,
  onPreClear,
}) => {
  const [ledgerHash, setLedgerHash] = useState<string>('');
  const [isHashing, setIsHashing] = useState<boolean>(false);

  const esg: EsgComparisonResult = compareRouteEsg(cargo.weightTons);

  useEffect(() => {
    generatePreClearanceHash(cargo).then(setLedgerHash);
  }, [cargo]);

  const handlePreClearClick = () => {
    setIsHashing(true);
    setTimeout(() => {
      setIsHashing(false);
      onPreClear();
    }, 600);
  };

  return (
    <div className="glass-panel rounded-panel p-5 flex flex-col gap-4 text-text select-none">
      {/* Manifest Header */}
      <div className="flex items-start justify-between border-b border-divider pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-inner bg-surface-2 border border-hairline flex items-center justify-center text-accent">
            <FileText className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-text">
                Манифест {cargo.manifestId}
              </span>
            </div>
            <p className="text-[11px] text-text-2 font-mono mt-0.5">
              ТН ВЭД {cargo.hsCode} · {cargo.weightTons} т · {cargo.cargoDescription}
            </p>
          </div>
        </div>

        {/* Pre-clearance Pill */}
        <div className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-hairline bg-surface-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPreCleared ? 'bg-ok' : 'bg-warn'
            }`}
          />
          <span className="text-[11px]">
            {isPreCleared ? 'Pre-cleared' : 'Ожидание'}
          </span>
        </div>
      </div>

      {/* Shipper & Consignee Row */}
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="bg-surface-2 p-2.5 rounded-inner border border-hairline">
          <span className="text-text-2 block text-[10px] mb-0.5">Отправитель</span>
          <span className="text-text font-medium text-[11px]">{cargo.shipper}</span>
        </div>
        <div className="bg-surface-2 p-2.5 rounded-inner border border-hairline">
          <span className="text-text-2 block text-[10px] mb-0.5">Получатель</span>
          <span className="text-text font-medium text-[11px]">{cargo.consignee}</span>
        </div>
      </div>

      {/* ESG Route Comparison Section */}
      <div className="p-3.5 rounded-inner bg-surface-2 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-ok" strokeWidth={1.5} />
            Углеродный след (GLEC / ISO 14083)
          </span>
          <span className="text-[10px] font-mono text-ok">
            -{esg.savingsPercent}% к авто
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-surface p-2 rounded-inner border border-hairline">
            <span className="text-[10px] text-text-2 block mb-0.5">Море+Ж/Д</span>
            <span className="font-mono text-[11px] text-text font-semibold">
              {(esg.syncSlotCo2Kg / 1000).toFixed(1)} т
            </span>
          </div>

          <div className="bg-surface p-2 rounded-inner border border-hairline">
            <span className="text-[10px] text-text-2 block mb-0.5">Авто (фуры)</span>
            <span className="font-mono text-[11px] text-text-2">
              {(esg.roadAlternativeCo2Kg / 1000).toFixed(1)} т
            </span>
          </div>

          <div className="bg-surface p-2 rounded-inner border border-hairline">
            <span className="text-[10px] text-text-2 block mb-0.5">Экономия</span>
            <span className="font-mono text-[11px] text-ok font-semibold">
              -{esg.savingsVsRoadTons} т
            </span>
          </div>
        </div>
      </div>

      {/* Ledger-Ready Pre-clearance Section */}
      <div className="p-3.5 rounded-inner bg-surface-2 border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-2 font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
            Pre-clearance (Ledger-ready SHA-256)
          </span>
          <span className="text-[10px] font-mono text-text-2">
            Пломба: {cargo.eSealId}
          </span>
        </div>

        <div className="p-2 rounded bg-surface border border-hairline text-[10px] font-mono text-text-2 truncate">
          Хеш манифеста: {ledgerHash ? `${ledgerHash.slice(0, 24)}...` : 'генерация...'}
        </div>

        {!isPreCleared ? (
          <button
            onClick={handlePreClearClick}
            disabled={isHashing}
            className="w-full py-2 px-3 rounded-inner bg-surface hover:bg-divider border border-hairline text-text font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isHashing ? (
              <span className="text-text-2 font-mono">Верификация хеша...</span>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                <span>Оформить Pre-clearance до прибытия</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-2 rounded bg-ok-muted border border-ok text-ok text-[11px] font-medium flex items-center gap-2">
            <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Pre-cleared: время оформления сокращено с 48 ч до 1.5 ч</span>
          </div>
        )}
      </div>
    </div>
  );
};
