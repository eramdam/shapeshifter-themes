import { pickTheme } from "../server/themePicker.js";

(async () => {
  console.log(await pickTheme(0));
})();
