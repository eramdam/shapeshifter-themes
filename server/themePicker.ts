import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import _ from "lodash";
import objectHash from "object-hash";
import kaleidoscopeThemes from "../data/kaleidoscope.json" with { type: "json" };
import shapeshifterThemes from "../data/merged.json" with { type: "json" };

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

const TOTAL_HOURS = 24;

// Grab all themes.
const themes = [...kaleidoscopeThemes, ...shapeshifterThemes];
// Calculate percentage (rounded to biggest integer) of Kaleidoscope themes out of the whole set
const kaleidoscopeOf = Math.floor(
  percentageOf(
    percentage(kaleidoscopeThemes.length, themes.length),
    TOTAL_HOURS
  )
);
// All of the hours
const hours = Array.from({ length: TOTAL_HOURS }).map((_val, index) => index);

const memoizedShuffle = _.memoize(_dateString => {
  return _.shuffle(hours);
});

export async function pickTheme(hour?: number) {
  // Get current hour (0-23)
  const currentHour = hour ?? new Date().getHours();
  // Shuffle hours by memoizing using the current _day_ so distribution is constant for a given day
  const shuffledHours = memoizedShuffle(new Date().toDateString());
  // Grab index of the current hour in our shuffled array
  const hourIndex = shuffledHours.indexOf(currentHour);
  // Is the index smaller than the percentage of classic themes?
  const shouldUseClassicTheme = hourIndex < kaleidoscopeOf;

  const tweetedHashesPath = shouldUseClassicTheme
    ? "tweeted-kaleidoscope.txt"
    : "tweeted-shapeshifter.txt";
  const hashes = shouldUseClassicTheme
    ? kaleidoscopeHashes
    : shapeShifterHashes;

  // Filter our tweeted hashes to only list the themes we care about right now
  let tweetedHashes = _.uniq(
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

  return {
    ...pickedTheme,
    shouldUseClassicTheme
  };
}

function percentage(partial: number, total: number) {
  return (100 * partial) / total;
}

function percentageOf(percentage: number, total: number) {
  return (percentage / 100) * total;
}
