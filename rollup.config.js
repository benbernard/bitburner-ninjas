const fs = require("fs");
const path = require("path");

const onwarn = () => {};
let config = [
  {
    input: "netrun/netrun.js",
    output: {
      file: "dist/netrun.js",
      format: "esm",
    },
    onwarn,
  },
];

let user = process.env.USER;
let dirname = `${__dirname}/netrun/${user}`;

fs.readdirSync(dirname)
  .filter(file => !fs.lstatSync(`${dirname}/${file}`).isDirectory())
  .forEach(file => {
    let contents = fs.readFileSync(`${dirname}/${file}`).toString();
    if (!contents.match(/^export .*main/m)) return;

    let fullPath = `${dirname}/${file}`;
    let name = file.replace(/\.js$/, "");
    config.push({
      input: fullPath,
      onwarn,
      output: {
        file: path.join("dist", file),
        format: "esm",
      },
    });
  });

module.exports = config;
