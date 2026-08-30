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

/**
 * Identity carried by every piece of inventory the library hands to a
 * consumer, for correlation and diagnostics.
 *
 * Shared by pooled ads and multi-format handles so the two read as siblings
 * and so a log line from either can be correlated the same way.
 */
export type AdIdentity = {
  /** Stable id, unique within the app for this ad's lifetime. */
  adId: string;
  /**
   * Epoch millis when the library obtained this fill.
   *
   * NOTE (superseded): ratified expiry decision point 4. Pending a rename that
   * says what this measures, nullability, and per-provenance documentation.
   * What the library can observe is its own load completion, or its own first
   * sight of an ad becoming available; neither is the SDK's cache age. See the
   * canonical inventory expiry record published on the internal tracker as
   * `inventory-expiry-canonical.md`.
   */
  loadedAt: number;
};

/**
 * Expiry surface on inventory the consumer holds.
 *
 * NOTE (superseded): this whole type is superseded by the ratified expiry
 * decision, points 1, 2 and 7, and is pending removal in favor of a staleness
 * window the publisher configures. Treat nothing below as a statement of
 * platform behavior. The single source of truth is the canonical inventory
 * expiry record published on the internal tracker as
 * `inventory-expiry-canonical.md`; where this file and that record disagree,
 * that record is correct and this file is the defect.
 *
 * Scope still matters, and this part survives: these members describe the
 * object the consumer holds. Pool `expired` events describe pool-owned
 * inventory only, and a handed-out ad has already left the pool, so those
 * events can never identify it.
 */
export type AdExpiry = {
  /**
   * Epoch millis after which this ad must not be shown.
   *
   * NOTE (superseded): point 1, pending removal. No expiry deadline is
   * readable from public API on either platform, so this member cannot be
   * populated. The former claim that `null` means the backend did not disclose
   * an expiry is withdrawn. See the canonical record.
   */
  expiresAt: number | null;
  /**
   * True once this ad must not be shown.
   *
   * NOTE (superseded): points 1, 2 and 7, pending removal. The replacement is a
   * predicate over the configured staleness window, which protects against
   * holding an ad too long and does not certify that an ad inside the window is
   * valid. See the canonical record.
   */
  isExpired(): boolean;
  /**
   * Fires if this ad expires while held. Returns an unsubscribe function.
   *
   * NOTE (superseded): points 1 and 2, pending removal. Neither platform emits
   * a per-ad expiry signal, so nothing can drive this. The replacement is a
   * subscription over the same configured staleness window. See the canonical
   * record.
   */
  onExpired(listener: () => void): () => void;
};
