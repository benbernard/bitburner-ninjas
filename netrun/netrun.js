let NS;
const RESTART_SENTINEL = "netrun-restart";
const INFO_FILE = "netrun_temp.txt";

import startup from "nrStart.js";

export async function main(ns) {
  NS = ns;

  if (NS.getHostname() != "home") {
    NS.tprint("Must run from home server");
  }

  let hasChange = await updateFiles();

  if (hasChange) {
    NS.tprint(`Restarting`);
    await NS.run("netrun.js", 1, RESTART_SENTINEL, ...NS.args);
    NS.exit();
  } else {
    NS.tprint("No change");
  }

  while (NS.args[0] === RESTART_SENTINEL) {
    NS.args.shift();
  }

  startup();
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
        NS.tprint(`Writing ${file}`);
        hasChanges = true;
      }
    }

    return hasChanges;
  } finally {
    NS.rm(INFO_FILE);
  }
}
