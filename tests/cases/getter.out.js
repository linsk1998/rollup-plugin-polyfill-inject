import getInnerHeight from "@/utils/getInnerHeight";
import getTextContent from "@/utils/getNodeText";
import { getCurrentScript } from "sky-core/utils/getCurrentScript";

console.log({ innerHeight: getInnerHeight() });
var text = getTextContent(document.getElementById("foo"));
var script = getCurrentScript();
console.log(getTextContent(getTextContent({})));
console.log(getTextContent(getTextContent(getTextContent({}))));
