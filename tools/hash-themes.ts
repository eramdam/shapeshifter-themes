import fs from "fs/promises";
import objectHash from "object-hash";
import shapeshifterThemes from "../data/merged.json";
import kaleidoscopeThemes from "../data/kaleidoscope.json";

(async () => {
  const shapeShifterHashes = shapeshifterThemes.map(t => {
    return objectHash(t);
  });
  const kaleidoscopeHashes = kaleidoscopeThemes.map(t => objectHash(t));

  await fs.writeFile(
    "data/shapeshifter-hashes.txt",
    kaleidoscopeHashes.join("\n").trim()
  );
  await fs.writeFile(
    "data/kaleidoscope-hashes.txt",
    shapeShifterHashes.join("\n").trim()
  );
})();
