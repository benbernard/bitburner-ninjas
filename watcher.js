const watch = require("watch");
const {spawn} = require("child_process");

const startRollup = () => {
  console.log(`Starting rollup`);

  let child = spawn("/usr/local/bin/npx", ["rollup", "-c", "--watch"]);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  return child;
};

let rollup = startRollup();

const restartRollup = () => {
  rollup.kill();
  rollup = startRollup();
};

watch.createMonitor("netrun", function (monitor) {
  monitor.on("created", restartRollup);
  monitor.on("removed", restartRollup);
});
