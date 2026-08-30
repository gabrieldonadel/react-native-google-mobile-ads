import React from 'react';
import { render } from '@testing-library/react-native';

import {
  AdFormat,
  AdPoolPresets,
  AdStalenessGuidanceMillis,
  getAdCapabilities,
  MultiFormatAdRequest,
  MultiFormatBannerAdView,
  useMultiFormatAd,
  usePooledAd,
} from '../src';

describe('AX-0I expiry policy surface stubs', () => {
  it('exposes guidance defaults as publisher policy constants, not SDK TTL', () => {
    expect(AdStalenessGuidanceMillis.APP_OPEN).toBe(4 * 60 * 60 * 1000);
    expect(AdStalenessGuidanceMillis.OTHER).toBe(60 * 60 * 1000);
  });

  it('reports maxManagedPoolAds as null and exposes per-format preload + peek gates', () => {
    const caps = getAdCapabilities();
    expect(caps.maxManagedPoolAds).toBeNull();
    expect(caps.fullscreenPreloadFormats[AdFormat.REWARDED_INTERSTITIAL]).toBe('unavailable');
    expect(caps.poolResponseInfoPeek).toBe('unavailable');
  });

  it('builds fullscreen and display pool presets with optional staleness override', () => {
    const fullscreen = AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, 'unit', {
      bufferSize: 2,
      stalenessWindowMillis: AdStalenessGuidanceMillis.OTHER,
    });
    expect(fullscreen).toMatchObject({
      formats: [AdFormat.INTERSTITIAL],
      adUnitId: 'unit',
      bufferSize: 2,
      stalenessWindowMillis: AdStalenessGuidanceMillis.OTHER,
    });

    const display = AdPoolPresets.display('feed');
    expect(display.formats).toEqual([AdFormat.NATIVE, AdFormat.BANNER]);
    expect(display.bufferSize).toBe(1);
  });

  it('rejects MultiFormatAdRequest.load until native wiring lands', async () => {
    const request = MultiFormatAdRequest.create('unit', {
      formats: [AdFormat.NATIVE],
    });
    await expect(request.load()).rejects.toThrow('MultiFormatAdRequest.load is not implemented');
    expect(() => request.destroy()).not.toThrow();
  });

  it('returns idle stub state from pool and multi-format hooks', async () => {
    const calls: Array<() => void | Promise<unknown>> = [];
    function Probe() {
      const pooled = usePooledAd('display-pool');
      const multi = useMultiFormatAd('unit', { formats: [AdFormat.BANNER] });
      expect(pooled.status).toBe('idle');
      expect(pooled.ad).toBeNull();
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

  it('renders MultiFormatBannerAdView stub without throwing', () => {
    const handle = {
      format: AdFormat.BANNER as const,
      adId: 'ad-1',
      observedAt: 1,
      provenance: 'pool/emulated-no-sdk-preloader' as const,
      stalenessWindowMillis: AdStalenessGuidanceMillis.OTHER,
      stalenessWindowSource: 'guidance/other' as const,
      isStaleByPolicy: () => false,
      onStaleByPolicy: () => () => undefined,
      responseInfo: null,
      size: { width: 320, height: 50 },
      destroy: () => undefined,
    };
    const { toJSON } = render(<MultiFormatBannerAdView handle={handle} />);
    expect(toJSON()).toBeTruthy();
  });
});
