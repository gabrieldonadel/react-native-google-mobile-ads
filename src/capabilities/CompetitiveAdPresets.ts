import { AdFormat } from '../types/AdFormat';
import type { CompetitiveAdRequestOptions } from '../types/CompetitiveAd';
import type { CompetitiveBannerSize } from '../types/CompetitiveBannerSize';

export const CompetitiveAdPresets = {
  nativeOrBanner(
    _adUnitId: string,
    bannerSizes: CompetitiveBannerSize[],
  ): CompetitiveAdRequestOptions {
    return {
      formats: [AdFormat.NATIVE, AdFormat.BANNER],
      bannerSizes,
      requestCount: 1,
      adServer: 'ad-manager',
    };
  },
};
