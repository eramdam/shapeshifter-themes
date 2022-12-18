import fs from "fs";
import kaleidoscope from "../data/kaleidoscope.json";

(async () => {
  kaleidoscope.forEach(theme => {
    theme.thumbnails = theme.thumbnails.filter(thumbnail => {
      return fs.existsSync(thumbnail);
    });
  });

  const newKaleidoscope = kaleidoscope.filter(t => t.thumbnails.length > 0);

  fs.writeFileSync("./data/kaleidoscope.json", JSON.stringify(newKaleidoscope));
})();
