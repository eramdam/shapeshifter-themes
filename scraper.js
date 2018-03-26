/* eslint no-await-in-loop: 0 */
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// http://macgui.com/downloads/?mode=category&cat_id=10
// https://web.archive.org/web/20110126155426/https://interfacelift.com/themes-mac/

const sleep = n => new Promise(resolve => setTimeout(resolve, n));

const fetchInterfaceLiftPage = n =>
  fetch(`https://web.archive.org/web/20101203061123/http://interfacelift.com:80/themes-mac/index.php?sort=date&id=&page=${n}`)
    .then(res => res.text())
    .then((body) => {
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

async function run() {
  for (let index = 1; index < 18; index += 1) {
    await sleep(1000);
    const data = await fetchInterfaceLiftPage(index);
    console.log(index);
    console.log(data);
  }
}

run();
