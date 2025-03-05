var err = new Error("error");
var err2 = new TypeError("error");

class MyError extends Error { }
var MyTypeError = class extends TypeError { };
