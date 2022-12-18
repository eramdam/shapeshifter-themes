import fs from "fs";
import _ from "lodash";
import merged from "../data/merged.json";

(async () => {
  const final = _(merged)
    .groupBy(t => t.name + t.author)
    .mapValues(themes => {
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
    })
    .values()
    .flatten()
    .value();

  // console.log(util.inspect(final, { depth: null, colors: true }));
  fs.writeFileSync("./data/merged.json", JSON.stringify(final));
})();
