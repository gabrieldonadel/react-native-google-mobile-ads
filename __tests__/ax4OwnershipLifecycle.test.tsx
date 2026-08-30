import React from 'react';
import { render } from '@testing-library/react-native';

import {
  AdFormat,
  useMultiFormatAd,
  usePooledAd,
  type UseMultiFormatAdStatus,
  type UsePooledAdResult,
  type UsePooledAdStatus,
} from '../src';

/**
 * AX-4 contract locks (runtime stubs + compile-time status shape).
 * Full ownership/consumed transitions need native wiring; this locks the
 * public status vocabulary and that stubs stay honest.
 *
 * Consumed milestone (docs + JSDoc): `await ad.show()` fulfills — not OPENED /
 * CLOSED / EARNED_REWARD. release() clears to status 'idle' among current arms.
 */
type ConsumedArm = Extract<UsePooledAdResult, { status: 'consumed' }>;
type ConsumedHasNullAd = ConsumedArm['ad'] extends null ? true : false;
type ConsumedHasNullError = ConsumedArm['error'] extends null ? true : false;
const consumedShapeOk: [ConsumedHasNullAd, ConsumedHasNullError] = [true, true];

type ConsumedNotOnMulti = Extract<UseMultiFormatAdStatus, 'consumed'> extends never
  ? true
  : false;
const consumedPoolOnly: ConsumedNotOnMulti = true;

/** Frozen prose lock for AX4-R1 / AX4-R2 — mirrors public contract wording. */
const CONSUMED_MILESTONE =
  "await ad.show() fulfills (show-promise settle); not OPENED/CLOSED/EARNED_REWARD";
const RELEASE_LEAVES_IDLE = "release() leaves status: 'idle' among current arms";

const pooledStatuses: UsePooledAdStatus[] = [
  'idle',
  'polling',
  'filled',
  'empty',
  'timeout',
  'no-fill',
  'error',
  'stale-by-policy',
  'consumed',
];

describe('AX-4 ownership and consumption lifecycle', () => {
  it('exposes consumed as a pooled hook-only non-error status', () => {
    expect(consumedShapeOk).toEqual([true, true]);
    expect(consumedPoolOnly).toBe(true);
    expect(pooledStatuses).toContain('consumed');
    expect(pooledStatuses).not.toContain('loading');
    expect(CONSUMED_MILESTONE).toContain('show-promise settle');
    expect(CONSUMED_MILESTONE).not.toMatch(/OPENED.*milestone|CLOSED.*milestone/);
    expect(RELEASE_LEAVES_IDLE).toContain("status: 'idle'");
  });

  it('keeps stub hooks idle without inventing filled/loaded ownership', async () => {
    const calls: Array<() => void | Promise<unknown>> = [];
    function Probe() {
      const pooled = usePooledAd('fullscreen-pool');
      const multi = useMultiFormatAd('unit', { formats: [AdFormat.NATIVE] });

      expect(pooled.status).toBe('idle');
      expect(pooled.ad).toBeNull();
      expect(pooled.error).toBeNull();
      expect(multi.status).toBe('idle');
      expect(multi.ads).toEqual([]);

      calls.push(() => pooled.poll());
      calls.push(() => pooled.release());
      calls.push(() => multi.load());
      calls.push(() => multi.release());
      return null;
    }

    render(<Probe />);
    await expect(calls[0]!()).resolves.toEqual({ status: 'empty' });
    expect(calls[1]!()).toBeNull();
    await expect(calls[2]!()).resolves.toEqual({ status: 'no-fill', ads: [], errors: [] });
    expect(calls[3]!()).toEqual([]);
  });
});
