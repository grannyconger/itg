// Shared helpers: DOM builder, icons, lesson clock, and the garden band.
(function () {
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(3).forEach((c) => { if (c == null || c === false) return; el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  const svg = (markup) => { const t = document.createElement("template"); t.innerHTML = markup; return t.content.firstChild; };
  const PATHS = {
    check: '<path d="M4 12.5l5.5 5.5L20 6.5"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    open: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>', next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 5l12 7-12 7z"/>', screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'
  };
  const icon = (n) => svg(`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${PATHS[n]}</svg>`);

  // ---------- clock. endsAt while running, left while paused ----------
  const remaining = (st) => (!st ? null : typeof st.left === "number" ? st.left : st.endsAt ? st.endsAt - Date.now() : null);
  function clock(ms) {
    if (ms == null) return "";
    const s = Math.ceil(Math.abs(ms) / 1000);
    return (ms <= -1000 ? "+" : "") + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  const current = (L, st) => {
    const open = (st && st.unlocked) || [];
    if (st && st.phase && open.includes(st.phase)) return st.phase;
    const o = L.phases.filter((p) => open.includes(p.id));
    return o.length ? o[o.length - 1].id : null;
  };

  // ---------- garden band: one planted bed per section ----------
  const BEDS = ["#6f9c7a", "#d8bc83", "#5d958f", "#b3775a", "#94718f", "#8aa06a", "#b06d80", "#7fa3a8"];
  let uid = 0;
  function bedPath(i, n, W, H) {
    const w = W / n, x0 = i * w, x1 = (i + 1) * w, a = Math.min(16, w / 5);
    const edge = (x, j) => (j === 0 || j === n ? 0 : (j % 2 ? a : -a));
    const l = edge(x0, i), r = edge(x1, i + 1), g = 2;
    const b = x0 + w * .35, c = x0 + w * .65;
    return `M${x0 + g + l} ${H * .07} C${b} 0 ${c} ${H * .14} ${x1 - g + r} ${H * .07} C${x1 - g + r * .2} ${H * .38} ${x1 - g - r * 1.2} ${H * .62} ${x1 - g - r} ${H * .93} C${c} ${H} ${b} ${H * .86} ${x0 + g - l} ${H * .93} C${x0 + g - l * 1.2} ${H * .62} ${x0 + g + l * .2} ${H * .38} ${x0 + g + l} ${H * .07}Z`;
  }
  // at: index of the current section. frac: how far through it, 0 to 1. done(i): optional override.
  function garden(n, at, frac, o) {
    o = Object.assign({ W: 1120, H: 40, empty: "#2b5c51" }, o);
    const id = "bed" + ++uid;
    let s = "", w = o.W / n;
    for (let i = 0; i < n; i++) {
      const d = bedPath(i, n, o.W, o.H), full = o.done ? o.done(i) : i < at;
      s += `<path d="${d}" fill="${full ? BEDS[i % 8] : o.empty}"/>`;
      if (!full && i === at) s += `<clipPath id="${id}"><path d="${d}"/></clipPath><rect class="fill" clip-path="url(#${id})" x="${i * w - 20}" y="0" height="${o.H}" width="${(w + 40) * Math.max(.06, Math.min(1, frac || 0))}" fill="${BEDS[i % 8]}"/>`;
    }
    return svg(`<svg class="garden" viewBox="0 0 ${o.W} ${o.H}" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`);
  }
  // Garden plan seen from above, for the sign-in and projector pages.
  const plan = () => svg(`<svg viewBox="0 0 450 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<rect width="450" height="520" fill="#153d35"/>
<path d="M-20 90C70 10 150 70 210 40S360-40 470 30V-20H-20Z" fill="#2c6352"/>
<path d="M-20 120C60 60 130 130 170 190S120 330 40 320-20 260-20 260Z" fill="#6f9c7a"/>
<path d="M30 170C70 150 110 190 100 240S50 290 20 260 0 190 30 170Z" fill="#4c7d62"/>
<path d="M230 80C300 40 400 70 420 150S340 250 280 220 170 120 230 80Z" fill="#5d958f"/>
<path d="M285 115C325 95 375 115 372 155S315 195 285 180 250 135 285 115Z" fill="#89b3aa"/>
<path d="M190 260C240 230 330 270 400 250S480 290 480 350 380 380 320 360 140 310 190 260Z" fill="#d8bc83"/>
<path d="M-20 380C40 340 120 350 170 390S260 440 240 490 120 560 40 540-20 480-20 480Z" fill="#b3775a"/>
<path d="M50 420C90 400 140 420 140 460S90 500 60 485 20 440 50 420Z" fill="#cf9b80"/>
<path d="M280 410C340 380 400 410 470 400V540H300C260 500 230 440 280 410Z" fill="#94718f"/>
<path d="M350 450C385 430 420 455 415 490S360 520 340 500 325 465 350 450Z" fill="#b296ab"/>
<g fill="none" stroke="#f1f6f2" stroke-opacity=".55" stroke-width="2" stroke-linecap="round">
<path d="M30 300C55 260 65 220 62 180M58 220C45 216 38 208 34 198M61 240C75 234 84 226 90 214M52 262C40 260 30 254 25 246"/>
<path d="M300 480C310 450 330 430 360 415"/></g></svg>`);

  window.UI = { h, svg, icon, remaining, clock, current, garden, plan, BEDS };
})();
