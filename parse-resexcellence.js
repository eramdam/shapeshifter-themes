const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync('./resexcellence.md', { encoding: 'utf8' });

const parsed = fileContent.split('---\n---').map(i => i.trim());

const existingThumbnails = thumbnails =>
  thumbnails.filter(t => fs.existsSync(t.replace('file://', '')));

const themes = parsed.map((t) => {
  const [name, author, ...thumbnails] = t.split('\n').map(i => i.trim());

  return {
    name,
    author,
    thumbnails: existingThumbnails(thumbnails),
  };
});

const themesMeta = {
  one_tb: 0,
  two_tb: 0,
};

const authors = {};

themes.forEach((t) => {
  if (t.thumbnails.length === 1) {
    themesMeta.one_tb += 1;
    return;
  }

  themesMeta.two_tb += 1;

  if (!authors[t.author]) {
    authors[t.author] = 1;
  } else {
    authors[t.author] += 1;
  }
});

fs.writeFileSync('./data/resexcellence.json', JSON.stringify(themes, null, 2));

console.log(`${themes.length} themes`);
console.log(themesMeta);
console.log(`Authors: ${Object.keys(authors).length}`);

const newthemes = themes.map(theme => ({
  ...theme,
  thumbnails: theme.thumbnails.map((t) => {
    const filepath = t.replace('file://', '');
    const newPath = `./assets/${path.basename(filepath)}`;

    fs.createReadStream(filepath).pipe(fs.createWriteStream(newPath));

    return newPath;
  }),
}));

fs.writeFileSync(
  './data/resexcellence.json',
  JSON.stringify(newthemes, null, 2),
);
