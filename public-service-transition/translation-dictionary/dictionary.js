/* Translation Dictionary: the Dictionary and References tabs, search, the category and order menus,
   the A to Z bar, and the Light, Dark, and System theme choice. Without this script both sections are shown in order
   and the page reads as a printed glossary. */
(function () {
  "use strict";
  var root = document.querySelector("[data-td]");
  if (!root) return;
  var doc = document.documentElement;
  var slice = function (list) { return Array.prototype.slice.call(list); };
  var tools = root.querySelector("[data-td-tools]");
  var tablist = root.querySelector("[data-td-tabs]");
  var tabs = slice(root.querySelectorAll("[data-tab]"));
  var panels = slice(root.querySelectorAll("[data-panel]"));
  var controls = root.querySelector("[data-td-controls]");
  var lettersNav = root.querySelector("[data-td-letters]");
  var letterLinks = slice(lettersNav.querySelectorAll("a[data-letter]"));
  var input = root.querySelector("#td-q");
  var catSel = root.querySelector("#td-cat");
  var orderSel = root.querySelector("#td-order");
  var list = root.querySelector("[data-td-list]");
  var countEl = root.querySelector("[data-td-count]");
  var noneEl = root.querySelector("[data-td-none]");
  var current = "terms";

  /* ---------------------------------------------------------------- theme */
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function choice() { return doc.getAttribute("data-theme-choice") || "system"; }
  function applyTheme(c) {
    var t = c === "system" ? (media && media.matches ? "dark" : "light") : c;
    doc.setAttribute("data-theme", t);
    doc.setAttribute("data-theme-choice", c);
    root.querySelectorAll(".theme-pick button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-theme-choice") === c));
    });
  }
  root.querySelectorAll(".theme-pick button").forEach(function (b) {
    b.addEventListener("click", function () {
      var c = b.getAttribute("data-theme-choice");
      try { if (c === "system") localStorage.removeItem("ara-theme"); else localStorage.setItem("ara-theme", c); } catch (e) { /* storage unavailable */ }
      applyTheme(c);
    });
  });
  if (media && media.addEventListener) media.addEventListener("change", function () { if (choice() === "system") applyTheme("system"); });
  applyTheme(choice());

  /* ---------------------------------------------------------------- entries */
  function norm(s) {
    s = (s || "").toLowerCase();
    if (s.normalize) s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    return s.replace(/’/g, "'").replace(/[^a-z0-9%./\- ]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(str) {
    var out = [];
    str.split(" ").forEach(function (t) {
      if (!t) return;
      out.push(t);
      t.split(/[-/.]/).forEach(function (part) { if (part && part !== t) out.push(part); });
    });
    return out;
  }
  var info = slice(list.querySelectorAll(".td-entry")).map(function (el) {
    return {
      el: el, i: +el.getAttribute("data-i"), cat: el.getAttribute("data-cat"), catName: el.getAttribute("data-catname"),
      catIndex: +el.getAttribute("data-catindex"), letter: el.getAttribute("data-letter"), letterLabel: el.getAttribute("data-letter-label"),
      key: tokens(el.getAttribute("data-key")), all: tokens(el.getAttribute("data-search")), score: 0
    };
  });
  var total = info.length;
  function hit(listOfTokens, w) { return listOfTokens.some(function (t) { return t.indexOf(w) === 0; }); }

  function clearMarks(el) {
    el.querySelectorAll("mark.td-hit").forEach(function (m) {
      var p = m.parentNode; p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
    });
  }
  function markIn(el, words) {
    if (!el || !words.length) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.nodeValue.trim()) nodes.push(n); }
    var re = new RegExp("(?:^|\\b)(" + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      if (!re.test(text)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var mk = document.createElement("mark"); mk.className = "td-hit"; mk.textContent = m[0]; frag.appendChild(mk);
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------------------------------------------------------------- the list */
  function setOffset() {
    var sticky = window.getComputedStyle(tools).position === "sticky";
    doc.style.setProperty("--td-offset", ((sticky ? tools.offsetHeight : 0) + 14) + "px");
  }
  function render() {
    var q = norm(input.value);
    var words = q ? q.split(" ") : [];
    var cat = catSel.value;
    var order = orderSel.value;
    var raw = input.value.trim().split(/\s+/).filter(function (w) { return w.length > 1; });
    var shown = 0;
    info.forEach(function (it) {
      clearMarks(it.el);
      var ok = (!cat || it.cat === cat) && words.every(function (w) { return hit(it.all, w); });
      it.el.hidden = !ok;
      it.score = 0;
      if (!ok) return;
      shown += 1;
      words.forEach(function (w) { it.score += (it.key.indexOf(w) !== -1) ? 4 : hit(it.key, w) ? 2 : 0; });
      if (raw.length) { markIn(it.el.querySelector("h4"), raw); markIn(it.el.querySelector(".td-aka"), raw); }
    });
    slice(list.querySelectorAll(".td-group")).forEach(function (h) { h.parentNode.removeChild(h); });
    var mode = words.length ? "rank" : order;
    var arr = info.slice();
    if (mode === "rank") arr.sort(function (a, b) { return (b.score - a.score) || (a.i - b.i); });
    else if (mode === "cat") arr.sort(function (a, b) { return (a.catIndex - b.catIndex) || (a.i - b.i); });
    else arr.sort(function (a, b) { return a.i - b.i; });
    var lastGroup = null, available = {};
    arr.forEach(function (it) {
      if (!it.el.hidden && mode !== "rank") {
        var g = mode === "cat" ? it.cat : it.letter;
        if (g !== lastGroup) {
          var h = document.createElement("h3");
          h.className = "td-group" + (mode === "cat" ? " is-cat" : "");
          h.id = mode === "cat" ? "cat-" + it.cat : "letter-" + it.letter;
          h.textContent = mode === "cat" ? it.catName : it.letterLabel;
          list.appendChild(h);
          lastGroup = g;
          available[it.letter] = true;
        }
      }
      list.appendChild(it.el);
    });
    letterLinks.forEach(function (a) {
      var id = a.getAttribute("data-letter");
      if (mode === "az" && available[id]) { a.setAttribute("href", "#letter-" + id); a.removeAttribute("aria-disabled"); a.removeAttribute("tabindex"); }
      else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.setAttribute("tabindex", "-1"); }
    });
    lettersNav.hidden = current !== "terms" || mode !== "az";
    var catLabel = cat ? catSel.options[catSel.selectedIndex].text.replace(/\s*\(\d+\)$/, "") : "";
    if (!q && !cat) countEl.textContent = total + " terms, " + (order === "cat" ? "grouped by category." : "A to Z.");
    else countEl.textContent = "Showing " + shown + " of " + total + " terms" + (catLabel ? " in " + catLabel : "") +
      (q ? " for “" + input.value.trim() + "”" : "") + (q && shown > 1 ? ", closest matches first" : "") + ".";
    noneEl.hidden = shown !== 0;
    setOffset();
  }

  /* ---------------------------------------------------------------- address bar */
  function setUrl(hash) {
    var params = new URLSearchParams(location.search);
    if (input.value.trim()) params.set("q", input.value.trim()); else params.delete("q");
    if (catSel.value) params.set("cat", catSel.value); else params.delete("cat");
    if (orderSel.value !== "az") params.set("order", orderSel.value); else params.delete("order");
    var s = params.toString();
    var h = hash === undefined ? location.hash : hash;
    try { history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + h); } catch (e) { /* address bar unavailable */ }
  }

  /* ---------------------------------------------------------------- tabs */
  tablist.setAttribute("role", "tablist");
  tabs.forEach(function (t) { t.setAttribute("role", "tab"); });
  panels.forEach(function (p) { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "tab-" + p.getAttribute("data-panel")); });
  function openTab(name) {
    current = name;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== name; });
    controls.hidden = name !== "terms";
    lettersNav.hidden = name !== "terms" || !!norm(input.value) || orderSel.value !== "az";
    setOffset();
  }
  function toTop() {
    var top = root.getBoundingClientRect().top;
    if (top < 0) root.scrollIntoView({ block: "start" });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () {
      var name = t.getAttribute("data-tab");
      openTab(name);
      setUrl(name === "refs" ? "#references" : "");
      toTop();
    });
    t.addEventListener("keydown", function (ev) {
      var j = null;
      if (ev.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (ev.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = tabs.length - 1;
      if (j === null) return;
      ev.preventDefault();
      tabs[j].focus();
      tabs[j].click();
    });
  });

  /* ---------------------------------------------------------------- links to a term, a source, or a letter */
  function flash(el) {
    root.querySelectorAll(".is-target").forEach(function (x) { x.classList.remove("is-target"); });
    el.classList.add("is-target");
  }
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    var el = document.getElementById(h);
    if (h === "references") { openTab("refs"); toTop(); return; }
    if (h.indexOf("ref-") === 0 && el) { openTab("refs"); flash(el); el.scrollIntoView({ block: "start" }); return; }
    if (h.indexOf("term-") === 0 && el) {
      openTab("terms");
      if (el.hidden) { input.value = ""; catSel.value = ""; render(); setUrl(); }
      flash(el); el.scrollIntoView({ block: "start" }); return;
    }
    if (h.indexOf("letter-") === 0) {
      openTab("terms");
      if (!el) { input.value = ""; catSel.value = ""; orderSel.value = "az"; render(); setUrl(); el = document.getElementById(h); }
      if (el) el.scrollIntoView({ block: "start" });
    }
  }
  window.addEventListener("hashchange", route);
  root.addEventListener("click", function (ev) {
    var a = ev.target.closest ? ev.target.closest("a") : null;
    if (!a || !root.contains(a)) return;
    if (a.getAttribute("aria-disabled") === "true") { ev.preventDefault(); return; }
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href === location.hash) { ev.preventDefault(); route(); }
  });

  /* ---------------------------------------------------------------- controls */
  var timer = null;
  input.addEventListener("input", function () { render(); clearTimeout(timer); timer = setTimeout(function () { setUrl(); }, 400); });
  input.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && input.value) { input.value = ""; render(); setUrl(); } });
  catSel.addEventListener("change", function () { render(); setUrl(); });
  orderSel.addEventListener("change", function () { render(); setUrl(); });
  document.addEventListener("keydown", function (ev) {
    var t = ev.target;
    var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if (ev.key === "/" && !typing && !ev.metaKey && !ev.ctrlKey && !ev.altKey) { ev.preventDefault(); openTab("terms"); input.focus(); }
  });
  window.addEventListener("resize", setOffset);

  /* ---------------------------------------------------------------- start */
  var params = new URLSearchParams(location.search);
  if (params.get("q")) input.value = params.get("q");
  if (params.get("cat") && catSel.querySelector('option[value="' + params.get("cat").replace(/[^a-z]/g, "") + '"]')) catSel.value = params.get("cat");
  if (params.get("order") === "cat") orderSel.value = "cat";
  root.classList.add("td-ready");
  tools.hidden = false;
  openTab("terms");
  render();
  if (location.hash) route();
})();
