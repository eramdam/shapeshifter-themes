import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

(async () => {
  const images = fs
    .readdirSync("./assets")
    .map(f => path.join("./assets", f))
    .filter(f => fs.lstatSync(f).isFile())
    .filter(f => f.endsWith(".gif"));

  const imagePromises = images.map(async singleImage => {
    const data = await sharp(singleImage).metadata();

    return sharp(singleImage)
      .resize({
        width: data!.width! * 4,
        height: data!.height! * 4,
        kernel: "nearest"
      })
      .toFile(singleImage.replace(".gif", ".upscaled.gif"));
  });

  await Promise.all(imagePromises);
})();
