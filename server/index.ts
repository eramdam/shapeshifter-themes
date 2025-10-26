import "dotenv/config";
import express from "express";

import _ from "lodash";
import { postThemeToBluesky, postThemeToMastodon } from "./post.js";
import { pickTheme } from "./themePicker.js";

const app = express();

const shouldPostToTwitter = process.env.TWITTER_ENABLED === "true";
const shouldPostToMastodon = process.env.MASTO_ENABLED === "true";
const shouldPostToBsky = process.env.BSKY_ENABLED === "true";

app.get(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const theme = await pickTheme();
    await Promise.all(
      _.compact([
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
