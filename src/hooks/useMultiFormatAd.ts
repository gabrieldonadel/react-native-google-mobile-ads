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
 * Members present on every arm, so they are callable without narrowing.
 *
 * `load` and `release` keep the same identity for the life of the hook, the
 * same guarantee `usePooledAd` gives, so `useEffect(() => { void load(); },
 * [load])` loads once rather than on every render.
 */
type UseMultiFormatAdResultBase = {
  /**
   * Issues the request and updates hook state. Never rejects: it resolves into
   * a `MultiFormatLoadResult` mirroring the state it just set, so the return
   * value is optional convenience for callers that want to load and render in
   * one handler, exactly like `usePooledAd().poll()`.
   *
   * This library performed the load, so the observed time starts at hand-off and
   * aging is only possible afterwards, while the hook holds the handles. A later
   * `load()` destroys the handles from the previous one.
   */
  load: () => Promise<MultiFormatLoadResult>;
  /**
   * Hands ownership of the current handles to the caller and clears hook state
   * to `{ status: 'idle', ads: [], errors: [] }` (among the current result
   * arms), so unmount cleanup will not destroy handles someone else now owns.
   * Returns an empty array when nothing is held. The caller then owns
   * `destroy()` and the staleness check on each handle: the policy timer lives
   * on the handle, not on the hook.
   *
   * Call `release()` before you `destroy()` handles yourself. While this hook
   * still owns them, do not call `handle.destroy()`: that leaves the hook able
   * to report `loaded` / `loaded-partial` with dead inventory (same ownership
   * rule as the inner `NativeAd` on a native arm).
   *
   * Ordering is guaranteed: calling `release()` immediately after `await
   * load()` returns the handles that load just produced, without waiting for a
   * render, so the implementation tracks them in a ref alongside state.
   */
  release: () => MultiFormatAdHandle[];
};

/**
 * Multi-format hook state, discriminated on `status`.
 *
 * Narrowing mirrors `MultiFormatLoadResult` for terminal arms: a `loaded` arm
 * cannot carry errors, a `no-fill` arm cannot carry handles or errors, and an
 * `error` arm cannot carry handles. `loaded-partial` is the arm where both
 * arrays are populated. Hook-only arms are `idle`, `loading`, and
 * `stale-by-policy`.
 *
 * During `loading`, previously held handles and prior load errors may still be
 * present until the in-flight load settles and supersedes them.
 * `stale-by-policy` retains prior load `errors` and may still list
 * already-rendered handles.
 *
 * Status words follow the multi-format **load** vocabulary (`loading`,
 * `loaded`, `loaded-partial`), not the pool/poll vocabulary (`polling`,
 * `filled`). That is deliberate: terminal arms mirror `MultiFormatLoadResult`,
 * just as `UsePooledAdStatus` mirrors `PollResult`. Shared words
 * (`idle`, `no-fill`, `error`, `stale-by-policy`) mean the same thing on both
 * hooks; in-flight and success words do not.
 *
 * `loaded-partial` exists because one request can both fill and fail: a native
 * winner can arrive while the banner leg errors. Handles and errors are
 * therefore not mutually exclusive on that arm, so the arm carries both arrays
 * rather than inventing a false either/or.
 *
 * `no-fill` and `error` are split so a clean no-fill does not masquerade as a
 * failure with an empty `errors` array. `stale-by-policy` is not an error
 * either, the same split `usePooledAd` makes; when it fires after
 * `loaded-partial`, prior load `errors` are retained rather than discarded.
 *
 * There is no `'consumed'` arm: multi-format handles are banner/native and have
 * no `show()`. Fullscreen consumption lives on `usePooledAd` only.
 *
 * **Ownership:** while this hook holds handles, do not call `handle.destroy()`.
 * Call `release()` first if you need to own destruction, or leave destruction
 * to the hook (unmount, superseding load, or stale unrendered eviction).
 */
export type UseMultiFormatAdResult = UseMultiFormatAdResultBase &
  (
    | { status: 'idle'; ads: never[]; errors: never[] }
    | { status: 'loading'; ads: MultiFormatAdHandle[]; errors: AdError[] }
    /** At least one handle, no errors. */
    | { status: 'loaded'; ads: MultiFormatAdHandle[]; errors: never[] }
    /** At least one handle plus at least one error. */
    | { status: 'loaded-partial'; ads: MultiFormatAdHandle[]; errors: AdError[] }
    /**
     * Request completed, no handles, no transport failure. Routine ad-server
     * outcome, so `errors` is empty.
     */
    | { status: 'no-fill'; ads: never[]; errors: never[] }
    /** No handles, and at least one leg actually failed. */
    | { status: 'error'; ads: never[]; errors: AdError[] }
    /**
     * Every held handle crossed the publisher's staleness window while the hook
     * owned it, so `ads` is empty of showable inventory. Not an error. Call
     * `load()` for fresh inventory.
     *
     * Per-handle rather than all-or-nothing: one handle going stale drops only
     * that handle. Unrendered handles are destroyed; already-rendered
     * banner/native handles are left in place until release or unmount.
     * Load-time `errors` from a prior `loaded-partial` are retained.
     */
    | { status: 'stale-by-policy'; ads: MultiFormatAdHandle[]; errors: AdError[] }
  );

/**
 * Status discriminant for `useMultiFormatAd`. Derived from
 * `UseMultiFormatAdResult` so the string union cannot drift from the result
 * arms.
 */
export type UseMultiFormatAdStatus = UseMultiFormatAdResult['status'];

/**
 * Multi-format request as a hook. One request, several eligible formats,
 * one winner per format leg (`requestCount` 1 in v1).
 *
 * Ownership, release ordering, never-reject load, and `stale-by-policy`
 * semantics match `usePooledAd`. Status **vocabulary** does not: this hook
 * uses load words (`loading` / `loaded` / `loaded-partial`) because its
 * terminal arms mirror `MultiFormatLoadResult`, while `usePooledAd` uses poll
 * words (`polling` / `filled`) because its terminal arms mirror `PollResult`.
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
