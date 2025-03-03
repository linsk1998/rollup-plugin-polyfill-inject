import setTextContent from "@/utils/setNodeText";
import { setActivityTitle as setTitle } from "@/utils/jsBridge";
import { setStatusText as setStatus } from "@/utils/jsBridge";
import { getStatusText as getStatus } from "@/utils/jsBridge";
import getTextContent from "@/utils/getNodeText";
var $0, $1, $2, $3, $4, $5, $6, $7, $8;

setTextContent(document.getElementById("foo"), "bar");
setTitle("New Title");
setStatus("New Status");
($0 = getStatus(), $0 += "!", setStatus($0), $0);
($2 = $1 = getStatus(), $1++, setStatus($1), $2);
($3 = getStatus(), ++$3, setStatus($3), $3);
($4 = document.head, $5 = getTextContent($4), $5 += "!", setTextContent($4, $5), $5);
($6 = document.getElementById("bar"), $8 = $7 = getTextContent($6), $7++, setTextContent($6, $7), $8);
(function() {
	var $9, $10, $11;
($9 = getTextContent(document.getElementById("bar")), $11 = $10 = getTextContent($9), $10++, setTextContent($9, $10), $11);
})();
