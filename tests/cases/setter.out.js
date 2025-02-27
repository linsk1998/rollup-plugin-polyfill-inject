import setTextContent from "@/utils/setNodeText";
import { setActivityTitle as setTitle } from "@/utils/jsBridge";
import { setStatusText as setStatus } from "@/utils/jsBridge";
import { getStatusText as getStatus } from "@/utils/jsBridge";
var $0, $1, $2, $3, $4;

setTextContent(document.getElementById("foo"), "bar");
setTitle("New Title");
setStatus("New Status");
($0 = getStatus(), $0 += "!", setStatus($0), $0);
($2 = $1 = getStatus(), $1++, setStatus($1), $2);
($3 = getStatus(), ++$3, setStatus($3), $3);
($4 = getTextContent(document.head), $4 += "!", setTextContent($4), $4);
