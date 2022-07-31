require("dotenv").config();
import express from "express";
import _, { sample } from "lodash";
import shapeshifterThemes from "../data/merged.json";
import kaleidoscopeThemes from "../data/kaleidoscope.json";
import {
  postThemeToCohost,
  postThemeToMastodon,
  postThemeToTwitter
} from "./post";
import fs from "fs/promises";
import objectHash from "object-hash";

const app = express();

async function pickTheme() {
  const currentHourIsEven = new Date().getHours() % 2 === 0;
  // Decide what themes to choose from
  const themes = currentHourIsEven ? kaleidoscopeThemes : shapeshifterThemes;
  const shapeShifterHashes = (
    await fs.readFile("./data/shapeshifter-hashes.txt")
  )
    .toString()
    .split("\n");
  const kaleidoscopeHashes = (
    await fs.readFile("./data/kaleidoscope-hashes.txt")
  )
    .toString()
    .split("\n");

  // Filter our tweeted hashes to only list the themes we care about right now
  let tweetedHashes = (await fs.readFile("./data/tweeted-hashs.txt"))
    .toString()
    .split("\n");
  tweetedHashes = currentHourIsEven
    ? tweetedHashes.filter(h => kaleidoscopeHashes.includes(h))
    : tweetedHashes.filter(h => shapeShifterHashes.includes(h));

  // Get the list of remaining hashes
  let remainingHashes = _.difference(
    currentHourIsEven ? kaleidoscopeHashes : shapeShifterHashes,
    tweetedHashes
  );

  // If we tweeted everything, we reset the list
  if (remainingHashes.length === 0) {
    tweetedHashes = [];
    remainingHashes = currentHourIsEven
      ? kaleidoscopeHashes
      : shapeShifterHashes;
  }

  let pickedHash = sample(remainingHashes) || remainingHashes[0];
  const pickedTheme =
    [...kaleidoscopeThemes, ...shapeshifterThemes].find(
      t => pickedHash === objectHash(t)
    ) ||
    sample(themes) ||
    themes[0];

  tweetedHashes.push(pickedHash);

  await fs.writeFile(
    "./data/tweeted-hashs.txt",
    tweetedHashes.join("\n").trim()
  );

  return pickedTheme;
}

app.all(`/${process.env.BOT_ENDPOINT}`, async (req, res) => {
  try {
    const theme = await pickTheme();
    await Promise.all([
      postThemeToMastodon(theme),
      postThemeToTwitter(theme),
      postThemeToCohost(theme)
    ]);
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
