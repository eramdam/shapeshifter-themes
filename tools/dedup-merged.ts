import { groupBy, mapValues } from "es-toolkit";
import fs from "fs";
import merged from "../data/merged.json";

(async () => {
  const mergedTweak = mapValues(
    groupBy(merged, t => t.name + t.author),
    themes => {
      if (themes.length === 1) {
        return themes;
      }

      const thumbnails = themes.flatMap(t => t.thumbnails);

      return [
        {
          ...themes[0],
          thumbnails
        }
      ];
    }
  );
  const final = Object.values(mergedTweak).flat();

  // console.log(util.inspect(final, { depth: null, colors: true }));
  fs.writeFileSync("./data/merged.json", JSON.stringify(final));
})();
