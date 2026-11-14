const { computeSlots } = require('../website/js/slots');

const day = { open: '09:00', close: '12:00' };

describe('computeSlots', () => {
  test('default: grid every 30 min, service must end before closing', () => {
    const s = computeSlots({ ...day, duration: 45 });
    expect(s[0]).toBe('09:00');
    expect(s).toContain('11:00');
    expect(s).not.toContain('11:30'); // 11:30 + 45 > 12:00
  });

  test('custom interval 15 min', () => {
    const s = computeSlots({ ...day, duration: 15, interval: 15 });
    expect(s.slice(0, 4)).toEqual(['09:00', '09:15', '09:30', '09:45']);
    expect(s[s.length - 1]).toBe('11:45');
  });

  test('offers the time right after a booking even off-grid', () => {
    const s = computeSlots({ ...day, duration: 45, busy: [{ start: '09:00', duration: 45 }] });
    expect(s).toContain('09:45');
    expect(s).not.toContain('09:30');
  });

  test('offers the start that ends exactly when the next booking starts', () => {
    const s = computeSlots({ ...day, duration: 15, busy: [{ start: '10:00', duration: 45 }] });
    expect(s).toContain('09:45');
  });

  test('never overlaps a booking or a block', () => {
    const busy = [{ start: '09:45', duration: 45 }, { start: '11:00', duration: 30 }];
    const s = computeSlots({ ...day, duration: 30, interval: 15, busy });
    expect(s).not.toContain('09:30');
    expect(s).not.toContain('10:15');
    expect(s).not.toContain('10:45');
    expect(s).toContain('10:30');
  });

  test('minGap: no 15-min hole after a 45-min cut (Da Cutzz case)', () => {
    const busy = [{ start: '09:00', duration: 45 }];
    const s = computeSlots({ open: '09:00', close: '19:00', duration: 45, interval: 15, minGap: 30, busy });
    expect(s).toContain('09:45');       // enchaîne
    expect(s).not.toContain('10:00');   // laisserait 15 min perdues
    expect(s).toContain('10:15');       // 30 min libres = comblables
  });

  test('minGap: a 15-min beard can still chain right after a cut', () => {
    const busy = [{ start: '09:00', duration: 45 }, { start: '10:00', duration: 45 }];
    const s = computeSlots({ open: '09:00', close: '19:00', duration: 15, interval: 15, minGap: 30, busy });
    expect(s).toContain('09:45');
  });

  test('minGap: empty day starts at opening, not 15 min after', () => {
    const s = computeSlots({ open: '09:00', close: '19:00', duration: 45, interval: 15, minGap: 30 });
    expect(s[0]).toBe('09:00');
    expect(s).not.toContain('09:15');
  });

  test('minGap: unavoidable small hole still leaves one bookable slot', () => {
    // 09:00-10:00 libre, coupe 45 min : 15 min perdues quoi qu'il arrive
    const busy = [{ start: '10:00', duration: 120 }];
    const s = computeSlots({ open: '09:00', close: '12:00', duration: 45, interval: 15, minGap: 30, busy });
    expect(s).toEqual(['09:00']);
  });

  test('today: past times are hidden and do not count as a hole', () => {
    const s = computeSlots({ open: '09:00', close: '19:00', duration: 45, interval: 15, minGap: 30, nowMin: 10 * 60 + 7 });
    expect(s[0]).toBe('10:15');
  });
});
