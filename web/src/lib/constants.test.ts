import { describe, it, expect } from 'vitest';
import {
  SPORTS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_FORMAT_SHORT_LABELS,
  TOURNAMENT_STATUS_MAP,
} from './constants';

describe('SPORTS', () => {
  it('contains the three supported sports', () => {
    expect(SPORTS).toEqual(['PADEL', 'TENNIS', 'SQUASH']);
  });

  it('has exactly 3 entries', () => {
    expect(SPORTS).toHaveLength(3);
  });
});

describe('TOURNAMENT_STATUSES', () => {
  it('contains all four statuses', () => {
    expect(TOURNAMENT_STATUSES).toEqual([
      'REGISTRATION_OPEN',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
  });
});

describe('TOURNAMENT_FORMAT_LABELS', () => {
  it('has labels for all three formats', () => {
    expect(TOURNAMENT_FORMAT_LABELS.SINGLE_ELIMINATION).toBe('Single Elimination');
    expect(TOURNAMENT_FORMAT_LABELS.DOUBLE_ELIMINATION).toBe('Double Elimination');
    expect(TOURNAMENT_FORMAT_LABELS.ROUND_ROBIN).toBe('Round Robin');
  });

  it('has exactly 3 format entries', () => {
    expect(Object.keys(TOURNAMENT_FORMAT_LABELS)).toHaveLength(3);
  });
});

describe('TOURNAMENT_FORMAT_SHORT_LABELS', () => {
  it('has short labels for all three formats', () => {
    expect(TOURNAMENT_FORMAT_SHORT_LABELS.SINGLE_ELIMINATION).toBe('Single Elim');
    expect(TOURNAMENT_FORMAT_SHORT_LABELS.DOUBLE_ELIMINATION).toBe('Double Elim');
    expect(TOURNAMENT_FORMAT_SHORT_LABELS.ROUND_ROBIN).toBe('Round Robin');
  });

  it('short labels differ from full labels for elimination formats', () => {
    expect(TOURNAMENT_FORMAT_SHORT_LABELS.SINGLE_ELIMINATION).not.toBe(
      TOURNAMENT_FORMAT_LABELS.SINGLE_ELIMINATION
    );
    expect(TOURNAMENT_FORMAT_SHORT_LABELS.DOUBLE_ELIMINATION).not.toBe(
      TOURNAMENT_FORMAT_LABELS.DOUBLE_ELIMINATION
    );
  });
});

describe('TOURNAMENT_STATUS_MAP', () => {
  const statuses = ['REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  it('has entries for all statuses', () => {
    for (const s of statuses) {
      expect(TOURNAMENT_STATUS_MAP[s]).toBeDefined();
    }
  });

  it('each entry has label, shortLabel, and color', () => {
    for (const s of statuses) {
      const entry = TOURNAMENT_STATUS_MAP[s];
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('shortLabel');
      expect(entry).toHaveProperty('color');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.shortLabel).toBe('string');
      expect(typeof entry.color).toBe('string');
    }
  });

  it('REGISTRATION_OPEN is labelled as open', () => {
    expect(TOURNAMENT_STATUS_MAP.REGISTRATION_OPEN.shortLabel).toBe('Open');
  });

  it('CANCELLED uses red color class', () => {
    expect(TOURNAMENT_STATUS_MAP.CANCELLED.color).toContain('red');
  });
});
