import SuperError from "sky-core/pure/Error";
import SuperTypeError from "sky-core/pure/TypeError";

var err = new Error("error");
var err2 = new TypeError("error");

class MyError extends SuperError { }
var MyTypeError = class extends SuperTypeError { };
