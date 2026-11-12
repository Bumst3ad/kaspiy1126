import { CargoManifest } from '../data/types';

/**
 * Ledger-ready Pre-clearance хеширование пакета документов (SHA-256 via Web Crypto API)
 */
export async function generatePreClearanceHash(manifest: CargoManifest): Promise<string> {
  const payload = JSON.stringify({
    manifestId: manifest.manifestId,
    shipper: manifest.shipper,
    consignee: manifest.consignee,
    hsCode: manifest.hsCode,
    weightTons: manifest.weightTons,
    eSealId: manifest.eSealId,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  // Fallback for node/test environment vs browser
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure deterministic hash fallback if subtle is unavailable in some node runtimes
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(40, '0');
}
