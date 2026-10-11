const fs = require("fs");
const path = require("path");
for (const name of ["build", "release"]) {
  fs.rmSync(path.join(__dirname, name), { recursive: true, force: true });
}
