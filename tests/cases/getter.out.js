import get_textContent from "@/utils/getNodeText";
import { getCurrentScript as get_document_currentScript } from "sky-core/utils/getCurrentScript";

var text = get_textContent(document.getElementById("foo"));

var script = get_document_currentScript();
