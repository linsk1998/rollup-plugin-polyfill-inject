import setTextContent from "@/utils/setNodeText";
import { setActivityTitle as setTitle } from "@/utils/jsBridge";
import { setStatusText as setStatus } from "@/utils/jsBridge";

setTextContent(document.getElementById("foo"), "bar");
setTitle("New Title");
setStatus("New Status");
