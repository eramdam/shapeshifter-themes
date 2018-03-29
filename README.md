# OSX themes bot

This is the source code of the bot that posts on https://twitter.com/@osxthemes and https://botsin.space/@osxthemes

Most of the base Twitter code originates from the following Glitch template https://glitch.com/edit/#!/twitterbot

# Inspiration

This bot is inspired by https://twitter.com/kaleidoscopemac. I grew up during the period where Mac OSX had those amazing looking themes and I just wanted to build a bot that'd share those gems of the past 😊

# How it works

Themes are grabed from two different sources:

## Interfacelift.com

Fortunately the website has a very specific/strict layout and is thus quite easy to scrape. `scraper.js` is responsible of scraping the themes. You might notice that the Interface lift specific code is in its own file, because I had hopes I could have something generic for multiple sources (spoiler: that didn't happen).

So `scraper.js` downloads the ~15 pages of themes, grabs the names, downloads the images, and compiles everything into `data/interfacelift.json`.

## ResExcellence

The website (at least its archives on the Wayback Machine) changed a lot through the years, so almost every page had a different layout. I attempted to write some scraping code but was discouradged by the layout being so different every time. I ended up grabbing/listing the themes by hand.

I first downloaded the entierety of the archives with https://github.com/hartator/wayback-machine-downloader, and then proceeds to visit the pages I was interested in and list every themes with images in `tools/resexcellence.md`. I then used `tools/parse-resexcellence.js` to create `data/resexcellence.json`.

I then merged `data/interfacelift.json` and `data/resexcellence.json` into `data/merged.json`, and this is the final JSON file used by `server.js`


## Posting

Like the original template, the posting is done whenever `/${process.env.BOT_ENDPOINT}` is called. From there the code uses [twit](https://www.npmjs.com/package/twit) and [mastodon](https://www.npmjs.com/package/mastodon) to post a status.