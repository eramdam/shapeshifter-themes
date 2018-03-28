require('dotenv').config();

/* Setting things up. */
const fs = require('fs');
const express = require('express');

const app = express();
const Twit = require('twit');

const config = {
  twitter: {
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
  },
};
const T = new Twit(config.twitter);

app.use(express.static('public'));

/* You can use uptimerobot.com or a similar site to hit your /BOT_ENDPOINT to wake up your app and make your Twitter bot tweet. */
app.all(`/${process.env.BOT_ENDPOINT}`, (req, res) => {
  const imgContent = fs.readFileSync('./public/meme.jpg', {
    encoding: 'base64',
  });

  T.post('media/upload', { media_data: imgContent })
    .then(({ data }) => {
      const mediaId = data.media_id_string;
      const params = { media_id: mediaId };

      return T.post('media/metadata/create', params).then(() =>
        T.post('statuses/update', {
          status: 'Testing img upload 2',
          media_ids: [mediaId],
        }).then((result) => {
          console.log(result.data);
          res.sendStatus(200);
        }));
    })
    .catch((err) => {
      res.sendStatus(500);
      console.log('Error');
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
