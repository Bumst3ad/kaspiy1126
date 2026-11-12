export type Provenance = 'real' | 'synthetic' | 'assumption';

export interface PortData {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  channelLimitMeters: number;
  currentDraftMeters: number;
  congestionPercent: number;
  berthsAvailable: number;
  railGauge?: string;
  provenance: Provenance;
}

export interface VesselData {
  id: string;
  name: string;
  type: string;
  flag: string;
  imo: string;
  draftMeters: number;
  lengthMeters: number;
  capacityTeu: number;
  currentLoadTeu: number;
  cargoType: string;
  cargoTonnage: number;
  origin: string;
  destination: string;
  lat: number;
  lon: number;
  speedKnots: number;
  status: 'normal' | 'risk' | 'rerouted';
  provenance: Provenance;
}

export interface CargoManifest {
  manifestId: string;
  shipper: string;
  consignee: string;
  cargoDescription: string;
  hsCode: string;
  weightTons: number;
  eSealId: string;
  eSealStatus: 'intact' | 'breached';
  isPreCleared: boolean;
  provenance: Provenance;
}
