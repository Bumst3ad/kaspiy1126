import { describe, it, expect } from 'vitest';
import { generatePreClearanceHash } from './preClearance';
import { INITIAL_CARGO } from '../data/vessels';

describe('Ledger-ready Pre-clearance Hasher', () => {
  it('generates deterministic SHA-256 ledger token for cargo manifest', async () => {
    const hash1 = await generatePreClearanceHash(INITIAL_CARGO);
    const hash2 = await generatePreClearanceHash(INITIAL_CARGO);

    expect(hash1).toBe(hash2);
    expect(hash1.startsWith('0x')).toBe(true);
    expect(hash1.length).toBeGreaterThan(16);
  });
});
