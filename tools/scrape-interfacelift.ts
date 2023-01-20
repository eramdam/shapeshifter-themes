import axios from "axios";
import cheerio from "cheerio";
import fs from "node:fs";
import fetch from "node-fetch";
import path from "node:path";
import { compact, isString } from "lodash-es";
import * as url from "url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const sleep = (n: number) => new Promise(resolve => setTimeout(resolve, n));
const fetchPage = (url: string) => axios.get(url).then(res => res.data);
const BASE_URL = "/web/20110126155426/https://interfacelift.com/themes-mac/";

(async () => {
  const themesData = [];
  const getNextPage = (htmlBody: string) => {
    const $ = cheerio.load(htmlBody);
    const query = $(
      "#pagenums > div:nth-child(2) > div:nth-child(2) > a[href]"
    );

    return (query.length > 0 && query.attr("href")) || "";
  };
  const extractThemesFromBody = (htmlBody: string) => {
    const $ = cheerio.load(htmlBody);

    return $(".list_preview")
      .map((_i, el) => {
        const $preview = $(el);

        return {
          thumbnails: compact([$preview.find("img").attr("src")]),
          name: $preview.next(".list_text").find("h1").text(),
          author: $preview
            .next(".list_text")
            .find("h4")
            .text()
            .replace("by ", ""),
          downloadLink: `https://web.archive.org${
            $preview.find("a[id]").attr("href") || ""
          }`
        };
      })
      .get();
  };

  let nextPage = BASE_URL;

  while (isString(nextPage) && String(nextPage).length > 0) {
    // await sleep(200);
    const pageBody = await fetchPage(`https://web.archive.org${nextPage}`);
    themesData.push(...extractThemesFromBody(pageBody));

    await sleep(500);
    nextPage = getNextPage(pageBody);
    console.log("Got themes", themesData.length);

    if (isString(nextPage) && String(nextPage).length > 0) {
      console.log("Next page", { nextPage });
    } else {
      console.log("No next page, all done!");
    }
  }

  console.log(`Saving themes data: ${themesData.length} themes`);
  fs.writeFileSync("./data/interfacelift.json", JSON.stringify(themesData));

  for (const theme of themesData) {
    await sleep(200);
    const imgPath = `./assets/${theme.thumbnails[0].split("/").pop()}`;
    if (!fs.existsSync(imgPath)) {
      console.log(`fetching ${theme.thumbnails[0]}`);
      await fetch(theme.thumbnails[0]).then(res => {
        const dest = fs.createWriteStream(imgPath);
        res.body?.pipe(dest);
        return imgPath;
      });
    } else {
      console.log("already got", theme.thumbnails);
    }
  }

  console.log(`Saving themes data: ${themesData.length} themes`);
  fs.writeFileSync("./data/interfacelift.json", JSON.stringify(themesData));
})();
