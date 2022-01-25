import merged from "../data/merged.json";
import path from "path";
import fs from "fs";

(async () => {
  merged.forEach(theme => {
    theme.thumbnails.forEach((thumbnail, index) => {
      if (!thumbnail.startsWith("assets/")) {
        theme.thumbnails[index] = `assets/${thumbnail}`;
      }
    });
  });

  fs.writeFileSync("./data/merged.json", JSON.stringify(merged));
})();
