import kaleidoscope from "../data/kaleidoscope.json";
import path from "path";
import fs from "fs";

(async () => {
  kaleidoscope.forEach(theme => {
    theme.thumbnails = theme.thumbnails.filter((thumbnail, index) => {
      return fs.existsSync(thumbnail);
    });
  });

  const newKaleidoscope = kaleidoscope.filter(t => t.thumbnails.length > 0);

  fs.writeFileSync("./data/kaleidoscope.json", JSON.stringify(newKaleidoscope));
})();
