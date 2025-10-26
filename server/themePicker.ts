import fs from "fs";
import fsPromises from "fs/promises";
import _ from "lodash";
import objectHash from "object-hash";
import path from "path";
import shapeshifterThemes from "../data/merged.json" with { type: "json" };
import { Theme } from "./types.js";

const shapeShifterHashes = fs
  .readFileSync("./data/shapeshifter-hashes.txt")
  .toString()
  .split("\n")
  .map(i => i.trim());

const TOTAL_HOURS = 24;
const listFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction"
});
const BASE_WEBSITE_URL = "https://macthemes.garden";

// All of the hours
const hours = Array.from({ length: TOTAL_HOURS }).map((_val, index) => index);

const memoizedShuffle = _.memoize(_dateString => {
  return _.shuffle(hours);
});

export async function pickTheme(hour?: number, forceClassic = false) {
  const remoteThemes = await fetch(new URL("/bot.json", BASE_WEBSITE_URL));
  const remoteThemesJson = await remoteThemes.json();
  const decompressedRemoteThemes = remoteThemesJson;

  const formattedRemoteThemes: Theme[] = decompressedRemoteThemes.map(
    (t: any) => {
      return {
        thumbnails: (t.thumbnails as string[]).map(t => {
          return new URL(t, BASE_WEBSITE_URL).toString();
        }),
        name: t.name,
        author: listFormatter.format(t.authors.map((a: any) => a.name)),
        createdAt: new Date(t.createdAt),
        extra: {
          url: new URL(`/themes/${t.urlBase}`, BASE_WEBSITE_URL).toString(),
          opengraph: new URL(
            `/themes-opengraph/${t.urlBase}.png`,
            BASE_WEBSITE_URL
          ).toString(),
          authors: t.authors.map((a: any) => {
            return {
              ...a,
              url: new URL(a.url, BASE_WEBSITE_URL).toString()
            };
          })
        }
      };
    }
  );

  const kaleidoscopeHashes = _.orderBy(
    formattedRemoteThemes,
    t => t.createdAt
  ).map(t => {
    return objectHash(t);
  });

  const specialDayThemes = formattedRemoteThemes
    .filter(specialFiltering)
    .map(t => objectHash(t));
  console.log({
    specialDayThemes: formattedRemoteThemes
      .filter(specialFiltering)
      .map(t => t.name)
  });

  // Grab all themes.
  const themes: Theme[] = [...formattedRemoteThemes, ...shapeshifterThemes];
  // Calculate percentage (rounded to biggest integer) of Kaleidoscope themes out of the whole set
  const kaleidoscopeOf = Math.floor(
    percentageOf(
      percentage(formattedRemoteThemes.length, themes.length),
      TOTAL_HOURS
    )
  );

  // Get current hour (0-23)
  const currentHour = hour ?? new Date().getHours();
  // Shuffle hours by memoizing using the current _day_ so distribution is constant for a given day
  const shuffledHours = memoizedShuffle(new Date().toDateString());
  // Grab index of the current hour in our shuffled array
  const hourIndex = shuffledHours.indexOf(currentHour);
  // Is the index smaller than the percentage of classic themes?
  const shouldUseClassicTheme = forceClassic
    ? true
    : hourIndex < kaleidoscopeOf;
  const tweetedHashesPath = shouldUseClassicTheme
    ? "tweeted-kaleidoscope.txt"
    : "tweeted-shapeshifter.txt";
  const hashes = shouldUseClassicTheme
    ? specialDayThemes.length > 0
      ? specialDayThemes
      : kaleidoscopeHashes
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

  let pickedHash = _.shuffle(remainingHashes)[0];
  const pickedTheme = themes.find(t => pickedHash === objectHash(t))!;

  tweetedHashes = [...tweetedHashes, pickedHash];

  await fsPromises.writeFile(
    `./data/${tweetedHashesPath}`,
    tweetedHashes.join("\n").trim()
  );

  // If we're showing a classic theme, use only the first thumbnail.
  if (shouldUseClassicTheme) {
    if (pickedTheme.extra?.opengraph && pickedTheme.thumbnails.length > 1) {
      pickedTheme.thumbnails = [pickedTheme.extra?.opengraph];
    } else {
      pickedTheme.thumbnails = [pickedTheme.thumbnails[0]];
    }
  }

  if (pickedTheme.thumbnails.some(t => t.startsWith("http"))) {
    pickedTheme.thumbnails = await Promise.all(
      pickedTheme.thumbnails.map(async t => {
        if (!t.startsWith("http")) {
          return t;
        }

        const response = await fetch(t);
        const buffer = await response.arrayBuffer();
        const fileName = `assets/${path.basename(t)}`;
        await fsPromises.writeFile(fileName, Buffer.from(buffer));
        return fileName;
      })
    );
  }

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

function specialFiltering(theme: Theme) {
  const date = new Date();
  const isHalloween = date.getUTCMonth() === 9 && date.getUTCDate() === 31;
  const halloweenKeywords = [
    "muertos",
    "muerte",
    "bonehead",
    "halloween",
    "hallowwen",
    "gargoyle",
    "evil",
    "skeleton",
    "spooky",
    "cockroach",
    "Diabla",
    "ween",
    "Dragon"
  ];
  const isChristmas =
    date.getUTCMonth() === 11 &&
    (date.getUTCDate() === 24 || date.getUTCDate() === 25);
  const christmasKeywords = ["christmas", "holiday"];

  if (!isHalloween && !isChristmas) {
    return false;
  }

  if (isHalloween) {
    return nameHasKeywords(theme.name, halloweenKeywords);
  }

  if (isChristmas) {
    return nameHasKeywords(theme.name, christmasKeywords);
  }

  // Shouldn't be reached
  return theme.createdAt;
}

function nameHasKeywords(name: string, keywords: string[]) {
  return keywords.some(k => name.toLowerCase().includes(k.toLowerCase()));
}
