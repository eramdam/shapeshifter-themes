import "dotenv/config";
import express from "express";

import { postThemeToCohost, postThemeToMastodon } from "./post.js";
import { pickTheme } from "./themePicker.js";

const app = express();

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const currentHourIsEven = new Date().getHours() % 2 === 0;
    const theme = await pickTheme(currentHourIsEven);
    await Promise.all([postThemeToMastodon(theme), postThemeToCohost(theme)]);
    console.log(`Posted ${theme.name} - ${theme.author}`);
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log(
    `Your bot is running on port http://localhost:${
      // @ts-expect-error
      listener.address().port
    }/${process.env.BOT_ENDPOINT}`
  );
});
