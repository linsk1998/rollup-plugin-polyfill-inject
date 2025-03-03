new AggregateError([], "msg");
new AggregateError([], "msg", { cause: 1 });
new AggregateError(...args);
new AggregateError([], ...args);

new Error("error");
new Error("error", { cause: 1 });
new Error(...args);
