import crypto from "crypto";
import fsPromises from "fs/promises";
import _ from "lodash";
import objectHash from "object-hash";
import path from "path";
import shapeshifterThemes from "../data/merged.json" with { type: "json" };
import { Theme } from "./types.js";

const TOTAL_HOURS = 24;

const BASE_WEBSITE_URL = "https://bejewelled-hotteok-46f90d.netlify.app";
const remoteThemes = await fetch(new URL("/bot.json", BASE_WEBSITE_URL));
const remoteThemesJson = await remoteThemes.json();
const decompressedRemoteThemes = remoteThemesJson;
const listFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction"
});
const formattedRemoteThemes: Theme[] = decompressedRemoteThemes.map(
  (t: any) => {
    return {
      thumbnails: (t.thumbnails as string[]).map(t => {
        return new URL(t, BASE_WEBSITE_URL).toString();
      }),
      name: t.name,
      author: listFormatter.format(t.authors.map((a: any) => a.name)),
      extra: {
        url: new URL(`/themes/${t.urlBase}`, BASE_WEBSITE_URL).toString(),
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

// Grab all themes.
const themes: Theme[] = [...formattedRemoteThemes, ...shapeshifterThemes];
// Calculate percentage (rounded to biggest integer) of Kaleidoscope themes out of the whole set
const kaleidoscopeOf = Math.floor(
  percentageOf(
    percentage(formattedRemoteThemes.length, themes.length),
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
  const collection = shouldUseClassicTheme
    ? formattedRemoteThemes
    : shapeshifterThemes;
  const index = crypto.randomInt(0, collection.length - 1);
  const pickedTheme = collection[index];

  if (shouldUseClassicTheme) {
    pickedTheme.thumbnails = [pickedTheme.thumbnails[0]];
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

export function findThemeForHash(hash: string) {
  return themes.find(t => {
    return objectHash(t) === hash;
  });
}
