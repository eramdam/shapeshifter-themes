import { pickTheme } from "../server/themePicker.js";
import { DateTime } from "luxon";

(async () => {
  let classicThemes = 0;
  for (const hour of Array.from({ length: 24 }).map((_val, index) => index)) {
    const d = DateTime.fromObject({
      month: 1,
      day: 31,
      hour: hour
    }).toJSDate();
    const { shouldUseClassicTheme } = await pickTheme(d, false, true);
    if (shouldUseClassicTheme) {
      classicThemes++;
    }
    console.log(d.getUTCHours(), shouldUseClassicTheme);
  }
  console.log("classicThemes", classicThemes);
})();
