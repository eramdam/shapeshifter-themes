require("dotenv").config();
import express from "express";
import { sample } from "lodash";
import shapeshifterThemes from "../data/merged.json";
import kaleidoscopeThemes from "../data/kaleidoscope.json";
import { postThemeToMastodon, postThemeToTwitter } from "./post";
import fs from "fs/promises";
import objectHash from "object-hash";

const app = express();

async function pickTheme() {
  const hashPath = "./data/tweeted-hashs.txt";
  let tweetedHashs = (await fs.readFile(hashPath)).toString().split("\n");
  const currentHourIsEven = new Date().getHours() % 2 === 0;
  const collection = currentHourIsEven
    ? kaleidoscopeThemes
    : shapeshifterThemes;
  console.log({ currentHourIsEven });

  // If we tweeted everything, we reset the list
  if (
    tweetedHashs.length ===
    kaleidoscopeThemes.length + shapeshifterThemes.length
  ) {
    tweetedHashs = [];
  }

  let pickedTheme = sample(collection) || collection[0];
  let pickedHash = objectHash(pickedTheme);
  let tries = 0;
  console.log({ pickedTheme, pickedHash });

  while (tweetedHashs.find(h => h === pickedHash) && tries < 10) {
    tries++;
    pickedTheme = sample(collection) || collection[0];
    pickedHash = objectHash(pickedTheme);
    console.log({ pickedTheme, pickedHash });
  }

  tweetedHashs.push(pickedHash);

  await fs.writeFile(hashPath, tweetedHashs.join("\n").trim());

  return pickedTheme;
}

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const theme = await pickTheme();
    console.log({ theme });
    await Promise.all([postThemeToMastodon(theme), postThemeToTwitter(theme)]);
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
