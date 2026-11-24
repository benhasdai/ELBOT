# ELLEBOT

Deadline calculator for Israeli civil procedure (תקנות סדר הדין האזרחי, התשע"ט-2018).
Enter one date, say what it is (service of the claim, the last pleading, or the first pretrial
hearing), and get every deadline that follows from it, each with its regulation number.
The results can be copied as text or downloaded as a CSV file.

## Use

Open `index.html` in a browser. No server. The fonts load from Google Fonts; offline the page
falls back to system fonts.

## Files

- `rules.js`: the deadlines table. One row per deadline; edit it to add or change a deadline.
- `calendar.js`: court vacations, special closures and election days. Update it when a new closure
  or election day is announced.
- `engine.js`: the day counting. Vacation days are not counted (תקנה 179(ב)); a last day on a Friday,
  Saturday, holiday, election day or vacation day moves on, or earlier when counting backward.
- `index.html`: the page.

## Test

```bash
node test/test.js
```

## Limits

- Dates from 1.1.2021.
- The regular civil track only. A date the court sets in the case overrides the table.
- Regional vacation extensions are not counted.
- An aid, not legal advice: count a critical deadline by hand as well.
