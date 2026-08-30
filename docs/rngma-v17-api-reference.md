# React Native Google Mobile Ads v17 API reference

Single-file reference for the public TypeScript surface of `react-native-google-mobile-ads`.
Covers today’s source-compatible shims plus the additive v17 types and stubs
(`getAdCapabilities`, `AdPools`, `MultiFormatAdRequest`, `MultiFormatBannerAdView`, presets, and hooks).

> **Status:** types and minimal runtime stubs. Native preload / multi-format load /
> pool wiring lands in later work. Stub methods no-op, resolve an empty outcome,
> or reject as documented below.

---

## ELI5: what the new APIs are for

Today’s APIs still work: create an ad, load it, show it (or mount a banner). The new surface adds two ideas on top of that, without forcing you to rewrite existing screens.

### Multi-format ads: “ask for a few formats, keep the winner”

Sometimes you do not care whether the fill is a **native** ad or a **banner**, you just want the best one Google returns for that placement. A **multi-format request** is one AdLoader-style call that lists the formats you will accept (in v1: native and/or GAM banner, **count 1**). You specify:

- the **ad unit**
- which **formats** compete (`native`, `banner`, or both)
- for banners, which **sizes** are legal for that request (typed sizes; adaptive / `FLUID` are rejected because there is no view width yet)

**Multi-format is not multi-count.** Multi-format means _several formats compete for one ad_. Multi-count (several ads returned from one request, via `numberOfAds` / `requestCount`) is **out of v1** and unsupported on mediated units.

You get back one handle (or errors). Render a native winner with `<NativeAdView>`; render a banner winner with `<MultiFormatBannerAdView>` (attach-only: it does not load again).

Use this when the UI can show either shape. Skip it when you already know you only want a banner component or only a native layout.

### Ad pools: “keep something ready, refill when you take one”

A **pool** is a named buffer of ads for a placement (`poolId` + formats + unit). When you need an ad, you **`poll()`** one out; the pool tries to refill in the background. Depending on the **backend and formats**, that buffer may:

- **preload** via the platform SDK preloader when Google supports it, which today means interstitial, rewarded and app open on both classic backends, plus **rewarded interstitial on iOS only**: Android's preload registry has no slot for that format and rejects it,
- hold **more than one** ready ad **on those fullscreen formats**, where Google recommends a buffer of 2 per preload ID under an app-wide cap the SDK resolves at runtime from server-delivered settings, which is why `maxManagedPoolAds` is reported as `null` rather than a number,
- or fill using **multi-format requests** inside the pool when the formats are native/banner and that is the honest way to request them,
- or run as a depth-1 self-refill when there is no SDK display preloader, which is the case for **banner and native on both classic backends**, since neither iOS nor classic Android ships a display preloader. Still a pool from your point of view: create reports `degraded: true` with reason `'pool/emulated-no-sdk-preloader'`, matching `getAdCapabilities().displayPreload === 'emulated'`. The token `emulated` is a capability / reason value, not a field on `AdPool` or `resolved`.

So buffer depth greater than 1 is a **fullscreen** capability today. A display pool asking for depth clamps to 1 and tells you it did; see the degrade example below.

Ads do not stay usable forever, and what the library can honestly tell you about that is narrower than it looks and depends on who loaded the ad. The publisher-policy staleness surface is the **current** contract, stated in exactly one place: [Expiry: two different scopes](#expiry-two-different-scopes).

`AdPoolProvider` only **owns** those pools for a React tree of children. Child screens look them up by the same `poolId` (`useAdPool` / `usePooledAd`), then poll and show/render. You can also call `AdPools.create` yourself. You can also use **neither** pools nor multi-format APIs and stay on the classic create/load/show path.

### Not every permutation is possible, and that is checked up front

Google’s SDKs do not support every combination of format × buffer size × preload × multi-format × mediation. Mixing fullscreen with display in one pool, asking for buffer depths the backend cannot honor, illegal banner sizes in a multi-format request, or formats that are simply `unavailable` on this binary are examples of things that **cannot** all be true at once.

So the library does **not** ask you to memorize the matrix. At create time it validates the config against what this app can actually do:

- **`AdPools.create(config)`** returns `Promise<AdPool>` and **rejects** when the request is impossible (e.g. a format would be dropped, unsupported mix). Catch with `.catch()` / `try` around `await`.
- **`MultiFormatAdRequest.create(adUnitId, options)`** is **synchronous** and **throws** when the request is impossible (e.g. illegal size). Catch with `try/catch`.
- **Loud degrade** when a milder adjustment is safe (e.g. clamp buffer size, display preload without an SDK preloader); you see that on `resolved` / `degraded` / `degradeReasons`.

Presets (`AdPoolPresets`, `MultiFormatAdPresets`) aim to request only configs that survive that check. Hand-written configs are welcome; just expect create-time validation instead of silent wrong behavior later.

**Short version:** multi-format = one request, several format options, one winner. Pool = keep inventory warm when the platform allows it, refill after poll, optionally using multi-format loads inside. Many useful setups work; impossible ones fail (or degrade) when you create the pool/request, not when the user is mid-session.

---

## Compatibility

- Existing class, hook, and component **names and call shapes are kept**.
- New APIs are **additive**.
- Load / show / event patterns for fullscreen, banner, and native ads do not require a rewrite.

---

## Installation surface (unchanged)

```ts
import mobileAds, {
  InterstitialAd,
  BannerAd,
  NativeAd,
  useInterstitialAd,
  TestIds,
  // …
} from 'react-native-google-mobile-ads';
```

---

## Module / consent / request (shim)

| Export                          | Notes                                                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobileAds()` / `MobileAds()`   | `initialize()`, volume/mute, request configuration, ad inspector; additive stubs (no-op / JS package version today): `disableMediationAdapterInitialization`, `disableSdkCrashReporting`, `setPublisherFirstPartyIdEnabled`, `getVersion` |
| `NativeError`                   | Public `Error` subclass. Legacy code paths use it directly; the v17 hooks use `AdError`, which is `NativeError` plus the structured payload                                                                                               |
| `AdsConsent`                    | UMP consent flow (unchanged)                                                                                                                                                                                                              |
| `MaxAdContentRating`, `TestIds` | Unchanged                                                                                                                                                                                                                                 |
| `RequestOptions`                | Additive: `categoryExclusions?: string[]` (GAM-only)                                                                                                                                                                                      |
| `RequestConfiguration`          | Additive: `publisherPrivacyPersonalizationState?: 'enabled' \| 'disabled' \| 'unset'`                                                                                                                                                     |
| `AdapterStatus`                 | Additive optional `latencyMillis`                                                                                                                                                                                                         |

---

## Fullscreen ads (shim)

Classes: `AppOpenAd`, `InterstitialAd`, `RewardedAd`, `RewardedInterstitialAd`, `GAMInterstitialAd`.

```ts
const ad = InterstitialAd.createForAdRequest(adUnitId, requestOptions?);
ad.load();
ad.show(options?);
ad.loaded;
ad.addAdEventListener / addAdEventsListener / removeAllListeners
```

**Additive on the same objects:**

| Member            | Type                                          |
| ----------------- | --------------------------------------------- |
| `ad.destroy()`    | `void`, releases native listeners; idempotent |
| `ad.responseInfo` | `ResponseInfo \| null`, snapshot after load   |

**Events (`AdEventType`):**

| Event                                                    | Notes                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `LOADED`, `OPENED`, `CLOSED`, `CLICKED`, `PAID`, `ERROR` | Existing                                                                          |
| `IMPRESSION`                                             | Additive; no payload                                                              |
| `ERROR`                                                  | Keeps `code` / `message`; gains structured `reason` + `phase` (see Error payload) |

Hooks: `useAppOpenAd`, `useInterstitialAd`, `useRewardedAd`, `useRewardedInterstitialAd`, `useForeground`.

---

## Banner ads (shim)

Components: `<BannerAd>`, `<GAMBannerAd>`.

**Additive callbacks:**

- `onAdLoaded` dimensions may include `responseInfo?: ResponseInfo`
- `onAdFailedToLoad` may carry `AdErrorPayload` fields (`reason`, `phase`) in addition to legacy `Error`. Typed as `Error & Partial<AdErrorPayload>` so existing `(error: Error) => void` handlers stay assignable under `strictFunctionTypes` — unlike hook / event surfaces where `reason` and `phase` are required.

Sizes: `BannerAdSize`, `GAMBannerAdSize` (unchanged).

---

## Native ads (shim)

- `NativeAd.createForAdRequest` → `Promise<NativeAd>`
- `<NativeAdView>`, `<NativeAsset>`, `<NativeMediaView>`
- `destroy()` on the native ad instance

Top-level `responseId` remains the registry key. Additive member: `nativeAd.responseInfo: ResponseInfo | null` (null until native wiring).

---

## Capability discovery (new)

```ts
type AdBackend = 'ios' | 'android-classic' | 'android-next-gen';

enum AdFormat {
  APP_OPEN = 'appOpen',
  INTERSTITIAL = 'interstitial',
  REWARDED = 'rewarded',
  REWARDED_INTERSTITIAL = 'rewardedInterstitial',
  BANNER = 'banner',
  NATIVE = 'native',
}

type CapabilitySupport = 'supported' | 'emulated' | 'degraded' | 'experimental' | 'unavailable';

type AdCapabilities = {
  backend: AdBackend;
  sdkVersion: string; // linked native SDK version
  formats: Record<AdFormat, CapabilitySupport>;
  multiFormatNativeBanner: CapabilitySupport;
  fullscreenPreload: CapabilitySupport; // coarse rollup; prefer fullscreenPreloadFormats
  fullscreenPreloadFormats: Record<FullscreenAdFormat, CapabilitySupport>;
  displayPreload: CapabilitySupport;
  multiCountNative: CapabilitySupport;
  /** Classic Android: unavailable. Classic iOS: supported when wired. */
  poolResponseInfoPeek: CapabilitySupport;
  maxManagedPoolAds: number | null; // always null: cap is server-delivered
  mediation: 'unknown' | 'known-enabled' | 'known-disabled';
};

function getAdCapabilities(): AdCapabilities;
```

- Synchronous; safe before `initialize()`.
- **Stub today:** returns placeholder values: `backend: 'android-classic'`, `sdkVersion: '0.0.0-stub'`, every format and capability as `unavailable`, `maxManagedPoolAds: null`, `mediation: 'unknown'`. These are not live device/SDK capability readings.
- Prefer **presets** for common cases; do not re-implement capability matrices in app code.
- Gate rewarded interstitial pooling with `fullscreenPreloadFormats[AdFormat.REWARDED_INTERSTITIAL]` before `AdPools.create`: on Android classic that format is `unavailable` and create hard-errors with reason `'pool/format-preload-unsupported'`.
- Gate `AdPool.peekResponseInfo()` with `poolResponseInfoPeek`: classic Android is `unavailable` (no peek API) and peek hard-errors with `'pool/peek-unsupported'`; classic iOS is `supported` when wired. A resolved `null` means empty head only on a supported backend — never "unsupported".
- When native-wired, classic fullscreen preload may report `experimental` while upstream preload APIs remain beta. Treat `experimental` as maturity honesty, not a veto of a supported path.
- **Anti-pattern:** do not pre-flight-branch on the full capability matrix before every call. Use presets / hard-errors at `create()`, and reserve capability reads for UI gating or diagnostics.

---

## Presets (new)

```ts
type AdPoolPresetOverrides = Omit<Partial<AdPoolConfig>, 'formats' | 'adUnitId'>;

AdPoolPresets.fullscreen(
  format: FullscreenAdFormat,
  adUnitId: string,
  options?: AdPoolPresetOverrides,
): AdPoolConfig; // poolId defaults to `fullscreen-${format}-${adUnitId}`

AdPoolPresets.display(adUnitId: string, options?: AdPoolPresetOverrides): AdPoolConfig;
// poolId defaults to `display-${adUnitId}`

MultiFormatAdPresets.nativeOrBanner(
  bannerSizes: MultiFormatBannerSize[],
): MultiFormatAdRequestOptions;
```

Presets return plain configuration objects. `AdPools.create` / `MultiFormatAdRequest.create` validate them the same as hand-written ones.

`AdPoolPresets.fullscreen` accepts rewarded interstitial in the type for cross-platform presets, but create hard-errors on Android classic when that format's preload capability is `unavailable`. Check `fullscreenPreloadFormats` first, or catch `'pool/format-preload-unsupported'`.

Both pool presets take the same `AdPoolPresetOverrides` bag, spread over the preset defaults. That bag deliberately omits `formats` and `adUnitId`: those come from the positional parameters, so `display()` cannot be handed `formats: [INTERSTITIAL]` or a different unit at the type level. That matters most on `fullscreen`, because fullscreen is the only family where `bufferSize` above 1 is meaningful. Default depth is `1` so create succeeds under a tight app-wide cap; Google recommends `2` per preload ID, and publishers opt in explicitly:

```ts
AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, unit, { bufferSize: 2 });
AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, unit, { requestOptions: { keywords: ['games'] } });
AdPoolPresets.fullscreen(AdFormat.APP_OPEN, unit, { stalenessWindowMillis: 2 * 60 * 60 * 1000 });
```

The computed `poolId` default (`fullscreen-${format}-${adUnitId}`, `display-${adUnitId}`) survives unless you override it. Prefer reading `config.poolId` at the consumer rather than hand-retyping the template: the preset return type carries the template literal, so a typo fails at compile time.

---

## Multi-format request (new)

One AdLoader-style request. Count **1**. Formats: native and/or GAM banner.

```ts
type MultiFormatAdFormat = AdFormat.NATIVE | AdFormat.BANNER;

type MultiFormatBannerSize =
  | BannerAdSize.BANNER
  | BannerAdSize.FULL_BANNER
  | BannerAdSize.LARGE_BANNER
  | BannerAdSize.LEADERBOARD
  | BannerAdSize.MEDIUM_RECTANGLE
  | BannerAdSize.WIDE_SKYSCRAPER // mediation-only; not served by the Google network
  | `${number}x${number}` // custom, e.g. "300x200"
  | { width: number; height: number }; // custom object form

type MultiFormatAdRequestOptions = RequestOptions & {
  formats: MultiFormatAdFormat[];
  bannerSizes?: MultiFormatBannerSize[]; // required when banner is requested
  requestCount?: 1;
  adServer?: 'ad-manager';
  stalenessWindowMillis?: number; // publisher policy; defaults to guidance/other
};

// Module-local composition helper — not exported. Consumers import
// `MultiFormatAdHandle`. Shared with pooled ads: same identity, same policy
// surface, same words.
type MultiFormatAdHandleBase = AdIdentity &
  AdExpiry & {
    provenance: 'pool/emulated-no-sdk-preloader'; // library-performed load
    responseInfo: ResponseInfo | null;
    destroy(): void; // on the native arm this destroys the inner `ad` too
  };

type MultiFormatAdHandle =
  | (MultiFormatAdHandleBase & { format: AdFormat.NATIVE; ad: NativeAd })
  | (MultiFormatAdHandleBase & {
      format: AdFormat.BANNER;
      size: { width: number; height: number };
    });

// Outcome of one load, resolved by `useMultiFormatAd().load()`. The status
// values are the terminal subset of `UseMultiFormatAdStatus` (exported), so
// hook state and the resolved result use the same words.
type MultiFormatLoadResult =
  | { status: 'loaded'; ads: MultiFormatAdHandle[]; errors: never[] }
  | { status: 'loaded-partial'; ads: MultiFormatAdHandle[]; errors: AdError[] }
  | { status: 'no-fill'; ads: never[]; errors: never[] } // routine, not a failure
  | { status: 'error'; ads: never[]; errors: AdError[] };

class MultiFormatAdRequest {
  readonly adUnitId: string;
  readonly options: MultiFormatAdRequestOptions;
  static create(
    adUnitId: string,
    options: MultiFormatAdRequestOptions,
  ): MultiFormatAdRequest; // synchronous; throws on illegal config
  load(): Promise<{ ads: MultiFormatAdHandle[]; errors: AdError[] }>;
  destroy(): void;
}
```

**Stub:** `load()` rejects with `"MultiFormatAdRequest.load is not implemented"`.

A load never resolves `stale-by-policy`. This library performed the load and returns the handles out of its own completion callback, so its observed time starts at hand-off. That is a statement about provenance, not a guarantee inherited from `poll()`. See [Expiry: two different scopes](#expiry-two-different-scopes).

Imperative callers own every returned handle: both `destroy()` and the staleness check are theirs, and `useMultiFormatAd` does both for you. See [Expiry: two different scopes](#expiry-two-different-scopes).

The imperative `load()` resolves the `{ ads, errors }` pair rather than a `MultiFormatLoadResult`, so there is no `status` word on that path: both arrays empty is a clean no-fill, a non-empty `errors` with a handle is the partial case, and a non-empty `errors` with no handle is a failure. `MultiFormatLoadResult` is what `useMultiFormatAd().load()` resolves.

**Render:** native handle → existing `<NativeAdView>` via `handle.ad`. Banner handle → new `<MultiFormatBannerAdView handle={...} />` (attach-only; does not issue a second load). `handle` is typed as `MultiFormatBannerAdHandle` (banner-only extract of `MultiFormatAdHandle`); non-banner handles are a TypeScript error.

```tsx
import {
  MultiFormatBannerAdView,
  type MultiFormatBannerAdHandle,
} from 'react-native-google-mobile-ads';

declare const bannerHandle: MultiFormatBannerAdHandle;
<MultiFormatBannerAdView handle={bannerHandle} />;
```

**Stub:** empty `View` until native attach lands. No runtime format check; the prop type enforces banner handles.

Illegal in v1, split by enforcement:

- **Rejected by the type system** (do not type-check as `MultiFormatBannerSize` / `requestCount?: 1`): adaptive sizes, `FLUID`, `requestCount` other than `1`.
- **Hard-error at create time when wired** (types still admit the shape): empty `formats`, banner format without `bannerSizes`.

---

## Ad pools (new)

```ts
type AdPoolConfig = {
  poolId: string;
  formats: AdFormat[];
  adUnitId: string;
  requestOptions?: RequestOptions;
  bufferSize?: number;
  pollTimeoutMillis?: number;
  stalenessWindowMillis?: number; // publisher policy; defaults from guidance
  adServer?: 'ad-manager' | 'admob';
  mediation?: 'unknown' | 'known-enabled' | 'known-disabled';
  bannerSizes?: MultiFormatAdRequestOptions['bannerSizes'];
};

/** Preset override bag: omits formats and adUnitId so presets cannot be undercut. */
type AdPoolPresetOverrides = Omit<Partial<AdPoolConfig>, 'formats' | 'adUnitId'>;

/** Default poolId templates from AdPoolPresets (prefer config.poolId at both ends). */
type DisplayPoolId<TAdUnitId extends string = string> = `display-${TAdUnitId}`;
type FullscreenPoolId<
  TFormat extends FullscreenAdFormat = FullscreenAdFormat,
  TAdUnitId extends string = string,
> = `fullscreen-${TFormat}-${TAdUnitId}`;

type AdPoolDegradeReason =
  | 'pool/degraded-buffer-size'
  | 'pool/degraded-request-count'
  | 'pool/emulated-no-sdk-preloader'; // also the library-load provenance tag

type AdPoolResolvedConfig = AdPoolConfig & {
  requestedBufferSize?: number;
  effectiveBufferSize: number;
  effectiveStalenessWindowMillis: number;
  effectiveStalenessWindowSource: AdStalenessWindowSource;
  degraded: boolean;
  degradeReasons: AdPoolDegradeReason[];
};

// Identity, for correlation and diagnostics. Shared with multi-format handles.
type AdIdentity = {
  adId: string; // stable, unique within the app for this ad's lifetime
  observedAt: number | null; // library observation; null when never seen; see expiry section
};

type AdInventoryProvenance =
  | 'pool/emulated-no-sdk-preloader' // library-performed load
  | 'pool/sdk-managed-preloader'; // platform preloader handed over on poll

type AdStalenessWindowSource = 'configured' | 'guidance/app-open' | 'guidance/other';

// Google's published guidance figures used as publisher policy defaults when
// `stalenessWindowMillis` is omitted (not the SDK's cache timeout).
const AdStalenessGuidanceMillis = {
  APP_OPEN: 4 * 60 * 60 * 1000, // four hours
  OTHER: 60 * 60 * 1000, // one hour; Android interstitial figure is contested
} as const;

// Publisher-policy staleness on any inventory the consumer holds.
type AdExpiry = {
  stalenessWindowMillis: number;
  stalenessWindowSource: AdStalenessWindowSource;
  // False when observedAt is null (unknown age is not treated as stale).
  isStaleByPolicy(): boolean;
  // Sync-fires once if already stale on subscribe; never fires while
  // observedAt is null; destroy() releases listeners (later unsub is a no-op).
  onStaleByPolicy(listener: () => void): () => void;
};

// Kept as aliases so the pooled-ad vocabulary still reads naturally.
type PooledAdIdentity = AdIdentity;
type PooledAdExpiry = AdExpiry;

// Module-local composition helper — not exported. Consumers import `PooledAd`.
type PooledAdBase = AdIdentity &
  AdExpiry & {
    provenance: AdInventoryProvenance;
    responseInfo: ResponseInfo | null;
    destroy(): void; // on the native arm this destroys the inner `ad` too
  };

type PooledAd =
  | (PooledAdBase & { format: AdFormat.NATIVE; ad: NativeAd })
  | (PooledAdBase & { format: AdFormat.BANNER; size: { width: number; height: number } })
  | (PooledAdBase & {
      format:
        | AdFormat.INTERSTITIAL
        | AdFormat.REWARDED
        | AdFormat.REWARDED_INTERSTITIAL
        | AdFormat.APP_OPEN;
      show(options?: AdShowOptions): Promise<void>;
      // Same generics as MobileAd / GAMInterstitialAd (GAM pools use adServer: 'ad-manager')
      addAdEventListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType>(
        type: T,
        listener: AdEventListener<T>,
      ): () => void;
      addAdEventsListener<T extends AdEventType | RewardedAdEventType | GAMAdEventType>(
        listener: AdEventsListener<T>,
      ): () => void;
      removeAllListeners(): void;
    });

// poll() outcome. Replaces a bare `null`, which could not tell an exhausted
// buffer from a timeout, a no-fill, or a transport failure.
type PollResult =
  | { status: 'filled'; ad: PooledAd } // ownership transfers; not a freshness guarantee
  | { status: 'empty' } // buffer exhausted, refill in flight, not an error
  | { status: 'timeout' } // pollTimeoutMillis elapsed, not an error
  | { status: 'no-fill'; error: AdErrorPayload } // routine ad-server outcome
  | { status: 'error'; error: AdErrorPayload }; // network or internal failure

// Buffer readiness. `observedCount` is always present: both classic platforms
// expose a count for SDK-managed preloaders (`getNumAdsAvailable` /
// `numberOfAdsAvailableWithPreloadID:`), and library-managed pools know their
// own buffer depth. Both fields are upper bounds (no expiry sweep on Android
// V2; iOS sweep UNKNOWN).
type AdPoolAvailability = {
  available: boolean; // observedCount > 0
  observedCount: number;
};

interface AdPool {
  readonly poolId: string;
  readonly formats: AdFormat[];
  readonly resolved: AdPoolResolvedConfig;
  getAvailability(): Promise<AdPoolAvailability>;
  // Capability-gated (`poolResponseInfoPeek`). Unsupported → rejects with
  // 'pool/peek-unsupported'. Supported null = empty head (not unsupported).
  peekResponseInfo(): Promise<ResponseInfo | null>;
  poll(): Promise<PollResult>; // async; no put-back; never rejects; no freshness filter
  addListener(listener: (event: AdPoolEvent) => void): () => void;
  destroy(): void; // held-ad policy timer unaffected; native teardown of polled ads unverified
}

const AdPools: {
  getCapabilities(): AdCapabilities;
  create(config: AdPoolConfig): Promise<AdPool>;
  get(poolId: string): AdPool | null;
  destroyAll(): void;
};
```

**Stub:** `create()` rejects with `"AdPools.create is not implemented"`; `get()` returns `null`; `destroyAll()` is a no-op.

`resolved` is the post-create config after buffer / capability adjustments. When `degraded` is true, `degradeReasons` lists why (for example buffer clamped, request count clamped, or emulated preload without an SDK preloader).

**Why `create()` and `poll()` are asynchronous.** `create()` cannot report `resolved` until native answers: clamping `effectiveBufferSize` depends on app-wide pool accounting, and validation consults live backend capabilities. `poll()` crosses to native, and the Google Mobile Ads SDK delivers load callbacks on the main thread, so a synchronous version originating on the UI thread would deadlock. Capability reads stay synchronous because they are constants; anything that allocates native ad state or consults live pool accounting is asynchronous.

**`AdPoolEvent` shapes:**

```ts
type AdPoolEvent =
  | {
      type: 'degraded';
      poolId: string;
      reasons: AdPoolDegradeReason[];
      resolved: AdPoolResolvedConfig;
    }
  | { type: 'error'; poolId: string; error: AdErrorPayload }
  // Library-managed pools only: per-ad eviction. Never a polled ad.
  | {
      type: 'expired';
      poolId: string;
      adId: string;
      reason: 'stale-by-policy' | 'refresh';
      provenance: 'pool/emulated-no-sdk-preloader';
    }
  // Library-managed only. replacedAdId correlates with the preceding expired event.
  | {
      type: 'refreshed';
      poolId: string;
      adId: string;
      replacedAdId: string | null;
      provenance: 'pool/emulated-no-sdk-preloader';
    }
  // SDK-managed: buffer became empty; cause unknown (onAdsExhausted / adsExhausted).
  | { type: 'exhausted'; poolId: string }
  // SDK-managed: per-response-id availability (refresh observability with exhausted).
  | { type: 'available'; poolId: string; responseId: string };
```

On a pool the library manages itself, an eviction and its replacement are correlated by id: the `expired` event carries the outgoing `adId`, and the following `refreshed` event carries `replacedAdId` equal to that same id plus the incoming `adId`. A diagnostic consumer can build the full chain (evicted, why, what replaced it) from those two events alone. Library-managed pools do **not** unprompted forever-refill on policy eviction: replacement is demand-gated (refill after poll / consumer demand), because an unprompted forever-refill produces unshown fills that depress match rate. On a pool the platform preloader manages, that chain is not available; listen for `exhausted` and `available` instead. There is no separate "stopped refilling" event: observe an empty, non-refilling buffer as `exhausted` with no later `available`, together with `getAvailability().observedCount === 0`. See [Expiry: two different scopes](#expiry-two-different-scopes) and [Availability](#availability-getavailability).

<a id="availability-getavailability"></a>

### Availability (`getAvailability`)

`AdPool.getAvailability()` returns `{ available, observedCount }`. The count is **required**, not optional:

- **SDK-managed pools:** both classic platforms expose it — Android `getNumAdsAvailable(preloadId)` and iOS `numberOfAdsAvailableWithPreloadID:`.
- **Library-managed (emulated) pools:** the library reports its own buffer depth.

`available` is `observedCount > 0`. Neither field sweeps for expiry on the Android V2 path, so both are **upper bounds** (an ad past the platform TTL can still be counted until the next sweep). Whether iOS sweeps is UNKNOWN. Prefer this snapshot (or the hook's live `available` / `observedCount`) over assuming a retained depth equal to `bufferSize`: the SDK may optimize cache order, and the app-wide cap is server-delivered (`maxManagedPoolAds` reports `null`).

The hook mirrors the same numbers on every `usePooledAd` result arm as event-driven fields (updated from pool events and after each poll settles — no timer, no polling loop).

### Expiry: two different scopes

> **Single source of truth.** Everything about expiry, staleness, ad age, cache timeouts and eviction
> is governed by the canonical inventory expiry record published on the internal tracker as
> `inventory-expiry-canonical.md`. Where this reference and that record disagree, that record is
> correct and this reference is the defect. Freshness is a **policy the publisher sets**, not a
> condition the library observes: `expiresAt` / `isExpired()` / `onExpired()` are gone; the
> replacement is `stalenessWindowMillis` + `isStaleByPolicy()` / `onStaleByPolicy()`, with a
> provenance tag on every handed-out object.

**Everything this document says about age is said here, once.** Other sections link here rather than
restate it.

Two scopes, named apart:

| Question                                               | Answer                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Did an ad **still in the pool** churn?                 | Library-managed: `expired` / `refreshed` by `adId`. SDK-managed: `exhausted` / `available` only |
| Did the ad or handle **I am holding** age?             | `isStaleByPolicy()` / `onStaleByPolicy()` on that `PooledAd` or handle                          |
| Am I at risk of rendering something stale from a hook? | The hooks reduce that risk; they do not remove it. See point 5 below                            |

A polled ad has left the pool, because ownership transfers on `poll()`, so pool events can never identify it. That is why the check lives on the handle too. The staleness timer lives on the held ad, not on the pool: it keeps running after `release()` and after pool `destroy()`. Whether a pool's `destroy()` also tears down the native resources of an ad it already handed out is **unverified** (open probe); do not build on either answer — destroy held ads explicitly when you are done.

**The canonical pattern is to poll at show time.** Google's own guidance is to leave ads in the SDK cache until you are ready to show, so the SDK can refresh and reorder them. That is the strongest surviving part of this contract.

#### What the library can and cannot tell you about age

1. **`poll()` carries no freshness guarantee.** The platform poll path performs no age sweep, so an ad can already be past the timeout the platform itself enforces at the moment it is handed over, and the library has no way to see that. A `filled` result therefore means "an ad came out of the buffer", nothing more. Ads that already exceed the configured policy window are **reported and handed over**, not discarded. `getAvailability()` and its `observedCount` are upper bounds for the same reason.
2. **Provenance decides what a time value means.** For a load this library performed (`'pool/emulated-no-sdk-preloader'`), `observedAt` is the library's own load completion. For an ad the platform polled out of its own buffer (`'pool/sdk-managed-preloader'`), `observedAt` is when the library first saw that response id become available, or `null` if it never did. Neither is the age the platform is accounting for.
3. **Freshness is a policy you set, and it protects in one direction only.** Configure `stalenessWindowMillis` per pool or per request, or inherit the defaults from `AdStalenessGuidanceMillis` (four hours for app open via `APP_OPEN`, one hour otherwise via `OTHER`). Those figures are Google's published guidance used as publisher policy defaults, not values this library or the platform enforces; the Android interstitial one hour figure is contested between sources. The window guards against you or the library holding an ad too long. It does **not** certify that an ad inside the window is valid. Applied window and source are readable on every handed-out object.
4. **`onStaleByPolicy` edge semantics.** Subscribing when the held ad is already stale by policy invokes the listener synchronously once. When `observedAt` is `null`, `isStaleByPolicy()` is `false` and the subscription never fires (unknown age is not treated as stale). `destroy()` releases listeners; a later unsubscribe is a no-op. The timer lives on the held object, not on the pool or the hook, so it keeps running after `release()` and after pool `destroy()`.
5. **The hooks reduce accidental stale rendering, they do not remove it.** `usePooledAd` subscribes to the held ad's `onStaleByPolicy`. Unrendered inventory is destroyed, `ad` cleared, and `status` set to `'stale-by-policy'` on the next render after the policy edge. Already-rendered banner/native inventory is left in place (impression already counted). `useMultiFormatAd` does the same per handle; `status` becomes `'stale-by-policy'` once no showable handle remains, retaining prior load `errors`. That closes the window in which the library is holding an ad too long after hand-off, except the same tick in which the policy edge fires (and the race between a check and `show()` / render). It also cannot close the window that opened before hand-off on a pool the platform preloader manages, per point 1. Keep an `isStaleByPolicy()` guard immediately before show/render for that residual.
6. **Staleness is not an error.** `status: 'stale-by-policy'` never populates `error`, the same way `empty` and `timeout` do not. No platform reports a show failure for a stale ad, so representing staleness as an error would invent a failure that never occurs. Do not add an expiry reason to `KnownAdErrorReason`.
7. **Library-managed pool refill is demand-gated.** Policy eviction of pool-owned inventory does not trigger an unprompted forever-refill; the pool refills in response to consumer demand (for example after `poll()`), because unshown fills depress match rate. SDK-managed pools follow the platform preloader's own refill behavior.
8. **Poll order does not follow preload order.** The platform buffer is a priority queue ordered by a value-like key, not a queue in arrival order.
9. **Imperative callers own the check.** `AdPools.create` + `poll()`, or `MultiFormatAdRequest.load()`, hand you objects with no hook watching them, so the staleness check and `destroy()` are both yours. After `release()`, the same is true: the policy timer lives on the object. Pool `destroy()` does not cancel it.

---

## Hooks / provider (new)

```ts
type AdPoolProviderProps = {
  pools: AdPoolConfig[];
  children: React.ReactNode;
};

function AdPoolProvider(props: AdPoolProviderProps): React.ReactElement;

// `retry` sits on a shared base so it is callable without narrowing first.
// UseAdPoolResultBase is module-local; consumers import UseAdPoolResult.
type UseAdPoolResultBase = {
  retry: () => void; // re-attempt AdPools.create for this poolId
};

// Discriminated on status: `pool` narrows to non-null without assertions.
// `absent` means no pool is registered for this poolId, a common
// misconfiguration that would otherwise look like a create that never finishes.
type UseAdPoolResult = UseAdPoolResultBase &
  (
    | { status: 'creating'; pool: null; error: null }
    | { status: 'ready'; pool: AdPool; error: null }
    | { status: 'ready-degraded'; pool: AdPool; error: null }
    | { status: 'error'; pool: null; error: AdError }
    | { status: 'absent'; pool: null; error: null }
  );

type UseAdPoolStatus = UseAdPoolResult['status'];

function useAdPool(poolId: string): UseAdPoolResult;

// Discriminated on `status`, like `PollResult` / `UseAdPoolResult`.
// `{ status: 'filled', ad: null }` and `{ status: 'error', error: null }`
// do not type-check. Terminal arms mirror `PollResult`; `idle`, `polling`,
// `stale-by-policy`, and `consumed` are hook-only. `stale-by-policy` and
// `consumed` are not errors: `error` stays null, like `empty` and `timeout`.
// UsePooledAdResultBase is module-local; consumers import UsePooledAdResult
// and UsePooledAdStatus.
type UsePooledAdResultBase = {
  // Same vocabulary as useAdPool; distinguishes absent / creating / ready
  // without pairing a second hook. useAdPool still needed for pool / retry.
  poolStatus: UseAdPoolStatus;
  available: boolean; // observedCount > 0; event-driven upper bound
  observedCount: number; // always present; upper bound (no Android V2 expiry sweep)
  poll: () => Promise<PollResult>; // updates state; never rejects; never during render
  // take ownership without destroying; leaves status 'idle' among current arms
  release: () => PooledAd | null;
};

type UsePooledAdResult = UsePooledAdResultBase &
  (
    | { status: 'idle'; ad: null; error: null }
    | { status: 'polling'; ad: PooledAd | null; error: null } // prior ad may still be held
    | { status: 'filled'; ad: PooledAd; error: null }
    | { status: 'empty'; ad: null; error: null }
    | { status: 'timeout'; ad: null; error: null }
    | { status: 'no-fill'; ad: null; error: AdError }
    | { status: 'error'; ad: null; error: AdError }
    | { status: 'stale-by-policy'; ad: PooledAd | null; error: null } // rendered ad may remain
    // consumed milestone: await show() fulfills (not OPENED/CLOSED/EARNED_REWARD)
    | { status: 'consumed'; ad: null; error: null }
  );

type UsePooledAdStatus = UsePooledAdResult['status'];

function usePooledAd(poolId: string): UsePooledAdResult;

// Discriminated on `status`. Terminal arms mirror `MultiFormatLoadResult`.
// `loaded-partial` is real: one request can fill one format leg and fail the
// other, so that arm carries both arrays. `no-fill` is split from `error` so
// a clean no-fill does not look like a failure with an empty `errors` array.
// `stale-by-policy` is not an error; prior load errors are retained.
// UseMultiFormatAdResultBase is module-local; consumers import
// UseMultiFormatAdResult and UseMultiFormatAdStatus.
type UseMultiFormatAdResultBase = {
  // updates state; never rejects; coalesces like usePooledAd().poll()
  load: () => Promise<MultiFormatLoadResult>;
  // take ownership without destroying; leaves status 'idle' among current arms
  release: () => MultiFormatAdHandle[];
};

type UseMultiFormatAdResult = UseMultiFormatAdResultBase &
  (
    | { status: 'idle'; ads: never[]; errors: never[] }
    | { status: 'loading'; ads: MultiFormatAdHandle[]; errors: AdError[] }
    | { status: 'loaded'; ads: MultiFormatAdHandle[]; errors: never[] }
    | { status: 'loaded-partial'; ads: MultiFormatAdHandle[]; errors: AdError[] }
    | { status: 'no-fill'; ads: never[]; errors: never[] }
    | { status: 'error'; ads: never[]; errors: AdError[] }
    | { status: 'stale-by-policy'; ads: MultiFormatAdHandle[]; errors: AdError[] }
  );

type UseMultiFormatAdStatus = UseMultiFormatAdResult['status'];

function useMultiFormatAd(
  adUnitId: string,
  options: MultiFormatAdRequestOptions,
): UseMultiFormatAdResult;
```

### What the types cannot check

Two guarantees above are expressible in TypeScript and are expressed: discriminated hook/pool results (narrowing `pool` / `ad` / `error`), and the banner-only `handle` prop on `MultiFormatBannerAdView`. The rest of the lifecycle contract is **runtime behavior**, not a type:

- `poll()` / `load()` never reject (outcomes are result unions)
- concurrent `poll()` / `load()` coalesce per hook instance
- the hook owns inventory and destroys it on unmount, supersede, and unrendered `stale-by-policy`
- `release()` immediately after `await poll()` / `await load()` returns that inventory (implementation ref)
- returned `poll` / `load` / `release` / `retry` keep identity for the life of the hook instance
- `AdPoolProvider` reconciles by `poolId`, not by `pools` array identity

Trust those as documented behavior. TypeScript will not catch a violation.

### Hook state ownership

`usePooledAd` is **state-first**. Calling `poll()` updates `status`, `ad`, and `error` on the hook, so you do not track loading, stash the ad, or destroy it yourself. It also:

- **coalesces** concurrent calls onto the in-flight poll, so a double tap — or React StrictMode in development double-invoking an effect that calls `poll()` — cannot burn two ads (**per hook instance** — see shared-`poolId` note below),
- **destroys** the previous ad when a later poll supersedes it, and every held ad on unmount,
- **subscribes** to `onStaleByPolicy`: unrendered inventory is destroyed, `ad` cleared, and `status` set to `'stale-by-policy'`; already-rendered banner/native inventory is left in place,
- **consumes** a fullscreen ad it still owns when `await ad.show()` **fulfills** (show-promise settle): destroys the spent ad, clears `ad`, and sets `status` to `'consumed'` (not an error; a later show attempt on a released reference fails with reason `'ad-already-used'`). The milestone is **not** `OPENED`, `CLOSED`, or `EARNED_REWARD` — native show promises resolve after `present`/`show` without waiting for those events (Android `FullScreenAdModule`, iOS `RNGoogleMobileAdsFullScreenAd`; classic `useFullScreenAd` tracks `OPENED`/`CLOSED` for observation only and does not auto-destroy),
- **never rejects**: `poll()` resolves into the same `PollResult` the state reflects, so the return value is optional convenience for “poll and show in one handler”.

**Do not call `destroy()` on inventory the hook still owns.** That leaves the hook able to report `filled` / `loaded` with a dead ad — the same ownership rule as the inner `NativeAd` on a native arm. Early `destroy()` while hook-owned also drops listeners, so post-show events cannot be observed. Call `release()` first if you need to own destruction or post-show observation (handing the ad to a store, wiring your own `CLOSED` listener, etc.), or leave destruction to the hook.

Use `release()` when the ad must outlive the hook, or when you need post-show events on a fullscreen ad. It clears hook state to `status: 'idle'` (among the current arms) so unmount cleanup will not destroy an ad someone else now owns. After `release()`, the caller owns both `destroy()` and the staleness check: the policy timer lives on the ad and is unaffected by pool `destroy()`. Ordering is guaranteed: `release()` called immediately after `await poll()` returns the ad that poll just produced, without waiting for a render, because the hook tracks the current ad in a ref alongside state.

`available` and `observedCount` are **event-driven**: updated from the pool's own events and after each poll settles. There is no timer and no polling loop. Both are upper bounds (see [Availability](#availability-getavailability)). `available` is `observedCount > 0`.

`poolStatus` carries the same lookup vocabulary as `useAdPool` (`absent` / `creating` / `ready` / `ready-degraded` / `error`), so `status: 'idle'` with `available: false` no longer conflates an absent pool, a warming pool, and a ready empty buffer. Call `useAdPool` when you still need the `AdPool` object, `retry()`, or `resolved.degradeReasons`. Example 2 below uses both.

**Shared `poolId`:** coalescing is per hook instance. Two components that both call `usePooledAd(sameId)` each coalesce only their own concurrent `poll()` calls; they do **not** share an in-flight poll. On a depth-1 display pool one placement reliably starves the other. Give each placement its own pool, or make a single owner poll and pass the ad down.

`useMultiFormatAd` is the sibling of `usePooledAd` for **ownership and lifecycle**, not for status vocabulary. Shared words (`idle`, `no-fill`, `error`, `stale-by-policy`) mean the same thing on both hooks. In-flight and success words follow each hook's imperative result type on purpose:

- pool/poll: `polling` / `filled` (mirrors `PollResult`)
- multi-format load: `loading` / `loaded` / `loaded-partial` (mirrors `MultiFormatLoadResult`)

Do not treat those pairs as synonyms. `'consumed'` applies only to pooled fullscreen ads: multi-format handles are banner/native and have no `show()`.

Sibling guarantees that do match:

- the hook **owns** the handles it returns,
- it **destroys** them on unmount, and when a later `load()` supersedes them,
- it **subscribes** per handle to `onStaleByPolicy`, drops a stale unrendered handle from `ads`, and reports `status: 'stale-by-policy'` once no showable handle remains, retaining prior load `errors`,
- `load()` **coalesces** concurrent calls onto the in-flight load (**per hook instance**), same parity as `poll()` — including under StrictMode double-invoke of the mount effect,
- `load()` **never rejects**: it resolves a `MultiFormatLoadResult` mirroring the state it just set,
- `release()` hands the current handles to the caller and clears hook state to `status: 'idle'` (among the current arms), returning `[]` when nothing is held, with the same post-`await` ordering guarantee,
- callers **must not** `destroy()` handles the hook still owns — `release()` first.

### Callback identity and argument freshness

**Returned callbacks keep the same identity for the life of the hook instance.** `poll`, `load`, `release`, and `retry` are stable references, so listing them in a dependency array does not re-run the effect. That is what makes `useEffect(() => { void load(); }, [load])` load once per mount instead of on every render.

**Hook arguments are not frozen into those callbacks.** `poolId`, `adUnitId`, and `options` are sampled when the callback runs (the implementation holds them in refs updated each render). Passing a fresh inline options object every render — including `MultiFormatAdPresets.nativeOrBanner(...)` called in the render body — does **not** change `load`'s identity and does **not** re-fire an effect that depends only on `[load]`. The next `load()` or `poll()` uses the latest arguments.

If you need to reload when options change, depend on those options (or a value derived from them) yourself and call `load()`; do not expect `[load]` alone to detect argument changes.

**Coalescing and StrictMode.** Both `poll()` and `load()` coalesce concurrent calls onto one in-flight promise per hook instance. Joiners share the result started with the arguments current when the flight began; after it settles, the next call samples current arguments. React StrictMode in development double-invokes effects: without coalescing, the documented mount-effect pattern would issue two polls or two loads. Coalescing is still per hook instance — two components sharing one `poolId` do not share an in-flight poll (see shared-`poolId` note above).

`useAdPool` exposes `status` rather than `ready` + `degraded` booleans, and does **not** mirror degrade reasons; read `pool.resolved.degradeReasons`, the single source of truth.

`useAdPool().retry()` exists because pool creation is provider-owned: without it `status: 'error'` would be terminal, even though the underlying ad load may have failed transiently. It re-attempts `AdPools.create` for that `poolId` using the config the provider already holds, moving the state back through `creating`. It is a no-op while a create is already in flight, and a no-op when `status` is `absent`, where there is no config to retry with and the fix is the provider config. It lives on a shared base of the union, so it is callable without narrowing.

### How the provider connects to later usage

`AdPoolProvider` does **not** inject ads into the tree by itself. It only **owns** pools for its lifetime:

1. You pass configs (usually from `AdPoolPresets.*`). Each config has a stable `poolId` (presets pick one for you, e.g. `display-${adUnitId}`).
2. On mount (when wired), the provider calls `AdPools.create` for each config and keeps those native pools alive.
3. Descendants look pools up **by that same `poolId`** via `useAdPool(poolId)` / `usePooledAd(poolId)`.
4. You still **poll** when you want inventory, then **render or `show()`** the returned `PooledAd`. The provider never auto-shows.

**The provider reconciles by `poolId`, not by array identity.** On every render it creates pools for ids that have appeared, destroys pools for ids that have disappeared, and leaves existing pools untouched when only the array identity changed. A forgotten `useMemo` therefore cannot tear down and recreate native pools every render: `useMemo` is an optimization here, never a correctness requirement. Reusing a `poolId` with a different config replaces that pool, because the id is the identity.

```
AdPoolProvider(pools=[…configs with poolId…])
        │
        │  creates / destroys AdPool instances
        ▼
useAdPool(poolId) / usePooledAd(poolId)   ← same poolId string
        │
        │  poll() → PollResult ('filled' carries the PooledAd)
        ▼
show()  or  <MultiFormatBannerAdView> / <NativeAdView>
```

If you never wrap with `AdPoolProvider`, you can still:

- use today’s shims (`InterstitialAd`, `<BannerAd>`, `NativeAd`, existing hooks) with **no** pool, or
- call `AdPools.create` / `AdPools.get` imperatively and poll yourself.

**Rules:** never `poll()` during render; pool ownership stays with the provider or `AdPools.create`, never with the consumer hook. `usePooledAd` and `useMultiFormatAd` destroy the inventory they hand you on unmount, so call `release()` if it must outlive the hook — and before you call `destroy()` yourself. Imperative callers of `AdPools.create` / `MultiFormatAdRequest.load` own `destroy()` and the age check themselves: see [Expiry: two different scopes](#expiry-two-different-scopes).

**Stub:** provider is a pass-through; `useAdPool` reports `absent` with a no-op `retry`; `usePooledAd` reports `idle` and its `poll()` resolves `{ status: 'empty' }`; `useMultiFormatAd` reports `idle` and its `load()` resolves `{ status: 'no-fill', ads: [], errors: [] }`. Only the imperative `MultiFormatAdRequest.load()` still rejects.

---

## Metadata (additive)

```ts
type AdapterResponseError = {
  domain: string;
  code: number;
  message: string;
};

// Fields every waterfall row reports, pass or fail. Latency on failed rows is
// what makes waterfall debugging useful, so these never disappear.
type AdapterResponseInfoBase = {
  adapterClassName: string;
  adSourceName: string | null;
  adSourceId: string | null;
  adSourceInstanceName: string | null;
  adSourceInstanceId: string | null;
  latencyMillis: number;
};

// `outcome` narrows adError without pretending the shared fields vanish on error.
type AdapterResponseInfo = AdapterResponseInfoBase &
  ({ outcome: 'success'; adError: null } | { outcome: 'error'; adError: AdapterResponseError });

// The winning row cannot carry an error, so adError is statically null.
type LoadedAdapterResponseInfo = AdapterResponseInfoBase & {
  outcome: 'success';
  adError: null;
};

type ResponseInfoExtras = {
  mediationGroupName?: string;
  mediationAbTestName?: string;
  mediationAbTestVariant?: string;
  creativeId?: string;
  lineItemId?: string;
};

type ResponseInfo = {
  responseId: string | null;
  adapterClassName: string | null;
  loadedAdapterResponse: LoadedAdapterResponseInfo | null; // null when nothing loaded
  adapterResponses: AdapterResponseInfo[];
  extras: ResponseInfoExtras;
};

/** Paid-event snapshot: omits the full `adapterResponses` list. */
type PaidResponseInfo = Pick<
  ResponseInfo,
  'responseId' | 'adapterClassName' | 'loadedAdapterResponse' | 'extras'
>;

type PaidEvent = {
  currency: string;
  precision: RevenuePrecisions;
  value: number;
  responseInfo?: PaidResponseInfo;
  valueMicros?: string | null; // decimal string; null when not exact
};
```

No eCPM or lift claims in the public API.

---

## Error payload (additive)

```ts
type KnownAdErrorReason =
  | 'no-fill'
  | 'mediation-no-fill'
  | 'network-error'
  | 'timeout'
  | 'invalid-request'
  | 'invalid-argument'
  | 'invalid-ad-string'
  | 'app-id-missing'
  | 'internal-error'
  | 'server-error'
  | 'mediation-adapter-error'
  | 'mediation-data-error'
  | 'mediation-invalid-ad-size'
  | 'ad-already-used'
  | 'request-id-mismatch'
  | 'pool/format-preload-unsupported' // create: format the platform preloader rejects
  | 'pool/peek-unsupported' // peekResponseInfo where poolResponseInfoPeek is unavailable
  | 'unknown';

type AdErrorReason = KnownAdErrorReason | (string & {});

type AdErrorPayload = {
  /** @deprecated Use `reason`. Removed in v18 with the shims. */
  code: string;
  message: string;
  reason: AdErrorReason;
  phase: 'load' | 'show';
  responseInfo?: ResponseInfo;
};

// The one error type every v17 hook and multi-format load result uses.
type AdError = NativeError & AdErrorPayload;
```

Legacy `code` / `message` values stay unchanged. Fail-to-show uses `ERROR` with `phase: 'show'` (no separate show-failed event).

`AdError` is a real `Error` (it can be thrown, and it has a `stack`) that also carries the structured payload, so `reason` / `phase` / `responseInfo` branching works identically whether the error arrived through a hook or through an `AdEventType.ERROR` event, whose payload is `Error & AdErrorPayload`. One shape for those delivery styles. Banner / GAM `onAdFailedToLoad` stays `Error & Partial<AdErrorPayload>` (see [Error handling](#6-error-handling-reason--phase)).

`NativeError` itself is deliberately unchanged: it is shared with legacy code paths that have no structured payload to supply. `AdError` is the intersection, used by `useAdPool().error`, `usePooledAd().error`, `useMultiFormatAd().errors`, `MultiFormatLoadResult.errors`, and `MultiFormatAdRequest.load()`. Pool-level shapes (`PollResult`, `AdPoolEvent`) carry the plain `AdErrorPayload`, because those are data records crossing from native rather than objects a consumer would throw.

---

## Usage examples

> Illustrative “when native lands” code. Today these APIs stub/reject as noted above;
> shapes and ownership rules are what freeze.

### 1. No pool: today’s shims still work

Pools and multi-format requests are **opt-in**. Existing apps keep working:

```tsx
import React, { useEffect } from 'react';
import { Button, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const interstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);

export function ClassicScreen() {
  useEffect(() => {
    const unsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });
    interstitial.load();
    return unsub;
  }, []);

  return (
    <View>
      <BannerAd unitId={TestIds.BANNER} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
      <Button title="Reload interstitial" onPress={() => interstitial.load()} />
    </View>
  );
}
```

Same story for `useInterstitialAd` / `NativeAd.createForAdRequest`: no `AdPoolProvider` required.

---

### 2. Provider + display pool: poll and show a banner

Preset `AdPoolPresets.display(adUnitId)` sets `poolId` to `display-${adUnitId}`. Children must use **that** id: read it from the config rather than retyping the template.

```tsx
import React, { useCallback, useMemo } from 'react';
import { Button, Text, View } from 'react-native';
import {
  AdFormat,
  AdPoolPresets,
  AdPoolProvider,
  BannerAdSize,
  MultiFormatBannerAdView,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  TestIds,
  useAdPool,
  usePooledAd,
} from 'react-native-google-mobile-ads';

const FEED_UNIT = TestIds.BANNER; // replace with your GAM display unit
const displayPool = AdPoolPresets.display(FEED_UNIT, {
  bannerSizes: [BannerAdSize.MEDIUM_RECTANGLE, BannerAdSize.BANNER],
  adServer: 'ad-manager',
});
const DISPLAY_POOL_ID = displayPool.poolId; // typed joint with the provider config

function FeedPlacement() {
  // poolStatus on usePooledAd distinguishes absent / creating / ready.
  // useAdPool still supplies pool, retry(), and degradeReasons.
  const poolState = useAdPool(DISPLAY_POOL_ID);
  // State-first: no loading flag, no ad stashing, no manual destroy.
  const { status, poolStatus, available, observedCount, poll, ad, error } =
    usePooledAd(DISPLAY_POOL_ID);

  const onShowNext = useCallback(() => {
    // Never call poll() during render, only from handlers or effects.
    // Concurrent calls coalesce per hook instance, so a double tap cannot
    // burn two ads. Do not mount two usePooledAd(sameId) owners on a
    // depth-1 pool — one starves the other.
    void poll();
  }, [poll]);

  // Prefer poolStatus from the consumer hook for absent/warming gates.
  switch (poolStatus) {
    case 'absent':
      return <Text>No pool registered for {DISPLAY_POOL_ID}. Check the provider config.</Text>;
    case 'creating':
      return <Text>Warming display pool…</Text>;
    case 'error':
      // retry() is on every useAdPool arm, so no narrowing is needed to call it.
      return (
        <Text onPress={poolState.retry}>
          Pool failed: {poolState.error?.reason}. Tap to retry.
        </Text>
      );
  }

  return (
    <View>
      {poolState.status === 'ready-degraded' ? (
        // Degrade reasons live on the pool, not mirrored onto usePooledAd.
        <Text>Pool degraded: {poolState.pool.resolved.degradeReasons.join(', ')}</Text>
      ) : null}
      <Text>
        Available: {available ? 'yes' : 'no'} (count {observedCount})
      </Text>
      {status === 'empty' ? <Text>Buffer empty, refilling.</Text> : null}
      {status === 'no-fill' ? <Text>No fill for this request.</Text> : null}
      {/* Not an error: the held ad crossed the policy window; the hook dropped unrendered inventory. */}
      {status === 'stale-by-policy' ? <Text>Ad stale by policy, poll again.</Text> : null}
      {error ? (
        <Text>
          Poll failed: {error.reason} ({error.phase})
        </Text>
      ) : null}
      <Button title="Poll next ad" onPress={onShowNext} disabled={status === 'polling'} />

      {/* The hook clears unrendered `ad` and reports 'stale-by-policy' when policy fires. */}
      {ad?.format === AdFormat.BANNER ? (
        // Pooled banner arm matches MultiFormatBannerAdHandle structurally.
        <MultiFormatBannerAdView handle={ad} />
      ) : null}

      {ad?.format === AdFormat.NATIVE ? (
        <NativeAdView nativeAd={ad.ad}>
          {/* NativeAsset wraps the element that renders the asset. */}
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text>{ad.ad.headline}</Text>
          </NativeAsset>
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text>{ad.ad.body}</Text>
          </NativeAsset>
        </NativeAdView>
      ) : null}
    </View>
  );
}

export function AppWithDisplayPool() {
  // useMemo is an optimization, not a requirement: the provider reconciles by
  // poolId, so a new array identity does not recreate the pool.
  const pools = useMemo(() => [displayPool], []);

  return (
    <AdPoolProvider pools={pools}>
      <FeedPlacement />
    </AdPoolProvider>
  );
}
```

**Takeaway:** the provider registers the pool; `usePooledAd(DISPLAY_POOL_ID)` is how a screen later consumes it. Changing `poolId` in the child without matching the provider config looks up nothing.

---

### 3. Provider + fullscreen pool: poll then `show()`

```tsx
import React, { useCallback, useMemo } from 'react';
import { Button } from 'react-native';
import {
  AdEventType,
  AdFormat,
  AdPoolPresets,
  AdPoolProvider,
  TestIds,
  usePooledAd,
} from 'react-native-google-mobile-ads';

const UNIT = TestIds.INTERSTITIAL;
const fullscreenPool = AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, UNIT);
const POOL_ID = fullscreenPool.poolId;

function LevelEndButton() {
  const { poll, release } = usePooledAd(POOL_ID);

  const onPress = useCallback(async () => {
    // Prefer a poll at show time. The hook already drops unrendered inventory
    // that crossed the policy window on the next render after the policy edge;
    // this guard covers the residual same-tick case and the race between check
    // and show (re-check immediately before show). See Expiry point 5.
    const result = await poll();
    if (result.status !== 'filled' || result.ad.format !== AdFormat.INTERSTITIAL) {
      return;
    }

    // Take ownership before show/destroy. While the hook owns the ad, do not
    // call destroy() — that would leave the hook reporting filled with a dead
    // ad. release() clears hook state so CLOSED cleanup is yours alone.
    const next = release();
    if (!next) return;
    if (next.isStaleByPolicy()) {
      next.destroy();
      return;
    }

    const unsub = next.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      next.destroy();
      void poll(); // refill after dismiss
    });
    await next.show();
  }, [poll, release]);

  return <Button title="Continue (ad)" onPress={onPress} />;
}

export function AppWithFullscreenPool() {
  const pools = useMemo(() => [fullscreenPool], []);
  return (
    <AdPoolProvider pools={pools}>
      <LevelEndButton />
    </AdPoolProvider>
  );
}
```

There is **no** `useInterstitialAd`-style show hook for pools on purpose: a polled fullscreen `PooledAd` already exposes `show()` and the same event listeners.

If you keep the ad hook-owned instead of calling `release()`, `await ad.show()` and let the hook move to `status: 'consumed'` when that promise **fulfills** (it destroys the spent ad for you). Do not call `ad.destroy()` yourself in that path. **Footnote — two paths:**

- **Path A (`release()` then show):** Example 3 above. You own listeners through `CLOSED` / reward / paid, then `destroy()` yourself. Required whenever you need post-show observation.
- **Path B (hook-owned show):** `'consumed'` fires on show-promise settle, then the hook destroys. That drops listeners, so you will **not** see `OPENED` / `CLOSED` / `EARNED_REWARD` afterward. Early `destroy()` while still hook-owned has the same effect.

Rejected milestones for Path B: `OPENED` (native show promises do not wait for it), `CLOSED` / `EARNED_REWARD` (classic `useFullScreenAd` / `MobileAd` observation lifecycle — not the pool consume signal; waiting for them would keep the handle alive through the impression and contradict destroy-on-consume).

Holding a polled ad across a long session is allowed but is the consumer's risk: the pool cannot refresh an ad it no longer owns. `usePooledAd` covers the React case by destroying unrendered inventory that crosses the policy window and reporting `status: 'stale-by-policy'`; imperative holders run the check themselves. See [Expiry: two different scopes](#expiry-two-different-scopes).

#### Buffer depth greater than 1: a fullscreen capability

Fullscreen formats have a real SDK preloader on both classic backends, so they can hold more than one ready ad. `AdPoolPresets.fullscreen` takes the override bag directly, so this is the one preset call where `bufferSize` is worth passing:

```ts
const pool = await AdPools.create(
  AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, UNIT, {
    bufferSize: 2, // the depth Google recommends per preload ID
  }),
);

pool.resolved.effectiveBufferSize; // 2 where the app-wide cap allows it
pool.resolved.degraded; // false
```

The cap is app-wide across every format and preload ID, and the SDK resolves it at runtime from server-delivered settings rather than from a fixed number, so `maxManagedPoolAds` reports `null` and `effectiveBufferSize` is the value to read. Shallow pools coexist comfortably; many deep pools will clamp.

Depth interacts with age rather than solving it: a deeper buffer means more ads aging at once, and it does not change what the library can observe. See [Expiry: two different scopes](#expiry-two-different-scopes).

#### What a loud degrade looks like

Ask a **display** pool for depth and it clamps to 1, because neither classic backend ships an SDK display preloader. The pool still works; it tells you what it did rather than failing or pretending:

```ts
const pool = await AdPools.create(
  AdPoolPresets.display(FEED_UNIT, {
    bufferSize: 3, // not honourable on a display pool today
  }),
);

pool.resolved.requestedBufferSize; // 3
pool.resolved.effectiveBufferSize; // 1
pool.resolved.degraded; // true
pool.resolved.degradeReasons;
// ['pool/degraded-buffer-size', 'pool/emulated-no-sdk-preloader']
```

`useAdPool` surfaces the same thing as `status: 'ready-degraded'`. This is the difference between a **hard error** (the request is impossible: a format would be dropped, an illegal size, an unsupported mix) and a **loud degrade** (a milder adjustment was safe and is reported).

---

### 4. Multi-format ad via hook (no pool)

`useMultiFormatAd` is independent of `AdPoolProvider`. One request, winner is native **or** banner (count 1).

```tsx
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import {
  AdFormat,
  BannerAdSize,
  MultiFormatAdPresets,
  MultiFormatBannerAdView,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  TestIds,
  useMultiFormatAd,
} from 'react-native-google-mobile-ads';

const UNIT = TestIds.BANNER;

export function MultiFormatFeedSlot() {
  const { status, load, ads, errors } = useMultiFormatAd(
    UNIT,
    MultiFormatAdPresets.nativeOrBanner([BannerAdSize.MEDIUM_RECTANGLE, BannerAdSize.BANNER]),
  );

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    // load() never rejects; it resolves a MultiFormatLoadResult.
    void load();
  }, [load]);

  if (status === 'loading') return <ActivityIndicator />;
  // A clean no-fill is a routine ad-server outcome, so it is not `error` and
  // `errors` is empty. Do not early-return on `stale-by-policy`: leave-in-place
  // may still list already-rendered handles in `ads` (same pattern as usePooledAd).
  if (status === 'no-fill') {
    return <Text onPress={retry}>Nothing to show, tap to retry</Text>;
  }
  if (status === 'error') {
    return <Text onPress={retry}>Load failed: {errors[0]?.reason}. Tap to retry.</Text>;
  }
  // `loaded-partial` still has a usable handle: one format leg filled while the
  // other errored. Log the errors, render the winner.
  if (status === 'loaded-partial') {
    console.warn(
      'partial multi-format fill',
      errors.map(e => `${e.reason}/${e.phase}`),
    );
  }

  // The hook drops an unrendered handle that goes stale by policy.
  // Already-rendered handles stay in `ads`; only empty UI when none remain.
  if (ads.length === 0) {
    return status === 'stale-by-policy' ? (
      <Text onPress={retry}>Ad stale by policy, tap to reload</Text>
    ) : null;
  }

  const handle = ads[0]!;

  return (
    <View>
      {/* Optional stale hint; keep rendering leave-in-place handles below. */}
      {status === 'stale-by-policy' ? <Text>Ad stale by policy, load again.</Text> : null}
      {handle.format === AdFormat.NATIVE ? (
        <NativeAdView nativeAd={handle.ad}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text>{handle.ad.headline}</Text>
          </NativeAsset>
        </NativeAdView>
      ) : (
        /* Narrowed to the banner arm by the ternary above, so no assertion. */
        <MultiFormatBannerAdView handle={handle} />
      )}
    </View>
  );
}
```

Imperative equivalent (same shapes, no hook), so the caller owns both destruction and the age check, per [Expiry: two different scopes](#expiry-two-different-scopes):

```ts
const request = MultiFormatAdRequest.create(
  UNIT,
  MultiFormatAdPresets.nativeOrBanner([BannerAdSize.MEDIUM_RECTANGLE]),
);
const { ads, errors } = await request.load();

const handle = ads[0];
if (handle && !handle.isStaleByPolicy()) {
  const unsub = handle.onStaleByPolicy(() => {
    // Destroy only if this handle was never rendered; blanking a visible slot
    // after the impression was counted is user-hostile.
    handle.destroy();
  });
  // …render, then unsub() and handle.destroy() when done
  console.log(handle.adId, handle.observedAt, handle.provenance, unsub);
}
console.log(errors.map(e => e.reason));
```

`MultiFormatAdPresets.nativeOrBanner` returns request options only; pass the ad unit to `useMultiFormatAd` / `MultiFormatAdRequest.create` separately.

---

### 5. Imperative pool: no provider

Useful outside React or when you want explicit lifetime:

```ts
import { AdFormat, AdPools, AdPoolPresets, TestIds } from 'react-native-google-mobile-ads';

const unit = TestIds.INTERSTITIAL;
const pool = await AdPools.create(AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, unit));

pool.addListener(event => {
  if (event.type === 'error') {
    console.warn(event.error.reason, event.error.phase);
  }
  // Library-managed pools only: per-ad eviction, correlated by adId.
  if (event.type === 'expired') {
    console.log('pool ad evicted', event.adId, event.reason, event.provenance);
  }
  // Library-managed only: replacedAdId ties this fill to the expired event above.
  if (event.type === 'refreshed') {
    console.log('pool refilled', event.adId, 'replacing', event.replacedAdId);
  }
  // SDK-managed: buffer empty, cause unknown (onAdsExhausted / adsExhausted).
  if (event.type === 'exhausted') {
    console.log('pool exhausted', event.poolId);
  }
  // SDK-managed: a response id became available (pair with exhausted for refresh).
  if (event.type === 'available') {
    console.log('pool available', event.responseId);
  }
});

// Count is always present; upper bound (no Android V2 expiry sweep).
const { available, observedCount } = await pool.getAvailability();
console.log(available, observedCount);

const result = await pool.poll();
switch (result.status) {
  case 'filled':
    // An ad came out of the buffer. That is not a freshness guarantee.
    if (result.ad.format === AdFormat.INTERSTITIAL) {
      await result.ad.show();
      result.ad.destroy();
    }
    break;
  case 'empty':
  case 'timeout':
    // Not errors: the pool is still refilling. Try again later.
    break;
  case 'no-fill':
  case 'error':
    console.warn(result.error.reason);
    break;
}

pool.destroy(); // or AdPools.destroyAll()
```

Lookup later:

```ts
AdPools.get(`fullscreen-${AdFormat.INTERSTITIAL}-${unit}`);
```

---

### 6. Error handling (`reason` + `phase`)

`code` / `message` stay as today. Use **`reason`** for cross-platform branching and **`phase`** to tell load vs show failures (no separate show-failed event).

Those fields are **required** on the structured delivery surfaces that share one payload shape: `AdEventType.ERROR` payloads are `Error & AdErrorPayload`, the hooks expose `AdError` (exactly `NativeError & AdErrorPayload`), and the pool data records carry `AdErrorPayload`. So the branching below reads the same on a hook error as on an event payload.

The **banner / GAM banner** `onAdFailedToLoad` prop is the deliberate exception: it is typed `Error & Partial<AdErrorPayload>` so existing `(error: Error) => void` handlers stay assignable under `strictFunctionTypes`. Treat `reason` / `phase` as optional there (`error.reason === 'no-fill'` is fine; do not assume they are always present).

```ts
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);

ad.addAdEventListener(AdEventType.ERROR, error => {
  // error is Error & AdErrorPayload when wired
  if (error.reason === 'no-fill' || error.reason === 'mediation-no-fill') {
    // distinct no-fill; required fields on event / hook / pool surfaces
  } else if (error.phase === 'show') {
    // fail-to-show (exactly one ERROR event)
  } else {
    console.warn(error.phase, error.reason, error.message);
  }
  // optional auction snapshot on the failure
  console.debug(error.responseInfo?.responseId);
});

ad.load();
```

Banner prop form (`Partial` exception — `reason` / `phase` may be absent):

```tsx
<BannerAd
  unitId={TestIds.BANNER}
  size={BannerAdSize.BANNER}
  onAdFailedToLoad={error => {
    // Error & Partial<AdErrorPayload>: guard before treating as structured
    if (error.reason === 'no-fill') {
      // …
    }
  }}
/>
```

Where each failure shows up:

| Surface                                  | Where the failure lands                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Pool creation                            | `useAdPool(…)` `status: 'error'` plus `error: AdError`; call `retry()` to try again           |
| `poll()`                                 | `usePooledAd(…)` `status: 'no-fill' \| 'error'` plus `error: AdError`; `poll()` never rejects |
| Multi-format hook load                   | `useMultiFormatAd(…).errors` (`AdError[]`) with `status: 'error'` or `'loaded-partial'`       |
| Imperative `pool.poll()`                 | `PollResult` `no-fill` / `error` carrying `AdErrorPayload`; never a rejection                 |
| Imperative `MultiFormatAdRequest.load()` | the resolved `errors: AdError[]`                                                              |
| Banner / GAM `onAdFailedToLoad`          | `Error & Partial<AdErrorPayload>` (additive; `reason` / `phase` optional)                     |

Because hook errors are `AdError`, `error.reason` and `error.phase` are real values there, not `undefined`:

```ts
const pooled = usePooledAd(POOL_ID);
if (pooled.status === 'error' && pooled.error.reason === 'network-error') {
  // same branching as the event payload above; `error` is narrowed to AdError
  console.warn(pooled.error.phase, pooled.error.message, pooled.error.responseInfo?.responseId);
}
```

Note the deliberate splits. `empty`, `timeout`, and `stale-by-policy` are **not** errors, because the pool is still refilling or the held ad simply crossed the publisher window, so they never populate `error`. `no-fill` is separated from `error` on both `usePooledAd` and `useMultiFormatAd`, so a routine ad-server no-fill is never reported as a failure with an empty `errors` array.

---

### 7. Response metadata and paid events

After a successful load, read `responseInfo` on the ad / handle. On `PAID`, prefer `valueMicros` when present and walk the loaded adapter row for waterfall debugging. **No eCPM helpers in the public API.**

```ts
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);

ad.addAdEventListener(AdEventType.LOADED, () => {
  const info = ad.responseInfo;
  console.log('responseId', info?.responseId);
  console.log('winning adapter', info?.loadedAdapterResponse?.adSourceName);
  // Every row reports identity and latency; `outcome` narrows the error.
  console.log(
    'waterfall',
    info?.adapterResponses?.map(r => ({
      source: r.adSourceName,
      latencyMillis: r.latencyMillis,
      error: r.outcome === 'error' ? r.adError.message : null,
    })),
  );
  console.log('GAM extras', info?.extras); // lineItemId, creativeId, …
});

ad.addAdEventListener(AdEventType.PAID, paid => {
  // paid: { currency, precision, value, valueMicros?, responseInfo? }
  const micros = paid.valueMicros; // decimal string, or null if not exact
  const source = paid.responseInfo?.loadedAdapterResponse?.adSourceName;
  analytics.logRevenue({
    currency: paid.currency,
    value: paid.value,
    valueMicros: micros,
    adapter: source,
    responseId: paid.responseInfo?.responseId,
  });
});

ad.load();
```

Same `responseInfo` field exists on `NativeAd`, multi-format handles, and pooled ads once wired. `peekResponseInfo()` on a pool is a **non-reserving** snapshot (racy, do not treat it as a poll). It reports the head of the buffer only and carries no time information, so it is not an age check. Gate with `getAdCapabilities().poolResponseInfoPeek` first: classic Android has no peek API (`unavailable` → hard-error `'pool/peek-unsupported'`); classic iOS supports a head peek when wired. On a supported backend, resolved `null` means the head is empty — it must not be read as "peek unsupported".

---

## Out of this surface (v1)

- Custom native formats
- `numberOfAds` / `requestCount` greater than 1
- Mediation host packages (MAX, CloudX, etc.): use scoped GAM adapter packages separately
- Shim removal
