/* eslint no-await-in-loop: 0 */
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { isString } = require('lodash');
const Interfacelift = require('./scrapers/interfacelift');

// http://macgui.com/downloads/?mode=category&cat_id=10
// https://web.archive.org/web/20110126155426/https://interfacelift.com/themes-mac/

const sleep = n => new Promise(resolve => setTimeout(resolve, n));

const fetchPage = url => fetch(url).then(res => res.text());

async function run() {
  const themesData = [];
  const { BASE_URL, extractThemesFromBody, getNextPage } = Interfacelift;
  let nextPage = BASE_URL;

  while (isString(nextPage)) {
    await sleep(200);
    const pageBody = await fetchPage(`https://web.archive.org${nextPage}`);
    themesData.push(...extractThemesFromBody(pageBody));
    nextPage = getNextPage(pageBody);
    console.log('Got themes', themesData.length);

    if (isString(nextPage)) {
      console.log('Next page', nextPage);
    } else {
      console.log('No next page, all done!');
    }
  }

  console.log(`Saving themes data: ${themesData.length} themes`);
  fs.writeFileSync('./data/interfacelift.json', JSON.stringify(themesData));

  for (const theme of themesData) {
    await sleep(200);
    const imgPath = `./assets/${theme.thumbnail.split('/').pop()}`;
    if (!fs.existsSync(imgPath)) {
      console.log(`fetching ${theme.thumbnail}`);
      await fetch(theme.thumbnail).then((res) => {
        const dest = fs.createWriteStream(imgPath);
        res.body.pipe(dest);
        return imgPath;
      });
    } else {
      console.log('already got', theme.thumbnail);
    }

    theme.thumbnail = path.resolve(__dirname, imgPath);
  }

  console.log(`Saving themes data: ${themesData.length} themes`);
  fs.writeFileSync('./data/interfacelift.json', JSON.stringify(themesData));
}

run();
