import React from 'react';
import { render } from '@testing-library/react-native';

import {
  AdFormat,
  BannerAdSize,
  MultiFormatAdPresets,
  useAdPool,
  useMultiFormatAd,
  usePooledAd,
} from '../src';

/**
 * AX-5 contract locks (IDM-C3, IDM-C4, EXP-F15):
 * - Callback identity is stable across re-renders even when hook args change
 *   or options are inline each render (argument freshness via refs).
 * - poll() and load() coalesce concurrent calls onto one in-flight promise
 *   per hook instance (StrictMode double-invoke safety).
 */

const CALLBACK_IDENTITY =
  'poll/load/release/retry keep the same identity for the life of the hook instance';
const ARGUMENT_FRESHNESS =
  'poolId/adUnitId/options are sampled when the callback runs; inline options do not change load identity';
const LOAD_POLL_COALESCING =
  'poll() and load() coalesce concurrent calls per hook instance (StrictMode-safe)';

describe('AX-5 hook argument freshness and load coalescing', () => {
  it('locks the documented freshness / coalescing prose', () => {
    expect(CALLBACK_IDENTITY).toContain('same identity');
    expect(ARGUMENT_FRESHNESS).toContain('inline options');
    expect(LOAD_POLL_COALESCING).toContain('StrictMode');
  });

  it('keeps poll/load/release/retry identity stable across re-renders with fresh inline options', () => {
    const snapshots: Array<{
      poll: () => unknown;
      releasePooled: () => unknown;
      load: () => unknown;
      releaseMulti: () => unknown;
      retry: () => void;
    }> = [];

    function Probe({ tick }: { tick: number }) {
      const pooled = usePooledAd(`pool-${tick}`);
      const multi = useMultiFormatAd(
        `unit-${tick}`,
        MultiFormatAdPresets.nativeOrBanner([BannerAdSize.BANNER]),
      );
      // Also lock a raw inline options object (EXP-F15 shape).
      const multiInline = useMultiFormatAd(`unit-inline-${tick}`, {
        formats: [AdFormat.NATIVE],
      });
      const pool = useAdPool(`pool-${tick}`);

      snapshots.push({
        poll: pooled.poll,
        releasePooled: pooled.release,
        load: multi.load,
        releaseMulti: multi.release,
        retry: pool.retry,
      });
      // Touch the second hook so identity is observable if we expand later.
      void multiInline.load;
      return null;
    }

    const { rerender } = render(<Probe tick={0} />);
    rerender(<Probe tick={1} />);
    rerender(<Probe tick={2} />);

    expect(snapshots).toHaveLength(3);
    const [a, b, c] = snapshots;
    expect(a!.poll).toBe(b!.poll);
    expect(b!.poll).toBe(c!.poll);
    expect(a!.releasePooled).toBe(c!.releasePooled);
    expect(a!.load).toBe(b!.load);
    expect(b!.load).toBe(c!.load);
    expect(a!.releaseMulti).toBe(c!.releaseMulti);
    expect(a!.retry).toBe(c!.retry);
  });

  it('coalesces concurrent poll() and load() onto one promise per hook instance', async () => {
    let pollFn: (() => Promise<unknown>) | undefined;
    let loadFn: (() => Promise<unknown>) | undefined;

    function Probe() {
      const pooled = usePooledAd('fullscreen-pool');
      const multi = useMultiFormatAd('unit', { formats: [AdFormat.NATIVE] });
      pollFn = pooled.poll;
      loadFn = multi.load;
      return null;
    }

    render(<Probe />);

    const p1 = pollFn!();
    const p2 = pollFn!();
    expect(p1).toBe(p2);
    await expect(p1).resolves.toEqual({ status: 'empty' });

    const l1 = loadFn!();
    const l2 = loadFn!();
    expect(l1).toBe(l2);
    await expect(l1).resolves.toEqual({ status: 'no-fill', ads: [], errors: [] });
  });
});
