import type { NativeAd } from '../ads/native-ad/NativeAd';
import type { AdError } from './AdError';
import type { AdExpiry, AdIdentity } from './AdExpiry';
import type { AdFormat } from './AdFormat';
import type { MultiFormatBannerSize } from './MultiFormatBannerSize';
import type { RequestOptions } from './RequestOptions';
import type { ResponseInfo } from './ResponseInfo';

export type MultiFormatAdFormat = AdFormat.NATIVE | AdFormat.BANNER;

export type MultiFormatAdRequestOptions = RequestOptions & {
  formats: MultiFormatAdFormat[];
  bannerSizes?: MultiFormatBannerSize[];
  requestCount?: 1;
  adServer?: 'ad-manager';
};

/**
 * Members every multi-format handle carries.
 *
 * Identity and expiry are the same shapes pooled ads use. A multi-format
 * handle is loaded now and rendered later, which is precisely the window in
 * which inventory goes stale, so the holder gets the same surface.
 *
 * NOTE (superseded): the `AdExpiry` members are superseded by ratified expiry
 * decision points 1, 2 and 4 and are pending replacement by a staleness window
 * the publisher configures, plus a provenance tag (point 3). A multi-format
 * handle is always a load this library performed, which is the provenance where
 * the library's own observed time is the whole truth available to any client.
 * See the canonical inventory expiry record published on the internal tracker
 * as `inventory-expiry-canonical.md`.
 */
type MultiFormatAdHandleBase = AdIdentity &
  AdExpiry & {
    responseInfo: ResponseInfo | null;
    /**
     * Releases the handle's native resources; idempotent.
     *
     * On the native arm this also destroys the inner `ad`. Do not call
     * `ad.destroy()` separately: the handle owns it.
     */
    destroy(): void;
  };

export type MultiFormatAdHandle =
  | (MultiFormatAdHandleBase & {
      format: AdFormat.NATIVE;
      /** Owned by this handle. Destroyed by `destroy()`, never on its own. */
      ad: NativeAd;
    })
  | (MultiFormatAdHandleBase & {
      format: AdFormat.BANNER;
      size: { width: number; height: number };
    });

/**
 * Outcome of one multi-format load, discriminated on `status`.
 *
 * The status values are the terminal subset of `UseMultiFormatAdStatus`, so a
 * hook consumer and a caller awaiting `load()` branch on the same words.
 *
 * A load never resolves `expired`. This library performed the load and returns
 * the handles straight out of its own completion callback, so the observed time
 * starts at hand-off.
 *
 * NOTE (superseded): the justification changes. This must no longer cite the
 * `PollResult` `filled` guarantee, which is withdrawn under ratified expiry
 * decision point 5; the reason the two differ is provenance. See the canonical
 * inventory expiry record published on the internal tracker as
 * `inventory-expiry-canonical.md`.
 */
export type MultiFormatLoadResult =
  /** At least one handle, no errors. */
  | { status: 'loaded'; ads: MultiFormatAdHandle[]; errors: never[] }
  /** At least one handle plus at least one error: one format leg failed. */
  | { status: 'loaded-partial'; ads: MultiFormatAdHandle[]; errors: AdError[] }
  /**
   * Request completed with no handle and no transport failure. Routine
   * ad-server outcome, not a defect, so `errors` is empty.
   */
  | { status: 'no-fill'; ads: never[]; errors: never[] }
  /** No handle, and at least one leg failed. */
  | { status: 'error'; ads: never[]; errors: AdError[] };
