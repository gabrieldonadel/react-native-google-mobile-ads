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

import type { PollResult, PooledAd } from '../types/AdPool';
import type { AdError } from '../types/AdError';

/**
 * Mirrors `PollResult` for the last completed poll, plus the pre-poll `idle`
 * state and the post-hand-off `expired` state.
 *
 * `empty`, `timeout`, and `expired` are not errors: the pool is still
 * refilling, or the held ad simply reached the end of its inventory lifecycle.
 */
export type UsePooledAdStatus =
  | 'idle'
  | 'polling'
  | 'filled'
  | 'empty'
  | 'timeout'
  | 'no-fill'
  | 'error'
  /**
   * The held ad expired while the hook owned it. `ad` is `null` and `error` is
   * `null`. Poll again for fresh inventory.
   *
   * NOTE (superseded): ratified expiry decision points 2 and 7. The mechanism
   * (destroy, clear, re-render) survives, but it is pending renaming and
   * rewiring to the publisher's configured staleness window rather than a
   * claimed SDK expiry. See the canonical inventory expiry record published on
   * the internal tracker as `inventory-expiry-canonical.md`.
   */
  | 'expired';

/**
 * `poll` and `release` keep the same identity for the life of the hook, so
 * listing them in a dependency array does not re-run the effect or callback
 * that depends on them.
 */
export type UsePooledAdResult = {
  status: UsePooledAdStatus;
  /**
   * Last polled ad, or `null` when nothing is held.
   *
   * Hook-owned: destroyed on unmount, when a later poll supersedes it, and
   * when it expires. Use `release()` to take ownership instead.
   *
   * The hook subscribes to the held ad's `onExpired`, and when it fires it
   * destroys the ad, clears this to `null`, and sets `status: 'expired'`.
   *
   * NOTE (superseded): points 2 and 7. The guarantee becomes "never an ad the
   * configured staleness window considers stale", which protects against the
   * hook holding an ad too long and does not certify that the ad it hands you is
   * valid. See the canonical record.
   *
   * `expired` is not an error and does not populate `error`, the same way
   * `empty` and `timeout` do not: expiry is a normal inventory lifecycle
   * event, not a failure.
   */
  ad: PooledAd | null;
  /**
   * Last poll failure, carrying the structured payload (`reason`, `phase`,
   * `responseInfo`) as well as being a real `Error`. Only populated for
   * `status: 'no-fill' | 'error'`.
   */
  error: AdError | null;
  /**
   * Whether the pool reports inventory ready to poll right now.
   *
   * Event-driven: updated from the pool's own events and after each poll
   * settles. There is no polling loop and no timer, so this is live without
   * costing a render per interval.
   *
   * NOTE (superseded): it derives from SDK availability signals that do not
   * sweep for expiry, so it is an upper bound. See the canonical record.
   *
   * `false` with `status: 'idle'` does not distinguish an absent pool from one
   * that is still warming. Pair this hook with `useAdPool(poolId)` when that
   * distinction matters; `useAdPool` reports `absent` versus `creating`.
   */
  available: boolean;
  /**
   * Triggers a poll and updates hook state. Never rejects: it resolves into
   * the same `PollResult` the state reflects, so the return value is optional
   * convenience for callers that want to poll and show in one handler.
   *
   * Concurrent calls coalesce onto the in-flight poll, so a double tap cannot
   * burn two ads. Never call during render: polling consumes inventory.
   *
   * NOTE (superseded): the hand-off freshness guarantee this used to restate is
   * withdrawn under ratified expiry decision point 5. See `AdPool.poll` and the
   * canonical record.
   */
  poll: () => Promise<PollResult>;
  /**
   * Hands ownership of the current ad to the caller and clears hook state, so
   * unmount cleanup will not destroy an ad someone else now owns. Returns
   * `null` when there is nothing held.
   *
   * Ordering is guaranteed: calling `release()` immediately after `await
   * poll()` returns the ad that poll just produced, without waiting for a
   * render. The implementation therefore tracks the current ad in a ref
   * alongside state, and `release()` reads the ref.
   */
  release: () => PooledAd | null;
};

/**
 * Poll-on-demand against a pool. Never polls during render.
 * Stub: poll always resolves `{ status: 'empty' }`.
 */
export function usePooledAd(poolId: string): UsePooledAdResult {
  void poolId;
  return {
    status: 'idle',
    ad: null,
    error: null,
    available: false,
    poll: () => Promise.resolve({ status: 'empty' }),
    release: () => null,
  };
}
