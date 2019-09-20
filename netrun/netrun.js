const RELOAD_SCRIPT = "netrun-reload.js";

let NS;
export async function main(ns) {
  NS = ns;

  if (NS.getHostname() !== "home") {
    NS.tprint("Must run from home server");
  }

  await updateSourceFiles();

  let argCommand = NS.args.shift();
  let command = argCommand;
  if (!command.match(/\.js$/)) command = `${command}.js`;

  if (!NS.fileExists(command)) {
    NS.tprint(`No command ${argCommand} found at ${command}`);
    await NS.exit(1);
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
  const INFO_FILE = "netrun_temp.txt";

  await NS.rm(INFO_FILE);
  await NS.wget("http://localhost:3000/files", INFO_FILE);

  let hasChanges = false;
  let contents = JSON.parse(NS.read(INFO_FILE));

  for (let file of Object.keys(contents)) {
    let originalContents = await NS.read(file);
    if (originalContents !== contents[file]) {
      NS.tprint(`Updating ${file}`);
      NS.write(file, contents[file], "w");
      hasChanges = true;

      // Also update the reload script
      if (file === "netrun.js") {
        NS.write(RELOAD_SCRIPT, contents[file], "w");
      }
    }
  }

  await NS.rm(INFO_FILE);
  return hasChanges;
}

async function updateSourceFiles() {
  if (NS.getScriptName() === RELOAD_SCRIPT) return; // Don't re-update

  let hasChange = await updateFiles();

  // This was too flaky, instead run on ygg
  if (hasChange) {
    // This stuff is unfortunately flaky
    NS.tprint(`Auto Reloading`);
    await NS.run(RELOAD_SCRIPT, 1, ...NS.args);
    // await NS.tail(RELOAD_SCRIPT, ...NS.args);
    await NS.exit();
  }
}
