// Court calendar data. Edit this file when a new closure or election day is announced.
// Dates are written YYYY-MM-DD. The calculator supports dates from 2021-01-01.
(function (root) {
  const CALENDAR = {
    // Summer vacation, the same every year: 21 July to 5 September
    // (תקנה 1(3) לתקנות בתי המשפט (פגרות), התשמ"ג-1983).
    // Pesach (14-21 Nisan) and Sukkot (14-22 Tishrei) vacations are computed from the Hebrew calendar.
    summer: { from: [7, 21], to: [9, 5] },

    // Special closures: days that are not counted, like a vacation.
    closures: [
      { from: "2022-05-25", to: "2022-05-30", name: "שביתה" },
      { from: "2023-10-08", to: "2023-11-30", name: "מצב חירום" },
      { from: "2025-06-15", to: "2025-06-24", name: "מצב חירום" },
      { from: "2025-09-07", to: "2025-09-08", name: "שביתה" },
      { from: "2026-03-01", to: "2026-04-08", name: "מצב חירום" },
    ],

    // Election days (יום שבתון). A last day that falls on one moves to the next working day.
    elections: ["2021-03-23", "2022-11-01", "2024-02-27", "2026-10-27"],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = CALENDAR;
  else root.CALENDAR = CALENDAR;
})(typeof globalThis !== "undefined" ? globalThis : this);
