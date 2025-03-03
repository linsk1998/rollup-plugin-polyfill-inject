import CauseError from "sky-core/pure/Error";

var err = new Error("error");
var err2 = new CauseError("error", { cause: 1 });
var err2 = new CauseError(...args);
