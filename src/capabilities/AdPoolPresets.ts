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
import { AdFormat } from '../types/AdFormat';

/**
 * Backend-aware pool config presets. Return plain AdPoolConfig objects;
 * AdPools.create validates them the same as hand-written config.
 */
export const AdPoolPresets = {
  /**
   * Fullscreen buffer sized for this backend. Safe on every backend.
   *
   * NOTE (superseded): ratified expiry decision point 9. `FullscreenAdFormat`
   * includes rewarded interstitial, which Android classic's preload registry
   * rejects while iOS accepts it, so this preset is pending a capability gate
   * and a hard error at pool creation on Android. Point 10 also applies to the
   * app-wide cap this preset's depth competes for: the effective cap is
   * server-delivered and is reported as `null`. See the canonical inventory
   * expiry record published on the internal tracker as
   * `inventory-expiry-canonical.md`.
   *
   * Takes the same `Partial<AdPoolConfig>` override bag as `display`, because
   * fullscreen is the one family where `bufferSize` above 1 is meaningful:
   * `AdPoolPresets.fullscreen(format, unit, { bufferSize: 2 })` is the intended
   * way to ask for the depth Google recommends per preload ID. Pass request
   * options as `{ requestOptions }`.
   */
  fullscreen(
    format: FullscreenAdFormat,
    adUnitId: string,
    options?: Partial<AdPoolConfig>,
  ): AdPoolConfig {
    return {
      poolId: `fullscreen-${format}-${adUnitId}`,
      formats: [format],
      adUnitId,
      bufferSize: 1,
      ...options,
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
