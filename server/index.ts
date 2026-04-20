import "dotenv/config";
import express from "express";

import { postThemeToBluesky, postThemeToMastodon } from "./post.js";
import { pickTheme } from "./themePicker.js";
import { compact } from "es-toolkit";

const app = express();

const shouldPostToMastodon = process.env.MASTO_ENABLED === "true";
const shouldPostToBsky = process.env.BSKY_ENABLED === "true";

app.get(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const theme = await pickTheme(new Date());
    await Promise.all(
      compact([
        shouldPostToMastodon && postThemeToMastodon(theme),
        shouldPostToBsky && postThemeToBluesky(theme)
      ])
    );
    console.log(theme);
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
