import { login } from "masto";
import Twit from "twit";
import { Theme } from "./types";
import fs from "fs";
import path from "path";

const config = {
  twitter: {
    consumer_key: process.env.CONSUMER_KEY || "",
    consumer_secret: process.env.CONSUMER_SECRET || "",
    access_token: process.env.ACCESS_TOKEN || "",
    access_token_secret: process.env.ACCESS_TOKEN_SECRET || ""
  },
  mastodon: {
    access_token: process.env.MASTO_ACCESS_TOKEN || "",
    api_url: "https://botsin.space/"
  }
};

export async function postThemeToTwitter(theme: Theme) {
  try {
    const twitter = new Twit({
      consumer_key: config.twitter.consumer_key,
      consumer_secret: config.twitter.consumer_secret,
      access_token: config.twitter.access_token,
      access_token_secret: config.twitter.access_token_secret,
      strictSSL: true
    });
    const attachments = await Promise.all(
      theme.thumbnails.map(thumbnail => {
        return twitter.post("media/upload", {
          media_data: fs.readFileSync(
            path.resolve(__dirname, "..", "..", thumbnail),
            {
              encoding: "base64"
            }
          ),
          alt_text: {
            text: `${theme.name} - ${theme.author}`
          }
        });
      })
    );

    for (const attachment of attachments) {
      await twitter.post("media/metadata/create", {
        // @ts-expect-error
        media_id: attachment.data.media_id_string
      });
    }

    const post = await twitter.post("statuses/update", {
      status: `${theme.name} - ${theme.author}`,
      // @ts-expect-error
      media_ids: attachments.map(a => a.data.media_id_string)
    });

    return post;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export async function postThemeToMastodon(theme: Theme) {
  try {
    const masto = await login({
      url: config.mastodon.api_url,
      accessToken: config.mastodon.access_token
    });

    const attachments = await Promise.all(
      theme.thumbnails.map(thumbnail => {
        return masto.mediaAttachments.create({
          file: fs.createReadStream(
            path.resolve(__dirname, "..", "..", thumbnail)
          ),
          description: `${theme.name} - ${theme.author}`
        });
      })
    );

    const status = await masto.statuses.create({
      status: `${theme.name} - ${theme.author}`,
      visibility: "public",
      mediaIds: attachments.map(t => t.id)
    });

    return status;
  } catch (e) {
    console.error(e);
    return undefined;
  }
}
