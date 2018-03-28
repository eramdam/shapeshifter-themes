const cheerio = require('cheerio');

exports.extractThemesFromBody = (htmlBody) => {
  const $ = cheerio.load(htmlBody);

  return $('.list_preview')
    .map((i, el) => {
      const $preview = $(el);

      return {
        thumbnails: [$preview.find('img').attr('src')],
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
};

exports.getNextPage = (htmlBody) => {
  const $ = cheerio.load(htmlBody);
  const query = $('#pagenums > div:nth-child(2) > div:nth-child(2) > a[href]');

  return query.length > 0 && query.attr('href');
};

exports.BASE_URL = '/web/20110126155426/https://interfacelift.com/themes-mac/';
