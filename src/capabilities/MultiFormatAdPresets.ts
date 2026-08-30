import { AdFormat } from '../types/AdFormat';
import type { MultiFormatAdRequestOptions } from '../types/MultiFormatAd';
import type { MultiFormatBannerSize } from '../types/MultiFormatBannerSize';

export const MultiFormatAdPresets = {
  nativeOrBanner(
    _adUnitId: string,
    bannerSizes: MultiFormatBannerSize[],
  ): MultiFormatAdRequestOptions {
    return {
      formats: [AdFormat.NATIVE, AdFormat.BANNER],
      bannerSizes,
      requestCount: 1,
      adServer: 'ad-manager',
    };
  },
};
