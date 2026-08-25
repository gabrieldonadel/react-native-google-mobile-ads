import type { AdEventType } from '../AdEventType';
import type { NativeAd } from '../ads/native-ad/NativeAd';
import type { GAMAdEventType } from '../GAMAdEventType';
import type { RewardedAdEventType } from '../RewardedAdEventType';
import type { AdEventListener } from './AdEventListener';
import type { AdEventsListener } from './AdEventsListener';
import type { AdShowOptions } from './AdShowOptions';
import type { AdErrorPayload } from './AdError';
import type { AdFormat } from './AdFormat';
import type { AdCapabilities } from './AdCapabilities';
import type { CompetitiveAdRequestOptions } from './CompetitiveAd';
import type { RequestOptions } from './RequestOptions';
import type { ResponseInfo } from './ResponseInfo';

export type AdPoolConfig = {
  poolId: string;
  formats: AdFormat[];
  adUnitId: string;
  requestOptions?: RequestOptions;
  bufferSize?: number;
  pollTimeoutMillis?: number;
  adServer?: 'ad-manager' | 'admob';
  mediation?: 'unknown' | 'known-enabled' | 'known-disabled';
  bannerSizes?: CompetitiveAdRequestOptions['bannerSizes'];
};

export type AdPoolDegradeReason =
  | 'pool/degraded-buffer-size'
  | 'pool/degraded-request-count'
  | 'pool/emulated-no-sdk-preloader';

export type AdPoolResolvedConfig = AdPoolConfig & {
  requestedBufferSize?: number;
  effectiveBufferSize: number;
  degraded: boolean;
  degradeReasons: AdPoolDegradeReason[];
};

export type PooledAd =
  | { format: AdFormat.NATIVE; ad: NativeAd; responseInfo: ResponseInfo | null; destroy(): void }
  | {
      format: AdFormat.BANNER;
      size: { width: number; height: number };
      responseInfo: ResponseInfo | null;
      destroy(): void;
    }
  | {
      format:
        | AdFormat.INTERSTITIAL
        | AdFormat.REWARDED
        | AdFormat.REWARDED_INTERSTITIAL
        | AdFormat.APP_OPEN;
      responseInfo: ResponseInfo | null;
      show(options?: AdShowOptions): Promise<void>;
      /** Same listener contract as fullscreen MobileAd / GAMInterstitialAd. */
      addAdEventListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType>(
        type: T,
        listener: AdEventListener<T>,
      ): () => void;
      addAdEventsListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType>(
        listener: AdEventsListener<T>,
      ): () => void;
      removeAllListeners(): void;
      destroy(): void;
    };

export type AdPoolEvent =
  | {
      type: 'degraded';
      poolId: string;
      reasons: AdPoolDegradeReason[];
      resolved: AdPoolResolvedConfig;
    }
  | { type: 'error'; poolId: string; error: AdErrorPayload }
  | { type: 'expired'; poolId: string }
  | { type: 'refreshed'; poolId: string };

export interface AdPool {
  readonly poolId: string;
  readonly formats: AdFormat[];
  readonly resolved: AdPoolResolvedConfig;
  getAvailability(): Promise<{ available: boolean; observedCount?: number }>;
  peekResponseInfo(): Promise<ResponseInfo | null>;
  poll(): Promise<PooledAd | null>;
  addListener(listener: (event: AdPoolEvent) => void): () => void;
  destroy(): void;
}

export type AdPoolsApi = {
  getCapabilities(): AdCapabilities;
  create(config: AdPoolConfig): Promise<AdPool>;
  get(poolId: string): AdPool | null;
  destroyAll(): void;
};
