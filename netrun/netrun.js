// This file should never import tk or other scripts, as it needs to be able to
// reload from scratch, and also not fail if there is a syntax or other error
// in the toolkit that doesn't even allow scripts to load
const RELOAD_SCRIPT = "netrun-reload.js";

let LIBRARY_FILES = [
  "baseScript.js",
  "tk.js",
  "contracts.js",
  "purchased.js",
  "stock.js",
  "messaging.js",
];

let NS;
export async function main(ns) {
  NS = ns;

  if (NS.getHostname() !== "home") {
    NS.tprint("Must run from home server");
  }

  let argCommand = NS.args.shift();
  let command = argCommand;

  if (command === "forceReload") {
    await forceReload();
    await updateSourceFiles();
    return await NS.exit();
  }

  await updateSourceFiles();

  if (!command.match(/\.js$/)) command = `${command}.js`;

  if (!NS.fileExists(command)) {
    NS.tprint(`No command ${argCommand} found at ${command}`);
    return await NS.exit(1);
  }

  let threads = pullArgWithValue(/--threads?/, NS.args) || 1;

  await NS.run(command, threads, ...NS.args);
}

// Force all files except this one to re-load from server
async function forceReload() {
  let files = NS.ls("home");
  files = files
    .filter(file => file.endsWith(".js"))
    .filter(file => file !== "netrun.js");

  // Remove files before scp to suppress warnings
  for (let file of files) {
    await NS.rm(file, "home");
  }
}

function pullArgWithValue(regex, args) {
  let elem = args.find(el => el.match && el.match(regex));
  if (!elem) return null;

  let index = args.indexOf(elem);
  let info = args.splice(index, 2);
  return parseInt(info[1]);
}

async function updateFile(file, contents) {
  let originalContents = await NS.read(file);

  if (originalContents !== contents) {
    NS.tprint(`Updating ${file}`);

    NS.rm(file); // Clear the script so that the module also gets cleared.
    NS.write(file, contents, "w");

    return true;
  }

  return false;
}

async function updateFiles() {
  const INFO_FILE = "netrun_temp.txt";

  await NS.rm(INFO_FILE);
  await NS.wget("http://localhost:3000/files", INFO_FILE);

  let hasChanges = false;
  let contents = JSON.parse(NS.read(INFO_FILE));

  for (let file of LIBRARY_FILES) {
    if (!(file in contents)) continue;
    await updateFile(file, contents[file]);
  }

  for (let file of Object.keys(contents)) {
    await updateFile(file, contents[file]);
  }

  // Make sure the reload script gets updated as well
  await updateFile(RELOAD_SCRIPT, contents["netrun.js"]);

  await NS.rm(INFO_FILE);
  return hasChanges;
}

// Check to make sure that BaseScript will not inflate script ram sizes
async function checkBaseScript() {
  // Check baseScript is still good
  let ramUsage = NS.getScriptRam("baseScript.js");
  if (ramUsage !== 1.6) {
    NS.tprint(`Bad baseScript ram size, should be 1.6, but found ${ramUsage}`);
    await NS.exit();
  }
}

async function updateSourceFiles() {
  if (NS.getScriptName() === RELOAD_SCRIPT) return; // Don't re-update

  let hasChange = await updateFiles();
  await checkBaseScript();

  // This was too flaky, instead run on ygg
  if (hasChange) {
    // This stuff is unfortunately flaky
    NS.tprint(`Auto Reloading`);
    await NS.run(RELOAD_SCRIPT, 1, ...NS.args);
    // await NS.tail(RELOAD_SCRIPT, ...NS.args);
    await NS.exit();
  }
}
