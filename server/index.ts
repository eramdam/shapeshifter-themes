import "dotenv/config";
import express from "express";

import {
  postThemeToBluesky,
  postThemeToCohost,
  postThemeToMastodon,
  postThemeToTwitter
} from "./post.js";
import { pickTheme } from "./themePicker.js";

const app = express();

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const theme = await pickTheme();
    await Promise.all([
      postThemeToMastodon(theme),
      postThemeToCohost(theme),
      postThemeToBluesky(theme),
      postThemeToTwitter(theme)
    ]);
    console.log(
      `Posted ${theme.name} - ${theme.author} - isClassic: ${theme.shouldUseClassicTheme}`
    );
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.get(`/${process.env.BOT_ENDPOINT}-ping`, async (req, res) => {
  return res.sendStatus(200);
});

const listener = app.listen(process.env.PORT, () => {
  console.log(
    `Your bot is running on port http://localhost:${
      // @ts-expect-error
      listener.address().port
    }/${process.env.BOT_ENDPOINT}`
  );
});
