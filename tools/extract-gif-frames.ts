const extractFrames = require("gif-extract-frames");
import merged from "../data/merged.json";
import path from "path";
import fs from "fs/promises";
import { format } from "util";

(async () => {
  for (const theme of merged) {
    const { thumbnails } = theme;
    const gifIndex = thumbnails.findIndex(t => t.endsWith(".gif"));
    const gif = thumbnails[gifIndex];

    if (!gif) {
      continue;
    }

    const withoutExtension = path.basename(gif, ".gif");

    const results = await extractFrames({
      input: gif,
      output: `./assets/${withoutExtension}-%d.png`
    });

    Array.from(results.shape).forEach((_, index) => {
      thumbnails[index] = format(`${withoutExtension}-%d.png`, index);
    });
  }

  fs.writeFile("./data/merged.json", JSON.stringify(merged));
})();
