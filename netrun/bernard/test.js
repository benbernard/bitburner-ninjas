import BaseScript from "./baseScript.js";
import {json} from "./utils.js";

class ThisScript extends BaseScript {
  async perform() {
    this.tlog(document);
    this.tlog(navigator);
    let result = await navigator.permissions.query({name: "clipboard-write"});
    this.tlog(result.state);

    let info = await navigator.clipboard.writeText("foo");
    this.tlog(json(info));
  }
}

export let main = ThisScript.runner();
