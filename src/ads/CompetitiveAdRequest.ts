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

import { NativeError } from '../internal/NativeError';
import type { CompetitiveAdHandle, CompetitiveAdRequestOptions } from '../types/CompetitiveAd';

/**
 * One AdLoader / GADAdLoader request that may return native and/or GAM banner.
 * Stub: load() rejects until native wiring lands.
 */
export class CompetitiveAdRequest {
  readonly adUnitId: string;
  readonly options: CompetitiveAdRequestOptions;

  private constructor(adUnitId: string, options: CompetitiveAdRequestOptions) {
    this.adUnitId = adUnitId;
    this.options = options;
  }

  static create(adUnitId: string, options: CompetitiveAdRequestOptions): CompetitiveAdRequest {
    return new CompetitiveAdRequest(adUnitId, options);
  }

  load(): Promise<{ ads: CompetitiveAdHandle[]; errors: NativeError[] }> {
    return Promise.reject(new Error('CompetitiveAdRequest.load is not implemented'));
  }

  destroy(): void {
    // no-op stub
  }
}
