require('dotenv').config();

/* Setting things up. */
const express = require('express');

const app = express();
const Twit = require('twit');

const config = {
  /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/how-to-create-a-twitter-app */

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
  /* The example below tweets out "Hello world!". */
  T.post('statuses/update', { status: 'hello world 👋' }, (err) => {
    if (err) {
      res.sendStatus(500);
      console.log('Error!');
      console.log(err);
    } else {
      res.sendStatus(200);
    }
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your bot is running on port ${listener.address().port}`);
});
