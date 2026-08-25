/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type { AdPoolConfig } from '../types/AdPool';
import type { FullscreenAdFormat } from '../types/FullscreenAdFormat';
import type { RequestOptions } from '../types/RequestOptions';
import { AdFormat } from '../types/AdFormat';

/**
 * Backend-aware pool config presets. Return plain AdPoolConfig objects;
 * AdPools.create validates them the same as hand-written config.
 */
export const AdPoolPresets = {
  /**
   * Fullscreen buffer sized for this backend. Safe on every backend.
   */
  fullscreen(
    format: FullscreenAdFormat,
    adUnitId: string,
    requestOptions?: RequestOptions,
  ): AdPoolConfig {
    return {
      poolId: `fullscreen-${format}-${adUnitId}`,
      formats: [format],
      adUnitId,
      requestOptions,
      bufferSize: 1,
    };
  },

  /**
   * Display pool (native + banner). Resolves to an emulated depth-1 pool
   * where no SDK preloader exists.
   */
  display(adUnitId: string, options?: Partial<AdPoolConfig>): AdPoolConfig {
    return {
      poolId: `display-${adUnitId}`,
      formats: [AdFormat.NATIVE, AdFormat.BANNER],
      adUnitId,
      bufferSize: 1,
      ...options,
    };
  },
} as const;
