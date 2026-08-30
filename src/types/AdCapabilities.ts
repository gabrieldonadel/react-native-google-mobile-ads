import type { AdBackend } from './AdBackend';
import type { AdFormat } from './AdFormat';
import type { CapabilitySupport } from './CapabilitySupport';

export type AdCapabilities = {
  backend: AdBackend;
  /** The actually-linked native SDK version, read from the SDK itself. */
  sdkVersion: string;
  formats: Record<AdFormat, CapabilitySupport>;
  /** GAM native+banner in one AdLoader request, count 1. */
  multiFormatNativeBanner: CapabilitySupport;
  /**
   * SDK-managed fullscreen preloader.
   *
   * NOTE (superseded): ratified expiry decision point 9. One value cannot
   * express that Android classic's preload registry rejects rewarded
   * interstitial while iOS accepts it, so this is pending a per-format gate. See
   * the canonical inventory expiry record published on the internal tracker as
   * `inventory-expiry-canonical.md`.
   */
  fullscreenPreload: CapabilitySupport;
  /** Banner/native preloader. */
  displayPreload: CapabilitySupport;
  /** numberOfAds > 1. Unsupported on mediated units. */
  multiCountNative: CapabilitySupport;
  /**
   * Varies by backend; `null` when undocumented.
   *
   * NOTE (superseded): ratified expiry decision point 10 settles the value at
   * `null`. The effective cap is server-delivered, so any number reported here
   * would be a guess. The type already permits `null`. See the canonical record.
   */
  maxManagedPoolAds: number | null;
  mediation: 'unknown' | 'known-enabled' | 'known-disabled';
};
