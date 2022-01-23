require("dotenv").config();
import express from "express";
import { random } from "lodash";
import themes from "../data/merged.json";
import { postThemeToMastodon, postThemeToTwitter } from "./post";

const app = express();

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  const theme = themes[random(0, themes.length - 1)];
  await postThemeToMastodon(theme);
  await postThemeToTwitter(theme);
  console.log(`Posted ${theme.name} - ${theme.author}`);
  res.sendStatus(200);
});

const listener = app.listen(process.env.PORT, () => {
  if (process.env.NODE_ENV === "dev") {
    console.log(
      `Your bot is running on port http://localhost:${
        // @ts-expect-error
        listener.address().port
      }/${process.env.BOT_ENDPOINT}`
    );
  }
});
