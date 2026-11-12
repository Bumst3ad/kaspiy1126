// MOCK & ASSUMPTIONS FILE — All unverified industry estimates stored here

export interface OperationalAssumption {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  provenance: 'assumption';
  note: string;
}

export const CASPIAN_ASSUMPTIONS: Record<string, OperationalAssumption> = {
  vkmskNominalDepth: {
    key: 'vkmskNominalDepth',
    label: 'Проходная осадка ВКМСК',
    value: 4.5,
    unit: 'м',
    provenance: 'assumption',
    note: 'Гарантированная осадка канала 4.2-4.5м при штатных гидроусловиях',
  },
  windTideDropMax: {
    key: 'windTideDropMax',
    label: 'Максимальный сгон уровня воды',
    value: 0.65,
    unit: 'м',
    provenance: 'assumption',
    note: 'Падение уровня воды 40-65 см при затяжном ветре СВ/В румбов >12 м/с',
  },
  dailyDemurrageCostUsd: {
    key: 'dailyDemurrageCostUsd',
    label: 'Потери от простоя судна на рейде',
    value: 15000,
    unit: 'USD/сут',
    provenance: 'assumption',
    note: 'Суточный демередж судна река-море при простое на внешнем рейде',
  },
  berthSlotCancellationThresholdHours: {
    key: 'berthSlotCancellationThresholdHours',
    label: 'Порог аннулирования портового слота',
    value: 3,
    unit: 'ч',
    provenance: 'assumption',
    note: 'Слот причала отдается следующему судну при опоздании свыше 3 часов',
  },
  gaugeBreakPoint: {
    key: 'gaugeBreakPoint',
    label: 'Точка смены железнодорожной колеи 1520/1435',
    value: 'ст. Самур / Астара / Серахс',
    unit: 'узел',
    provenance: 'assumption',
    note: 'Переход с колеи 1520 мм на 1435 мм требует перегрузки или смены тележек',
  },
  safetyUnderkeelMargin: {
    key: 'safetyUnderkeelMargin',
    label: 'Минимальный нормативный запас под килем',
    value: 0.3,
    unit: 'м',
    provenance: 'assumption',
    note: 'Безопасный навигационный запас под килем по регламенту канала',
  },
};
