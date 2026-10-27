// Switches the embedded PDF between the workshop documents. The page works without this script.
(function () {
  var root = document.querySelector("[data-viewer]");
  var docs = window.ARA_DOCS;
  if (!root || !docs) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panel = root.querySelector('[role="tabpanel"]');
  var frame = root.querySelector("[data-frame]");
  var open = root.querySelector("[data-open]");
  var down = root.querySelector("[data-download]");
  var phone = root.querySelector("[data-phone]");
  var cover = root.querySelector("[data-cover]");
  var desc = root.querySelector("[data-desc]");

  function show(key, focus) {
    var d = docs[key];
    if (!d) return;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-doc") === key;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on) { panel.setAttribute("aria-labelledby", t.id); if (focus) t.focus(); }
    });
    frame.src = d.href + "#view=FitH";
    frame.title = d.full + " (PDF)";
    open.href = d.href; down.href = d.href; phone.href = d.href;
    cover.src = d.cover; cover.alt = "Cover of the " + d.label.toLowerCase();
    desc.textContent = d.desc + " ";
    var meta = document.createElement("span");
    meta.className = "file-meta"; meta.textContent = d.meta;
    desc.appendChild(meta);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { show(t.getAttribute("data-doc"), false); });
    t.addEventListener("keydown", function (ev) {
      var n = null;
      if (ev.key === "ArrowRight") n = (i + 1) % tabs.length;
      if (ev.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      if (ev.key === "Home") n = 0;
      if (ev.key === "End") n = tabs.length - 1;
      if (n !== null) { ev.preventDefault(); show(tabs[n].getAttribute("data-doc"), true); }
    });
  });
})();
