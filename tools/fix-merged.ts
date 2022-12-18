import fs from "fs";
import merged from "../data/merged.json";

(async () => {
  merged.forEach(theme => {
    theme.thumbnails = theme.thumbnails.filter(thumbnail => {
      return fs.existsSync(thumbnail);
    });
  });

  fs.writeFileSync("./data/merged.json", JSON.stringify(merged));
})();
