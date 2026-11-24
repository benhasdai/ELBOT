// Run from the repo root: node test/test.js
const assert = require("assert");
const M = require("../engine.js");
const { RULES, schedule } = require("../rules.js");

const iso = (s, days) => M.toIso(M.count(M.fromIso(s), days).date);

// 1. Known results.
assert.strictEqual(iso("2026-11-24", 45), "2027-01-10"); // lands on a Friday, moves to Sunday
assert.strictEqual(iso("2026-10-17", 10), "2026-10-28"); // lands on election day 27.10.2026
assert.strictEqual(iso("2027-01-30", -14), "2027-01-14"); // backward, lands on Saturday, moves to Thursday

// 2. Reference results for random counts (test/expected.json).
// The engine must agree with them, except where the reference last day is itself a day that cannot be
// a last day; there the engine must go further in the same direction.
const cases = require("./expected.json");
let further = 0;
for (const [start, days, expected] of cases) {
  const got = iso(start, days);
  if (got === expected) continue;
  const reason = M.blocked(M.fromIso(expected));
  assert.ok(reason && (days > 0 ? got > expected : got < expected),
    `${start} ${days}: expected ${expected}, got ${got}`);
  further++;
}
console.log(`${cases.length} random counts match the reference (${further} moved past a blocked day).`);

// 3. The chain: every rule gets a date, and a child is counted from its parent's date.
const { diary } = require("../rules.js");
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
const forward = RULES.filter((r) => !["report", "motionList", "motionListNotice", "motionListAns", "witnessesP", "witnessesD"].includes(r.id)).map((r) => r.id);
const fromClaim = byId(schedule("claim", M.fromIso("2026-11-24")));
assert.deepStrictEqual(Object.keys(fromClaim), forward);
assert.strictEqual(fromClaim.inspect.date, M.count(fromClaim.discovery.date, 30).date);
assert.strictEqual(fromClaim.discovery.date, M.count(fromClaim.last.date, 30).date);
assert.strictEqual(fromClaim.motionsNotice.date, M.count(fromClaim.motions.date, -7).date);

// From service of the defense: the reply 14 days on, and from it the same rows as from the last pleading.
const fromDefense = byId(schedule("defense", M.fromIso("2026-11-24")));
assert.deepStrictEqual(Object.keys(fromDefense), forward.slice(1));
assert.strictEqual(M.toIso(fromDefense.last.date), iso("2026-11-24", 14));
assert.deepStrictEqual(schedule("last", fromDefense.last.date).map((r) => r.date), Object.values(fromDefense).slice(1).map((r) => r.date));

const pretrialRows = schedule("pretrial", M.fromIso("2027-03-01"));
const fromPretrial = byId(pretrialRows);
assert.strictEqual(M.toIso(fromPretrial.report.date), iso("2027-03-01", -20));
assert.strictEqual(fromPretrial.witnessesD.date, M.count(fromPretrial.witnessesP.date, 14).date);
assert.strictEqual(fromPretrial.motionListNotice.date, M.count(fromPretrial.motionList.date, -7).date);
console.log("Chain checks passed.");

// 4. The diary entries: earliest first, joined rows share one entry, a notice stands without "מ.א".
assert.deepStrictEqual(diary(pretrialRows).map((e) => [M.toIso(e.date), e.text]), [
  ["2027-02-02", "פנייה לבעל הדין שכנגד והודעה על כוונה להגיש בקשות על פי הרשימה (תקנה 49(ד))"],
  ["2027-02-09", "מ.א לדיווח באשר לתוצאות הדיון המקדמי (תקנה 36)"],
  ["2027-02-09", "מ.א להגשת רשימת בקשות לבית המשפט (תקנה 49(ג)) ולהגשת רשימת עדים (תקנה 62)"],
  ["2027-02-23", "מ.א לתגובה לרשימת הבקשות (תקנה 49(ה)) ולהגשת רשימת עדים על ידי הנתבע (תקנה 62)"],
]);
assert.ok(diary(schedule("last", M.fromIso("2026-11-24"))).some((e) => e.text === "מ.א להשלמת העיון במסמכים (תקנה 58) ולמענה על השאלונים (תקנה 56(א))"));
console.log("Diary checks passed.");
