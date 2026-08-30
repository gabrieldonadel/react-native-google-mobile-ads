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
- or run as an **emulated** depth-1 self-refill when there is no SDK display preloader, which is the case for **banner and native on both classic backends**, since neither iOS nor classic Android ships a display preloader. Still a pool from your point of view, labeled `emulated` / `degraded` rather than fake “full SDK preload” parity.

So buffer depth greater than 1 is a **fullscreen** capability today. A display pool asking for depth clamps to 1 and tells you it did; see the degrade example below.

Ads do not stay usable forever, and what the library can honestly tell you about that is narrower than it looks and depends on who loaded the ad. It is a contract currently in revision, and it is stated in exactly one place: [Expiry: two different scopes](#expiry-two-different-scopes).

`AdPoolProvider` only **owns** those pools for a React tree of children. Child screens look them up by the same `poolId` (`useAdPool` / `usePooledAd`), then poll and show/render. You can also call `AdPools.create` yourself. You can also use **neither** pools nor multi-format APIs and stay on the classic create/load/show path.

### Not every permutation is possible, and that is checked up front

Google’s SDKs do not support every combination of format × buffer size × preload × multi-format × mediation. Mixing fullscreen with display in one pool, asking for buffer depths the backend cannot honor, illegal banner sizes in a multi-format request, or formats that are simply `unavailable` on this binary are examples of things that **cannot** all be true at once.

So the library does **not** ask you to memorize the matrix. At **`AdPools.create` / `MultiFormatAdRequest.create` time** it validates the config against what this app can actually do:

- **Hard-error** when the request is impossible (e.g. a format would be dropped, illegal size, unsupported mix).
- **Loud degrade** when a milder adjustment is safe (e.g. clamp buffer size, emulated display preload); you see that on `resolved` / `degraded` / `degradeReasons`.

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
- `onAdFailedToLoad` may carry `AdErrorPayload` fields (`reason`, `phase`) in addition to legacy `Error`

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
  fullscreenPreload: CapabilitySupport;
  displayPreload: CapabilitySupport;
  multiCountNative: CapabilitySupport;
  maxManagedPoolAds: number | null;
  mediation: 'unknown' | 'known-enabled' | 'known-disabled';
};

function getAdCapabilities(): AdCapabilities;
```

- Synchronous; safe before `initialize()`.
- **Stub today:** returns placeholder values: `backend: 'android-classic'`, `sdkVersion: '0.0.0-stub'`, every format and capability as `unavailable`, `maxManagedPoolAds: null`, `mediation: 'unknown'`. These are not live device/SDK capability readings.
- Prefer **presets** for common cases; do not re-implement capability matrices in app code.
- When native-wired, classic fullscreen preload may report `experimental` while upstream preload APIs remain beta. Treat `experimental` as maturity honesty, not a veto of a supported path.
- **Anti-pattern:** do not pre-flight-branch on the full capability matrix before every call. Use presets / hard-errors at `create()`, and reserve capability reads for UI gating or diagnostics.

---

## Presets (new)

```ts
AdPoolPresets.fullscreen(
  format: FullscreenAdFormat,
  adUnitId: string,
  options?: Partial<AdPoolConfig>,
): AdPoolConfig;

AdPoolPresets.display(adUnitId: string, options?: Partial<AdPoolConfig>): AdPoolConfig;

MultiFormatAdPresets.nativeOrBanner(
  adUnitId: string,
  bannerSizes: MultiFormatBannerSize[],
): MultiFormatAdRequestOptions;
```

Presets return plain config objects. `AdPools.create` / `MultiFormatAdRequest.create` validate them the same as hand-written config.

Both pool presets take the same `Partial<AdPoolConfig>` override bag, spread over the preset defaults. That matters most on `fullscreen`, because fullscreen is the only family where `bufferSize` above 1 is meaningful:

```ts
AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, unit, { bufferSize: 2 });
AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, unit, { requestOptions: { keywords: ['games'] } });
```

The computed `poolId` default (`fullscreen-${format}-${adUnitId}`, `display-${adUnitId}`) survives unless you override it.

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
};

// Shared with pooled ads: same identity, same expiry surface, same words.
type MultiFormatAdHandleBase = AdIdentity &
  AdExpiry & {
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
// values are the terminal subset of UseMultiFormatAdStatus, so hook state and
// the resolved result use the same words.
type MultiFormatLoadResult =
  | { status: 'loaded'; ads: MultiFormatAdHandle[]; errors: never[] }
  | { status: 'loaded-partial'; ads: MultiFormatAdHandle[]; errors: AdError[] }
  | { status: 'no-fill'; ads: never[]; errors: never[] } // routine, not a failure
  | { status: 'error'; ads: never[]; errors: AdError[] };

class MultiFormatAdRequest {
  static create(adUnitId, options): MultiFormatAdRequest;
  load(): Promise<{ ads: MultiFormatAdHandle[]; errors: AdError[] }>;
  destroy(): void;
}
```

**Stub:** `load()` rejects with `"MultiFormatAdRequest.load is not implemented"`.

A load never resolves `expired`. This library performed the load and returns the handles out of its own completion callback, so its observed time starts at hand-off. That is a statement about provenance, not a guarantee inherited from `poll()`. See [Expiry: two different scopes](#expiry-two-different-scopes).

Imperative callers own every returned handle: both `destroy()` and the age check are theirs, and `useMultiFormatAd` does both for you. See [Expiry: two different scopes](#expiry-two-different-scopes).

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

Illegal in v1 (hard-error when wired): adaptive sizes, `FLUID`, empty formats, banner without sizes, `requestCount !== 1`.

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
  adServer?: 'ad-manager' | 'admob';
  mediation?: 'unknown' | 'known-enabled' | 'known-disabled';
  bannerSizes?: MultiFormatAdRequestOptions['bannerSizes'];
};

type AdPoolDegradeReason =
  | 'pool/degraded-buffer-size'
  | 'pool/degraded-request-count'
  | 'pool/emulated-no-sdk-preloader';

type AdPoolResolvedConfig = AdPoolConfig & {
  requestedBufferSize?: number;
  effectiveBufferSize: number;
  degraded: boolean;
  degradeReasons: AdPoolDegradeReason[];
};

// Identity, for correlation and diagnostics. Shared with multi-format handles.
type AdIdentity = {
  adId: string; // stable, unique within the app for this ad's lifetime
  loadedAt: number; // epoch millis, the library's own observation; see the expiry section
};

// Expiry, on any inventory the consumer holds. Shared with multi-format handles.
// Superseded and pending removal: see the expiry section below.
type AdExpiry = {
  expiresAt: number | null;
  isExpired(): boolean;
  onExpired(listener: () => void): () => void;
};

// Kept as aliases so the pooled-ad vocabulary still reads naturally.
type PooledAdIdentity = AdIdentity;
type PooledAdExpiry = AdExpiry;

type PooledAdBase = AdIdentity &
  AdExpiry & {
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
  | { status: 'filled'; ad: PooledAd } // ownership transfers to the caller
  | { status: 'empty' } // buffer exhausted, refill in flight, not an error
  | { status: 'timeout' } // pollTimeoutMillis elapsed, not an error
  | { status: 'no-fill'; error: AdErrorPayload } // routine ad-server outcome
  | { status: 'error'; error: AdErrorPayload }; // network or internal failure

interface AdPool {
  readonly poolId: string;
  readonly formats: AdFormat[];
  readonly resolved: AdPoolResolvedConfig;
  getAvailability(): Promise<{ available: boolean; observedCount?: number }>;
  peekResponseInfo(): Promise<ResponseInfo | null>; // head only; not an age check
  poll(): Promise<PollResult>; // async; no put-back; never rejects
  addListener(listener: (event: AdPoolEvent) => void): () => void;
  destroy(): void;
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
  // Pool-owned inventory, evicted. Never describes an already-polled ad.
  // Library-managed pools only: see the expiry section.
  | { type: 'expired'; poolId: string; adId: string; reason: 'expiry' | 'refresh' }
  // The replacement fill. `replacedAdId` is the evicted `adId`, or null when
  // this fill replaced nothing (a plain refill into free depth).
  | { type: 'refreshed'; poolId: string; adId: string; replacedAdId: string | null };
```

On a pool the library manages itself, an eviction and its replacement are correlated by id: the `expired` event carries the outgoing `adId`, and the following `refreshed` event carries `replacedAdId` equal to that same id plus the incoming `adId`. A diagnostic consumer can build the full chain (evicted, why, what replaced it) from those two events alone. On a pool the platform preloader manages, that chain is not available, because the platform emits nothing when it evicts one buffered ad; see [Expiry: two different scopes](#expiry-two-different-scopes).

### Expiry: two different scopes

> **Status: superseded, and the surface below is pending revision.** The single source of truth for
> everything about expiry, staleness, ad age, cache timeouts and eviction is the canonical inventory expiry
> record published on the internal tracker as `inventory-expiry-canonical.md`. Where this reference
> and that record disagree, that record is correct and this reference is the defect. What changes:
> `expiresAt`, `isExpired()` and `onExpired()` are removed, because no public API on either platform
> reports an ad's expiry deadline, its cache age, or the timeout the SDK is currently enforcing; they
> are replaced by a staleness window the publisher configures, a predicate named for the fact that it
> evaluates that window, and a matching subscription. Every handed-out object gains a provenance tag
> separating a load this library performed from an ad the SDK handed over on `poll()`, and the
> `poll()` hand-off freshness guarantee is withdrawn outright.

**Everything this document says about age is said here, once.** Other sections link here rather than
restate it, so there is one place to correct when the revision lands.

Two scopes, named apart. This split survives the revision:

| Question                                               | Answer                                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Did an ad **still in the pool** churn?                 | Pool events `expired` / `refreshed`, correlated by `adId`, on library-managed pools only |
| Did the ad or handle **I am holding** age?             | The members on that `PooledAd` or handle                                                 |
| Am I at risk of rendering something stale from a hook? | The hooks reduce that risk; they do not remove it. See point 4 below                     |

A polled ad has left the pool, because ownership transfers on `poll()`, so pool events can never identify it. That is why the check lives on the handle too. Whether a pool's `destroy()` also affects an ad it already handed out is unverified and is tracked as an open probe in the canonical record; do not build on either answer.

**The canonical pattern is to poll at show time.** Google's own guidance is to leave ads in the SDK cache until you are ready to show, so the SDK can refresh and reorder them. That is the strongest surviving part of this contract, and it is now better supported than when it was written.

#### What the library can and cannot tell you about age

1. **`poll()` carries no freshness guarantee.** The platform poll path performs no age sweep, so an ad can already be past the timeout the platform itself enforces at the moment it is handed over, and the library has no way to see that. A `filled` result therefore means "an ad came out of the buffer", nothing more. `getAvailability()` and its `observedCount` are upper bounds for the same reason.
2. **Provenance decides what a time value means.** For a load this library performed, the observed time is the library's own load completion, and there is no hidden platform cache underneath it. For an ad the platform polled out of its own buffer, the best the library can offer is when it first saw that ad become available, which is not the age the platform is accounting for, and which is unavailable at all if the library was not listening when the ad arrived. `'pool/emulated-no-sdk-preloader'` already marks that boundary and is the hook the provenance tag is built on.
3. **Freshness is a policy you set, and it protects in one direction only.** The replacement surface evaluates a window you configure, defaulting to Google's published guidance for the format. Those figures are Google's published guidance, not values this library or the platform enforces: the app open guides state four hours on both platforms, the other formats carry a roughly one hour tip, and the canonical record marks the Android interstitial one hour figure as contested between sources. The window guards against you or the library holding an ad too long. It does **not** certify that an ad inside the window is valid, and a polled ad that exceeds it is reported rather than discarded, because a poll removes the ad with no way to put it back and your window may be the stricter of the two.
4. **The hooks reduce accidental stale rendering, they do not remove it.** `usePooledAd` subscribes to the held ad, and on firing it destroys the ad, clears `ad` to `null`, and sets `status: 'expired'`, so every component reading the hook re-renders. `useMultiFormatAd` does the same per handle, and `status` becomes `'expired'` once `ads` is empty. That closes the window in which the library is holding an ad too long. It cannot close the window that opened before hand-off on a pool the platform preloader manages, per point 1.
5. **Expiry is not an error.** `status: 'expired'` never populates `error` / `errors`, the same way `empty` and `timeout` do not. It is a normal inventory lifecycle event, and the response is to poll or load again. This is reinforced by the evidence: no platform reports a show failure for a stale ad, so representing staleness as an error would invent a failure that never occurs.
6. **Poll order does not follow preload order.** The platform buffer is a priority queue ordered by a value-like key, not a queue in arrival order, so a deeper buffer does not mean the oldest ad comes out next and preload order predicts nothing about poll order.
7. **Imperative callers own the check.** `AdPools.create` + `poll()`, or `MultiFormatAdRequest.load()`, hand you objects with no hook watching them, so the age check and `destroy()` are both yours.

---

## Hooks / provider (new)

```ts
function AdPoolProvider(props: { pools: AdPoolConfig[]; children: React.ReactNode }): JSX.Element;

// `retry` sits on a shared base so it is callable without narrowing first.
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

function useAdPool(poolId: string): UseAdPoolResult;

// `expired` is the held ad reaching the end of its inventory lifecycle.
// Not an error: `error` stays null, like `empty` and `timeout`.
type UsePooledAdStatus =
  | 'idle'
  | 'polling'
  | 'filled'
  | 'empty'
  | 'timeout'
  | 'no-fill'
  | 'error'
  | 'expired';

function usePooledAd(poolId: string): {
  status: UsePooledAdStatus;
  ad: PooledAd | null; // hook-owned; destroyed on unmount, when superseded, and on expiry
  error: AdError | null; // only for 'no-fill' | 'error'
  available: boolean; // event-driven, no polling loop
  poll: () => Promise<PollResult>; // updates state; never rejects; never during render
  release: () => PooledAd | null; // take ownership without destroying
};

// `loaded-partial` is real: one request can fill one format leg and fail the
// other, so handles and errors are not mutually exclusive.
// `no-fill` is split from `error` so a clean no-fill does not look like a
// failure with an empty `errors` array. `expired` is not an error either.
type UseMultiFormatAdStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'loaded-partial'
  | 'no-fill'
  | 'error'
  | 'expired';

function useMultiFormatAd(
  adUnitId,
  options,
): {
  status: UseMultiFormatAdStatus;
  ads: MultiFormatAdHandle[]; // hook-owned; destroyed on unmount, when superseded, and on expiry
  errors: AdError[]; // empty for 'no-fill' and 'expired'
  load: () => Promise<MultiFormatLoadResult>; // updates state; never rejects
  release: () => MultiFormatAdHandle[]; // take ownership without destroying
};
```

### Hook state ownership

`usePooledAd` is **state-first**. Calling `poll()` updates `status`, `ad`, and `error` on the hook, so you do not track loading, stash the ad, or destroy it yourself. It also:

- **coalesces** concurrent calls onto the in-flight poll, so a double tap cannot burn two ads,
- **destroys** the previous ad when a later poll supersedes it, and every held ad on unmount,
- **destroys** the held ad when it expires, clears `ad` to `null`, and reports `status: 'expired'`,
- **never rejects**: `poll()` resolves into the same `PollResult` the state reflects, so the return value is optional convenience for “poll and show in one handler”.

Use `release()` when the ad must outlive the hook (handing it to a store or another screen). It clears hook state so unmount cleanup will not destroy an ad someone else now owns. Ordering is guaranteed: `release()` called immediately after `await poll()` returns the ad that poll just produced, without waiting for a render, because the hook tracks the current ad in a ref alongside state.

`available` is **event-driven**: updated from the pool's own events and after each poll settles. There is no timer and no polling loop, so it stays live without costing a render per interval.

`usePooledAd` alone cannot tell an absent pool from a warming one: both look like `status: 'idle'` with `available: false`. Pair it with `useAdPool(poolId)` when that distinction matters, which is the intended pattern; `useAdPool` reports `absent` versus `creating`. Example 2 below does exactly this.

`useMultiFormatAd` is the sibling of `usePooledAd` and uses the same vocabulary:

- the hook **owns** the handles it returns,
- it **destroys** them on unmount, and when a later `load()` supersedes them,
- it **destroys** a handle that expires, drops it from `ads`, and reports `status: 'expired'` once `ads` is empty,
- `load()` **never rejects**: it resolves a `MultiFormatLoadResult` mirroring the state it just set,
- `release()` hands the current handles to the caller and clears hook state, returning `[]` when nothing is held, with the same post-`await` ordering guarantee.

**The callbacks these hooks return keep the same identity for the life of the hook.** `poll`, `load`, `release`, and `retry` are stable references, so listing them in a dependency array does not re-run the effect. That is what makes `useEffect(() => { void load(); }, [load])` load once instead of on every render.

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

**Rules:** never `poll()` during render; pool ownership stays with the provider or `AdPools.create`, never with the consumer hook. `usePooledAd` and `useMultiFormatAd` destroy the inventory they hand you on unmount, so call `release()` if it must outlive the hook. Imperative callers of `AdPools.create` / `MultiFormatAdRequest.load` own `destroy()` and the age check themselves: see [Expiry: two different scopes](#expiry-two-different-scopes).

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

`AdError` is a real `Error` (it can be thrown, and it has a `stack`) that also carries the structured payload, so `reason` / `phase` / `responseInfo` branching works identically whether the error arrived through a hook or through an `AdEventType.ERROR` event, whose payload is `Error & AdErrorPayload`. One shape, both delivery styles.

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

Preset `AdPoolPresets.display(adUnitId)` sets `poolId` to `display-${adUnitId}`. Children must use **that** id.

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
const DISPLAY_POOL_ID = `display-${FEED_UNIT}`; // matches AdPoolPresets.display

function FeedPlacement() {
  // Pairing the two hooks is how you tell an absent pool from a warming one.
  const poolState = useAdPool(DISPLAY_POOL_ID);
  // State-first: no loading flag, no ad stashing, no manual destroy.
  const { status, available, poll, ad, error } = usePooledAd(DISPLAY_POOL_ID);

  const onShowNext = useCallback(() => {
    // Never call poll() during render, only from handlers or effects.
    // Concurrent calls coalesce, so a double tap cannot burn two ads.
    void poll();
  }, [poll]);

  switch (poolState.status) {
    case 'absent':
      return <Text>No pool registered for {DISPLAY_POOL_ID}. Check the provider config.</Text>;
    case 'creating':
      return <Text>Warming display pool…</Text>;
    case 'error':
      // retry() is on every arm, so no narrowing is needed to call it.
      return (
        <Text onPress={poolState.retry}>Pool failed: {poolState.error.reason}. Tap to retry.</Text>
      );
  }

  return (
    <View>
      {poolState.status === 'ready-degraded' ? (
        // Degrade reasons live on the pool, not mirrored onto the hook.
        <Text>Pool degraded: {poolState.pool.resolved.degradeReasons.join(', ')}</Text>
      ) : null}
      <Text>Available: {available ? 'yes' : 'no'}</Text>
      {status === 'empty' ? <Text>Buffer empty, refilling.</Text> : null}
      {status === 'no-fill' ? <Text>No fill for this request.</Text> : null}
      {/* Not an error: the held ad aged out, the hook already dropped it. */}
      {status === 'expired' ? <Text>Ad expired, poll again.</Text> : null}
      {error ? (
        <Text>
          Poll failed: {error.reason} ({error.phase})
        </Text>
      ) : null}
      <Button title="Poll next ad" onPress={onShowNext} disabled={status === 'polling'} />

      {/* The hook clears `ad` and reports 'expired' when it drops one. */}
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
  const pools = useMemo(
    () => [
      AdPoolPresets.display(FEED_UNIT, {
        bannerSizes: [BannerAdSize.MEDIUM_RECTANGLE, BannerAdSize.BANNER],
        adServer: 'ad-manager',
      }),
    ],
    [],
  );

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
const POOL_ID = `fullscreen-${AdFormat.INTERSTITIAL}-${UNIT}`;

function LevelEndButton() {
  const { poll, ad } = usePooledAd(POOL_ID);

  const onPress = useCallback(async () => {
    // Prefer a poll at show time. The hook already drops an aged-out ad, so
    // this guard covers the same-tick case only.
    const held = ad && !ad.isExpired() ? ad : null;
    const next = held ?? (await poll().then(r => (r.status === 'filled' ? r.ad : null)));

    if (!next || next.format !== AdFormat.INTERSTITIAL) return;

    const unsub = next.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      next.destroy();
      void poll(); // refill after dismiss
    });
    await next.show();
  }, [ad, poll]);

  return <Button title="Continue (ad)" onPress={onPress} />;
}

export function AppWithFullscreenPool() {
  const pools = useMemo(() => [AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, UNIT)], []);
  return (
    <AdPoolProvider pools={pools}>
      <LevelEndButton />
    </AdPoolProvider>
  );
}
```

There is **no** `useInterstitialAd`-style show hook for pools on purpose: a polled fullscreen `PooledAd` already exposes `show()` and the same event listeners.

Holding a polled ad across a long session is allowed but is the consumer's risk: the pool cannot refresh an ad it no longer owns. `usePooledAd` covers the React case by destroying an aged-out held ad and reporting `status: 'expired'`; imperative holders run the check themselves. See [Expiry: two different scopes](#expiry-two-different-scopes).

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
    MultiFormatAdPresets.nativeOrBanner(UNIT, [BannerAdSize.MEDIUM_RECTANGLE, BannerAdSize.BANNER]),
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
  // `errors` is empty. `expired` means the handles aged out while held.
  if (status === 'no-fill' || status === 'expired') {
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

  // The hook destroys and drops an aged-out handle itself.
  const handle = ads[0];
  if (!handle) return null;

  if (handle.format === AdFormat.NATIVE) {
    return (
      <NativeAdView nativeAd={handle.ad}>
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text>{handle.ad.headline}</Text>
        </NativeAsset>
      </NativeAdView>
    );
  }

  return (
    <View>
      {/* Narrowed to the banner arm by the return above, so no assertion. */}
      <MultiFormatBannerAdView handle={handle} />
    </View>
  );
}
```

Imperative equivalent (same shapes, no hook), so the caller owns both destruction and the age check, per [Expiry: two different scopes](#expiry-two-different-scopes):

```ts
const request = MultiFormatAdRequest.create(
  UNIT,
  MultiFormatAdPresets.nativeOrBanner(UNIT, [BannerAdSize.MEDIUM_RECTANGLE]),
);
const { ads, errors } = await request.load();

const handle = ads[0];
if (handle && !handle.isExpired()) {
  const unsub = handle.onExpired(() => {
    handle.destroy(); // also destroys the inner NativeAd on the native arm
  });
  // …render, then unsub() and handle.destroy() when done
  console.log(handle.adId, handle.expiresAt, unsub);
}
console.log(errors.map(e => e.reason));
```

Note `useMultiFormatAd(UNIT, MultiFormatAdPresets.nativeOrBanner(UNIT, […]))` passes the ad unit twice, because the preset returns request options that do not carry the unit. Keep the two in sync, or hoist the unit into a constant as above.

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
  // Pool-owned inventory churn, correlated by adId. Never a polled ad.
  // Library-managed pools only: see the expiry section.
  if (event.type === 'expired') {
    console.log('pool ad evicted', event.adId, event.reason);
  }
  // replacedAdId ties this fill back to the expired event above.
  if (event.type === 'refreshed') {
    console.log('pool refilled', event.adId, 'replacing', event.replacedAdId);
  }
});

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

Those fields are available on every delivery surface, because they are the same type everywhere: `AdEventType.ERROR` payloads are `Error & AdErrorPayload`, the hooks expose `AdError` (which is exactly `NativeError & AdErrorPayload`), and the pool data records carry `AdErrorPayload`. So the branching below reads the same on a hook error as on an event payload.

```ts
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL);

ad.addAdEventListener(AdEventType.ERROR, error => {
  // error is Error & AdErrorPayload when wired
  if (error.reason === 'no-fill' || error.reason === 'mediation-no-fill') {
    // distinct no-fill, safe on every delivery surface
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

Banner prop form (same fields, additive on the existing `Error`):

```tsx
<BannerAd
  unitId={TestIds.BANNER}
  size={BannerAdSize.BANNER}
  onAdFailedToLoad={error => {
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

Because hook errors are `AdError`, `error.reason` and `error.phase` are real values there, not `undefined`:

```ts
const { status, error } = usePooledAd(POOL_ID);
if (status === 'error' && error?.reason === 'network-error') {
  // same branching as the event payload above
  console.warn(error.phase, error.message, error.responseInfo?.responseId);
}
```

Note the deliberate splits. `empty`, `timeout`, and `expired` are **not** errors, because the pool is still refilling or the held ad simply aged out, so they never populate `error`. `no-fill` is separated from `error` on both `usePooledAd` and `useMultiFormatAd`, so a routine ad-server no-fill is never reported as a failure with an empty `errors` array.

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

Same `responseInfo` field exists on `NativeAd`, multi-format handles, and pooled ads once wired. `peekResponseInfo()` on a pool is a **non-reserving** snapshot (racy, do not treat it as a poll). It reports the head of the buffer only and carries no time information, so it is not an age check.

---

## Out of this surface (v1)

- Custom native formats
- `numberOfAds` / `requestCount` greater than 1
- Mediation host packages (MAX, CloudX, etc.): use scoped GAM adapter packages separately
- Shim removal
