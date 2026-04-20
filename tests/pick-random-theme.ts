import { DateTime } from "luxon";
import { pickTheme } from "../server/themePicker.js";

(async () => {
  for (let index = 0; index < 1_000; index++) {
    const picked = await pickTheme(new Date(), true, true);
    console.log(
      picked.name,
      picked.createdAt
        ? Math.trunc(
            DateTime.local()
              .diff(DateTime.fromJSDate(picked.createdAt), "days")
              .as("days")
          )
        : undefined
    );
  }
})();
