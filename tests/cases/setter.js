document.getElementById("foo").textContent = "bar";
document.title = "New Title";
status = "New Status";
status += "!";
status++;
++status;
document.head.textContent += "!";
document.getElementById("bar").textContent++;
(function() {
	document.getElementById("bar").textContent.textContent++;
})();
