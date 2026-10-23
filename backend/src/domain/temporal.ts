import { TemporalInfo, TemporalPrecision, TEMPORAL_PRECISIONS } from './types.js';

/**
 * Validates ISO 8601 strings and temporal logic for event intervals.
 */
export function isValidISODateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Strict ISO 8601 regex or Date parse check
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) return false;
  
  // Ensure string matches ISO format variants (e.g. 2026-09-10T10:00:00Z, 2026-09-10, 2026-09-10T10:00)
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/;
  return isoRegex.test(dateStr);
}

export const DEFAULT_CLOCK_JITTER_SECONDS = 30;

export interface ClockDriftEvaluation {
  isConsistent: boolean;
  isWithinDriftTolerance: boolean;
  driftMs: number;
  message?: string;
}

/**
 * Evaluates whether tNext can causally follow tPrev given a clock jitter tolerance in seconds.
 * In live investigations, sensors (CCTV, badge readers, syslog) often have small clock skews.
 */
export function evaluateCausalTemporalOrder(
  prevTimestampIso: string,
  nextTimestampIso: string,
  jitterSeconds: number = DEFAULT_CLOCK_JITTER_SECONDS
): ClockDriftEvaluation {
  const tPrev = new Date(prevTimestampIso).getTime();
  const tNext = new Date(nextTimestampIso).getTime();
  const deltaMs = tNext - tPrev;

  if (deltaMs >= 0) {
    return {
      isConsistent: true,
      isWithinDriftTolerance: false,
      driftMs: 0
    };
  }

  const jitterMs = jitterSeconds * 1000;
  if (Math.abs(deltaMs) <= jitterMs) {
    return {
      isConsistent: true,
      isWithinDriftTolerance: true,
      driftMs: Math.abs(deltaMs),
      message: `Clock drift anomaly: Target precedes source by ${(Math.abs(deltaMs) / 1000).toFixed(1)}s (within ${jitterSeconds}s tolerance).`
    };
  }

  return {
    isConsistent: false,
    isWithinDriftTolerance: false,
    driftMs: Math.abs(deltaMs),
    message: `Temporal Inversion: Target occurs ${(Math.abs(deltaMs) / 1000).toFixed(1)}s before source (exceeds ${jitterSeconds}s jitter tolerance).`
  };
}

export function validateTemporalInfo(time?: unknown): { valid: boolean; error?: string } {
  if (time === undefined || time === null) {
    return { valid: true };
  }

  if (typeof time !== 'object') {
    return { valid: false, error: 'Temporal info must be an object.' };
  }

  const t = time as Partial<TemporalInfo>;

  if (t.precision && !TEMPORAL_PRECISIONS.includes(t.precision as TemporalPrecision)) {
    return {
      valid: false,
      error: `Invalid temporal precision '${t.precision}'. Allowed: ${TEMPORAL_PRECISIONS.join(', ')}`
    };
  }

  if (t.start !== undefined && t.start !== null) {
    if (!isValidISODateString(t.start)) {
      return { valid: false, error: `Invalid start timestamp '${t.start}'. Must be a valid ISO 8601 string.` };
    }
  }

  if (t.end !== undefined && t.end !== null) {
    if (!isValidISODateString(t.end)) {
      return { valid: false, error: `Invalid end timestamp '${t.end}'. Must be a valid ISO 8601 string.` };
    }
  }

  if (t.start && t.end) {
    const startTime = new Date(t.start).getTime();
    const endTime = new Date(t.end).getTime();
    if (endTime < startTime) {
      return {
        valid: false,
        error: `Temporal interval violation: End timestamp (${t.end}) must be greater than or equal to start timestamp (${t.start}).`
      };
    }
  }

  return { valid: true };
}
