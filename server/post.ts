import fs from "node:fs";
import path from "node:path";
// @ts-expect-error
import cohost from "cohost";
import { login } from "masto";
import { Theme } from "./types.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import AtProto from "@atproto/api";
import mime from "mime-types";
import { TwitterApi } from "twitter-api-v2";
import sharp from "sharp";
const { BskyAgent, RichText } = AtProto;
const __dirname = dirname(fileURLToPath(import.meta.url));

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
  },
  cohost: {
    email: process.env.COHOST_EMAIL || "",
    password: process.env.COHOST_PASSWORD || "",
    projectHandle: process.env.COHOST_PROJECT || ""
  },
  bluesky: {
    email: process.env.BSKY_ID || "",
    password: process.env.BSKY_PASSWORD || ""
  }
};

export async function postThemeToTwitter(theme: Theme) {
  try {
    const twitter = new TwitterApi({
      appKey: config.twitter.consumer_key,
      appSecret: config.twitter.consumer_secret,
      accessToken: config.twitter.access_token,
      accessSecret: config.twitter.access_token_secret
    });
    console.log("[twitter] logged in");

    console.log(
      `[twitter] Uploading ${theme.thumbnails.slice(0, 4).length} thumbnails`
    );
    const attachments = await Promise.all(
      theme.thumbnails.slice(0, 4).map(thumbnail => {
        const thumbnailPath = path.resolve(__dirname, "..", "..", thumbnail);
        return sharp(thumbnailPath)
          .metadata()
          .then(async data => {
            if (data.format === "gif" && data.pages === 1) {
              return {
                buf: await sharp(thumbnailPath).png().toBuffer(),
                format: mime.lookup("png") || ""
              };
            }

            return {
              buf: await sharp(thumbnailPath).toBuffer(),
              format: mime.lookup(thumbnailPath) || ""
            };
          })
          .then(buf => {
            return twitter.v1.uploadMedia(buf.buf, {
              mimeType: buf.format
            });
          });
      })
    );

    await Promise.all(
      attachments.map(a => {
        return twitter.v1.createMediaMetadata(a, {
          alt_text: {
            text: `${theme.name} - ${theme.author}`
          }
        });
      })
    );

    function padString(str: string) {
      return str.length > 120 ? `${str.slice(0, 119)}…` : str;
    }

    function getStatusText() {
      const baseStatus = `${theme.name} - ${theme.author}`;
      if (baseStatus.length >= 250) {
        return baseStatus;
      }

      return `${padString(theme.name)} - ${padString(theme.author)}`;
    }

    console.log(`[twitter] Posting...`);
    await twitter.v2.tweet(getStatusText(), {
      media: {
        media_ids: attachments
      }
    });
  } catch (e) {
    console.error(e);
  }
}

export async function postThemeToMastodon(theme: Theme): Promise<any | void> {
  try {
    const masto = await login({
      url: config.mastodon.api_url,
      accessToken: config.mastodon.access_token
    });

    console.log("[Mastodon] Logged in");

    console.log(
      `[Mastodon] Uploading ${theme.thumbnails.slice(0, 4).length} thumbnails`
    );
    const attachments = await Promise.all(
      theme.thumbnails.slice(0, 4).map(thumbnail => {
        return masto.v2.mediaAttachments.create({
          file: new Blob([
            fs.readFileSync(path.resolve(__dirname, "..", "..", thumbnail))
          ]),
          description: `${theme.name} - ${theme.author}`
        });
      })
    );
    console.log(
      `[Mastodon] Uploaded ${theme.thumbnails.slice(0, 4).length} thumbnails`
    );

    function padString(str: string) {
      return str.length > 220 ? `${str.slice(0, 219)}…` : str;
    }

    function getStatusText() {
      const baseStatus = `${theme.name} - ${theme.author}`;
      if (baseStatus.length >= 450) {
        return baseStatus;
      }

      return `${padString(theme.name)} - ${padString(theme.author)}`;
    }

    console.log(`[Mastodon] Posting...`);
    const status = await masto.v1.statuses.create({
      status: getStatusText(),
      visibility: "public",
      mediaIds: attachments.map(t => t.id)
    });

    return status;
  } catch (e) {
    if (String(e).includes("Timeout")) {
      console.log("Timed out, trying again");
      return postThemeToMastodon(theme);
    }

    console.error(e);
    return undefined;
  }
}

export async function postThemeToCohost(theme: Theme) {
  const user = new cohost.User();
  console.log("[cohost] logged in");
  await user.login(config.cohost.email, config.cohost.password);
  const projects = await user.getProjects();
  const projectToPostTo = projects.find(
    (p: any) => p.handle === config.cohost.projectHandle
  );

  if (!projectToPostTo) {
    console.error(
      new Error(`No cohost projects found for ${config.cohost.projectHandle}`)
    );
    return undefined;
  }
  console.log("[cohost] found project");

  const basePost = {
    postState: 0,
    headline: "",
    adultContent: false,
    cws: [],
    tags: [
      "macthemes",
      "macintosh",
      "mac osx",
      "shapeshifter",
      "kaleidoscope",
      "customization"
    ],
    blocks: [
      {
        type: "markdown",
        markdown: { content: `${theme.name} by ${theme.author}` }
      }
    ]
  };

  const draftId = await cohost.Post.create(projectToPostTo, basePost);

  const attachmentsData = await Promise.all(
    theme.thumbnails.slice(0, 4).map(thumbnail => {
      return projectToPostTo.uploadAttachment(
        draftId,
        path.resolve(__dirname, "..", "..", thumbnail)
      );
    })
  );
  console.log(
    `[cohost] Uploading ${theme.thumbnails.slice(0, 4).length} thumbnails`
  );

  await cohost.Post.update(projectToPostTo, draftId, {
    ...basePost,
    postState: 1,
    blocks: [
      ...basePost.blocks,
      ...attachmentsData.map(attachment => {
        return {
          type: "attachment",
          attachment: {
            ...attachment,
            altText: `A preview of the Mac theme "${theme.name}" by "${theme.author}"`
          }
        };
      })
    ]
  });

  console.log("[cohost] Posted");
}

export async function postThemeToBluesky(theme: Theme) {
  const agent = new BskyAgent({ service: "https://staging.bsky.social" });
  await agent.login({
    identifier: process.env.BSKY_ID || "",
    password: process.env.BSKY_PASSWORD || ""
  });

  const imageRecords = await Promise.all(
    theme.thumbnails.slice(0, 4).map(thumbnail => {
      return new Promise<Awaited<ReturnType<typeof agent.uploadBlob>>>(
        async resolve => {
          console.log(`[bsky] uploading ${thumbnail}`);
          const response = await agent.uploadBlob(
            fs.readFileSync(path.resolve(__dirname, "..", "..", thumbnail)),
            {
              encoding:
                mime.lookup(path.resolve(__dirname, "..", "..", thumbnail)) ||
                ""
            }
          );

          resolve(response);
        }
      );
    })
  );

  function padString(str: string) {
    return str.length > 220 ? `${str.slice(0, 219)}…` : str;
  }

  function getStatusText() {
    const baseStatus = `${theme.name} - ${theme.author}`;
    if (baseStatus.length >= 450) {
      return baseStatus;
    }

    return `${padString(theme.name)} - ${padString(theme.author)}`;
  }

  const rt = new RichText({ text: getStatusText() });
  await rt.detectFacets(agent);

  console.log(`[bsky] Posting...`);
  await agent.post({
    $type: "app.bsky.feed.post",
    text: rt.text,
    facets: rt.facets,
    embed: imageRecords.length
      ? {
          $type: "app.bsky.embed.images",
          images: imageRecords.map(r => {
            return {
              image: r.data.blob,
              alt: `A preview of the Mac theme "${theme.name}" by "${theme.author}"`
            };
          })
        }
      : undefined
  });
}
