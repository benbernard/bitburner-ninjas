let NS;
const RESTART_SENTINEL = "netrun-restart";
const INFO_FILE = "netrun_temp.txt";

export async function main(ns) {
  NS = ns;

  if (NS.getHostname() != "home") {
    NS.tprint("Must run from home server");
  }

  let hasChange = await updateFiles();

  if (hasChange) {
    NS.tprint(`Auto Reloading`);
    await NS.run("netrun.js", 1, RESTART_SENTINEL, ...NS.args);
    await NS.exit();
  }

  while (NS.args[0] === RESTART_SENTINEL) {
    NS.args.shift();
  }

  let argCommand = NS.args.shift();
  let command = argCommand;
  if (!command.match(/\.js$/)) command = `nr_${command}.js`;

  if (!NS.fileExists(command)) {
    NS.tprint(`No command ${argCommand} found at ${command}`);
    NS.exit(1);
  }

  let threads = pullArgWithValue(/--threads?/, NS.args) || 1;

  await NS.run(command, threads, ...NS.args);
}

function pullArgWithValue(regex, args) {
  let elem = args.find(el => el.match(regex));
  if (!elem) return null;

  let index = args.indexOf(elem);
  let info = args.splice(index, 2);
  return parseInt(info[1]);
}

async function updateFiles() {
  NS.rm(INFO_FILE);

  try {
    await NS.wget("http://localhost:3000/files", INFO_FILE);

    let hasChanges = false;
    let contents = JSON.parse(NS.read(INFO_FILE));

    for (let file in contents) {
      let originalContents = await NS.read(file);
      if (originalContents != contents[file]) {
        await NS.write(file, contents[file], "w");
        hasChanges = true;
      }
    }

    return hasChanges;
  } finally {
    await NS.rm(INFO_FILE);
  }
}
