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
import type {
  MultiFormatAdHandle,
  MultiFormatAdRequestOptions,
  MultiFormatLoadResult,
} from '../types/MultiFormatAd';

/**
 * Lifecycle of a multi-format request.
 *
 * `loaded-partial` exists because one request can both fill and fail: a native
 * winner can arrive while the banner leg errors. Handles and errors are
 * therefore not mutually exclusive, so this is a status over two arrays rather
 * than a discriminated union that would force a false either/or.
 *
 * `no-fill` and `error` are split so a clean no-fill does not masquerade as a
 * failure with an empty `errors` array. `expired` is not an error either, the
 * same split `usePooledAd` makes.
 */
export type UseMultiFormatAdStatus =
  | 'idle'
  | 'loading'
  /** At least one handle, no errors. */
  | 'loaded'
  /** At least one handle plus at least one error. */
  | 'loaded-partial'
  /**
   * Request completed, no handles, no transport failure. Routine ad-server
   * outcome, so `errors` is empty.
   */
  | 'no-fill'
  /** No handles, and at least one leg actually failed. */
  | 'error'
  /**
   * Every held handle expired while the hook owned it, so `ads` is empty.
   * Not an error: `errors` stays empty. Call `load()` for fresh inventory.
   *
   * NOTE (superseded): ratified expiry decision points 2 and 7. The per-handle
   * mechanism survives, but it is pending renaming and rewiring to the
   * publisher's configured staleness window rather than a claimed SDK expiry.
   * See the canonical inventory expiry record published on the internal tracker
   * as `inventory-expiry-canonical.md`.
   */
  | 'expired';

/**
 * `load` and `release` keep the same identity for the life of the hook, the
 * same guarantee `usePooledAd` gives, so `useEffect(() => { void load(); },
 * [load])` loads once rather than on every render.
 */
export type UseMultiFormatAdResult = {
  status: UseMultiFormatAdStatus;
  /**
   * Handles from the last completed load.
   *
   * Hook-owned, exactly as `usePooledAd` owns its polled ad: destroyed on
   * unmount, and destroyed when a later `load()` supersedes them. Use
   * `release()` to take ownership instead.
   *
   * The hook subscribes to each held handle's `onExpired`, and when one fires it
   * destroys that handle and drops it from this array. When the array empties,
   * `status` becomes `expired`, so a component holding a handle re-renders.
   *
   * NOTE (superseded): points 2 and 7. The guarantee becomes "never a handle the
   * configured staleness window considers stale". See the canonical record.
   */
  ads: MultiFormatAdHandle[];
  /**
   * Load failures, each carrying the structured payload (`reason`, `phase`,
   * `responseInfo`) as well as being a real `Error`. Empty for `no-fill` and
   * `expired`, which are not failures.
   */
  errors: AdError[];
  /**
   * Issues the request and updates hook state. Never rejects: it resolves into
   * a `MultiFormatLoadResult` mirroring the state it just set, so the return
   * value is optional convenience for callers that want to load and render in
   * one handler, exactly like `usePooledAd().poll()`.
   *
   * This library performed the load, so the observed time starts at hand-off and
   * aging is only possible afterwards, while the hook holds the handles. A later
   * `load()` destroys the handles from the previous one.
   *
   * NOTE (superseded): the justification changes; it must not cite the withdrawn
   * `AdPool.poll` hand-off guarantee (point 5). See the canonical record.
   */
  load: () => Promise<MultiFormatLoadResult>;
  /**
   * Hands ownership of the current handles to the caller and clears hook
   * state, so unmount cleanup will not destroy handles someone else now owns.
   * Returns an empty array when nothing is held. The caller then owns
   * `destroy()` and the staleness check on each handle.
   *
   * Ordering is guaranteed: calling `release()` immediately after `await
   * load()` returns the handles that load just produced, without waiting for a
   * render, so the implementation tracks them in a ref alongside state.
   */
  release: () => MultiFormatAdHandle[];
};

/**
 * Multi-format request as a hook. One request, several eligible formats,
 * one winner per format leg (`requestCount` 1 in v1).
 *
 * Stub: load resolves `{ status: 'no-fill', ads: [], errors: [] }`.
 */
export function useMultiFormatAd(
  adUnitId: string,
  options: MultiFormatAdRequestOptions,
): UseMultiFormatAdResult {
  void adUnitId;
  void options;
  return {
    status: 'idle',
    ads: [],
    errors: [],
    load: () => Promise.resolve({ status: 'no-fill', ads: [], errors: [] }),
    release: () => [],
  };
}
