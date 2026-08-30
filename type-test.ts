/* eslint-disable no-console */
import mobileAds, {
  SDK_VERSION,
  MobileAds,
  AdsConsentDebugGeography,
  AdsConsentPurposes,
  AdsConsentSpecialFeatures,
  AdsConsentStatus,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  TestIds,
  AdEventType,
  BannerAdSize,
  GAMBannerAdSize,
  GAMAdEventType,
  RewardedAdEventType,
  AdsConsent,
  AppOpenAd,
  InterstitialAd,
  RewardedAd,
  RewardedInterstitialAd,
  BannerAd,
  GAMBannerAd,
  GAMInterstitialAd,
  useAppOpenAd,
  useInterstitialAd,
  useRewardedAd,
  useRewardedInterstitialAd,
  useForeground,
  AdFormat,
  AdPools,
  AdPoolPresets,
  MultiFormatAdPresets,
  MultiFormatAdRequest,
  MultiFormatBannerAdView,
  getAdCapabilities,
  AdPoolProvider,
  useAdPool,
  usePooledAd,
  useMultiFormatAd,
  NativeError,
} from './src';

import type {
  AdapterResponseInfo,
  AdBackend,
  AdCapabilities,
  AdError,
  AdErrorPayload,
  AdExpiry,
  AdIdentity,
  AdPoolConfig,
  AdPoolEvent,
  CapabilitySupport,
  LoadedAdapterResponseInfo,
  MultiFormatAdHandle,
  MultiFormatAdRequestOptions,
  MultiFormatBannerAdHandle,
  MultiFormatBannerAdViewProps,
  MultiFormatBannerSize,
  MultiFormatLoadResult,
  PaidEvent,
  PollResult,
  PooledAd,
  ResponseInfo,
} from './src';

// static exports
console.log(SDK_VERSION);

// default export
mobileAds()
  .initialize()
  .then(statuses => statuses);
mobileAds().openAdInspector().then();
mobileAds().openDebugMenu('foo');
mobileAds().setAppMuted(false);
mobileAds().setAppVolume(0.5);
mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G }).then();
mobileAds().subscribeToNativeModuleEvent('foo');

// MobileAds
MobileAds()
  .initialize()
  .then(statuses => statuses);
MobileAds().openAdInspector().then();
MobileAds().openDebugMenu('foo');
MobileAds().setAppMuted(false);
MobileAds().setAppVolume(0.5);
MobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G }).then();
MobileAds().subscribeToNativeModuleEvent('foo');

// AdsConsentDebugGeography
console.log(AdsConsentDebugGeography.DISABLED);
console.log(AdsConsentDebugGeography.EEA);
console.log(AdsConsentDebugGeography.NOT_EEA);

// AdsConsentPurposes
console.log(AdsConsentPurposes.APPLY_MARKET_RESEARCH_TO_GENERATE_AUDIENCE_INSIGHTS);
console.log(AdsConsentPurposes.CREATE_A_PERSONALISED_ADS_PROFILE);
console.log(AdsConsentPurposes.CREATE_A_PERSONALISED_CONTENT_PROFILE);
console.log(AdsConsentPurposes.DEVELOP_AND_IMPROVE_PRODUCTS);
console.log(AdsConsentPurposes.MEASURE_AD_PERFORMANCE);
console.log(AdsConsentPurposes.MEASURE_CONTENT_PERFORMANCE);
console.log(AdsConsentPurposes.SELECT_BASIC_ADS);
console.log(AdsConsentPurposes.SELECT_PERSONALISED_ADS);
console.log(AdsConsentPurposes.SELECT_PERSONALISED_CONTENT);
console.log(AdsConsentPurposes.STORE_AND_ACCESS_INFORMATION_ON_DEVICE);

// AdsConsentSpecialFeatures
console.log(AdsConsentSpecialFeatures.ACTIVELY_SCAN_DEVICE_CHARACTERISTICS_FOR_IDENTIFICATION);
console.log(AdsConsentSpecialFeatures.USE_PRECISE_GEOLOCATION_DATA);

// AdsConsentStatus
console.log(AdsConsentStatus.UNKNOWN);
console.log(AdsConsentStatus.REQUIRED);
console.log(AdsConsentStatus.NOT_REQUIRED);
console.log(AdsConsentStatus.OBTAINED);

// AdsConsentPrivacyOptionsRequirementStatus
console.log(AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED);
console.log(AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
console.log(AdsConsentPrivacyOptionsRequirementStatus.UNKNOWN);

// MaxAdContentRating
console.log(MaxAdContentRating.G);
console.log(MaxAdContentRating.MA);
console.log(MaxAdContentRating.PG);
console.log(MaxAdContentRating.T);

// TestIds
console.log(TestIds.ADAPTIVE_BANNER);
console.log(TestIds.APP_OPEN);
console.log(TestIds.BANNER);
console.log(TestIds.GAM_APP_OPEN);
console.log(TestIds.GAM_BANNER);
console.log(TestIds.GAM_INTERSTITIAL);
console.log(TestIds.GAM_NATIVE);
console.log(TestIds.GAM_REWARDED);
console.log(TestIds.GAM_REWARDED_INTERSTITIAL);
console.log(TestIds.INTERSTITIAL);
console.log(TestIds.INTERSTITIAL_VIDEO);
console.log(TestIds.REWARDED);
console.log(TestIds.REWARDED_INTERSTITIAL);

// AdEventType
console.log(AdEventType.CLICKED);
console.log(AdEventType.CLOSED);
console.log(AdEventType.ERROR);
console.log(AdEventType.IMPRESSION);
console.log(AdEventType.LOADED);
console.log(AdEventType.OPENED);
console.log(AdEventType.PAID);

// BannerAdSize
console.log(BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER);
console.log(BannerAdSize.BANNER);
console.log(BannerAdSize.FULL_BANNER);
console.log(BannerAdSize.INLINE_ADAPTIVE_BANNER);
console.log(BannerAdSize.LARGE_BANNER);
console.log(BannerAdSize.LEADERBOARD);
console.log(BannerAdSize.MEDIUM_RECTANGLE);
console.log(BannerAdSize.WIDE_SKYSCRAPER);

// GAMBannerAdSize
console.log(GAMBannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER);
console.log(GAMBannerAdSize.BANNER);
console.log(GAMBannerAdSize.FLUID);
console.log(GAMBannerAdSize.FULL_BANNER);
console.log(GAMBannerAdSize.INLINE_ADAPTIVE_BANNER);
console.log(GAMBannerAdSize.LARGE_BANNER);
console.log(GAMBannerAdSize.LEADERBOARD);
console.log(GAMBannerAdSize.MEDIUM_RECTANGLE);
console.log(GAMBannerAdSize.WIDE_SKYSCRAPER);

// GAMAdEventType
console.log(GAMAdEventType.APP_EVENT);

// RewaredAdEventType
console.log(RewardedAdEventType.LOADED);
console.log(RewardedAdEventType.EARNED_REWARD);

// AdsConsent
AdsConsent.getConsentInfo().then(info => info.canRequestAds);
AdsConsent.getGdprApplies().then(applies => applies);
AdsConsent.getPurposeConsents().then(consents => consents);
AdsConsent.getPurposeLegitimateInterests().then(legitimateInterests => legitimateInterests);
AdsConsent.getTCModel().then(model => model.cmpId);
AdsConsent.getTCString().then(string => string);
AdsConsent.getUserChoices().then(choices => choices.selectBasicAds);
AdsConsent.loadAndShowConsentFormIfRequired().then(info => info.canRequestAds);
AdsConsent.requestInfoUpdate().then(info => info.canRequestAds);
AdsConsent.reset();
AdsConsent.showForm().then(info => info.status);
AdsConsent.showPrivacyOptionsForm().then(info => info.status);

// AppOpenAd
const appOpenAd = AppOpenAd.createForAdRequest('foo', {
  keywords: ['test'],
});

console.log(appOpenAd.adUnitId);
console.log(appOpenAd.loaded);

appOpenAd.load();
appOpenAd.show().then();

appOpenAd.addAdEventListener(AdEventType.PAID, () => {});
appOpenAd.addAdEventsListener(({ type, payload }) => {
  if (payload) {
    console.log(type);
    console.log(payload instanceof Error && payload.message);
    console.log('amount' in payload && payload.amount);
    console.log('data' in payload && payload.data);
  }
});
appOpenAd.removeAllListeners();

// InterstitialAd
const interstitial = InterstitialAd.createForAdRequest('foo', {
  keywords: ['test'],
});

console.log(interstitial.adUnitId);
console.log(interstitial.loaded);

interstitial.load();
interstitial.show().then();

interstitial.addAdEventListener(AdEventType.PAID, () => {});
interstitial.addAdEventsListener(({ type, payload }) => {
  if (payload) {
    console.log(type);
    console.log(payload instanceof Error && payload.message);
    console.log('amount' in payload && payload.amount);
    console.log('data' in payload && payload.data);
  }
});
interstitial.removeAllListeners();

// RewardedAd
const rewardedAd = RewardedAd.createForAdRequest('foo', {
  keywords: ['test'],
});

console.log(rewardedAd.adUnitId);
console.log(rewardedAd.loaded);

rewardedAd.load();
rewardedAd.show().then();

rewardedAd.addAdEventListener(AdEventType.PAID, () => {});
rewardedAd.addAdEventsListener(({ type, payload }) => {
  if (payload) {
    console.log(type);
    console.log(payload instanceof Error && payload.message);
    console.log('amount' in payload && payload.amount);
    console.log('data' in payload && payload.data);
  }
});
rewardedAd.removeAllListeners();

// RewardedInterstitialAd
const rewardedInterstitialAd = RewardedInterstitialAd.createForAdRequest('foo', {
  keywords: ['test'],
});

console.log(rewardedInterstitialAd.adUnitId);
console.log(rewardedInterstitialAd.loaded);

rewardedInterstitialAd.load();
rewardedInterstitialAd.show().then();

rewardedInterstitialAd.addAdEventListener(AdEventType.PAID, () => {});
rewardedInterstitialAd.addAdEventsListener(({ type, payload }) => {
  if (payload) {
    console.log(type);
    console.log(payload instanceof Error && payload.message);
    console.log('amount' in payload && payload.amount);
    console.log('data' in payload && payload.data);
  }
});
rewardedInterstitialAd.removeAllListeners();

// BannerAd
console.log(BannerAd);

// GAMBannerAd
console.log(GAMBannerAd);

// GAMInterstitialAd
const gmaInterstitialAd = GAMInterstitialAd.createForAdRequest('foo', {
  keywords: ['test'],
});

console.log(gmaInterstitialAd.adUnitId);
console.log(gmaInterstitialAd.loaded);

gmaInterstitialAd.load();
gmaInterstitialAd.show().then();

gmaInterstitialAd.addAdEventListener(AdEventType.PAID, () => {});
gmaInterstitialAd.addAdEventsListener(({ type, payload }) => {
  if (payload) {
    console.log(type);
    console.log(payload instanceof Error && payload.message);
    console.log('amount' in payload && payload.amount);
    console.log('data' in payload && payload.data);
  }
});
gmaInterstitialAd.removeAllListeners();

// useAppOpenAd
console.log(useAppOpenAd);

// useInterstitialAd
console.log(useInterstitialAd);

// useRewardedAd
console.log(useRewardedAd);

// useRewardedInterstitialAd
console.log(useRewardedInterstitialAd);

// useForeground
console.log(useForeground);

// v17 capability discovery + presets
const capabilities: AdCapabilities = getAdCapabilities();
const backend: AdBackend = capabilities.backend;
const support: CapabilitySupport = capabilities.fullscreenPreload;
console.log(backend, support, capabilities.sdkVersion);
console.log(AdFormat.NATIVE, AdFormat.BANNER, AdFormat.INTERSTITIAL);

const fullscreenPoolConfig: AdPoolConfig = AdPoolPresets.fullscreen(
  AdFormat.INTERSTITIAL,
  TestIds.INTERSTITIAL,
);
const displayPoolConfig = AdPoolPresets.display(TestIds.GAM_NATIVE);
console.log(fullscreenPoolConfig.poolId, displayPoolConfig.formats);

// AdPoolPresets.fullscreen takes the same Partial<AdPoolConfig> bag as display,
// so the one field that matters on a fullscreen pool is reachable.
const bufferedFullscreenConfig: AdPoolConfig = AdPoolPresets.fullscreen(
  AdFormat.INTERSTITIAL,
  TestIds.INTERSTITIAL,
  { bufferSize: 2, requestOptions: { keywords: ['test'] } },
);
console.log(bufferedFullscreenConfig.bufferSize, bufferedFullscreenConfig.requestOptions?.keywords);

const multiFormatBannerSizes: MultiFormatBannerSize[] = [
  BannerAdSize.BANNER,
  BannerAdSize.MEDIUM_RECTANGLE,
  BannerAdSize.WIDE_SKYSCRAPER,
  '300x200',
  { width: 300, height: 200 },
];
const multiFormatOptions: MultiFormatAdRequestOptions = MultiFormatAdPresets.nativeOrBanner(
  TestIds.GAM_NATIVE,
  multiFormatBannerSizes,
);
const multiFormat = MultiFormatAdRequest.create(TestIds.GAM_NATIVE, multiFormatOptions);
console.log(multiFormat.adUnitId);
multiFormat.destroy();

AdPools.getCapabilities();
AdPools.get('missing');
AdPools.destroyAll();
AdPools.create(fullscreenPoolConfig).catch(() => undefined);

console.log(AdPoolProvider);
console.log(useAdPool);
console.log(usePooledAd);
console.log(useMultiFormatAd);

// MultiFormatBannerAdView (banner-only handle prop)
declare const multiFormatBannerHandle: MultiFormatBannerAdHandle;
console.log(MultiFormatBannerAdView, multiFormatBannerHandle.format);

// NativeError public export
console.log(NativeError);

// PooledAd fullscreen listener typing (must not erase to unknown[])
declare const pooledAd: PooledAd;
if (
  pooledAd.format === AdFormat.INTERSTITIAL ||
  pooledAd.format === AdFormat.APP_OPEN ||
  pooledAd.format === AdFormat.REWARDED ||
  pooledAd.format === AdFormat.REWARDED_INTERSTITIAL
) {
  pooledAd.addAdEventListener(AdEventType.LOADED, () => undefined)();
  pooledAd.addAdEventListener(GAMAdEventType.APP_EVENT, () => undefined)();
  pooledAd.addAdEventsListener(({ type, payload }) => {
    console.log(type, payload);
  })();
  pooledAd.removeAllListeners();
}

// PooledAd identity + expiry are present on every variant
console.log(pooledAd.adId, pooledAd.loadedAt, pooledAd.expiresAt, pooledAd.isExpired());
pooledAd.onExpired(() => undefined)();

// PollResult narrows the filled case to a PooledAd
declare const pollResult: PollResult;
switch (pollResult.status) {
  case 'filled':
    console.log(pollResult.ad.adId);
    break;
  case 'empty':
  case 'timeout':
    break;
  case 'no-fill':
  case 'error':
    console.log(pollResult.error.reason, pollResult.error.phase);
    break;
}

// Pool expiry events carry ad identity
declare const poolEvent: AdPoolEvent;
if (poolEvent.type === 'expired') {
  console.log(poolEvent.poolId, poolEvent.adId, poolEvent.reason);
}
if (poolEvent.type === 'refreshed') {
  console.log(poolEvent.adId, poolEvent.replacedAdId);
}

// useAdPool status union narrows `pool` to non-null without assertions
const poolState = useAdPool('display-pool');
// `retry` lives on every arm, so it is callable without narrowing first
poolState.retry();
if (poolState.status === 'ready' || poolState.status === 'ready-degraded') {
  console.log(poolState.pool.poolId, poolState.pool.resolved.degradeReasons);
}
if (poolState.status === 'error') {
  // The error arm carries the structured payload as well as being an Error
  console.log(poolState.error.message, poolState.error.reason, poolState.error.phase);
}

// usePooledAd is state-first: status/error/ad live on the hook
const pooledState = usePooledAd('display-pool');
console.log(pooledState.status, pooledState.available, pooledState.error?.reason);
pooledState.poll().then(result => console.log(result.status));
console.log(pooledState.release());

// 'expired' is part of the usePooledAd status union and is not an error state
const expiredPooledStatus: ReturnType<typeof usePooledAd>['status'] = 'expired';
console.log(expiredPooledStatus);

// useMultiFormatAd: ownership, no-fill vs error, expired, release
const multiFormatState = useMultiFormatAd(TestIds.GAM_NATIVE, multiFormatOptions);
console.log(multiFormatState.status, multiFormatState.ads.length);
console.log(multiFormatState.errors.map(e => `${e.reason}/${e.phase}: ${e.message}`));
const releasedHandles: MultiFormatAdHandle[] = multiFormatState.release();
console.log(releasedHandles.length);
multiFormatState.load().then(result => console.log(result.status));

const multiFormatNoFillStatus: ReturnType<typeof useMultiFormatAd>['status'] = 'no-fill';
const multiFormatExpiredStatus: ReturnType<typeof useMultiFormatAd>['status'] = 'expired';
console.log(multiFormatNoFillStatus, multiFormatExpiredStatus);

// The load result narrows on status, and 'no-fill' is distinct from 'error'
declare const multiFormatLoadResult: MultiFormatLoadResult;
switch (multiFormatLoadResult.status) {
  case 'loaded':
    console.log(multiFormatLoadResult.ads[0]?.format, multiFormatLoadResult.errors.length);
    break;
  case 'loaded-partial':
    console.log(multiFormatLoadResult.ads[0]?.format);
    console.log(multiFormatLoadResult.errors.map(e => e.reason));
    break;
  case 'no-fill':
    // A clean no-fill carries no errors, so it cannot be confused with 'error'
    console.log(multiFormatLoadResult.ads.length, multiFormatLoadResult.errors.length);
    break;
  case 'error':
    console.log(multiFormatLoadResult.errors.map(e => e.phase));
    break;
}
// 'no-fill' and 'error' are separate arms: the no-fill arm cannot carry errors
type MultiFormatNoFillResult = Extract<MultiFormatLoadResult, { status: 'no-fill' }>;
type MultiFormatErrorResult = Extract<MultiFormatLoadResult, { status: 'error' }>;
const multiFormatNoFill: MultiFormatNoFillResult = { status: 'no-fill', ads: [], errors: [] };
declare const multiFormatError: MultiFormatErrorResult;
console.log(
  multiFormatNoFill.errors.length,
  multiFormatError.errors.map(e => e.reason),
);

// Multi-format handles carry the same identity + expiry surface pooled ads do
declare const multiFormatHandle: MultiFormatAdHandle;
console.log(multiFormatHandle.adId, multiFormatHandle.loadedAt, multiFormatHandle.expiresAt);
console.log(multiFormatHandle.isExpired());
multiFormatHandle.onExpired(() => undefined)();
const handleExpiry: AdExpiry = multiFormatHandle;
const handleIdentity: AdIdentity = multiFormatHandle;
const pooledExpiry: AdExpiry = pooledAd;
const pooledIdentity: AdIdentity = pooledAd;
console.log(
  handleExpiry.expiresAt,
  handleIdentity.adId,
  pooledExpiry.expiresAt,
  pooledIdentity.adId,
);

// A polled banner ad is structurally a MultiFormatBannerAdView handle
declare const pooledBannerAd: Extract<PooledAd, { format: AdFormat.BANNER }>;
const pooledBannerViewProps: MultiFormatBannerAdViewProps = { handle: pooledBannerAd };
const bannerHandleFromPool: MultiFormatBannerAdHandle = pooledBannerAd;
console.log(pooledBannerViewProps.handle.size, bannerHandleFromPool.adId);

// AdError is one type: a real Error that also carries the structured payload
declare const adError: AdError;
const adErrorAsError: Error = adError;
console.log(adError.reason, adError.phase, adError.message, adError.code);
console.log(adError.responseInfo?.responseId, adError.namespace, adError.jsStack);
console.log(adErrorAsError.name, adErrorAsError.stack);

const errorPayload: AdErrorPayload = {
  code: 'googleMobileAds/error-code-no-fill',
  message: 'no fill',
  reason: 'no-fill',
  phase: 'load',
};
const paid: PaidEvent = {
  currency: 'USD',
  precision: 3,
  value: 0.01,
  valueMicros: '10000',
};
const responseInfo: ResponseInfo = {
  responseId: null,
  adapterClassName: null,
  loadedAdapterResponse: null,
  adapterResponses: [],
  extras: {},
};
console.log(errorPayload.reason, paid.valueMicros, responseInfo.extras);

// AdapterResponseInfo: `outcome` narrows adError, shared fields always present
declare const adapterRow: AdapterResponseInfo;
console.log(adapterRow.adapterClassName, adapterRow.latencyMillis);
if (adapterRow.outcome === 'error') {
  console.log(adapterRow.adError.domain, adapterRow.adError.code);
} else {
  const noError: null = adapterRow.adError;
  console.log(noError);
}

// The loaded row cannot carry an error
const loadedRow: LoadedAdapterResponseInfo = {
  adapterClassName: 'com.google.ads.mediation.admob.AdMobAdapter',
  adSourceName: null,
  adSourceId: null,
  adSourceInstanceName: null,
  adSourceInstanceId: null,
  latencyMillis: 42,
  outcome: 'success',
  adError: null,
};
console.log(loadedRow.adError, loadedRow.latencyMillis);
