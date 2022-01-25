import merged from "../data/merged.json";
import path from "path";
import fs from "fs";

(async () => {
  merged.forEach(theme => {
    theme.thumbnails = theme.thumbnails.filter((thumbnail, index) => {
      return fs.existsSync(thumbnail);
    });
  });

  fs.writeFileSync("./data/merged.json", JSON.stringify(merged));
})();
