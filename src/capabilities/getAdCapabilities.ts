import { AdFormat } from '../types/AdFormat';
import type { CapabilitySupport } from '../types/CapabilitySupport';
import type { AdCapabilities } from '../types/AdCapabilities';

const unavailable: CapabilitySupport = 'unavailable';

const STUB_CAPABILITIES: AdCapabilities = {
  backend: 'android-classic',
  sdkVersion: '0.0.0-stub',
  formats: {
    [AdFormat.APP_OPEN]: unavailable,
    [AdFormat.INTERSTITIAL]: unavailable,
    [AdFormat.REWARDED]: unavailable,
    [AdFormat.REWARDED_INTERSTITIAL]: unavailable,
    [AdFormat.BANNER]: unavailable,
    [AdFormat.NATIVE]: unavailable,
  },
  multiFormatNativeBanner: unavailable,
  fullscreenPreload: unavailable,
  displayPreload: unavailable,
  multiCountNative: unavailable,
  maxManagedPoolAds: null,
  mediation: 'unknown',
};

/**
 * Returns the static capability snapshot for this binary.
 * Stub: placeholder values (`android-classic`, `0.0.0-stub`, all `unavailable`)
 * until native wiring lands, not live capability readings.
 */
export function getAdCapabilities(): AdCapabilities {
  return STUB_CAPABILITIES;
}
