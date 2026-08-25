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

import React from 'react';
import { View, type ViewProps } from 'react-native';

import { AdFormat } from '../types/AdFormat';
import type { CompetitiveAdHandle } from '../types/CompetitiveAd';

export type CompetitiveBannerAdHandle = Extract<CompetitiveAdHandle, { format: AdFormat.BANNER }>;

export type CompetitiveBannerAdViewProps = ViewProps & {
  /**
   * Banner handle from `CompetitiveAdRequest.load()` / `useCompetitiveAd`.
   * Attach-only: must not issue a second ad request.
   * Typed as banner-only — non-banner handles are a compile-time error.
   */
  handle: CompetitiveBannerAdHandle;
};

/**
 * Renders a competitive-request banner handle.
 *
 * Attach-only — the handle already owns the loaded inventory. Pass the handle
 * once; double-attach is rejected by the hooks that own destruction.
 *
 * Stub: empty View until native attach lands. `handle` is retained for the
 * typed prop contract; native wiring will attach it to the view.
 */
export function CompetitiveBannerAdView({
  handle,
  ...viewProps
}: CompetitiveBannerAdViewProps): React.JSX.Element {
  void handle;
  return <View {...viewProps} />;
}
