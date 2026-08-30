import type { AdEventType } from '../AdEventType';
import type { NativeAd } from '../ads/native-ad/NativeAd';
import type { GAMAdEventType } from '../GAMAdEventType';
import type { RewardedAdEventType } from '../RewardedAdEventType';
import type { AdEventListener } from './AdEventListener';
import type { AdEventsListener } from './AdEventsListener';
import type { AdShowOptions } from './AdShowOptions';
import type { AdErrorPayload } from './AdError';
import type { AdExpiry, AdIdentity } from './AdExpiry';
import type { AdFormat } from './AdFormat';
import type { AdCapabilities } from './AdCapabilities';
import type { MultiFormatAdRequestOptions } from './MultiFormatAd';
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
  bannerSizes?: MultiFormatAdRequestOptions['bannerSizes'];
};

/**
 * NOTE (superseded): ratified expiry decision point 3 promotes
 * `'pool/emulated-no-sdk-preloader'` from a degradation notice to the hook the
 * provenance tag is built on, because it already separates a load this library
 * performed from an ad the SDK polled out of its own buffer, and those two
 * cases differ in what can honestly be said about freshness. See the canonical
 * inventory expiry record published on the internal tracker as
 * `inventory-expiry-canonical.md`.
 */
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

/**
 * Identity carried by every pooled ad, for correlation and diagnostics.
 *
 * Alias of the shared `AdIdentity`, kept so the pooled-ad vocabulary reads
 * naturally. Multi-format handles carry the same members.
 */
export type PooledAdIdentity = AdIdentity;

/**
 * Expiry surface on the object the consumer owns after `poll()`.
 *
 * Alias of the shared `AdExpiry`, which multi-format handles also carry.
 *
 * NOTE (superseded): follows `AdExpiry`, so ratified expiry decision points 1,
 * 2 and 7 apply here too and these members are pending removal. See the
 * canonical inventory expiry record published on the internal tracker as
 * `inventory-expiry-canonical.md`.
 *
 * Pool `expired` events describe pool-owned inventory only: a polled ad has
 * already left the pool, so those events can never identify it.
 *
 * The canonical pattern is still to poll at show time, which the record
 * reinforces: Google's guidance is to leave ads in the SDK cache until you are
 * ready to show. Holding a polled ad is the consumer's risk.
 */
export type PooledAdExpiry = AdExpiry;

type PooledAdBase = AdIdentity &
  AdExpiry & {
    responseInfo: ResponseInfo | null;
    /**
     * Releases this ad's native resources; idempotent.
     *
     * On the native arm this also destroys the inner `ad`. Do not call
     * `ad.destroy()` separately: the pooled ad owns it, and after `poll()` the
     * caller (or the holding hook) owns the pooled ad.
     */
    destroy(): void;
  };

export type PooledAd =
  | (PooledAdBase & {
      format: AdFormat.NATIVE;
      /**
       * Owned by this pooled ad. Destroyed by the pooled ad's `destroy()`;
       * never destroy it directly.
       */
      ad: NativeAd;
    })
  | (PooledAdBase & {
      format: AdFormat.BANNER;
      size: { width: number; height: number };
    })
  | (PooledAdBase & {
      format:
        | AdFormat.INTERSTITIAL
        | AdFormat.REWARDED
        | AdFormat.REWARDED_INTERSTITIAL
        | AdFormat.APP_OPEN;
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
    });

/**
 * Outcome of `poll()`. Replaces a bare `null`, which could not distinguish an
 * exhausted buffer from a timeout, a no-fill, or a transport failure: cases
 * that call for different consumer responses.
 *
 * `empty` and `timeout` are not errors: the pool is still refilling.
 *
 * NOTE (superseded): the hand-off freshness guarantee that used to be stated
 * here is withdrawn under ratified expiry decision point 5. On an SDK-managed
 * pool the poll path performs no expiry sweep, so a polled ad can already be
 * stale when it is handed over, and the library cannot tell. See the canonical
 * inventory expiry record published on the internal tracker as
 * `inventory-expiry-canonical.md`.
 */
export type PollResult =
  /** Ad handed out; ownership transfers to the caller, including destruction. */
  | { status: 'filled'; ad: PooledAd }
  /** Buffer exhausted, refill in flight. Retry later. */
  | { status: 'empty' }
  /** `pollTimeoutMillis` elapsed. The pool keeps filling. */
  | { status: 'timeout' }
  /** Request completed with no ad. Routine ad-server outcome, not a defect. */
  | { status: 'no-fill'; error: AdErrorPayload }
  /** Network or internal failure. */
  | { status: 'error'; error: AdErrorPayload };

export type AdPoolEvent =
  | {
      type: 'degraded';
      poolId: string;
      reasons: AdPoolDegradeReason[];
      resolved: AdPoolResolvedConfig;
    }
  | { type: 'error'; poolId: string; error: AdErrorPayload }
  /**
   * Pool-owned inventory expired and was evicted, so it can never be polled.
   * Never describes an already-polled ad: use `AdExpiry` on the held ad.
   *
   * `reason: 'expiry'` is the ad aging out. `reason: 'refresh'` is the pool
   * replacing still-valid inventory. Either way a refill follows, reported by
   * a `refreshed` event carrying `replacedAdId` equal to this `adId`.
   *
   * NOTE (superseded): ratified expiry decision point 8 restricts this event to
   * pools the library manages itself. Neither platform emits a per-ad eviction
   * signal for an SDK-managed pool, and the one signal it does emit says only
   * that the buffer became empty, with the cause unknown. See the canonical
   * inventory expiry record published on the internal tracker as
   * `inventory-expiry-canonical.md`.
   */
  | { type: 'expired'; poolId: string; adId: string; reason: 'expiry' | 'refresh' }
  /**
   * Pool-owned inventory was replaced. `replacedAdId` is the `adId` of the
   * evicted ad, which correlates this fill with the preceding `expired` event.
   * `null` when this fill replaced nothing (a plain refill into free depth).
   *
   * NOTE (superseded): point 8. The event survives, because a new ad's identity
   * is observable, but `replacedAdId` is not derivable on an SDK-managed pool.
   * See the canonical record.
   */
  | { type: 'refreshed'; poolId: string; adId: string; replacedAdId: string | null };

export interface AdPool {
  readonly poolId: string;
  readonly formats: AdFormat[];
  readonly resolved: AdPoolResolvedConfig;
  /**
   * NOTE (superseded): on an SDK-managed pool neither the boolean nor the count
   * sweeps for expiry, so both are upper bounds rather than a count of ads the
   * SDK would still consider valid. See the canonical inventory expiry record
   * published on the internal tracker as `inventory-expiry-canonical.md`.
   */
  getAvailability(): Promise<{ available: boolean; observedCount?: number }>;
  /**
   * NOTE (superseded): head-of-queue only, and it carries no time information,
   * so it is not a freshness check. See the canonical record.
   */
  peekResponseInfo(): Promise<ResponseInfo | null>;
  /**
   * Takes the next ad, transferring ownership to the caller. Async because a
   * poll crosses to native and GMA delivers load callbacks on the main thread.
   * Never call during render: polling consumes inventory.
   *
   * NOTE (superseded): the "never hands out expired inventory" guarantee that
   * used to be stated here is withdrawn under ratified expiry decision point 5,
   * and point 6 settles what replaces it: a polled ad that exceeds the
   * configured staleness window is reported and handed over rather than
   * discarded, because a poll removes the ad with no way to put it back and the
   * publisher's window may be stricter than the SDK's own. See the canonical
   * inventory expiry record published on the internal tracker as
   * `inventory-expiry-canonical.md`.
   *
   * Never rejects: every outcome, including failures, is a `PollResult`.
   */
  poll(): Promise<PollResult>;
  addListener(listener: (event: AdPoolEvent) => void): () => void;
  destroy(): void;
}

export type AdPoolsApi = {
  getCapabilities(): AdCapabilities;
  /**
   * Async because `resolved` is only knowable after native answers: buffer
   * clamping depends on app-wide pool accounting, and validation consults live
   * backend capabilities. Hard-errors on an impossible config; loud-degrades
   * when a milder adjustment is safe.
   */
  create(config: AdPoolConfig): Promise<AdPool>;
  get(poolId: string): AdPool | null;
  destroyAll(): void;
};
