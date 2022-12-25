import { pickTheme } from "../server/themePicker.js";

(async () => {
  for (let i = 0; i < 3340; i++) {
    await pickTheme(i % 2 === 0);
  }
})();
