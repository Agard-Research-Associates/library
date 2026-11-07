// Veterans' Preference in Federal Reductions in Force: interactive guide.
// Section tabs, the light and dark switch, the sample retention register, and the ratings model
// from Section 4.2 of the ARA report. Without this script every section is shown in order.
(function () {
  "use strict";
  var root = document.querySelector("[data-rif-guide]");
  if (!root) return;
  var doc = document.documentElement;

  /* ---------------------------------------------------------------- light and dark */
  var themeBtn = root.querySelector("#rg-theme");
  function currentTheme() { return doc.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function showTheme() {
    var dark = currentTheme() === "dark";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    themeBtn.querySelector(".txt").textContent = dark ? "Light mode" : "Dark mode";
  }
  themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    doc.setAttribute("data-theme", next);
    try { localStorage.setItem("ara-theme", next); } catch (e) { /* storage unavailable */ }
    showTheme();
    if (lastChart) drawChart(lastChart[0], lastChart[1]);
  });
  if (!doc.getAttribute("data-theme")) {
    doc.setAttribute("data-theme", window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  showTheme();

  /* ---------------------------------------------------------------- tabs */
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
  var bar = root.querySelector(".rg-bar");
  function openTab(id, opts) {
    opts = opts || {};
    var found = panels.some(function (p) { return p.id === id; });
    if (!found) id = panels[0].id;
    panels.forEach(function (p) { p.classList.toggle("on", p.id === id); });
    tabs.forEach(function (t) {
      var on = t.getAttribute("aria-controls") === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        if (opts.focus) t.focus();
        /* keep the chosen tab visible in the strip on narrow screens without moving the page */
        var strip = t.parentNode, sr = strip.getBoundingClientRect(), tr = t.getBoundingClientRect();
        if (tr.left < sr.left) strip.scrollLeft -= (sr.left - tr.left) + 8;
        else if (tr.right > sr.right) strip.scrollLeft += (tr.right - sr.right) + 8;
      }
    });
    if (opts.hash !== false && window.history && history.replaceState) history.replaceState(null, "", "#" + id);
    if (opts.scroll) {
      var top = bar.getBoundingClientRect().top + window.pageYOffset;
      if (window.pageYOffset > top) window.scrollTo(0, top);
    }
    if (id === "credit" && lastChart) drawChart(lastChart[0], lastChart[1]);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { openTab(t.getAttribute("aria-controls")); });
    t.addEventListener("keydown", function (ev) {
      var n = null;
      if (ev.key === "ArrowRight") n = (i + 1) % tabs.length;
      if (ev.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
      if (ev.key === "Home") n = 0;
      if (ev.key === "End") n = tabs.length - 1;
      if (n !== null) { ev.preventDefault(); openTab(tabs[n].getAttribute("aria-controls"), { focus: true }); }
    });
  });
  Array.prototype.forEach.call(root.querySelectorAll("[data-go]"), function (b) {
    b.addEventListener("click", function () { openTab(b.getAttribute("data-go"), { scroll: true }); });
  });
  window.addEventListener("hashchange", function () {
    var id = location.hash.replace("#", "");
    if (panels.some(function (p) { return p.id === id; })) openTab(id, { hash: false });
  });

  /* ---------------------------------------------------------------- rules */
  var PTS = { 5: 7, 4: 5, 3: 3, 2: 0 };            // final rule, 5 C.F.R. 351.503(a)
  var OLD_CREDIT = { 5: 20, 4: 16, 3: 12, 2: 0 };  // prior rule, additional years of service per rating
  var PREF = { B: { pts: 0, order: 2, code: "B" }, A: { pts: 3, order: 1, code: "A" }, AD: { pts: 5, order: 0, code: "AD" } };
  var TENURE = {
    career: { oldGroup: 1, newSub: 1, label: "Career" },
    cc: { oldGroup: 2, newSub: 2, label: "Career-conditional" },
    prob: { oldGroup: 2, newSub: null, label: "Probation" }
  };
  function ratingPts(e) { return PTS[e.r[0]] + PTS[e.r[1]] + PTS[e.r[2]]; }
  function newScore(e) { return ratingPts(e) + PREF[e.pref].pts; }
  // The prior rule added the credits together, divided by 3, and rounded up to a whole number.
  function oldAdj(e) { return e.years + Math.ceil((OLD_CREDIT[e.r[0]] + OLD_CREDIT[e.r[1]] + OLD_CREDIT[e.r[2]]) / 3 - 1e-9); }
  function oldKey(e) { return [TENURE[e.tenure].oldGroup, PREF[e.pref].order, -oldAdj(e)]; }
  function newKey(e) { return [-newScore(e), TENURE[e.tenure].newSub, -e.years]; }
  function cmp(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
  function rank(list, keyFn) {
    var s = list.slice().sort(function (x, y) { return cmp(keyFn(x), keyFn(y)) || x.id - y.id; });
    var out = [], r = 0;
    s.forEach(function (e, i) { if (i === 0 || cmp(keyFn(e), keyFn(s[i - 1])) !== 0) r = i + 1; out.push({ e: e, rank: r }); });
    out.forEach(function (o) { o.tied = out.filter(function (p) { return p.rank === o.rank; }).length > 1; });
    return out;
  }

  /* ---------------------------------------------------------------- examples */
  function emp(id, label, pref, tenure, years, r) { return { id: id, label: label, pref: pref, tenure: tenure, years: years, r: r }; }
  var EXAMPLES = {
    gap: {
      note: "Under the prior rules, both veterans rank above both nonveterans because preference is sorted before performance. Under the final rule, the veteran with a 30 percent disability and three Fully Successful ratings falls from first to last: a score of 14 is below the 15 earned by a nonveteran with three Exceeds Fully Successful ratings.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 20, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 8, [4, 4, 4]),
             emp(3, "Veteran", "A", "career", 12, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 15, [5, 5, 5])]
    },
    holds: {
      note: "OPM used comparisons like these to show that the credit still matters (91 Fed. Reg. at 49,181-82). The veteran with a 30 percent disability (15 + 5 = 20) stays ahead of a nonveteran rated Outstanding twice (19), and the veteran with the 3-point credit (18) stays ahead of a nonveteran rated Outstanding once (17). The same 3-point veteran falls below the nonveteran rated Outstanding twice, which could not happen within a tenure group under the prior rules.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 10, [4, 4, 4]), emp(2, "Nonveteran", "B", "career", 10, [5, 5, 4]),
             emp(3, "Veteran", "A", "career", 10, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 10, [5, 4, 4])]
    },
    accepted: {
      note: "Commenters raised both outcomes, and OPM accepted them in the final rule (91 Fed. Reg. at 49,183). A nonveteran with three Outstanding ratings (21) outranks a disabled veteran with three Fully Successful ratings (14 with the 5-point credit), and a nonveteran with three Outstanding ratings and 4 years of service outranks a veteran with ratings of 4, 4, and 5 and 40 years of service (20). The two nonveterans tie on score and tenure, so length of service orders them.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 15, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 10, [5, 5, 5]),
             emp(3, "Veteran, 40 years", "A", "career", 40, [4, 4, 5]), emp(4, "Nonveteran, 4 years", "B", "career", 4, [5, 5, 5])]
    },
    gain: {
      note: "Under the prior rules, every Group I (career) employee ranked ahead of every Group II (career-conditional) employee, so both veterans here ranked below both nonveterans. Under the final rule, tenure only breaks ties: a career-conditional veteran with a 30 percent disability and three Outstanding ratings (26) now ranks first, and the career-conditional veteran with three Exceeds Fully Successful ratings (18) passes a career nonveteran with 17 (91 Fed. Reg. at 49,183).",
      emps: [emp(1, "Veteran, 30% disability", "AD", "cc", 2, [5, 5, 5]), emp(2, "Nonveteran", "B", "career", 12, [5, 4, 4]),
             emp(3, "Veteran", "A", "cc", 2, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 20, [3, 3, 3])]
    },
    prob: {
      note: "Under the prior rules, a veteran serving an initial probationary period competed in Group II with preference. Under the final rule, that veteran is not ranked, and the agency may retain or release the employee outside the retention order (91 Fed. Reg. at 49,178-79). Among those still ranked, the veteran with three Fully Successful ratings (12) falls below a career-conditional nonveteran with three Outstanding ratings (21).",
      emps: [emp(1, "Veteran, 30% disability", "AD", "prob", 1, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 10, [4, 4, 4]),
             emp(3, "Veteran", "A", "cc", 2, [3, 3, 3]), emp(4, "Nonveteran", "B", "cc", 2, [5, 5, 5])]
    }
  };
  var EDITED = "You have changed the employees. The prior order sorts by tenure group and preference subgroup before performance; the final rule sorts by score first, then tenure subgroup, then length of service.";

  var state = { ex: "gap", emps: [] };
  var exBox = root.querySelector("#rg-examples");
  var noteBox = root.querySelector("#rg-example-note");
  var editors = root.querySelector("#rg-editors");

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pressGroup(box, attr, val) {
    Array.prototype.forEach.call(box.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute(attr) === String(val))); });
  }
  function loadExample(k) {
    state.ex = k;
    state.emps = EXAMPLES[k].emps.map(function (e) { return { id: e.id, label: e.label, pref: e.pref, tenure: e.tenure, years: e.years, r: e.r.slice() }; });
    pressGroup(exBox, "data-k", k);
    noteBox.textContent = EXAMPLES[k].note;
    buildEditors(); renderRegisters();
  }
  function edited() {
    state.ex = null; pressGroup(exBox, "data-k", "__none");
    noteBox.textContent = EDITED;
  }
  Array.prototype.forEach.call(exBox.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { loadExample(b.getAttribute("data-k")); });
  });

  function seg(labelText, idBase, opts, cur) {
    return '<div class="field"><span class="label" id="' + idBase + '-l">' + labelText + '</span><div class="seg" role="group" aria-labelledby="' + idBase + '-l">' +
      opts.map(function (o) {
        return '<button type="button" id="' + idBase + "-" + o[0] + '" data-v="' + o[0] + '" aria-pressed="' + (String(o[0]) === String(cur)) + '"' + (o[2] ? ' title="' + o[2] + '"' : "") + ">" + o[1] + "</button>";
      }).join("") + "</div></div>";
  }
  function buildEditors() {
    editors.innerHTML = state.emps.map(function (e, i) {
      var L = String.fromCharCode(65 + i), id = "rg-e" + e.id;
      var ratingRows = [0, 1, 2].map(function (k) {
        var rid = id + "-r" + k;
        return '<div class="ratingrow"><span class="rl" id="' + rid + '-l">' + ["Most recent", "Second", "Third"][k] + '</span><div class="seg" role="group" aria-labelledby="' + rid + '-l">' +
          [5, 4, 3, 2].map(function (lv) { return '<button type="button" id="' + rid + "-" + lv + '" data-r="' + k + '" data-v="' + lv + '" aria-label="Level ' + lv + '" aria-pressed="' + (e.r[k] === lv) + '">' + lv + "</button>"; }).join("") +
          "</div></div>";
      }).join("");
      return '<div class="emp" data-id="' + e.id + '">' +
        '<div class="namerow"><span class="letter" aria-hidden="true">' + L + '</span><input type="text" id="' + id + '-name" maxlength="40" value="' + esc(e.label) + '" aria-label="Employee ' + L + ' description"></div>' +
        seg("Veterans’ preference", id + "-pref", [["B", "None"], ["A", "+3 (A)", "Preference eligible"], ["AD", "+5 (AD)", "Compensable service-connected disability of 30 percent or more"]], e.pref) +
        seg("Tenure", id + "-ten", [["career", "Career"], ["cc", "Career-cond.", "Career-conditional"], ["prob", "Probation", "Serving an initial probationary period"]], e.tenure) +
        '<div class="field"><label class="label" for="' + id + '-yrs">Years of service</label><div class="years"><input type="number" id="' + id + '-yrs" min="0" max="45" step="1" inputmode="numeric" value="' + e.years + '"><span>years</span></div></div>' +
        '<div class="field"><span class="label">Ratings of record</span><div class="ratings">' + ratingRows + "</div></div></div>";
    }).join("");
  }
  editors.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    var card = b.closest(".emp"), e = state.emps.filter(function (x) { return String(x.id) === card.getAttribute("data-id"); })[0];
    if (!e) return;
    var id = b.id, v = b.getAttribute("data-v");
    if (b.hasAttribute("data-r")) e.r[+b.getAttribute("data-r")] = +v;
    else if (id.indexOf("-pref-") > -1) e.pref = v;
    else if (id.indexOf("-ten-") > -1) e.tenure = v;
    edited(); buildEditors(); renderRegisters();
    var again = document.getElementById(id); if (again) again.focus();
  });
  editors.addEventListener("input", function (ev) {
    var t = ev.target, card = t.closest(".emp"); if (!card) return;
    var e = state.emps.filter(function (x) { return String(x.id) === card.getAttribute("data-id"); })[0];
    if (t.type === "text") { e.label = t.value || "Employee"; renderRegisters(); return; }
    if (t.type === "number") { var v = parseInt(t.value, 10); if (isNaN(v)) return; e.years = Math.max(0, Math.min(45, v)); edited(); renderRegisters(); }
  });

  function tags(e) {
    return '<span class="tags"><span class="tag' + (e.pref !== "B" ? " v" : "") + '">' + PREF[e.pref].code + '</span><span class="tag">' + TENURE[e.tenure].label + "</span></span>";
  }
  function renderRegisters() {
    var all = state.emps;
    var oldR = rank(all, oldKey);
    var ranked = all.filter(function (e) { return TENURE[e.tenure].newSub !== null; });
    var excluded = all.filter(function (e) { return TENURE[e.tenure].newSub === null; });
    var newR = rank(ranked, newKey);
    var oldIdx = {};
    oldR.filter(function (o) { return TENURE[o.e.tenure].newSub !== null; }).forEach(function (o, i) { oldIdx[o.e.id] = i; });
    root.querySelector("#rg-old").innerHTML = oldR.map(function (o) {
      var e = o.e;
      return '<li class="regrow"><span class="rank">' + (o.tied ? "=" : "") + o.rank + '</span><span class="who"><span class="nm">' + esc(e.label) + "</span>" + tags(e) +
        '</span><span class="metric"><span class="big">Group ' + (TENURE[e.tenure].oldGroup === 1 ? "I" : "II") + ", " + PREF[e.pref].code + '</span><span class="sub">' + oldAdj(e) + " years adjusted service</span></span></li>";
    }).join("");
    root.querySelector("#rg-new").innerHTML = newR.map(function (o, i) {
      var e = o.e, d = oldIdx[e.id] - i, pp = PREF[e.pref].pts;
      var mv = d > 0 ? '<span class="move up">&#9650; up ' + d + "</span>" : d < 0 ? '<span class="move down">&#9660; down ' + (-d) + "</span>" : '<span class="move">no change</span>';
      return '<li class="regrow"><span class="rank">' + (o.tied ? "=" : "") + o.rank + '</span><span class="who"><span class="nm">' + esc(e.label) + "</span>" + tags(e) +
        '</span><span class="metric"><span class="big">' + newScore(e) + ' points</span><span class="sub">' + ratingPts(e) + (pp ? " + " + pp : "") + ", " + e.years + " years</span>" + mv + "</span></li>";
    }).join("");
    var ex = root.querySelector("#rg-excluded");
    if (excluded.length) {
      ex.hidden = false;
      ex.innerHTML = excluded.map(function (e) { return esc(e.label) + ": on initial probation, so not ranked; the agency may retain or release this employee outside the retention order."; }).join("<br>");
    } else { ex.hidden = true; ex.textContent = ""; }
  }

  /* ---------------------------------------------------------------- ratings model */
  var SCEN = {
    A: { p: [30, 30, 39], name: "Scenario A", note: "Scenario A approximates the compressed distributions documented before the cap: 30, 30, and 39 percent at Levels 5, 4, and 3. GAO found that about 61 percent of permanent non-Senior Executive Service employees received one of the top two ratings in 2013 (SEA 2026, 2), and, by ARA’s calculation, 75 to 79 percent of the Department of Labor’s rated employees received Level 4 or Level 5 ratings in fiscal years 2022 through 2025 (DOL 2026, 4, Table 2)." },
    B: { p: [15, 25, 59], name: "Scenario B", note: "Scenario B assumes agencies rate right up to OPM’s fiscal year 2026 cap, which limits Level 4 and Level 5 ratings to a combined 40 percent and sets no separate limit for either level (OPM 2026c, 2). The split of 15 percent at Level 5 and 25 percent at Level 4, with 59 percent at Level 3, is ARA’s assumption." },
    C: { p: [7, 13, 79], name: "Scenario C", note: "Scenario C assumes a tighter distribution: 7 percent at Level 5, 13 percent at Level 4, and 79 percent at Level 3." },
    D: { p: [20, 0, 79], name: "Scenario D", note: "Scenario D models Pattern B, a three-level system with no Level 4: 20 percent Outstanding and 79 percent Fully Successful. A single step up is worth 4 points, more than the 3-point credit." },
    X: { p: null, name: "your distribution", note: "Set your own shares for Levels 5 and 4. Level 3 receives the remainder, and 1 percent of ratings stay at Level 1, as in the report’s model." }
  };
  var ms = { sc: "A", cr: 3 };
  var scBox = root.querySelector("#rg-scenarios"), crBox = root.querySelector("#rg-credit");
  var in5 = root.querySelector("#rg-p5"), in4 = root.querySelector("#rg-p4");
  var chartBox = root.querySelector("#rg-chart");
  var lastChart = null;

  function shares() {
    if (SCEN[ms.sc].p) { var p = SCEN[ms.sc].p; return { 5: p[0], 4: p[1], 3: p[2], 1: 1 }; }
    var a = parseInt(in5.value, 10) || 0, b = Math.min(parseInt(in4.value, 10) || 0, 99 - a);
    return { 5: a, 4: b, 3: 99 - a - b, 1: 1 };
  }
  function dist3(sh) {
    var one = [[7, sh[5] / 100], [5, sh[4] / 100], [3, sh[3] / 100], [0, sh[1] / 100]], d = [];
    for (var i = 0; i < 22; i++) d.push(0);
    one.forEach(function (a) { one.forEach(function (b) { one.forEach(function (c) { d[a[0] + b[0] + c[0]] += a[1] * b[1] * c[1]; }); }); });
    return d;
  }
  function metrics(d, cr) {
    var v = 9 + cr, share = 0, typ = 0, a, b;
    for (a = 0; a < v; a++) share += d[a];
    for (a = 0; a < 22; a++) for (b = 0; b < 22; b++) if (a + cr > b) typ += d[a] * d[b];
    return { v: v, share: share, typ: typ };
  }
  function renderModel() {
    pressGroup(scBox, "data-k", ms.sc); pressGroup(crBox, "data-cr", ms.cr);
    root.querySelector("#rg-custom").hidden = ms.sc !== "X";
    root.querySelector("#rg-sc-note").textContent = SCEN[ms.sc].note;
    var sh = shares();
    root.querySelector("#rg-p5v").textContent = sh[5] + " percent";
    root.querySelector("#rg-p4v").textContent = sh[4] + " percent";
    var parts = [[5, "Level 5", "var(--rg-seq-4)"], [4, "Level 4", "var(--rg-seq-3)"], [3, "Level 3", "var(--rg-seq-2)"], [1, "Level 1", "var(--rg-seq-1)"]];
    root.querySelector("#rg-distbar").innerHTML = '<span class="label">Share of ratings at each level</span><div class="bar" aria-hidden="true">' +
      parts.filter(function (p) { return sh[p[0]] > 0; }).map(function (p) { return '<span style="flex:' + sh[p[0]] + ' 1 0;background:' + p[2] + '"></span>'; }).join("") +
      '</div><p class="lab">' + parts.map(function (p) { return '<span><i style="background:' + p[2] + '"></i>' + p[1] + ": " + sh[p[0]] + " percent</span>"; }).join("") + "</p>";
    var d = dist3(sh), m = metrics(d, ms.cr);
    root.querySelector("#rg-ro-share").textContent = Math.round(m.share * 100) + "%";
    root.querySelector("#rg-ro-typ").textContent = Math.round(m.typ * 100) + "%";
    root.querySelector("#rg-chart-title").textContent = "Figure 1. Scores of nonveteran competitors under " + SCEN[ms.sc].name + ", and where a veteran with three Fully Successful ratings lands (9 + " + ms.cr + " = " + m.v + " points)";
    Array.prototype.forEach.call(root.querySelectorAll("#rg-table tbody tr"), function (tr) { tr.classList.toggle("on", tr.getAttribute("data-sc") === ms.sc); });
    drawChart(d, m.v);
  }
  Array.prototype.forEach.call(scBox.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { ms.sc = b.getAttribute("data-k"); renderModel(); }); });
  Array.prototype.forEach.call(crBox.querySelectorAll("button"), function (b) { b.addEventListener("click", function () { ms.cr = +b.getAttribute("data-cr"); renderModel(); }); });
  [in5, in4].forEach(function (inp) {
    inp.addEventListener("input", function () {
      var a = +in5.value, b = +in4.value;
      if (a + b > 99) { if (inp === in5) in4.value = 99 - a; else in5.value = 99 - b; }
      renderModel();
    });
  });

  var tip = document.createElement("div");
  tip.className = "tip"; tip.hidden = true; tip.setAttribute("role", "status");
  function niceMax(x) { var s = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1]; for (var i = 0; i < s.length; i++) if (x <= s[i]) return s[i]; return 1; }
  function drawChart(d, v) {
    lastChart = [d, v];
    if (!chartBox.clientWidth) return;
    var W = Math.max(290, chartBox.clientWidth), narrow = W < 480;
    var H = narrow ? 240 : 290, m = { t: 34, r: 6, b: 40, l: 42 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, ymax = niceMax(Math.max.apply(null, d));
    var step = ymax <= 0.2 ? 0.05 : ymax <= 0.4 ? 0.1 : 0.2;
    var slot = iw / 22, bw = Math.min(22, Math.max(4, slot - 3));
    function X(s) { return m.l + slot * s + slot / 2; }
    function Y(p) { return m.t + ih - (p / ymax) * ih; }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Bar chart of nonveteran scores from 0 to 21 points, with the veteran’s score of ' + v + ' marked">';
    s += '<defs><pattern id="rg-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="g-hatch-bg" width="5" height="5"/><rect class="g-hatch-line" width="2" height="5"/></pattern></defs>';
    for (var t = 0; t <= ymax + 1e-9; t += step) {
      s += '<line class="g-grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/>';
      s += '<text class="g-tick" x="' + (m.l - 7) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + Math.round(t * 100) + "%</text>";
    }
    (narrow ? [0, 6, 12, 18, 21] : [0, 3, 6, 9, 12, 15, 18, 21]).forEach(function (k) {
      s += '<text class="g-tick" x="' + X(k) + '" y="' + (m.t + ih + 18) + '" text-anchor="middle">' + k + "</text>";
    });
    s += '<text class="g-tick" x="' + (m.l + iw / 2) + '" y="' + (H - 2) + '" text-anchor="middle">Nonveteran score (points)</text>';
    for (var k = 0; k < 22; k++) {
      if (d[k] < 0.0005) continue;
      var x0 = X(k) - bw / 2, y0 = Y(d[k]), h = m.t + ih - y0, rr = Math.min(3, h, bw / 2);
      var cls = k < v ? "g-bar-vet" : k === v ? "g-bar-tie" : "g-bar-non";
      s += '<path class="' + cls + '" d="M' + x0 + "," + (m.t + ih) + " V" + (y0 + rr) + " Q" + x0 + "," + y0 + " " + (x0 + rr) + "," + y0 + " H" + (x0 + bw - rr) +
        " Q" + (x0 + bw) + "," + y0 + " " + (x0 + bw) + "," + (y0 + rr) + " V" + (m.t + ih) + ' Z"/>';
    }
    s += '<line class="g-axis" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih) + '" y2="' + (m.t + ih) + '"/>';
    var vx = X(v), right = vx > W * 0.62;
    s += '<line class="g-marker" x1="' + vx + '" x2="' + vx + '" y1="' + (m.t - 10) + '" y2="' + (m.t + ih) + '"/>';
    s += '<text class="g-mlabel" x="' + (vx + (right ? -6 : 6)) + '" y="' + (m.t - 14) + '" text-anchor="' + (right ? "end" : "start") + '">Veteran, ' + v + " points</text>";
    for (var j = 0; j < 22; j++) {
      if (d[j] < 0.0005) continue;
      s += '<rect class="hit" data-s="' + j + '" x="' + (m.l + slot * j) + '" y="' + m.t + '" width="' + slot + '" height="' + ih + '" tabindex="0" aria-label="' + j + " points: " + (d[j] * 100).toFixed(1) + ' percent of nonveterans"/>';
    }
    chartBox.innerHTML = s + "</svg>";
    chartBox.appendChild(tip);
    Array.prototype.forEach.call(chartBox.querySelectorAll(".hit"), function (r) {
      function show() {
        var sc = +r.getAttribute("data-s"), p = d[sc] * 100;
        tip.innerHTML = "<b>" + sc + " points.</b> " + (p < 10 ? p.toFixed(1) : p.toFixed(0)) + " percent of nonveterans. " +
          (sc < v ? "The veteran ranks ahead." : sc === v ? "Tied with the veteran." : "These nonveterans rank ahead of the veteran.");
        tip.hidden = false;
        var k2 = chartBox.clientWidth / W;
        tip.style.left = Math.max(115, Math.min(chartBox.clientWidth - 115, X(sc) * k2)) + "px";
        tip.style.top = (Y(d[sc]) * k2) + "px";
      }
      r.addEventListener("mouseenter", show); r.addEventListener("focus", show); r.addEventListener("click", show);
      r.addEventListener("mouseleave", function () { tip.hidden = true; }); r.addEventListener("blur", function () { tip.hidden = true; });
    });
  }
  if (window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function () {
      var w = chartBox.clientWidth;
      if (lastChart && w && Math.abs(w - lastW) > 2) { lastW = w; drawChart(lastChart[0], lastChart[1]); }
    }).observe(chartBox);
  }

  /* ---------------------------------------------------------------- start */
  root.classList.add("js");
  loadExample("gap");
  renderModel();
  var start = location.hash.replace("#", "");
  openTab(panels.some(function (p) { return p.id === start; }) ? start : "overview", { hash: !!start && panels.some(function (p) { return p.id === start; }) });
})();
