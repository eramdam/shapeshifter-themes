import fs from "fs/promises";
import _ from "lodash";
import puppeteer, { Page } from "puppeteer";

const BASE_URL = `https://web.archive.org/web/20060925184448fw_`;
const BASE_PAGE = `https://web.archive.org/web/20060925184448fw_/http://www.kaleidoscope.net/cgi-bin/schemes.cgi`;

async function getAuthorsOnPage(url: string, page: Page) {
  console.log(url);
  await page.goto(url, { timeout: 0 });

  const authorLinks = (
    await page.$$('body a[href*="schemes.cgi?author="]')
  ).map(el => el.evaluate(node => node.href));
  const authorsOnPage = (await Promise.all(authorLinks)).map(
    a => `${BASE_URL}/${a}`
  );

  return authorsOnPage;
}

interface Theme {
  author: string;
  name: string;
  image: string;
  download: string;
}

async function getThemesOnPage(url: string, page: Page): Promise<Theme[]> {
  console.log(url);
  await page.goto(url, { timeout: 0 });

  const authorNameTableTextPromise = (
    await page.$("table + ul > p > table")
  )?.evaluate(node => node.textContent?.trim());
  const authorNameTableText = (await authorNameTableTextPromise) || "";
  const authorName = authorNameTableText.replace("Creations by ", "");

  const themeTablePromises = (await page.$$('img[src$="/download.gif"]')).map(
    el =>
      el.evaluate(node => {
        const tableElement = node.closest("table");

        const image = tableElement?.querySelector<HTMLImageElement>(
          'img[src*="screensnapz/"]'
        )?.src;
        const themeName = tableElement
          ?.querySelector<HTMLFontElement>('font[size="5"]')
          ?.textContent?.trim();
        const downloadLink = node.closest("a")?.href;

        return { image, themeName, downloadLink };
      })
  );

  return _(await Promise.all(themeTablePromises))
    .compact()
    .map(rawTheme => {
      return {
        author: authorName,
        name: rawTheme.themeName || "",
        download: `${BASE_URL}/${rawTheme.downloadLink}`,
        image: `${BASE_URL}/${rawTheme.image}`
      };
    })
    .value();
}

(async () => {
  const browser = await puppeteer.launch({
    timeout: 0
  });
  const page = await browser.newPage();
  await page.goto(BASE_PAGE, { timeout: 0 });

  const letterAnchors = (
    await page.$$(`body a[href^="schemes.cgi?archive="]`)
  ).map(el => el.evaluate(node => node.href));
  const letterLinks = (await Promise.all(letterAnchors)).map(
    a => `${BASE_URL}/${a}`
  );
  const finalThemes: Theme[] = [];

  for (const letterLink of letterLinks) {
    const authorLinks = await getAuthorsOnPage(letterLink, page);
    for (const authorLink of authorLinks) {
      const themes = await getThemesOnPage(authorLink, page);
      finalThemes.push(...themes);
      console.log(`${finalThemes.length} themes`);
    }
  }

  await browser.close();
  await fs.writeFile("kaleidoscope.json", JSON.stringify(finalThemes));
})();
