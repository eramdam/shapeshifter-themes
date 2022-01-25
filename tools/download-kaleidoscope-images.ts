import kaleidoscope from "../data/kaleidoscope.json";
import axios from "axios";
import fs from "fs";
import path from "path";

(async () => {
  for (const theme of kaleidoscope) {
    const imagePath = `./assets/${path.basename(theme.thumbnails[0])}`;

    if (fs.existsSync(imagePath)) {
      console.log(`Skipping ${theme.thumbnails[0]}`);
      theme.thumbnails[0] = imagePath;
      continue;
    }

    console.log(theme.thumbnails[0]);
    await axios
      .get(theme.thumbnails[0], {
        responseType: "stream"
      })
      .then(res => {
        res.data.pipe(fs.createWriteStream(imagePath));
      });
    theme.thumbnails[0] = imagePath;
  }

  fs.writeFileSync("./data/kaleidoscope.json", JSON.stringify(kaleidoscope));
})();
