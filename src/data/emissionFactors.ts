// MOCK: Коэффициенты выбросов CO2 согласно методике GLEC Framework v3.0 / ISO 14083 (ориентировочно)

export interface EmissionFactor {
  transportMode: 'sea' | 'rail' | 'road' | 'air';
  gCo2PerTonKm: number;
  source: string;
  provenance: 'real';
}

export const EMISSION_FACTORS: Record<string, EmissionFactor> = {
  sea: {
    transportMode: 'sea',
    gCo2PerTonKm: 18.0, // Суда типа река-море / фидерные контейнеровозы
    source: 'GLEC Framework v3.0 / ISO 14083 (Maritime feeder vessel)',
    provenance: 'real',
  },
  rail: {
    transportMode: 'rail',
    gCo2PerTonKm: 22.0, // Электрифицированная и дизельная магистральная ж/д
    source: 'GLEC Framework v3.0 / РЖД ESG отчётность',
    provenance: 'real',
  },
  road: {
    transportMode: 'road',
    gCo2PerTonKm: 95.0, // Магистральный автопоезд (тягач Евро-5/6, 20т)
    source: 'GLEC Framework v3.0 (Heavy Duty Truck)',
    provenance: 'real',
  },
  air: {
    transportMode: 'air',
    gCo2PerTonKm: 550.0,
    source: 'GLEC Framework v3.0 (Cargo belly/freighter)',
    provenance: 'real',
  },
};
