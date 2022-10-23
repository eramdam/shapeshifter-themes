import fs from "fs";
import fsPromises from "fs/promises";
import _, { sample, uniq } from "lodash";
import objectHash from "object-hash";
import kaleidoscopeThemes from "../data/kaleidoscope.json";
import shapeshifterThemes from "../data/merged.json";
import crypto from "crypto";

const shapeShifterHashes = fs
  .readFileSync("./data/shapeshifter-hashes.txt")
  .toString()
  .split("\n")
  .map(i => i.trim());
const kaleidoscopeHashes = fs
  .readFileSync("./data/kaleidoscope-hashes.txt")
  .toString()
  .split("\n")
  .map(i => i.trim());

const themes = [...kaleidoscopeThemes, ...shapeshifterThemes];
export async function pickTheme(shouldUseClassicTheme: boolean) {
  // Decide what themes to choose from

  const tweetedHashesPath = shouldUseClassicTheme
    ? "tweeted-kaleidoscope.txt"
    : "tweeted-shapeshifter.txt";
  const hashes = shouldUseClassicTheme
    ? kaleidoscopeHashes
    : shapeShifterHashes;

  // Filter our tweeted hashes to only list the themes we care about right now
  let tweetedHashes = uniq(
    (await fsPromises.readFile(`./data/${tweetedHashesPath}`))
      .toString()
      .split("\n")
      .map(i => i.trim())
  );

  // Get the list of remaining hashes
  let remainingHashes = hashes.filter(h => !tweetedHashes.includes(h));

  // If we tweeted everything, we reset the list
  if (remainingHashes.length === 0) {
    tweetedHashes = [];
    remainingHashes = hashes;
  }

  const pickedIndex = crypto.randomInt(0, remainingHashes.length);
  let pickedHash = remainingHashes[pickedIndex];
  const pickedTheme = themes.find(t => pickedHash === objectHash(t))!;

  tweetedHashes = [...tweetedHashes, pickedHash];

  await fsPromises.writeFile(
    `./data/${tweetedHashesPath}`,
    tweetedHashes.join("\n").trim()
  );

  return pickedTheme;
}
