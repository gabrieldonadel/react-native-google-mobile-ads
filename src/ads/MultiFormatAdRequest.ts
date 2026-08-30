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

import type { AdError } from '../types/AdError';
import type { MultiFormatAdHandle, MultiFormatAdRequestOptions } from '../types/MultiFormatAd';

/**
 * One AdLoader / GADAdLoader request that may return native and/or GAM banner.
 *
 * Multi-format means several formats compete for one ad. It is not multi-count:
 * `requestCount` stays 1 in v1.
 *
 * Stub: load() rejects until native wiring lands.
 */
export class MultiFormatAdRequest {
  readonly adUnitId: string;
  readonly options: MultiFormatAdRequestOptions;

  private constructor(adUnitId: string, options: MultiFormatAdRequestOptions) {
    this.adUnitId = adUnitId;
    this.options = options;
  }

  static create(adUnitId: string, options: MultiFormatAdRequestOptions): MultiFormatAdRequest {
    return new MultiFormatAdRequest(adUnitId, options);
  }

  /**
   * Imperative load. The caller owns every returned handle: `destroy()` it, and
   * check it before rendering, since a handle can go stale between load and
   * render.
   *
   * NOTE (superseded): the check is pending replacement by a predicate over a
   * staleness window the caller configures, per ratified expiry decision points
   * 1, 2 and 7. See the canonical inventory expiry record published on the
   * internal tracker as `inventory-expiry-canonical.md`.
   *
   * Errors carry the structured `AdErrorPayload` fields as well as being real
   * `Error` objects, the same `AdError` shape the hooks expose.
   */
  load(): Promise<{ ads: MultiFormatAdHandle[]; errors: AdError[] }> {
    return Promise.reject(new Error('MultiFormatAdRequest.load is not implemented'));
  }

  destroy(): void {
    // no-op stub
  }
}
