require("dotenv").config();
import express from "express";
import { sample } from "lodash";
import shapeshifterThemes from "../data/merged.json";
import kaleidoscopeThemes from "../data/kaleidoscope.json";
import { postThemeToMastodon, postThemeToTwitter } from "./post";

const app = express();

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  const currentHourIsEven = new Date().getHours() % 2 === 0;
  const theme = currentHourIsEven
    ? sample(kaleidoscopeThemes) || kaleidoscopeThemes[0]
    : sample(shapeshifterThemes) || shapeshifterThemes[0];
  await Promise.all([postThemeToMastodon(theme), postThemeToTwitter(theme)]);
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
