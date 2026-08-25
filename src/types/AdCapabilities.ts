import type { AdBackend } from './AdBackend';
import type { AdFormat } from './AdFormat';
import type { CapabilitySupport } from './CapabilitySupport';

export type AdCapabilities = {
  backend: AdBackend;
  /** The actually-linked native SDK version, read from the SDK itself. */
  sdkVersion: string;
  formats: Record<AdFormat, CapabilitySupport>;
  /** GAM native+banner in one AdLoader request, count 1. */
  competitiveNativeBanner: CapabilitySupport;
  /** SDK-managed fullscreen preloader. */
  fullscreenPreload: CapabilitySupport;
  /** Banner/native preloader. */
  displayPreload: CapabilitySupport;
  /** numberOfAds > 1. Unsupported on mediated units. */
  multiCountNative: CapabilitySupport;
  /** Varies by backend; `null` when undocumented. */
  maxManagedPoolAds: number | null;
  mediation: 'unknown' | 'known-enabled' | 'known-disabled';
};
