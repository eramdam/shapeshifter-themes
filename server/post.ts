import { AtpAgent, RichText } from "@atproto/api";
import { login } from "masto";
import mime from "mime-types";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Theme } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  mastodon: {
    access_token: process.env.MASTO_ACCESS_TOKEN || "",
    api_url: process.env.MASTO_INSTANCE || ""
  },
  bluesky: {
    email: process.env.BSKY_ID || "",
    password: process.env.BSKY_PASSWORD || ""
  }
};

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
        return handleSingleThumbnail(thumbnail).then(buf => {
          return masto.v2.mediaAttachments.create({
            file: new Blob([buf.buf]),
            description: `${theme.name} - ${theme.author}`
          });
        });
      })
    );
    console.log(
      `[Mastodon] Uploaded ${theme.thumbnails.slice(0, 4).length} thumbnails`
    );

    function getStatusText() {
      return `${theme.name} - ${theme.author}\n${theme.extra?.url || ""}`.trim();
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

export async function postThemeToBluesky(theme: Theme) {
  const agent = new AtpAgent({ service: "https://staging.bsky.social" });
  await agent.login({
    identifier: process.env.BSKY_ID || "",
    password: process.env.BSKY_PASSWORD || ""
  });

  console.log(theme);
  const thumbnailsToUse = theme.thumbnails.slice(0, 4);

  const imageRecords = await Promise.all(
    thumbnailsToUse.map(async thumbnail => {
      return handleSingleThumbnail(thumbnail).then(async buf => {
        return {
          record: await agent.uploadBlob(buf.buf, {
            encoding: buf.format
          }),
          metadata: buf.metadata
        };
      });
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

  const rt = new RichText({
    text: getStatusText() + ((theme.extra && `\n${theme.extra.url}`) || "")
  });
  await rt.detectFacets(agent);

  console.log(`[bsky] Posting...`);
  await agent.post({
    $type: "app.bsky.feed.post",
    text: rt.text,
    facets: rt.facets,
    embed: imageRecords.length
      ? {
          $type: "app.bsky.embed.images",
          images: imageRecords.map((r, index) => {
            return {
              image: r.record.data.blob,
              alt: `A preview of the Mac theme "${theme.name}" by "${theme.author}"`,
              aspectRatio: {
                width: r.metadata.width,
                height: r.metadata.height
              }
            };
          })
        }
      : undefined
  });
}

async function handleSingleThumbnail(thumbnailFilename: string) {
  const thumbnailPath = path.resolve(__dirname, "..", "..", thumbnailFilename);
  return sharp(thumbnailPath)
    .metadata()
    .then(async data => {
      if (data.format === "gif" && data.pages === 1) {
        return {
          buf: await sharp(thumbnailPath).png().toBuffer(),
          format: mime.lookup("png") || "",
          metadata: data
        };
      }

      return {
        buf: await sharp(thumbnailPath).toBuffer(),
        format: mime.lookup(thumbnailPath) || "",
        metadata: data
      };
    });
}
