import axios from "axios";
import fs from "fs";
import cheerio from "cheerio";
import path from "path";
import { compact, isString } from "lodash";

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
})();
