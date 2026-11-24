// Day counting for court deadlines under the civil rule: vacation days are not counted
// (תקנה 179(ב) לתקנות סדר הדין האזרחי), and a last day that falls on a Friday, Saturday,
// holiday, election day or vacation day moves on (סעיף 10 לחוק הפרשנות; תקנה 4 לתקנות הפגרות).
// Counting backward, such a last day moves earlier.
//
// A date is an "ordinal": a whole number of days, counted from 1.1.0001 as day 1.
(function (root) {
  const CALENDAR = typeof module !== "undefined" && module.exports ? require("./calendar.js") : root.CALENDAR;

  const EPOCH = 719163; // ordinal of 1970-01-01
  const MIN = toOrdinal(2021, 1, 1);

  function toOrdinal(y, m, d) {
    return Date.UTC(y, m - 1, d) / 86400000 + EPOCH;
  }
  function fromIso(s) {
    const [y, m, d] = s.split("-").map(Number);
    return toOrdinal(y, m, d);
  }
  function toDate(o) {
    return new Date((o - EPOCH) * 86400000); // read with getUTC*()
  }
  function toIso(o) {
    return toDate(o).toISOString().slice(0, 10);
  }
  function weekday(o) {
    return toDate(o).getUTCDay(); // 0 = Sunday ... 5 = Friday, 6 = Saturday
  }

  // ---- Hebrew calendar (months numbered 1 = Nisan ... 7 = Tishrei ... 13 = Adar II) ----
  const div = (a, b) => Math.floor(a / b);

  function hebLeap(y) {
    return (1 + y * 7) % 19 < 7;
  }
  function hebElapsed(y) {
    const months = 235 * div(y - 1, 19) + 12 * ((y - 1) % 19) + div(((y - 1) % 19) * 7 + 1, 19);
    const partsElapsed = 204 + 793 * (months % 1080);
    const hours = 5 + 12 * months + 793 * div(months, 1080) + div(partsElapsed, 1080);
    const parts = (partsElapsed % 1080) + 1080 * (hours % 24);
    const day = 1 + 29 * months + div(hours, 24);
    const late = parts >= 19440 || (day % 7 === 2 && parts >= 9924 && !hebLeap(y)) ||
      (day % 7 === 1 && parts >= 16789 && hebLeap(y - 1));
    const alt = day + (late ? 1 : 0);
    return alt + ([0, 3, 5].includes(alt % 7) ? 1 : 0);
  }
  function hebMonthDays(m, y) {
    const yearDays = hebElapsed(y + 1) - hebElapsed(y);
    const short = [2, 4, 6, 10, 13].includes(m) || (m === 12 && !hebLeap(y)) ||
      (m === 8 && yearDays % 10 !== 5) || (m === 9 && yearDays % 10 === 3);
    return short ? 29 : 30;
  }
  function hebToOrdinal(day, month, year) {
    let total = day;
    const last = hebLeap(year) ? 13 : 12;
    if (month < 7) {
      for (let m = 7; m <= last; m++) total += hebMonthDays(m, year);
      for (let m = 1; m < month; m++) total += hebMonthDays(m, year);
    } else {
      for (let m = 7; m < month; m++) total += hebMonthDays(m, year);
    }
    return hebElapsed(year) - 1373429 + total;
  }
  function hebrew(o) {
    const g = toDate(o);
    let year = 3760 + g.getUTCFullYear();
    while (o >= hebToOrdinal(1, 7, year + 1)) year++;
    let month = [9, 10, 11, 12, 1, 2, 3, 4, 7, 7, 7, 8][g.getUTCMonth()];
    while (o > hebToOrdinal(hebMonthDays(month, year), month, year)) month = (month % (hebLeap(year) ? 13 : 12)) + 1;
    return { day: o - hebToOrdinal(1, month, year) + 1, month, year };
  }

  // ---- Days that are not counted, or that cannot be a last day ----
  const HOLIDAYS = { "7-1": "ראש השנה", "7-2": "ראש השנה", "7-10": "יום הכיפורים", "7-15": "סוכות",
    "7-22": "שמיני עצרת", "1-15": "פסח", "1-21": "שביעי של פסח", "3-6": "שבועות" };
  const closures = CALENDAR.closures.map((c) => ({ from: fromIso(c.from), to: fromIso(c.to), name: c.name }));
  const elections = new Set(CALENDAR.elections.map(fromIso));

  // Name of the holiday on this day, or null. Yom HaAtzmaut moves off Friday, Saturday and Monday.
  function holiday(o) {
    const h = hebrew(o);
    const name = HOLIDAYS[h.month + "-" + h.day];
    if (name) return name;
    if (h.month !== 2) return null;
    const pesach = weekday(hebToOrdinal(15, 1, h.year));
    const day = pesach === 0 ? 3 : pesach === 6 ? 4 : pesach === 2 ? 6 : 5;
    return h.day === day ? "יום העצמאות" : null;
  }

  // Name of the vacation or closure this day is in, or null.
  function vacation(o) {
    for (const c of closures) if (c.from <= o && o <= c.to) return c.name;
    const y = toDate(o).getUTCFullYear();
    const s = CALENDAR.summer;
    if (toOrdinal(y, s.from[0], s.from[1]) <= o && o <= toOrdinal(y, s.to[0], s.to[1])) return "פגרת הקיץ";
    const h = hebrew(o);
    if (h.month === 1 && h.day >= 14 && h.day <= 21) return "פגרת הפסח";
    if (h.month === 7 && h.day >= 14 && h.day <= 22) return "פגרת סוכות";
    return null;
  }

  // Why this day cannot be a last day, or null if it can.
  function blocked(o) {
    const w = weekday(o);
    if (w === 5) return "יום שישי";
    if (w === 6) return "שבת";
    return holiday(o) || (elections.has(o) ? "יום בחירות" : null) || vacation(o);
  }

  // Count `days` days from `start` (negative = backward).
  // Returns the last day, the vacation days that were not counted (name -> number of days),
  // and, if the day the count ended on could not be a last day, that day and the reasons it moved.
  function count(start, days) {
    if (start < MIN) throw new Error("המחשבון תומך בתאריכים מ-1.1.2021 ואילך.");
    const step = days < 0 ? -1 : 1;
    const skipped = {};
    let n = start;
    for (let i = 0; i < Math.abs(days); i++) {
      n += step;
      for (let v = vacation(n); v; v = vacation(n)) {
        skipped[v] = (skipped[v] || 0) + 1;
        n += step;
      }
    }
    const landed = n;
    const reasons = [];
    for (let b = blocked(n); b; b = blocked(n)) {
      if (!reasons.includes(b)) reasons.push(b);
      n += step;
    }
    return { date: n, skipped, movedFrom: n === landed ? null : landed, reasons };
  }

  const api = { toOrdinal, fromIso, toIso, toDate, weekday, hebrew, holiday, vacation, blocked, count, MIN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Moadim = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
