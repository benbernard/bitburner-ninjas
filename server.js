const port = 3000;

const fs = require("fs");
const http = require("http");

const DIR = "netrun";
const LOADER = `netrun.js`;

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
  } else {
    res.end(slurpFile(`${DIR}/${LOADER}`));
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

  fs.readdirSync(DIR).forEach(file => addFile(file, files));

  return files;
};

const addFile = (path, hash) => {
  hash[path] = slurpFile(`${DIR}/${path}`);
};
