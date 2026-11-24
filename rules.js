// The deadlines table. Each row is one deadline under תקנות סדר הדין האזרחי, התשע"ט-2018.
//
// To add or change a deadline, edit a row:
//   id      a short name, used by other rows in "from"
//   from    what the days are counted from: an anchor ("claim", "defense", "last", "pretrial") or another row's id
//   days    number of days; negative = before the "from" date
//   action  the step, as the page shows it
//   reg     the regulation number, shown in parentheses
//   entry   the step as a diary entry, a noun phrase that follows "מ.א ל" (the last day for ...)
//   plain   true = the diary entry stands as written, without "מ.א ל"
//   joins   another row's id: when both fall on the same day, the two share one diary entry
// A row whose "from" is another row is counted from that row's date, so the rows form a chain.
(function (root) {
  const Moadim = typeof module !== "undefined" && module.exports ? require("./engine.js") : root.Moadim;

  const ANCHORS = [
    { id: "claim", label: "המצאת כתב התביעה" },
    { id: "defense", label: "המצאת כתב ההגנה" },
    { id: "last", label: "כתב הטענות האחרון" },
    { id: "pretrial", label: "קדם המשפט הראשון" },
  ];

  const RULES = [
    // From service of the claim to the last pleading
    { id: "defense", from: "claim", days: 60, action: "כתב הגנה", reg: "9(ב)", entry: "הגשת כתב הגנה" },
    { id: "last", from: "defense", days: 14, action: "כתב תשובה – כתב הטענות האחרון", reg: "18(א)", entry: "הגשת כתב תשובה" },

    // From the last pleading
    { id: "prelim", from: "last", days: 30, action: "דיון מקדמי", reg: "35(א)", entry: "קיום דיון מקדמי" },
    { id: "questions", from: "last", days: 30, action: "משלוח שאלון", reg: "56(א)", entry: "משלוח שאלונים" },
    { id: "answers", from: "questions", days: 30, action: "תשובה לשאלון", reg: "56(א)", entry: "מענה על השאלונים", joins: "inspect" },
    { id: "discovery", from: "last", days: 30, action: "תצהירי גילוי מסמכים", reg: "57", entry: "החלפת תצהירי גילוי מסמכים" },
    { id: "inspect", from: "discovery", days: 30, action: "השלמת העיון", reg: "58", entry: "השלמת העיון במסמכים" },
    { id: "mediator", from: "last", days: 45, action: "מינוי מגשר מהו״ת", reg: "37(ב)", entry: "מינוי מגשר מהו״ת" },
    { id: "mehut", from: "mediator", days: 30, action: "פגישת מהו״ת", reg: "37(ד)", entry: "קיום פגישת מהו״ת" },
    { id: "mehutNotice", from: "mehut", days: 14, action: "הודעת המגשר", reg: "37(ו)", entry: "הודעת המגשר" },
    { id: "motions", from: "last", days: 60, action: "בקשות מקדמיות", reg: "49(ב)", entry: "הגשת בקשות מקדמיות" },
    { id: "motionsNotice", from: "motions", days: -7, action: "פנייה לצד שכנגד", reg: "49(ד)", plain: true,
      entry: "פנייה לבעל הדין שכנגד והודעה על כוונה להגיש בקשות מקדמיות" },

    // Backward from the first pretrial hearing
    { id: "report", from: "pretrial", days: -20, action: "דיווח על הדיון המקדמי", reg: "36", entry: "דיווח באשר לתוצאות הדיון המקדמי" },
    { id: "motionList", from: "pretrial", days: -20, action: "רשימת בקשות", reg: "49(ג)", entry: "הגשת רשימת בקשות לבית המשפט" },
    { id: "motionListNotice", from: "motionList", days: -7, action: "פנייה לצד שכנגד", reg: "49(ד)", plain: true,
      entry: "פנייה לבעל הדין שכנגד והודעה על כוונה להגיש בקשות על פי הרשימה" },
    { id: "motionListAns", from: "motionList", days: 14, action: "תשובה בכתב לרשימה", reg: "49(ה)", entry: "תגובה לרשימת הבקשות" },
    { id: "witnessesP", from: "pretrial", days: -20, action: "רשימת עדים – תובע", reg: "62", entry: "הגשת רשימת עדים", joins: "motionList" },
    { id: "witnessesD", from: "witnessesP", days: 14, action: "רשימת עדים – נתבע", reg: "62", entry: "הגשת רשימת עדים על ידי הנתבע", joins: "motionListAns" },
  ];

  // The dates that follow from one anchor date.
  // Returns the rows that have a date, in table order, each with its date (the last day) and the
  // engine's count details. A row counted from another row is counted from that row's last day.
  function schedule(anchor, anchorDate) {
    const dates = { [anchor]: anchorDate };
    const rows = [];
    for (const rule of RULES) {
      if (rule.id === anchor || !(rule.from in dates)) continue;
      const counted = Moadim.count(dates[rule.from], rule.days);
      dates[rule.id] = counted.date;
      rows.push({ ...rule, ...counted });
    }
    return rows;
  }

  // The same rows as diary entries, earliest first: [{ date, text }].
  // "מ.א ל<step> (תקנה N)"; two rows that join share one entry.
  function diary(rows) {
    const one = (r) => `${r.entry} (תקנה ${r.reg})`;
    const joined = (r) => rows.find((host) => host.id === r.joins && host.date === r.date);
    return rows.filter((r) => !joined(r)).map((r) => {
      const parts = [r, ...rows.filter((other) => joined(other) === r)].map(one);
      return { date: r.date, text: (r.plain ? "" : "מ.א ל") + parts.join(" ול") };
    }).sort((a, b) => a.date - b.date);
  }

  const api = { ANCHORS, RULES, schedule, diary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
