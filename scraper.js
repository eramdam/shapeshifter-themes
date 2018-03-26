/* eslint no-await-in-loop: 0 */
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// http://macgui.com/downloads/?mode=category&cat_id=10
// https://web.archive.org/web/20110126155426/https://interfacelift.com/themes-mac/

const sleep = n => new Promise(resolve => setTimeout(resolve, n));

const fetchInterfaceLiftPage = (n) => {
  console.log(`Fetching page #${n}`);
  return fetch(`https://web.archive.org/web/20101203061123/http://interfacelift.com:80/themes-mac/index.php?sort=date&id=&page=${n}`)
    .then(res => res.text())
    .then((body) => {
      console.log(`Got page #${n}`);
      const $ = cheerio.load(body);

      return $('.list_preview')
        .map((i, el) => {
          const $preview = $(el);

          return {
            thumbnail: $preview.find('img').attr('src'),
            name: $preview
              .next('.list_text')
              .find('h1')
              .text(),
            author: $preview
              .next('.list_text')
              .find('h4')
              .text()
              .replace('by ', ''),
          };
        })
        .get();
    });
};

async function run() {
  const themesData = [];

  for (let index = 1; index < 18; index += 1) {
    await sleep(1000);
    themesData.push(...(await fetchInterfaceLiftPage(index)));
    console.log(themesData.length, 'themes');
  }

  console.log(`Saving themes data: ${themesData.length} themes`);
  fs.writeFileSync('./data/themes.json', JSON.stringify(themesData));

  for (const theme of themesData) {
    await sleep(1000);
    console.log(`fetching ${theme.thumbnail}`);
    const finalImg = await fetch(theme.thumbnail).then((res) => {
      const imgPath = `./data/assets/${res.url.split('/').pop()}`;
      const dest = fs.createWriteStream(imgPath);
      res.body.pipe(dest);
      return imgPath;
    });
    theme.thumbnail = path.resolve(__dirname, finalImg);
  }
}

run();
