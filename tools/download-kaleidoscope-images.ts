import kaleidoscope from "../data/kaleidoscope.json";
import axios from "axios";
import fs from "fs";
import path from "path";

(async () => {
  for (const theme of kaleidoscope) {
    const imagePath = `./assets/${path.basename(theme.image)}`;

    if (fs.existsSync(imagePath)) {
      console.log(`Skipping ${theme.image}`);
      theme.image = imagePath;
      continue;
    }

    console.log(theme.image);
    await axios
      .get(theme.image, {
        responseType: "stream"
      })
      .then(res => {
        res.data.pipe(fs.createWriteStream(imagePath));
      });
    theme.image = imagePath;
  }

  fs.writeFileSync("./data/kaleidoscope.json", JSON.stringify(kaleidoscope));
})();
