import type { NativeError } from '../internal/NativeError';
import type { ResponseInfo } from './ResponseInfo';

export type KnownAdErrorReason =
  | 'no-fill'
  | 'mediation-no-fill'
  | 'network-error'
  | 'timeout'
  | 'invalid-request'
  | 'invalid-argument'
  | 'invalid-ad-string'
  | 'app-id-missing'
  | 'internal-error'
  | 'server-error'
  | 'mediation-adapter-error'
  | 'mediation-data-error'
  | 'mediation-invalid-ad-size'
  | 'ad-already-used'
  | 'request-id-mismatch'
  | 'unknown';

/**
 * OPEN union. Known members are stable; anything else is a passthrough for
 * error codes added after release.
 */
export type AdErrorReason = KnownAdErrorReason | (string & {});

export type AdErrorPayload = {
  /** @deprecated Use `reason`. Removed in v18 with the shims. */
  code: string;
  message: string;
  reason: AdErrorReason;
  phase: 'load' | 'show';
  responseInfo?: ResponseInfo;
};

/**
 * The single error type every v17 hook and multi-format load result uses.
 *
 * It is a real `Error` (it can be thrown, and it has a `stack`) that also carries the
 * structured payload, so `reason` / `phase` / `responseInfo` branching works on
 * a hook error exactly as documented, rather than reading `undefined`.
 *
 * This mirrors the classic event path, where the payload of an `AdEventType`
 * `ERROR` event is `Error & AdErrorPayload`. One shape, both delivery styles.
 *
 * `NativeError` itself is deliberately not widened: it is shared with legacy
 * code paths that have no structured payload to supply.
 */
export type AdError = NativeError & AdErrorPayload;
