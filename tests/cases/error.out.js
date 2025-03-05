import CauseAggregateError from "sky-core/pure/AggregateError";
import CauseError from "sky-core/pure/Error";

new AggregateError([], "msg");
new CauseAggregateError([], "msg", { cause: 1 });
new CauseAggregateError(...args);
new CauseAggregateError([], ...args);

new Error("error");
new CauseError("error", { cause: 1 });
new CauseError(...args);
