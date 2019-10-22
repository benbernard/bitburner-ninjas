const port = 3000;

const fs = require("fs");
const http = require("http");
const rollup = require("rollup");

const argName = process.argv[2];
const dirname = `dist`;

const LOADER = `netrun.js`;

if (!fs.existsSync(dirname)) {
  console.error(`
ERROR: ${dirname} does not exist.

Either invoke with \`USER=bernard npm start\` (or some other user) or create the directory

See Setup section of README for more details`);
  throw new Error("Cannot start");
}

let shouldStop = false;

const requestHandler = (req, res) => {
  console.log(`Got requst: ${req.url}`);
  setCORS(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/files") {
    res.end(JSON.stringify(gatherFiles()));
    // } else if (req.url.startsWith("/files/")) {
    //   let fileName = req.url.slice(7);
    //   bundleFile(fileName, res);
  } else if (req.url === "/shouldStop") {
    res.end(shouldStop ? "Yes" : "No");
  } else if (req.url === "/toggleStop/yes") {
    shouldStop = true;
    res.end(`Should Stop: ${shouldStop}`);
  } else if (req.url === "/toggleStop/no") {
    shouldStop = false;
    res.end(`Should Stop: ${shouldStop}`);
  } else {
    res.end(slurpFile(`${dirname}/${LOADER}`));
  }
};

const setCORS = (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Request-Method", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
};

const server = http.createServer(requestHandler);

server.listen(port, err => {
  if (err) {
    return console.log("something bad happened", err);
  }

  console.log(`server is listening on ${port}`);
});

const slurpFile = file => {
  return fs.readFileSync(file).toString();
};

const gatherFiles = () => {
  const files = {};

  fs.readdirSync(dirname)
    .filter(file => !fs.lstatSync(`${dirname}/${file}`).isDirectory())
    .forEach(file => {
      addFile(file, files);
    });

  return files;
};

const addFile = (path, hash) => {
  hash[path] = slurpFile(`${dirname}/${path}`);
};

async function bundleSingleFile(name) {
  let inputFile = `${dirname}/${name}`;
  if (name === "netrun.js") {
    inputFile = `netrun/${name}`;
  }

  if (!fs.existsSync(inputFile)) {
    return false;
  }

  let bundle = await rollup.rollup({
    input: inputFile,
  });

  let destFile = `./dist/${name}`;
  await bundle.write({
    file: destFile,
    format: "esm",
  });

  return fs.readFileSync(destFile).toString();
}

async function bundleFile(name, res) {
  let contents = await bundleSingleFile(name);
  if (contents === false) {
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.write("404 Not found");
    return res.end();
  }

  res.end(
    JSON.stringify({
      [name]: contents,
      "netrun.js": await bundleSingleFile("netrun.js"),
    })
  );
}
