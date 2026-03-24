(function () {
  "use strict";

  var EMBED_BASE = "https://app.roasteryplatform.com";

  // Allow override for development
  var scripts = document.querySelectorAll("script[data-roaster]");

  scripts.forEach(function (script) {
    var roaster = script.getAttribute("data-roaster");
    var type = script.getAttribute("data-type") || "shop";

    if (!roaster) {
      console.error("[Ghost Roastery Embed] Missing data-roaster attribute.");
      return;
    }

    // Determine embed URL
    var path;
    switch (type) {
      case "shop":
        path = "/s/" + encodeURIComponent(roaster) + "/shop?embedded=true";
        break;
      case "wholesale-apply":
        path = "/s/" + encodeURIComponent(roaster) + "/embed/wholesale-apply";
        break;
      default:
        console.error("[Ghost Roastery Embed] Unknown data-type: " + type);
        return;
    }

    // Use data-base-url for dev/staging override
    var base = script.getAttribute("data-base-url") || EMBED_BASE;
    var url = base + path;

    // Create container
    var container = document.createElement("div");
    container.className = "gr-embed-container";
    container.style.width = "100%";
    container.style.overflow = "hidden";

    // Create iframe
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.minHeight = "400px";
    iframe.style.backgroundColor = "transparent";
    iframe.setAttribute("scrolling", "auto");
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute(
      "allow",
      "payment"
    );

    container.appendChild(iframe);

    // Insert after the script tag
    script.parentNode.insertBefore(container, script.nextSibling);

    // Listen for resize messages from the iframe
    window.addEventListener("message", function (event) {
      if (
        event.data &&
        event.data.type === "gr-embed-resize" &&
        event.source === iframe.contentWindow
      ) {
        iframe.style.height = event.data.height + "px";
      }
    });
  });
})();
