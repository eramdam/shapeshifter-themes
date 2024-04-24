import { pickTheme } from "../server/themePicker.js";

(async () => {
  for (const hour of Array.from({ length: 24 }).map((_val, index) => index)) {
    console.log((await pickTheme(hour)).shouldUseClassicTheme);
  }
})();
