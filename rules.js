// The deadlines table. Each row is one deadline under תקנות סדר הדין האזרחי, התשע"ט-2018.
//
// To add or change a deadline, edit a row:
//   id      a short name, used by other rows in "from"
//   from    what the days are counted from: an anchor ("claim", "last", "pretrial") or another row's id
//   days    number of days; negative = before the "from" date
//   action  the step
//   reg     the regulation number, shown in parentheses
// A row whose "from" is another row is counted from that row's date, so the rows form a chain.
(function (root) {
  const Moadim = typeof module !== "undefined" && module.exports ? require("./engine.js") : root.Moadim;

  const ANCHORS = [
    { id: "claim", label: "המצאת כתב התביעה" },
    { id: "last", label: "כתב הטענות האחרון" },
    { id: "pretrial", label: "קדם המשפט הראשון" },
  ];

  const RULES = [
    // From service of the claim to the last pleading
    { id: "defense", from: "claim", days: 60, action: "כתב הגנה", reg: "9(ב)" },
    { id: "last", from: "defense", days: 14, action: "כתב תשובה – כתב הטענות האחרון", reg: "18(א)" },

    // From the last pleading
    { id: "prelim", from: "last", days: 30, action: "דיון מקדמי", reg: "35(א)" },
    { id: "questions", from: "last", days: 30, action: "משלוח שאלון", reg: "56(א)" },
    { id: "answers", from: "questions", days: 30, action: "תשובה לשאלון", reg: "56(א)" },
    { id: "discovery", from: "last", days: 30, action: "תצהירי גילוי מסמכים", reg: "57" },
    { id: "inspect", from: "discovery", days: 30, action: "השלמת העיון", reg: "58" },
    { id: "mediator", from: "last", days: 45, action: "מינוי מגשר מהו״ת", reg: "37(ב)" },
    { id: "mehut", from: "mediator", days: 30, action: "פגישת מהו״ת", reg: "37(ד)" },
    { id: "mehutNotice", from: "mehut", days: 14, action: "הודעת המגשר", reg: "37(ו)" },
    { id: "motions", from: "last", days: 60, action: "בקשות מקדמיות", reg: "49(ב)" },

    // Backward from the first pretrial hearing
    { id: "report", from: "pretrial", days: -20, action: "דיווח על הדיון המקדמי", reg: "36" },
    { id: "motionList", from: "pretrial", days: -20, action: "רשימת בקשות", reg: "49(ג)" },
    { id: "motionListAns", from: "motionList", days: 14, action: "תשובה בכתב לרשימה", reg: "49(ה)" },
    { id: "witnessesP", from: "pretrial", days: -20, action: "רשימת עדים – תובע", reg: "62" },
    { id: "witnessesD", from: "witnessesP", days: 14, action: "רשימת עדים – נתבע", reg: "62" },
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

  const api = { ANCHORS, RULES, schedule };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
