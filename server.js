require('dotenv').config();
/* Setting things up. */
const fs = require('fs');
const express = require('express');

const app = express();
const Twit = require('twit');
const Masto = require('mastodon');
const { random } = require('lodash');

const themes = require('./data/merged.json');

const config = {
  twitter: {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  },
  mastodon: {
    access_token: process.env.MASTO_ACCESS_TOKEN,
    api_url: 'https://botsin.space/api/v1/',
  },
};

const T = new Twit(config.twitter);
const M = new Masto(config.mastodon);

app.use(express.static('public'));

/* You can use uptimerobot.com or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */
app.all(`/${process.env.BOT_ENDPOINT}`, (req, res) => {
  const themeToTweet = themes[random(0, themes.length - 1)];
  const imgPath = themeToTweet.thumbnails[0];
  const imgContent = fs.readFileSync(imgPath, { encoding: 'base64' });
  const status = `${themeToTweet.name} - ${themeToTweet.author}`;

  res.sendStatus(200);

  // Post on Mastodon
  M.post('media', {
    file: fs.createReadStream(imgPath),
  }).then((response) => {
    M.post('statuses', {
      status,
      media_ids: [response.data.id],
    }, (tootRes) => {
      console.log(tootRes);
    });
  });

  // Post on Twitter
  T.post('media/upload', { media_data: imgContent })
    .then(({ data }) => {
      const mediaId = data.media_id_string;
      const params = { media_id: mediaId };

      return T.post('media/metadata/create', params).then(() =>
        T.post('statuses/update', {
          status,
          media_ids: [mediaId],
        }).then((result) => {
          console.log('Tweeting success');
          console.log(result.data);
        }));
    })
    .catch((err) => {
      console.log('Error when tweeting');
      console.log(err);
    });
});

const listener = app.listen(process.env.PORT, () => {
  if (process.env.NODE_ENV === 'dev') {
    console.log(`Your bot is running on port http://localhost:${
      listener.address().port
    }/${process.env.BOT_ENDPOINT}`);
  }
});
