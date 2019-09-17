let NS;

import {Script} from "tk.js";

export async function main(ns) {
  NS = ns;
  NS.tprint("test hello bar");
  new Script().run;
}
