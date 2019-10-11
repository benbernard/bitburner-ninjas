const port = 3000;

const fs = require("fs");
const http = require("http");

const argName = process.argv[2];
const dirname = `netrun/${argName}`;

console.log(`Serving out of ${dirname}`);

const LOADER = `../netrun.js`;

if (!fs.existsSync(dirname)) {
  console.error(`
ERROR: ${dirname} does not exist.

Either invoke with \`USER=bernard npm start\` (or some other user) or create the directory

See Setup section of README for more details`);
  throw new Error("Cannot start");
}

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
  } else if (req.url === "/shouldStop") {
    res.end("No");
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
  addFile(LOADER, files);

  fs.readdirSync(dirname)
    .filter(file => !fs.lstatSync(`${dirname}/${file}`).isDirectory())
    .forEach(file => {
      addFile(file, files);
    });

  return files;
};

const addFile = (path, hash) => {
  if (path === LOADER) {
    hash["netrun.js"] = slurpFile(`${dirname}/${path}`);
  } else {
    hash[path] = slurpFile(`${dirname}/${path}`);
  }
};
