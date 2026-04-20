import { memoize, random, shuffle, sortBy } from "es-toolkit";
import fsPromises from "fs/promises";
import { DateTime } from "luxon";
import path from "path";
import shapeshifterThemes from "../data/merged.json" with { type: "json" };
import { Theme } from "./types.js";

const TOTAL_HOURS = 24;
const listFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction"
});
const BASE_WEBSITE_URL = "https://macthemes.garden";

// All of the hours
const hours = Array.from({ length: TOTAL_HOURS }).map((_val, index) => index);

const memoizedShuffle = memoize(_dateString => {
  return shuffle(hours);
});

const fetchRemoteThemes = memoize(async (key: string) => {
  const remoteThemes = await fetch(new URL("/bot.json", BASE_WEBSITE_URL));
  const remoteThemesJson = await remoteThemes.json();

  const formattedRemoteThemes = remoteThemesJson.map((t: any) => {
    const createdAt = new Date(t.createdAt);
    return {
      thumbnails: (t.thumbnails as string[]).map(t => {
        return new URL(t, BASE_WEBSITE_URL).toString();
      }),
      name: t.name,
      author: listFormatter.format(t.authors.map((a: any) => a.name)),
      createdAt: createdAt,
      extra: {
        key: t.urlBase,
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
    } satisfies Theme;
  }) as Theme[];

  return sortBy(formattedRemoteThemes, [theme => theme.createdAt]);
});

export async function pickTheme(
  currentDate: Date,
  forceClassic = false,
  noOutput = false
) {
  const formattedRemoteThemes = await fetchRemoteThemes(
    currentDate.toDateString()
  );
  let alreadyPostedKeys: string[] = [];

  try {
    alreadyPostedKeys = JSON.parse(
      await fsPromises.readFile("./data/posted-keys.json", "utf-8")
    ) as string[];
  } catch (e) {}

  const specialDayThemes = formattedRemoteThemes.filter(t =>
    specialFiltering(t, currentDate)
  );

  const remainingKaleidoscope = formattedRemoteThemes.filter(t => {
    if (t.extra?.key) {
      return !alreadyPostedKeys.includes(t.extra.key);
    }
    return true;
  });

  const nonSpecialDayThemes = remainingKaleidoscope.length
    ? remainingKaleidoscope
    : formattedRemoteThemes;

  const kaleidoscopeThemes = [
    ...(specialDayThemes.length ? specialDayThemes : nonSpecialDayThemes)
  ];

  const allThemes = [...formattedRemoteThemes, ...shapeshifterThemes];

  // Calculate percentage (rounded to biggest integer) of Kaleidoscope themes out of the whole set
  const kaleidoscopeOf = Math.floor(
    percentageOf(
      percentage(formattedRemoteThemes.length, allThemes.length),
      TOTAL_HOURS
    )
  );

  // Get current hour (0-23)
  const currentHour = currentDate.getUTCHours();
  // Shuffle hours by memoizing using the current _day_ so distribution is constant for a given day
  const shuffledHours = memoizedShuffle(currentDate.toDateString());
  // Grab index of the current hour in our shuffled array
  const hourIndex = shuffledHours.indexOf(currentHour);
  // Is the index smaller than the percentage of classic themes?
  const shouldUseClassicTheme = forceClassic
    ? true
    : hourIndex < kaleidoscopeOf;

  // Grab all themes.
  const themes: Theme[] = shouldUseClassicTheme
    ? kaleidoscopeThemes
    : shapeshifterThemes;
  console.log("themes.length", themes.length);
  const pickedTheme = weightedShuffle(themes);

  if (pickedTheme.extra?.key) {
    alreadyPostedKeys.push(pickedTheme.extra.key);
    await fsPromises.writeFile(
      "./data/posted-keys.json",
      JSON.stringify(alreadyPostedKeys),
      "utf-8"
    );
  }

  // If we're showing a classic theme, use only the first thumbnail.
  if (shouldUseClassicTheme) {
    if (pickedTheme.extra?.opengraph && pickedTheme.thumbnails.length > 1) {
      pickedTheme.thumbnails = [pickedTheme.extra?.opengraph];
    } else {
      pickedTheme.thumbnails = [pickedTheme.thumbnails[0]];
    }
  }

  if (!noOutput && pickedTheme.thumbnails.some(t => t.startsWith("http"))) {
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
const christmasKeywords = ["christmas", "holiday", "xmas", "x'mas", "winter"];

function specialFiltering(theme: Theme, date: Date) {
  const isHalloween = date.getUTCMonth() === 9 && date.getUTCDate() === 31;

  const isChristmas = date.getUTCMonth() === 11 && date.getUTCDate() === 25;

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

// Based off https://codeberg.org/aenore/truthin32bit/src/branch/master/scripts/getPostsWeighted.js#L106
function weightedShuffle(arr: Theme[]): Theme {
  const sorted = arr
    .map(t => DateTime.fromJSDate(t.createdAt || new Date(0)))
    .toSorted();
  const newestDate: DateTime = sorted.toReversed()[0];
  const recentThemes = arr
    .filter(t => {
      if (!t.createdAt) {
        return undefined;
      }

      const diff = newestDate.diff(DateTime.fromJSDate(t.createdAt)).as("days");

      return Math.trunc(diff) <= 60;
    })
    .filter(Boolean);
  const shouldPreferRecent = random(0, 10) < 5;
  // console.log("recentThemes", recentThemes.length);
  // console.log(
  //   "shouldPreferRecent",
  //   shouldPreferRecent && recentThemes.length > 0,
  //   arr.length
  // );

  if (shouldPreferRecent && recentThemes.length > 0) {
    return shuffle(recentThemes)[0];
  }

  return shuffle(arr)[0];
}
