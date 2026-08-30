import React from 'react';
import { render } from '@testing-library/react-native';

import {
  AdFormat,
  useMultiFormatAd,
  usePooledAd,
  type AdPoolProviderProps,
  type UseAdPoolResult,
  type UseAdPoolStatus,
  type UseMultiFormatAdResult,
  type UseMultiFormatAdStatus,
  type UsePooledAdResult,
  type UsePooledAdStatus,
} from '../src';

// Compile-time locks live in type-test.ts (`yarn tsc:compile`):
// UsePooledAdStatus ↔ UsePooledAdResult['status'], UseMultiFormatAdStatus ↔
// UseMultiFormatAdResult['status'], poll-only words ∉ multi, load-only ∉ pooled.
// Importing these from the public barrel fails the build if AX-3 exports are removed.
type BarrelHookTypesAlive = [
  AdPoolProviderProps['pools'],
  UseAdPoolResult['status'],
  UseAdPoolStatus,
  UseMultiFormatAdResult['status'],
  UseMultiFormatAdStatus,
  UsePooledAdResult['status'],
  UsePooledAdStatus,
];
const barrelHookTypesAlive: BarrelHookTypesAlive = [
  [],
  'absent',
  'absent',
  'idle',
  'idle',
  'idle',
  'idle',
];
void barrelHookTypesAlive;

describe('AX-1 hook result status unions', () => {
  it('returns idle stub arms with null / empty inventory fields', () => {
    const calls: Array<() => void | Promise<unknown>> = [];
    function Probe() {
      const pooled = usePooledAd('display-pool');
      const multi = useMultiFormatAd('unit', { formats: [AdFormat.BANNER] });

      expect(pooled.status).toBe('idle');
      expect(pooled.ad).toBeNull();
      expect(pooled.error).toBeNull();
      expect(pooled.available).toBe(false);

      expect(multi.status).toBe('idle');
      expect(multi.ads).toEqual([]);
      expect(multi.errors).toEqual([]);

      calls.push(() => pooled.poll());
      calls.push(() => pooled.release());
      calls.push(() => multi.load());
      calls.push(() => multi.release());
      return null;
    }

    render(<Probe />);
    return Promise.all([
      expect(calls[0]!()).resolves.toEqual({ status: 'empty' }),
      Promise.resolve(expect(calls[1]!()).toBeNull()),
      expect(calls[2]!()).resolves.toEqual({ status: 'no-fill', ads: [], errors: [] }),
      Promise.resolve(expect(calls[3]!()).toEqual([])),
    ]);
  });
});
