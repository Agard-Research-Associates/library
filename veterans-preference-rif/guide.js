// Interactive parts of "Veterans' Preference in Federal Reductions in Force."
// Ranks sample employees under the prior and final RIF rules and computes the ratings model
// in Section 4.2 of the ARA report. Everything else on the page works without this script.
(function () {
  "use strict";
  var root = document.querySelector("[data-rif-guide]");
  if (!root) return;

  /* ---------------------------------------------------------------- rules */
  // Final rule: points per rating of record (5 C.F.R. 351.503(a)).
  var PTS = { 5: 7, 4: 5, 3: 3, 2: 0 };
  // Prior rule: additional years of service credit per rating (5 C.F.R. 351.504 (2025)).
  var OLD_CREDIT = { 5: 20, 4: 16, 3: 12, 2: 0 };
  var PREF = {
    B:  { pts: 0, order: 2, code: "B" },
    A:  { pts: 3, order: 1, code: "A" },
    AD: { pts: 5, order: 0, code: "AD" }
  };
  var TENURE = {
    career: { oldGroup: 1, newSub: 1, label: "Career" },
    cc:     { oldGroup: 2, newSub: 2, label: "Career-conditional" },
    prob:   { oldGroup: 2, newSub: null, label: "Initial probation" }
  };

  function ratingPts(e) { return PTS[e.r[0]] + PTS[e.r[1]] + PTS[e.r[2]]; }
  function newScore(e) { return ratingPts(e) + PREF[e.pref].pts; }
  // The prior regulation averages the credits and rounds a fraction up to the next whole year.
  function oldCredit(e) { return Math.ceil((OLD_CREDIT[e.r[0]] + OLD_CREDIT[e.r[1]] + OLD_CREDIT[e.r[2]]) / 3 - 1e-9); }
  function oldAdj(e) { return e.years + oldCredit(e); }
  function oldKey(e) { return [TENURE[e.tenure].oldGroup, PREF[e.pref].order, -oldAdj(e)]; }
  function newKey(e) { return [-newScore(e), TENURE[e.tenure].newSub, -e.years]; }
  function cmp(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; }
  function rank(list, keyFn) {
    var s = list.slice().sort(function (x, y) { return cmp(keyFn(x), keyFn(y)) || x.id - y.id; });
    var out = [], r = 0;
    s.forEach(function (e, i) {
      if (i === 0 || cmp(keyFn(e), keyFn(s[i - 1])) !== 0) r = i + 1;
      out.push({ e: e, rank: r });
    });
    out.forEach(function (o) { o.tied = out.filter(function (p) { return p.rank === o.rank; }).length > 1; });
    return out;
  }

  /* ---------------------------------------------------------------- examples */
  function emp(id, label, pref, tenure, years, r) { return { id: id, label: label, pref: pref, tenure: tenure, years: years, r: r }; }
  var EXAMPLES = {
    gap: {
      note: "Under the prior rules, both veterans rank above both nonveterans because preference is sorted before performance. Under the final rule, the veteran with a 30 percent disability and three Fully Successful ratings falls from first to last: a score of 14 is below the 15 earned by a nonveteran with three Exceeds Fully Successful ratings. A one-level difference held across three ratings is worth 6 points, more than either credit.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 20, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 8, [4, 4, 4]),
             emp(3, "Veteran", "A", "career", 12, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 15, [5, 5, 5])]
    },
    holds: {
      note: "OPM used comparisons like these to show that the credit still matters (91 Fed. Reg. at 49,181-82). The veteran with a 30 percent disability (15 + 5 = 20) stays ahead of a nonveteran rated Outstanding twice (19), and the veteran with the 3-point credit (18) stays ahead of a nonveteran rated Outstanding once (17). The same 3-point veteran falls below the nonveteran rated Outstanding twice, which could not happen within a tenure group under the prior rules.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 10, [4, 4, 4]), emp(2, "Nonveteran", "B", "career", 10, [5, 5, 4]),
             emp(3, "Veteran", "A", "career", 10, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 10, [5, 4, 4])]
    },
    accepted: {
      note: "Commenters raised both of these outcomes, and OPM accepted them in the final rule (91 Fed. Reg. at 49,183). A nonveteran with three Outstanding ratings (21) outranks a disabled veteran with three Fully Successful ratings (14 with the 5-point credit), and a nonveteran with three Outstanding ratings and 4 years of service outranks a veteran with ratings of 4, 4, and 5 and 40 years of service (20). OPM called the second outcome “a feature of a system designed to give meaningful effect to both veterans’ preference and performance.” The two nonveterans tie on score and tenure, so length of service orders them.",
      emps: [emp(1, "Veteran, 30% disability", "AD", "career", 15, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 10, [5, 5, 5]),
             emp(3, "Veteran, 40 years", "A", "career", 40, [4, 4, 5]), emp(4, "Nonveteran, 4 years", "B", "career", 4, [5, 5, 5])]
    },
    gain: {
      note: "Under the prior rules, every Group I (career) employee ranked ahead of every Group II (career-conditional) employee, so both veterans here ranked below both nonveterans. Under the final rule, tenure only breaks ties. A career-conditional veteran with a 30 percent disability and three Outstanding ratings (26), as in OPM’s example, now ranks first, and the career-conditional veteran with three Exceeds Fully Successful ratings (18) passes a career nonveteran with 17 (91 Fed. Reg. at 49,183).",
      emps: [emp(1, "Veteran, 30% disability", "AD", "cc", 2, [5, 5, 5]), emp(2, "Nonveteran", "B", "career", 12, [5, 4, 4]),
             emp(3, "Veteran", "A", "cc", 2, [4, 4, 4]), emp(4, "Nonveteran", "B", "career", 20, [3, 3, 3])]
    },
    prob: {
      note: "Under the prior rules, a veteran serving an initial probationary period competed in Group II with preference. Under the final rule, that veteran is not ranked, and the agency may retain or release the employee outside the retention order (91 Fed. Reg. at 49,178-79). Among those still ranked, the veteran with three Fully Successful ratings (12) falls below a career-conditional nonveteran with three Outstanding ratings (21).",
      emps: [emp(1, "Veteran, 30% disability", "AD", "prob", 1, [3, 3, 3]), emp(2, "Nonveteran", "B", "career", 10, [4, 4, 4]),
             emp(3, "Veteran", "A", "cc", 2, [3, 3, 3]), emp(4, "Nonveteran", "B", "cc", 2, [5, 5, 5])]
    }
  };
  var EDITED_NOTE = "You have changed the worksheet. Table 3 sorts by tenure group and preference subgroup before performance; Table 4 sorts by score first, then tenure, then length of service.";

  var emps = [];
  var exampleSel = root.querySelector("#rif-example");
  var noteBox = root.querySelector("#rif-example-note");
  var sheet = root.querySelector("#rif-worksheet tbody");
  var oldBody = root.querySelector("#rif-old tbody");
  var newBody = root.querySelector("#rif-new tbody");

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function opt(v, t, cur) { return '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>"; }

  function loadExample(key) {
    var ex = EXAMPLES[key];
    emps = ex.emps.map(function (e) { return { id: e.id, label: e.label, pref: e.pref, tenure: e.tenure, years: e.years, r: e.r.slice() }; });
    noteBox.textContent = ex.note;
    buildSheet();
    renderRegisters();
  }

  function buildSheet() {
    sheet.innerHTML = emps.map(function (e, i) {
      var id = "rif-e" + e.id;
      var ratingCells = [0, 1, 2].map(function (k) {
        return '<td><select id="' + id + "-r" + k + '" data-k="r' + k + '" aria-label="Rating ' + (k + 1) + (k === 0 ? " (most recent)" : "") + ", employee " + (i + 1) + '">' +
          opt(5, "5", e.r[k]) + opt(4, "4", e.r[k]) + opt(3, "3", e.r[k]) + opt(2, "2", e.r[k]) + "</select></td>";
      }).join("");
      return '<tr data-id="' + e.id + '">' +
        '<td><input type="text" id="' + id + '-name" data-k="label" maxlength="40" value="' + esc(e.label) + '" aria-label="Employee ' + (i + 1) + ' description"></td>' +
        '<td><select id="' + id + '-pref" data-k="pref" aria-label="Veterans’ preference, employee ' + (i + 1) + '">' +
          opt("B", "None (B)", e.pref) + opt("A", "+3 (A)", e.pref) + opt("AD", "+5 (AD)", e.pref) + "</select></td>" +
        '<td><select id="' + id + '-ten" data-k="tenure" aria-label="Tenure, employee ' + (i + 1) + '">' +
          opt("career", "Career", e.tenure) + opt("cc", "Career-conditional", e.tenure) + opt("prob", "Initial probation", e.tenure) + "</select></td>" +
        '<td><input type="number" id="' + id + '-yrs" data-k="years" min="0" max="45" step="1" inputmode="numeric" value="' + e.years + '" aria-label="Years of service, employee ' + (i + 1) + '"></td>' +
        ratingCells + "</tr>";
    }).join("");
  }

  sheet.addEventListener("input", onEdit);
  sheet.addEventListener("change", onEdit);
  function onEdit(ev) {
    var t = ev.target, tr = t.closest("tr");
    if (!tr) return;
    var e = emps.filter(function (x) { return String(x.id) === tr.getAttribute("data-id"); })[0];
    var k = t.getAttribute("data-k");
    if (!e || !k) return;
    if (k === "label") { e.label = t.value || "Employee"; renderRegisters(); return; }
    if (k === "years") { var v = parseInt(t.value, 10); if (isNaN(v)) return; e.years = Math.max(0, Math.min(45, v)); }
    else if (k === "pref" || k === "tenure") e[k] = t.value;
    else if (k.charAt(0) === "r") e.r[+k.charAt(1)] = parseInt(t.value, 10);
    noteBox.textContent = EDITED_NOTE;
    renderRegisters();
  }
  exampleSel.addEventListener("change", function () { loadExample(exampleSel.value); });

  function renderRegisters() {
    var oldR = rank(emps, oldKey);
    var ranked = emps.filter(function (e) { return TENURE[e.tenure].newSub !== null; });
    var excluded = emps.filter(function (e) { return TENURE[e.tenure].newSub === null; });
    var newR = rank(ranked, newKey);
    var oldIdx = {};
    oldR.filter(function (o) { return TENURE[o.e.tenure].newSub !== null; }).forEach(function (o, i) { oldIdx[o.e.id] = i; });

    oldBody.innerHTML = oldR.map(function (o) {
      var e = o.e;
      return "<tr><td class=\"rank\">" + (o.tied ? "=" : "") + o.rank + "</td><td>" + esc(e.label) + "</td><td>" +
        (TENURE[e.tenure].oldGroup === 1 ? "I" : "II") + "</td><td>" + PREF[e.pref].code + '</td><td class="n">' + oldAdj(e) + "</td></tr>";
    }).join("");

    newBody.innerHTML = newR.map(function (o, i) {
      var e = o.e, d = oldIdx[e.id] - i;
      var ch = d > 0 ? '<span class="change-up">Up ' + d + "</span>" : d < 0 ? '<span class="change-down">Down ' + (-d) + "</span>" : "Same";
      return "<tr><td class=\"rank\">" + (o.tied ? "=" : "") + o.rank + "</td><td>" + esc(e.label) + '</td><td class="n">' + ratingPts(e) +
        '</td><td class="n">' + (PREF[e.pref].pts ? "+" + PREF[e.pref].pts : "0") + '</td><td class="n"><b>' + newScore(e) + "</b></td><td>" + ch + "</td></tr>";
    }).join("") + excluded.map(function (e) {
      return '<tr class="excluded"><td class="rank"></td><td colspan="5">' + esc(e.label) + ": on initial probation and not ranked; the agency may retain or release this employee outside the retention order.</td></tr>";
    }).join("");
  }

  /* ---------------------------------------------------------------- ratings model (report Section 4.2) */
  var SCEN = {
    A: { p: [30, 30, 39], note: "Scenario A approximates the compressed distributions documented before the cap. GAO found that about 61 percent of permanent non-Senior Executive Service employees received one of the top two ratings in 2013 (SEA 2026, 2), and, by ARA’s calculation, 75 to 79 percent of the Department of Labor’s rated employees received Level 4 or Level 5 ratings in fiscal years 2022 through 2025 (DOL 2026, 4)." },
    B: { p: [15, 25, 59], note: "Scenario B places OPM’s fiscal year 2026 cap at its ceiling: 15 percent at Level 5 and 25 percent at Level 4, together 40 percent, with 59 percent at Level 3 (OPM 2026c, 2)." },
    C: { p: [7, 13, 79], note: "Scenario C assumes a tighter distribution: 7 percent at Level 5, 13 percent at Level 4, and 79 percent at Level 3." },
    D: { p: [20, 0, 79], note: "Scenario D models Pattern B, a three-level system with no Level 4: 20 percent Outstanding and 79 percent Fully Successful. A single step up is worth 4 points, more than the 3-point credit." },
    X: { p: null, note: "Enter your own shares for Levels 5 and 4. Level 3 receives the remainder, and 1 percent of ratings remain at Level 1, as in the report’s model." }
  };
  var NAMES = { A: "Scenario A", B: "Scenario B", C: "Scenario C", D: "Scenario D", X: "your distribution" };
  var scenSel = root.querySelector("#rif-scenario");
  var customBox = root.querySelector("#rif-custom");
  var in5 = root.querySelector("#rif-p5"), in4 = root.querySelector("#rif-p4"), out3 = root.querySelector("#rif-p3");
  var scenNote = root.querySelector("#rif-scenario-note");
  var resultBox = root.querySelector("#rif-result");
  var chartBox = root.querySelector("#rif-chart");
  var ms = { sc: "A", cr: 3 };

  function shares() {
    if (SCEN[ms.sc].p) { var p = SCEN[ms.sc].p; return { 5: p[0], 4: p[1], 3: p[2], 1: 1 }; }
    var a = Math.max(0, Math.min(99, parseInt(in5.value, 10) || 0));
    var b = Math.max(0, Math.min(99 - a, parseInt(in4.value, 10) || 0));
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
  function pct(x) { return Math.round(x * 100) + " percent"; }

  function renderModel() {
    customBox.hidden = ms.sc !== "X";
    scenNote.textContent = SCEN[ms.sc].note;
    var sh = shares();
    if (ms.sc === "X") out3.textContent = sh[3] + " percent at Level 3, 1 percent at Level 1";
    var d = dist3(sh), m = metrics(d, ms.cr);
    resultBox.innerHTML = "Under " + NAMES[ms.sc] + ", with the " + ms.cr + "-point credit, a veteran with three Fully Successful ratings scores " + m.v +
      " and outranks <b>" + pct(m.share) + "</b> of nonveteran competitors. A typical veteran ranks ahead of a typical nonveteran <b>" + pct(m.typ) +
      "</b> of the time. Under the prior rules, a veteran rated acceptable ranked ahead of every nonveteran in the same tenure group.";
    Array.prototype.forEach.call(root.querySelectorAll("#rif-table5 tbody tr"), function (tr) {
      tr.classList.toggle("on", tr.getAttribute("data-sc") === ms.sc);
    });
    drawChart(d, m.v);
  }
  scenSel.addEventListener("change", function () { ms.sc = scenSel.value; renderModel(); });
  Array.prototype.forEach.call(root.querySelectorAll('input[name="rif-credit"]'), function (r) {
    r.addEventListener("change", function () { if (r.checked) { ms.cr = parseInt(r.value, 10); renderModel(); } });
  });
  [in5, in4].forEach(function (inp) {
    inp.addEventListener("input", function () {
      var a = parseInt(in5.value, 10) || 0, b = parseInt(in4.value, 10) || 0;
      if (a + b > 99) { if (inp === in5) in4.value = Math.max(0, 99 - a); else in5.value = Math.max(0, 99 - b); }
      renderModel();
    });
  });

  /* ---------------------------------------------------------------- figure 1 */
  var tip = document.createElement("div");
  tip.className = "tip"; tip.hidden = true; tip.setAttribute("role", "status");
  var last = null;
  function niceMax(x) { var s = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1]; for (var i = 0; i < s.length; i++) if (x <= s[i]) return s[i]; return 1; }
  function drawChart(d, v) {
    last = [d, v];
    var W = Math.max(300, chartBox.clientWidth || 700), narrow = W < 480;
    var H = narrow ? 240 : 290, m = { t: 34, r: 6, b: 40, l: 42 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, ymax = niceMax(Math.max.apply(null, d));
    var step = ymax <= 0.2 ? 0.05 : ymax <= 0.4 ? 0.1 : 0.2;
    var slot = iw / 22, bw = Math.min(22, Math.max(4, slot - 3));
    function X(s) { return m.l + slot * s + slot / 2; }
    function Y(p) { return m.t + ih - (p / ymax) * ih; }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Bar chart of nonveteran scores from 0 to 21 points, with the veteran’s score of ' + v + ' marked">';
    s += '<defs><pattern id="rif-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="g-hatch-bg" width="5" height="5"/><rect class="g-hatch-line" width="2" height="5"/></pattern></defs>';
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
      s += '<rect class="hit" data-s="' + j + '" x="' + (m.l + slot * j) + '" y="' + m.t + '" width="' + slot + '" height="' + ih + '" tabindex="0" aria-label="' + j + ' points: ' + (d[j] * 100).toFixed(1) + ' percent of nonveterans"/>';
    }
    chartBox.innerHTML = s + "</svg>";
    chartBox.appendChild(tip);
    Array.prototype.forEach.call(chartBox.querySelectorAll(".hit"), function (r) {
      function show() {
        var sc = +r.getAttribute("data-s"), p = d[sc] * 100;
        tip.innerHTML = "<b>" + sc + " points.</b> " + (p < 10 ? p.toFixed(1) : p.toFixed(0)) + " percent of nonveterans. " +
          (sc < v ? "The veteran ranks ahead." : sc === v ? "Tied with the veteran." : "These nonveterans rank ahead of the veteran.");
        tip.hidden = false;
        var sc2 = chartBox.clientWidth / W;
        tip.style.left = Math.max(110, Math.min(chartBox.clientWidth - 110, X(sc) * sc2)) + "px";
        tip.style.top = (Y(d[sc]) * sc2) + "px";
      }
      r.addEventListener("mouseenter", show); r.addEventListener("focus", show); r.addEventListener("click", show);
      r.addEventListener("mouseleave", function () { tip.hidden = true; }); r.addEventListener("blur", function () { tip.hidden = true; });
    });
  }
  if (window.ResizeObserver) {
    var lastW = 0;
    new ResizeObserver(function () {
      var w = chartBox.clientWidth;
      if (last && Math.abs(w - lastW) > 2) { lastW = w; drawChart(last[0], last[1]); }
    }).observe(chartBox);
  }

  /* ---------------------------------------------------------------- start */
  root.classList.add("js");
  loadExample(exampleSel.value || "gap");
  renderModel();
})();
