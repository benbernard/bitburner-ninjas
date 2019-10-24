function readStdin() {
  var chunks = [];

  return new Promise((resolve, reject) => {
    process.stdin
      .on("data", function (chunk) {
        chunks.push(chunk);
      })
      .on("end", function () {
        resolve(chunks.join(""));
      })
      .setEncoding("utf8");
  });
}

async function main() {
  let stdin = await readStdin();

  let buff = new Buffer.from(stdin, "base64");
  let text = buff.toString("utf8");

  let data = JSON.parse(text);
  let save = JSON.parse(data.data.PlayerSave);
  console.log(save.data.karma);
}

main();
