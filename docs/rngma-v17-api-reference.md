# React Native Google Mobile Ads — v17 API reference

Single-file reference for the public TypeScript surface of `react-native-google-mobile-ads`.
Covers today’s source-compatible shims plus the additive v17 types and stubs
(`getAdCapabilities`, `AdPools`, `CompetitiveAdRequest`, `CompetitiveBannerAdView`, presets, and hooks).

> **Status:** types and minimal runtime stubs. Native preload / competitive load /
> pool wiring lands in later work. Stub methods reject or no-op as documented below.

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

| Export | Notes |
|--------|--------|
| `mobileAds()` / `MobileAds()` | `initialize()`, volume/mute, request configuration, ad inspector; additive stubs (no-op / JS package version today): `disableMediationAdapterInitialization`, `disableSdkCrashReporting`, `setPublisherFirstPartyIdEnabled`, `getVersion` |
| `NativeError` | Public `Error` subclass used in competitive / pool hook error shapes |
| `AdsConsent` | UMP consent flow (unchanged) |
| `MaxAdContentRating`, `TestIds` | Unchanged |
| `RequestOptions` | Additive: `categoryExclusions?: string[]` (GAM-only) |
| `RequestConfiguration` | Additive: `publisherPrivacyPersonalizationState?: 'enabled' \| 'disabled' \| 'unset'` |
| `AdapterStatus` | Additive optional `latencyMillis` |

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

| Member | Type |
|--------|------|
| `ad.destroy()` | `void` — release native listeners; idempotent |
| `ad.responseInfo` | `ResponseInfo \| null` — snapshot after load |

**Events (`AdEventType`):**

| Event | Notes |
|-------|--------|
| `LOADED`, `OPENED`, `CLOSED`, `CLICKED`, `PAID`, `ERROR` | Existing |
| `IMPRESSION` | Additive; no payload |
| `ERROR` | Keeps `code` / `message`; gains structured `reason` + `phase` (see Error payload) |

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
type AdBackend = 'ios-classic' | 'android-classic' | 'android-next-gen';

enum AdFormat {
  APP_OPEN = 'appOpen',
  INTERSTITIAL = 'interstitial',
  REWARDED = 'rewarded',
  REWARDED_INTERSTITIAL = 'rewardedInterstitial',
  BANNER = 'banner',
  NATIVE = 'native',
}

type CapabilitySupport =
  | 'supported'
  | 'emulated'
  | 'degraded'
  | 'experimental'
  | 'unavailable';

type AdCapabilities = {
  backend: AdBackend;
  sdkVersion: string; // linked native SDK version
  formats: Record<AdFormat, CapabilitySupport>;
  competitiveNativeBanner: CapabilitySupport;
  fullscreenPreload: CapabilitySupport;
  displayPreload: CapabilitySupport;
  multiCountNative: CapabilitySupport;
  maxManagedPoolAds: number | null;
  mediation: 'unknown' | 'known-enabled' | 'known-disabled';
};

function getAdCapabilities(): AdCapabilities;
```

- Synchronous; safe before `initialize()`.
- **Stub today:** returns placeholder values — `backend: 'android-classic'`, `sdkVersion: '0.0.0-stub'`, every format and capability as `unavailable`, `maxManagedPoolAds: null`, `mediation: 'unknown'`. These are not live device/SDK capability readings.
- Prefer **presets** for common cases; do not re-implement capability matrices in app code.
- When native-wired, classic fullscreen preload may report `experimental` while upstream preload APIs remain beta. Treat `experimental` as maturity honesty, not a veto of a supported path.
- **Anti-pattern:** do not pre-flight-branch on the full capability matrix before every call. Use presets / hard-errors at `create()`, and reserve capability reads for UI gating or diagnostics.

---

## Presets (new)

```ts
AdPoolPresets.fullscreen(format, adUnitId, requestOptions?): AdPoolConfig
AdPoolPresets.display(adUnitId, options?): AdPoolConfig

CompetitiveAdPresets.nativeOrBanner(adUnitId, bannerSizes): CompetitiveAdRequestOptions
```

Presets return plain config objects. `AdPools.create` / `CompetitiveAdRequest.create` validate them the same as hand-written config.

---

## Competitive request (new)

One AdLoader-style request. Count **1**. Formats: native and/or GAM banner.

```ts
type CompetitiveAdFormat = AdFormat.NATIVE | AdFormat.BANNER;

type CompetitiveBannerSize =
  | BannerAdSize.BANNER
  | BannerAdSize.FULL_BANNER
  | BannerAdSize.LARGE_BANNER
  | BannerAdSize.LEADERBOARD
  | BannerAdSize.MEDIUM_RECTANGLE
  | BannerAdSize.WIDE_SKYSCRAPER // mediation-only; not served by the Google network
  | `${number}x${number}` // custom, e.g. "300x200"
  | { width: number; height: number }; // custom object form

type CompetitiveAdRequestOptions = RequestOptions & {
  formats: CompetitiveAdFormat[];
  bannerSizes?: CompetitiveBannerSize[]; // required when banner is requested
  requestCount?: 1;
  adServer?: 'ad-manager';
};

type CompetitiveAdHandle =
  | {
      format: AdFormat.NATIVE;
      ad: NativeAd;
      responseInfo: ResponseInfo | null;
      destroy(): void;
    }
  | {
      format: AdFormat.BANNER;
      size: { width: number; height: number };
      responseInfo: ResponseInfo | null;
      destroy(): void;
    };

class CompetitiveAdRequest {
  static create(adUnitId, options): CompetitiveAdRequest;
  load(): Promise<{ ads: CompetitiveAdHandle[]; errors: NativeError[] }>;
  destroy(): void;
}
```

**Stub:** `load()` rejects with `"CompetitiveAdRequest.load is not implemented"`.

**Render:** native handle → existing `<NativeAdView>` via `handle.ad`. Banner handle → new `<CompetitiveBannerAdView handle={...} />` (attach-only; does not issue a second load). `handle` is typed as `CompetitiveBannerAdHandle` (banner-only extract of `CompetitiveAdHandle`); non-banner handles are a TypeScript error.

```tsx
import {
  CompetitiveBannerAdView,
  type CompetitiveBannerAdHandle,
} from 'react-native-google-mobile-ads';

declare const bannerHandle: CompetitiveBannerAdHandle;
<CompetitiveBannerAdView handle={bannerHandle} />
```

**Stub:** empty `View` until native attach lands. No runtime format check — the prop type enforces banner handles.

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
  bannerSizes?: CompetitiveAdRequestOptions['bannerSizes'];
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

type PooledAd =
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
      // Same generics as MobileAd / GAMInterstitialAd (GAM pools use adServer: 'ad-manager')
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

interface AdPool {
  readonly poolId: string;
  readonly formats: AdFormat[];
  readonly resolved: AdPoolResolvedConfig;
  getAvailability(): Promise<{ available: boolean; observedCount?: number }>;
  peekResponseInfo(): Promise<ResponseInfo | null>;
  poll(): Promise<PooledAd | null>; // async; no put-back
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
  | { type: 'expired'; poolId: string }
  | { type: 'refreshed'; poolId: string };
```

---

## Hooks / provider (new)

```ts
function AdPoolProvider(props: { pools: AdPoolConfig[]; children: React.ReactNode }): JSX.Element;

function useAdPool(poolId: string): {
  pool: AdPool | null;
  ready: boolean;
  degraded: boolean;
  degradeReasons: AdPoolDegradeReason[];
  error: NativeError | null;
};

function usePooledAd(poolId: string): {
  available: boolean;
  poll: () => Promise<PooledAd | null>; // never during render
  ad: PooledAd | null;
};

function useCompetitiveAd(adUnitId, options): {
  load: () => Promise<void>;
  ads: CompetitiveAdHandle[];
  errors: NativeError[];
  loading: boolean;
};
```

**Rules:** never `poll()` during render; destroy polled / competitive handles on unmount; pool ownership stays with the provider or `AdPools.create`.

**Stub:** provider is a pass-through; hooks return empty / not-ready state; competitive `load` rejects.

---

## Metadata (additive)

```ts
type AdapterResponseError = {
  domain: string;
  code: number;
  message: string;
};

type AdapterResponseInfo = {
  adapterClassName: string;
  adSourceName: string | null;
  adSourceId: string | null;
  adSourceInstanceName: string | null;
  adSourceInstanceId: string | null;
  latencyMillis: number;
  adError: AdapterResponseError | null;
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
  loadedAdapterResponse: AdapterResponseInfo | null;
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
  /** @deprecated Prefer `reason`. */
  code: string;
  message: string;
  reason: AdErrorReason;
  phase: 'load' | 'show';
  responseInfo?: ResponseInfo;
};
```

Legacy `code` / `message` values stay unchanged. Fail-to-show uses `ERROR` with `phase: 'show'` (no separate show-failed event).

---

## Zero-config recipes

**Fullscreen pool (when native lands):**

```ts
await AdPools.create(AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, adUnitId));
```

**Display competitive request (when native lands):**

```ts
const request = CompetitiveAdRequest.create(
  adUnitId,
  CompetitiveAdPresets.nativeOrBanner(adUnitId, [
    BannerAdSize.MEDIUM_RECTANGLE,
  ]),
);
const { ads } = await request.load();
```

**Provider:**

```tsx
<AdPoolProvider pools={[AdPoolPresets.fullscreen(AdFormat.INTERSTITIAL, adUnitId)]}>
  {children}
</AdPoolProvider>
```

---

## Out of this surface (v1)

- Custom native formats
- `numberOfAds` / `requestCount` greater than 1
- Mediation host packages (MAX, CloudX, etc.) — use scoped GAM adapter packages separately
- Shim removal
