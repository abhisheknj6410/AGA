import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateTemporalInfo, isValidISODateString } from '../domain/temporal.js';
import { validateNode } from '../domain/validation.js';
import { GraphNode } from '../domain/types.js';

describe('Temporal Validation Engine', () => {
  it('should accept valid ISO 8601 strings and interval ranges', () => {
    assert.strictEqual(isValidISODateString('2026-09-10T14:15:00Z'), true);
    assert.strictEqual(isValidISODateString('2026-09-10'), true);

    const timeCheck = validateTemporalInfo({
      start: '2026-09-10T14:15:00Z',
      end: '2026-09-10T14:30:00Z',
      precision: 'SECOND'
    });
    assert.strictEqual(timeCheck.valid, true);
  });

  it('should reject invalid timestamp formats', () => {
    assert.strictEqual(isValidISODateString('not-a-date'), false);
    assert.strictEqual(isValidISODateString('09/10/2026 14:15'), false);

    const check = validateTemporalInfo({
      start: 'invalid-iso-string',
      precision: 'SECOND'
    });
    assert.strictEqual(check.valid, false);
    assert.ok(check.error?.includes('Must be a valid ISO 8601 string'));
  });

  it('should reject inverted intervals where end timestamp < start timestamp', () => {
    const check = validateTemporalInfo({
      start: '2026-09-10T15:00:00Z',
      end: '2026-09-10T14:00:00Z', // 1 hour earlier than start
      precision: 'SECOND'
    });
    assert.strictEqual(check.valid, false);
    assert.ok(check.error?.includes('Temporal interval violation: End timestamp'));
  });

  it('should reject invalid precision enum', () => {
    const check = validateTemporalInfo({
      precision: 'MILLISECOND' as any
    });
    assert.strictEqual(check.valid, false);
    assert.ok(check.error?.includes('Invalid temporal precision'));
  });

  it('should validate temporal intervals on Event nodes', () => {
    const eventNode: Partial<GraphNode> = {
      id: 'ev-bad-time',
      caseId: 'case-100',
      category: 'EVENT',
      type: 'LOGIN',
      label: 'Login Attempt',
      time: {
        start: '2026-09-10T15:00:00Z',
        end: '2026-09-10T12:00:00Z',
        precision: 'SECOND'
      }
    };
    const res = validateNode(eventNode);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some(e => e.code === 'INVALID_TEMPORAL_INFO'));
  });
});
