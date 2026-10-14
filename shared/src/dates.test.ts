// Calendar-date helpers (R-2, R-30; acceptance A-01, A-29).
import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatLong,
  isWeekend,
  isoDateIn,
  todayIso,
  workdayOffset,
  workdays,
} from './dates.js';

describe('workdays', () => {
  it('A-01 ten workdays from a Wednesday skip the weekend and start today', () => {
    const days = workdays(10, '2026-10-14');
    expect(days).toHaveLength(10);
    expect(days[0]).toBe('2026-10-14');
    expect(days.some(isWeekend)).toBe(false);
    expect(days[2]).toBe('2026-10-16'); // Fri
    expect(days[3]).toBe('2026-10-19'); // Mon
  });

  it('starts on Monday when asked from a Saturday', () => {
    expect(workdays(1, '2026-10-17')[0]).toBe('2026-10-19');
    expect(workdayOffset('2026-10-17', 0)).toBe('2026-10-19');
  });
});

describe('isoDateIn (R-30)', () => {
  it('A-29 uses the office calendar date, not UTC', () => {
    const lateNight = new Date('2026-10-14T23:30:00+03:00'); // 20:30Z same day
    expect(isoDateIn(lateNight, 'Europe/Riga')).toBe('2026-10-14');
    const earlyMorning = new Date('2026-10-14T01:30:00+03:00'); // 2026-10-13T22:30Z
    expect(isoDateIn(earlyMorning, 'Europe/Riga')).toBe('2026-10-14');
    expect(isoDateIn(earlyMorning, 'UTC')).toBe('2026-10-13');
    expect(todayIso('Europe/Riga', earlyMorning)).toBe('2026-10-14');
  });
});

describe('formatting', () => {
  it('formats en-GB "Wed 14 Oct"', () => {
    expect(formatLong('2026-10-14')).toBe('Wed 14 Oct');
  });
  it('addDays crosses month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});
