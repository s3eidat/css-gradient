/* CSS Gradient — visual gradient builder. CSS output + canvas PNG export, all local. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$, h = S3.h;

  var PRESETS = [
    ["Sunset", { type: "linear", angle: 135, stops: [["#ff7e5f", 0], ["#feb47b", 100]] }],
    ["Ocean", { type: "linear", angle: 120, stops: [["#2193b0", 0], ["#6dd5ed", 100]] }],
    ["Lagoon", { type: "linear", angle: 135, stops: [["#0e9f9a", 0], ["#3dd6d0", 100]] }],
    ["Violet", { type: "linear", angle: 135, stops: [["#7f00ff", 0], ["#e100ff", 100]] }],
    ["Mango", { type: "linear", angle: 90, stops: [["#ffe259", 0], ["#ffa751", 100]] }],
    ["Night", { type: "linear", angle: 160, stops: [["#0f2027", 0], ["#203a43", 50], ["#2c5364", 100]] }],
    ["Aurora", { type: "linear", angle: 120, stops: [["#00c9a7", 0], ["#845ec2", 50], ["#ff6f91", 100]] }],
    ["Peach", { type: "linear", angle: 45, stops: [["#ffecd2", 0], ["#fcb69f", 100]] }],
    ["Mint", { type: "linear", angle: 135, stops: [["#d4fc79", 0], ["#96e6a1", 100]] }],
    ["Ember", { type: "radial", shape: "ellipse", x: 50, y: 50, stops: [["#f9d423", 0], ["#ff4e50", 100]] }],
    ["Spotlight", { type: "radial", shape: "circle", x: 30, y: 30, stops: [["#ffffff", 0], ["#a1c4fd", 40], ["#4b6cb7", 100]] }],
    ["Spectrum", { type: "conic", angle: 0, x: 50, y: 50, stops: [["#ff0000", 0], ["#ffff00", 17], ["#00ff00", 33], ["#00ffff", 50], ["#0000ff", 67], ["#ff00ff", 83], ["#ff0000", 100]] }]
  ];

  // ---------- core ----------
  var uid = 0;
  function mkState(p) {
    return { type: p.type, angle: p.angle != null ? p.angle : 90, shape: p.shape || "ellipse", x: p.x != null ? p.x : 50, y: p.y != null ? p.y : 50,
      stops: p.stops.map(function (s) { return { id: ++uid, color: s[0], alpha: s[2] != null ? s[2] : 1, pos: s[1] }; }) };
  }
  function hexToRgb(hx) { var n = parseInt(hx.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbToHex(c) { return "#" + c.map(function (v) { return Math.round(v).toString(16).padStart(2, "0"); }).join(""); }
  function stopColor(s) { if (s.alpha >= 1) return s.color; var c = hexToRgb(s.color); return "rgba(" + c.join(", ") + ", " + Math.round(s.alpha * 100) / 100 + ")"; }
  function sorted(st) { return st.stops.slice().sort(function (a, b) { return a.pos - b.pos; }); }
  function stopList(st) { return sorted(st).map(function (s) { return stopColor(s) + " " + Math.round(s.pos * 10) / 10 + "%"; }).join(", "); }
  function gradient(st) {
    var c = st.x === 50 && st.y === 50 ? "" : " at " + st.x + "% " + st.y + "%";
    if (st.type === "radial") return "radial-gradient(" + st.shape + c + ", " + stopList(st) + ")";
    if (st.type === "conic") return "conic-gradient(from " + st.angle + "deg" + (c || " at 50% 50%") + ", " + stopList(st) + ")";
    return "linear-gradient(" + st.angle + "deg, " + stopList(st) + ")";
  }
  function cssText(st) { return "background: " + sorted(st)[0].color + ";\nbackground: " + gradient(st) + ";"; }
  // Colour at a position (0..100) between stops, used when the user clicks the bar to add a stop.
  function colorAt(st, pos) {
    var s = sorted(st);
    if (pos <= s[0].pos) return { color: s[0].color, alpha: s[0].alpha };
    for (var i = 1; i < s.length; i++) {
      if (pos <= s[i].pos) {
        var a = s[i - 1], b = s[i], t = b.pos === a.pos ? 0 : (pos - a.pos) / (b.pos - a.pos), ca = hexToRgb(a.color), cb = hexToRgb(b.color);
        return { color: rgbToHex(ca.map(function (v, k) { return v + (cb[k] - v) * t; })), alpha: Math.round((a.alpha + (b.alpha - a.alpha) * t) * 100) / 100 };
      }
    }
    var l = s[s.length - 1]; return { color: l.color, alpha: l.alpha };
  }
  // CSS linear-gradient line: 0deg points up, clockwise; length = |W sin a| + |H cos a| (CSS Images spec).
  function linearPoints(deg, W, H) {
    var a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * dx) + Math.abs(H * dy), cx = W / 2, cy = H / 2;
    return [cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2];
  }
  // farthest-corner radii (the CSS default size)
  function radialRadii(st, W, H) {
    var cx = st.x / 100 * W, cy = st.y / 100 * H;
    if (st.shape === "circle") { var r = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)); return [r, r]; }
    return [Math.max(cx, W - cx) * Math.SQRT2, Math.max(cy, H - cy) * Math.SQRT2];
  }
  function draw(st, canvas) {
    var W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d"), g, cx = st.x / 100 * W, cy = st.y / 100 * H;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (st.type === "linear") { var p = linearPoints(st.angle, W, H); g = ctx.createLinearGradient(p[0], p[1], p[2], p[3]); }
    else if (st.type === "conic") g = ctx.createConicGradient((st.angle - 90) * Math.PI / 180, cx, cy);
    else {
      var rr = radialRadii(st, W, H), k = rr[1] / rr[0];
      ctx.translate(cx, cy); ctx.scale(1, k || 1);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr[0]);
    }
    sorted(st).forEach(function (s) { g.addColorStop(Math.min(1, Math.max(0, s.pos / 100)), stopColor(s)); });
    ctx.fillStyle = g;
    if (st.type === "radial") { var kk = radialRadii(st, W, H); var k2 = kk[1] / kk[0] || 1; ctx.fillRect(-cx, -cy / k2, W, H / k2); }
    else ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---------- UI ----------
  var saved = S3.store("grad.state");
  var st = saved && saved.stops && saved.stops.length >= 2 ? saved : mkState(PRESETS[6][1]);
  st.stops.forEach(function (s) { if (!s.id) s.id = ++uid; uid = Math.max(uid, s.id); });
  var sel = st.stops[0].id;

  function selStop() { return st.stops.filter(function (s) { return s.id === sel; })[0] || st.stops[0]; }

  function render() {
    var g = gradient(st);
    $("#preview").style.background = g;
    $("#bar-fill").style.background = "linear-gradient(90deg, " + stopList(st) + ")";
    $("#css").textContent = cssText(st);
    $$("#type button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === st.type)); });
    $$("#shape button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === st.shape)); });
    $("#dial-wrap").hidden = st.type === "radial";
    $("#pos-box").hidden = st.type === "linear";
    $("#shape").hidden = st.type !== "radial";
    $("#knob").style.transform = "rotate(" + st.angle + "deg)";
    $("#dial").setAttribute("aria-valuenow", st.angle);
    if (document.activeElement !== $("#angle")) $("#angle").value = st.angle;
    $("#px").value = st.x; $("#py").value = st.y; $("#px-v").textContent = st.x + "%"; $("#py-v").textContent = st.y + "%";
    renderHandles(); renderEditor();
    S3.store("grad.state", st);
  }
  // Update handles in place while dragging so the pointer capture survives; rebuild only when stops are added/removed.
  function renderHandles() {
    var box = $("#handles"), els = $$(".handle", box);
    if (els.length !== st.stops.length || els.some(function (el, i) { return +el.dataset.id !== st.stops[i].id; })) {
      box.textContent = "";
      els = st.stops.map(function (s) { return box.appendChild(h("button", { "class": "handle", "data-id": s.id })); });
    }
    st.stops.forEach(function (s, i) {
      var el = els[i];
      el.classList.toggle("on", s.id === sel);
      el.style.left = s.pos + "%"; el.style.setProperty("--c", stopColor(s));
      el.setAttribute("aria-label", "Stop " + s.color + " at " + Math.round(s.pos) + "%");
      el.title = s.color + " · " + Math.round(s.pos) + "%";
    });
  }
  function renderEditor() {
    var s = selStop();
    $("#s-color").value = s.color;
    if (document.activeElement !== $("#s-hex")) $("#s-hex").value = s.color;
    if (document.activeElement !== $("#s-pos")) $("#s-pos").value = Math.round(s.pos * 10) / 10;
    $("#s-alpha").value = Math.round(s.alpha * 100);
    $("#s-del").disabled = st.stops.length <= 2;
  }

  // stops bar: add on click, drag handles
  var bar = $("#bar"), drag = null;
  function pctFromEvent(e) { var r = bar.getBoundingClientRect(); return Math.round(Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) * 10) / 10; }
  bar.addEventListener("pointerdown", function (e) {
    var hd = e.target.closest(".handle");
    if (hd) { sel = +hd.dataset.id; drag = { id: sel }; hd.setPointerCapture(e.pointerId); render(); return; }
    var pos = pctFromEvent(e), c = colorAt(st, pos), s = { id: ++uid, color: c.color, alpha: c.alpha, pos: pos };
    st.stops.push(s); sel = s.id; drag = { id: sel }; bar.setPointerCapture(e.pointerId); render();
  });
  bar.addEventListener("pointermove", function (e) { if (!drag) return; selStop().pos = pctFromEvent(e); render(); });
  bar.addEventListener("pointerup", function () { drag = null; });
  bar.addEventListener("pointercancel", function () { drag = null; });
  bar.addEventListener("keydown", function (e) {
    var hd = e.target.closest(".handle"); if (!hd) return;
    var s = selStop(), step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); s.pos = Math.min(100, Math.max(0, s.pos + (e.key === "ArrowLeft" ? -step : step))); }
    else if ((e.key === "Delete" || e.key === "Backspace") && st.stops.length > 2) { removeSel(); return; }
    else return;
    render(); $('.handle[data-id="' + sel + '"]').focus();
  });
  bar.addEventListener("focusin", function (e) { var hd = e.target.closest(".handle"); if (hd && +hd.dataset.id !== sel) { sel = +hd.dataset.id; renderEditor(); $$(".handle").forEach(function (x) { x.classList.toggle("on", x === hd); }); } });
  function removeSel() { st.stops = st.stops.filter(function (s) { return s.id !== sel; }); sel = st.stops[0].id; render(); }

  // stop editor
  $("#s-color").addEventListener("input", function () { selStop().color = this.value; render(); });
  $("#s-hex").addEventListener("input", function () {
    var v = this.value.trim().replace(/^#?/, "#").toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v.slice(1).split("").map(function (c) { return c + c; }).join("");
    if (/^#[0-9a-f]{6}$/.test(v)) { selStop().color = v; render(); }
  });
  $("#s-pos").addEventListener("input", function () { var v = parseFloat(this.value); if (!isNaN(v)) { selStop().pos = Math.min(100, Math.max(0, v)); render(); } });
  $("#s-alpha").addEventListener("input", function () { selStop().alpha = +this.value / 100; render(); });
  $("#s-del").addEventListener("click", function () { if (st.stops.length > 2) removeSel(); });

  // angle dial
  var dial = $("#dial"), turning = false;
  function angleFromEvent(e) { var r = dial.getBoundingClientRect(); var a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; a = Math.round((a + 360) % 360); return e.shiftKey ? Math.round(a / 15) * 15 % 360 : a; }
  dial.addEventListener("pointerdown", function (e) { turning = true; dial.setPointerCapture(e.pointerId); st.angle = angleFromEvent(e); render(); });
  dial.addEventListener("pointermove", function (e) { if (turning) { st.angle = angleFromEvent(e); render(); } });
  dial.addEventListener("pointerup", function () { turning = false; });
  dial.addEventListener("keydown", function (e) {
    var d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (!d) return;
    e.preventDefault(); st.angle = ((st.angle + d * (e.shiftKey ? 15 : 1)) % 360 + 360) % 360; render();
  });
  $("#angle").addEventListener("input", function () { var v = parseInt(this.value, 10); if (!isNaN(v)) { st.angle = ((v % 360) + 360) % 360; render(); } });

  function seg(id, key) { $$("#" + id + " button").forEach(function (b) { b.addEventListener("click", function () { st[key] = b.dataset.v; render(); }); }); }
  seg("type", "type"); seg("shape", "shape");
  $("#px").addEventListener("input", function () { st.x = +this.value; render(); });
  $("#py").addEventListener("input", function () { st.y = +this.value; render(); });

  // presets + random
  PRESETS.forEach(function (p, i) {
    $("#presets").appendChild(h("button", { "class": "preset", "data-i": i, title: p[0], "aria-label": "Preset " + p[0], style: "background:" + gradient(mkState(p[1])) }, [h("span", { text: p[0] })]));
  });
  $("#presets").addEventListener("click", function (e) { var b = e.target.closest(".preset"); if (!b) return; st = mkState(PRESETS[+b.dataset.i][1]); sel = st.stops[0].id; render(); });
  function hsl(hh, s, l) { function f(n) { var k = (n + hh / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); } return rgbToHex([f(0), f(8), f(4)]); }
  $("#random").addEventListener("click", function () {
    var base = Math.random() * 360, n = Math.random() < 0.6 ? 2 : 3, spread = 40 + Math.random() * 80, stops = [];
    for (var i = 0; i < n; i++) stops.push([hsl((base + i * spread / (n - 1)) % 360, 0.7 + Math.random() * 0.25, 0.5 + Math.random() * 0.15), Math.round(i * 100 / (n - 1))]);
    st = mkState({ type: st.type, angle: Math.round(Math.random() * 24) * 15, shape: st.shape, x: st.x, y: st.y, stops: stops }); sel = st.stops[0].id; render();
  });

  // output
  $("#copy").addEventListener("click", function () { S3.copy(cssText(st), "CSS copied"); S3.done(); });
  $("#png").addEventListener("click", function () {
    var W = Math.round(+$("#w").value), H = Math.round(+$("#h").value);
    if (!(W >= 1 && H >= 1 && W <= 8000 && H <= 8000)) { S3.toast("Size must be 1–8000 px", "error"); return; }
    var c = document.createElement("canvas"); c.width = W; c.height = H; draw(st, c);
    c.toBlob(function (b) { S3.download(b, "gradient-" + W + "x" + H + ".png", "image/png"); S3.done(); }, "image/png");
  });

  render();

  window.S3_DEMO = function () { st = mkState(PRESETS[6][1]); sel = st.stops[1].id; render(); };

  window.S3_SELFTEST = function () {
    function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-6); }
    var s1 = mkState({ type: "linear", angle: 90, stops: [["#ff0000", 0], ["#0000ff", 100, 0.5]] });
    var s2 = mkState({ type: "radial", shape: "circle", x: 30, y: 40, stops: [["#000000", 0], ["#ffffff", 100]] });
    var s3 = mkState({ type: "conic", angle: 45, x: 50, y: 50, stops: [["#000000", 0], ["#ffffff", 100]] });
    var p90 = linearPoints(90, 200, 100), p0 = linearPoints(0, 200, 100), p45 = linearPoints(45, 100, 100);
    var mid = colorAt(mkState({ type: "linear", stops: [["#ff0000", 0], ["#0000ff", 100]] }), 50);
    var rr = radialRadii({ shape: "ellipse", x: 50, y: 50 }, 200, 100);
    var ok = cssText(s1) === "background: #ff0000;\nbackground: linear-gradient(90deg, #ff0000 0%, rgba(0, 0, 255, 0.5) 100%);" &&
      gradient(s2) === "radial-gradient(circle at 30% 40%, #000000 0%, #ffffff 100%)" &&
      gradient(s3) === "conic-gradient(from 45deg at 50% 50%, #000000 0%, #ffffff 100%)" &&
      near(p90[0], 0) && near(p90[1], 50) && near(p90[2], 200) && near(p90[3], 50) &&
      near(p0[0], 100) && near(p0[1], 100) && near(p0[2], 100) && near(p0[3], 0) &&
      near(p45[0], 0) && near(p45[1], 100) && near(p45[2], 100) && near(p45[3], 0) &&
      mid.color === "#800080" && near(rr[0], 100 * Math.SQRT2) && near(rr[1], 50 * Math.SQRT2);
    if (!ok) return "maths";
    // canvas export: left edge red, right edge blue, middle purple
    var c = document.createElement("canvas"); c.width = 100; c.height = 4;
    draw(mkState({ type: "linear", angle: 90, stops: [["#ff0000", 0], ["#0000ff", 100]] }), c);
    var d = c.getContext("2d").getImageData(0, 2, 100, 1).data;
    var px = function (x) { return [d[x * 4], d[x * 4 + 1], d[x * 4 + 2]]; };
    if (!(px(0)[0] > 240 && px(0)[2] < 15 && px(99)[2] > 240 && px(99)[0] < 15 && Math.abs(px(50)[0] - px(50)[2]) < 12)) return "canvas " + px(0) + " " + px(99);
    return true;
  };
})();
