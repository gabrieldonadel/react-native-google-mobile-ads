import type { NativeAd } from '../ads/native-ad/NativeAd';
import type { AdFormat } from './AdFormat';
import type { CompetitiveBannerSize } from './CompetitiveBannerSize';
import type { RequestOptions } from './RequestOptions';
import type { ResponseInfo } from './ResponseInfo';

export type CompetitiveAdFormat = AdFormat.NATIVE | AdFormat.BANNER;

export type CompetitiveAdRequestOptions = RequestOptions & {
  formats: CompetitiveAdFormat[];
  bannerSizes?: CompetitiveBannerSize[];
  requestCount?: 1;
  adServer?: 'ad-manager';
};

export type CompetitiveAdHandle =
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
