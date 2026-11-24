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
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
const fromClaim = byId(schedule("claim", M.fromIso("2026-11-24")));
assert.deepStrictEqual(Object.keys(fromClaim), RULES.filter((r) => r.from !== "pretrial" && !["motionListAns", "witnessesD"].includes(r.id)).map((r) => r.id));
assert.strictEqual(fromClaim.inspect.date, M.count(fromClaim.discovery.date, 30).date);
assert.strictEqual(fromClaim.discovery.date, M.count(fromClaim.last.date, 30).date);

const fromPretrial = byId(schedule("pretrial", M.fromIso("2027-03-01")));
assert.strictEqual(M.toIso(fromPretrial.report.date), iso("2027-03-01", -20));
assert.strictEqual(fromPretrial.witnessesD.date, M.count(fromPretrial.witnessesP.date, 14).date);
console.log("Chain checks passed.");
