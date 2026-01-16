/* =========================================================
   Journey’s Unicorn World 🦄✨
   app.js — Gallery + Match + Runner + Color Magic + Wish Jar
   GitHub Pages friendly. No external libraries.
   Uses window.UNICORN_IMAGES from index.html
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  };

  /* ---------------- Sound + TTS ---------------- */
  let soundOn = store.get("uw_soundOn", true);
  let ttsOn = store.get("uw_ttsOn", true);
  let ttsVoice = null;

  function initVoices() {
    const voices = speechSynthesis.getVoices?.() || [];
    ttsVoice =
      voices.find(v => /en/i.test(v.lang) && /female|woman|samantha|victoria|karen|zira/i.test(v.name)) ||
      voices.find(v => /en/i.test(v.lang)) ||
      null;
  }
  if ("speechSynthesis" in window) {
    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;
  }

  function beep(type = "tap") {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);

      const now = ctx.currentTime;
      o.type = "sine";
      const base = (type === "win") ? 660 : (type === "bad") ? 220 : 440;
      o.frequency.setValueAtTime(base, now);
      o.frequency.exponentialRampToValueAtTime(base * 1.12, now + 0.08);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      o.start(now);
      o.stop(now + 0.14);
      setTimeout(() => ctx.close?.(), 250);
    } catch {}
  }

  function speak(text) {
    if (!ttsOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1.12;
      if (ttsVoice) u.voice = ttsVoice;
      speechSynthesis.speak(u);
    } catch {}
  }

  /* ---------------- Global state ---------------- */
  const IMAGES = (window.UNICORN_IMAGES && window.UNICORN_IMAGES.length)
    ? window.UNICORN_IMAGES
    : [
        { src: "./assets_journey_unicorn/images/unicorn1.jpg", caption: "Unicorn 1" },
        { src: "./assets_journey_unicorn/images/unicorn2.jpg", caption: "Unicorn 2" },
        { src: "./assets_journey_unicorn/images/unicorn3.jpg", caption: "Unicorn 3" },
      ];

  const STATE = store.get("uw_state", {
    stars: 0,
    badges: {},
    mission: null,

    match: { bestTimeEasy: null, bestTimeHard: null },
    wishes: [],
  });

  function saveState(){ store.set("uw_state", STATE); }

  function setSub(text){
    const el = $("#subline");
    if (el) el.textContent = text;
  }

  function addStars(n, why = ""){
    STATE.stars = Math.max(0, (STATE.stars|0) + (n|0));
    $("#stars").textContent = String(STATE.stars);
    if (why) setSub(why);
    saveState();
  }

  function unlockBadge(id, title, desc, emoji="🏅"){
    if (STATE.badges[id]) return false;
    STATE.badges[id] = { title, desc, emoji, at: Date.now() };
    $("#badges").textContent = String(Object.keys(STATE.badges).length);
    addStars(5, `Badge unlocked: ${title}!`);
    beep("win");
    speak(`Badge unlocked! ${title}!`);
    renderBadges();
    saveState();
    return true;
  }

  /* ---------------- Tabs ---------------- */
  function setupTabs(){
    $$(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        beep("tap");
        $$(".tab").forEach(b => b.classList.remove("active"));
        $$(".panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const name = btn.dataset.tab;
        $(`#tab-${name}`).classList.add("active");

        const t = {
          home:"Welcome home 🦄",
          gallery:"Unicorn Gallery",
          match:"Match Game",
          runner:"Rainbow Runner",
          color:"Color Magic",
          wishes:"Wish Jar",
          trophies:"Trophies"
        };
        setSub(t[name] || "Unicorn time!");
      });
    });

    // Quick buttons
    $("#btnQuickMatch")?.addEventListener("click", () => clickTab("match"));
    $("#btnQuickColor")?.addEventListener("click", () => clickTab("color"));
    $("#btnQuickWish")?.addEventListener("click", () => clickTab("wishes"));
  }

  function clickTab(name){
    const btn = $(`.tab[data-tab="${name}"]`);
    if (btn) btn.click();
  }

  /* ---------------- Header buttons ---------------- */
  function setupHeaderBtns(){
    const soundBtn = $("#soundBtn");
    const ttsBtn = $("#ttsBtn");

    function paint(){
      soundBtn.textContent = soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
      ttsBtn.textContent = ttsOn ? "🗣️ Read: ON" : "🔕 Read: OFF";
    }
    paint();

    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      store.set("uw_soundOn", soundOn);
      paint();
      beep("tap");
    });

    ttsBtn.addEventListener("click", () => {
      ttsOn = !ttsOn;
      store.set("uw_ttsOn", ttsOn);
      paint();
      beep("tap");
      if (ttsOn) speak("Reading is on!");
    });

    $("#resetBtn").addEventListener("click", () => {
      beep("bad");
      const ok = confirm("Reset Journey’s Unicorn World? This clears stars, badges, wishes, and best scores.");
      if (!ok) return;
      localStorage.removeItem("uw_state");
      localStorage.removeItem("uw_soundOn");
      localStorage.removeItem("uw_ttsOn");
      location.reload();
    });
  }

  /* =========================================================
     Mission system (simple, fun, keeps attention)
     ========================================================= */
  const MISSION_POOL = [
    { id:"m_gallery", text:"Look at the Unicorn Gallery and tap a unicorn.", tip:"Go to Gallery and tap any unicorn!", reward: 3 },
    { id:"m_match", text:"Win the Match Game on Easy mode.", tip:"Press Easy and match all pairs!", reward: 6 },
    { id:"m_runner", text:"Collect 5 stars in Rainbow Runner.", tip:"Press Start, then Jump to collect ⭐!", reward: 6 },
    { id:"m_color", text:"Draw a big rainbow in Color Magic.", tip:"Pick colors and draw across the canvas!", reward: 4 },
    { id:"m_wishes", text:"Add 3 wishes to the Wish Jar.", tip:"Type a wish and press Add.", reward: 5 },
  ];

  function setupMissions(){
    const box = $("#missionBox");
    const readBtn = $("#readMission");
    const newBtn = $("#newMission");
    if (!box || !readBtn || !newBtn) return;

    if (!STATE.mission) STATE.mission = pick(MISSION_POOL).id;

    function render(){
      const m = MISSION_POOL.find(x => x.id === STATE.mission) || MISSION_POOL[0];
      box.innerHTML = `
        <div>${m.text}</div>
        <span class="small">Tip: ${m.tip}</span>
      `;
      saveState();
    }

    readBtn.addEventListener("click", () => {
      const m = MISSION_POOL.find(x => x.id === STATE.mission) || MISSION_POOL[0];
      beep("tap");
      speak(m.text + " " + m.tip);
    });

    newBtn.addEventListener("click", () => {
      beep("tap");
      const options = MISSION_POOL.filter(x => x.id !== STATE.mission);
      STATE.mission = pick(options).id;
      render();
      setSub("New mission loaded 🎯");
    });

    render();
  }

  function completeMissionIf(id){
    if (!STATE.mission) return;
    if (STATE.mission !== id) return;
    const m = MISSION_POOL.find(x => x.id === id);
    if (!m) return;
    addStars(m.reward, `Mission complete! ⭐ +${m.reward}`);
    unlockBadge(`mission_${id}`, "Mission Star", "Completed a Unicorn Mission!", "🎯");
    // new mission
    STATE.mission = pick(MISSION_POOL.filter(x => x.id !== id)).id;
    setupMissions(); // re-render
  }

  /* =========================================================
     Gallery
     ========================================================= */
  function setupGallery(){
    const box = $("#gallery");
    if (!box) return;

    box.innerHTML = "";
    IMAGES.forEach((it, idx) => {
      const d = document.createElement("div");
      d.className = "gItem";
      d.innerHTML = `
        <img src="${it.src}" alt="Unicorn ${idx+1}">
        <div class="gCap">${it.caption}</div>
      `;
      d.addEventListener("click", () => {
        beep("tap");
        openModal(it.src, it.caption);
        addStars(1, "Unicorn spotted! ⭐");
        completeMissionIf("m_gallery");
      });
      box.appendChild(d);
    });

    const modal = $("#modal");
    const close = $("#closeModal");
    close?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function openModal(src, caption){
    const modal = $("#modal");
    const img = $("#modalImg");
    const cap = $("#modalCaption");
    if (!modal || !img || !cap) return;
    img.src = src;
    cap.textContent = caption;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
  }

  function closeModal(){
    const modal = $("#modal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
  }

  /* =========================================================
     Match Game (uses 3 unicorn images + cute emoji backs)
     ========================================================= */
  let matchTimer = null;
  let matchSeconds = 0;
  let matchRunning = false;
  let flips = 0;
  let matches = 0;

  let first = null;
  let lock = false;
  let matchDeck = [];

  function setupMatch(){
    $("#startMatchEasy")?.addEventListener("click", () => startMatch("easy"));
    $("#startMatchHard")?.addEventListener("click", () => startMatch("hard"));
    $("#resetMatch")?.addEventListener("click", () => resetMatch());
    $("#readMatch")?.addEventListener("click", () => speak(
      "Match Game! Press Easy or Hard. Tap cards to flip. Find pairs to win and unlock a badge!"
    ));
  }

  function startMatch(mode){
    beep("tap");
    resetMatch();
    const board = $("#matchBoard");
    const msg = $("#matchMsg");
    if (!board || !msg) return;

    // Build deck: easy = 8 cards (4 pairs), hard = 12 cards (6 pairs)
    // We only have 3 images, so we reuse them with different "frames" by pairing IDs.
    const pairs = (mode === "easy") ? 4 : 6;
    const items = [];
    for (let i = 0; i < pairs; i++) {
      const img = IMAGES[i % IMAGES.length];
      items.push({ key: `p${i}`, src: img.src });
    }
    matchDeck = shuffle([...items, ...items]); // duplicate for pairs
    board.className = "matchBoard " + mode;
    board.innerHTML = "";

    // reset stats
    flips = 0; matches = 0; first = null; lock = false;
    $("#flipCount").textContent = "0";
    $("#matchCount").textContent = "0";
    $("#matchTime").textContent = "0";
    msg.textContent = "Find all pairs! ✨";

    // create tiles
    matchDeck.forEach((it, idx) => {
      const tile = document.createElement("div");
      tile.className = "cardTile";
      tile.dataset.key = it.key;
      tile.dataset.idx = String(idx);

      tile.innerHTML = `
        <div class="face back"></div>
        <div class="face front">
          <img src="${it.src}" alt="Unicorn card">
        </div>
      `;

      tile.addEventListener("click", () => flipTile(tile));
      board.appendChild(tile);
    });

    startMatchTimer();
    matchRunning = true;
  }

  function resetMatch(){
    stopMatchTimer();
    matchRunning = false;
    matchSeconds = 0;
    flips = 0; matches = 0; first = null; lock = false;
    $("#flipCount").textContent = "0";
    $("#matchCount").textContent = "0";
    $("#matchTime").textContent = "0";
    $("#matchMsg").textContent = "Press Easy to start!";
    const board = $("#matchBoard");
    if (board) board.innerHTML = "";
  }

  function startMatchTimer(){
    stopMatchTimer();
    matchSeconds = 0;
    matchTimer = setInterval(() => {
      matchSeconds++;
      $("#matchTime").textContent = String(matchSeconds);
    }, 1000);
  }

  function stopMatchTimer(){
    if (matchTimer) clearInterval(matchTimer);
    matchTimer = null;
  }

  function flipTile(tile){
    if (!matchRunning) return;
    if (lock) return;
    if (tile.classList.contains("matched")) return;
    if (tile.classList.contains("flipped")) return;

    beep("tap");
    tile.classList.add("flipped");
    flips++;
    $("#flipCount").textContent = String(flips);

    if (!first){
      first = tile;
      return;
    }

    const a = first.dataset.key;
    const b = tile.dataset.key;

    if (a === b){
      // matched
      lock = true;
      setTimeout(() => {
        first.classList.add("matched");
        tile.classList.add("matched");
        first = null;
        lock = false;

        matches++;
        $("#matchCount").textContent = String(matches);
        addStars(2, "Match! ⭐⭐");
        beep("win");

        const totalPairs = ($$("#matchBoard .cardTile").length / 2) | 0;
        if (matches >= totalPairs){
          winMatch(totalPairs);
        }
      }, 280);
    } else {
      // not matched
      lock = true;
      setTimeout(() => {
        first.classList.remove("flipped");
        tile.classList.remove("flipped");
        first = null;
        lock = false;
      }, 560);
    }
  }

  function winMatch(totalPairs){
    stopMatchTimer();
    matchRunning = false;

    const mode = $("#matchBoard").classList.contains("hard") ? "hard" : "easy";
    const msg = $("#matchMsg");
    if (msg) msg.textContent = `You won! 🎉 ${totalPairs} pairs matched in ${matchSeconds}s!`;

    addStars(8, "You won Match Game! ⭐⭐⭐⭐⭐⭐⭐⭐");
    unlockBadge(`match_${mode}`, mode === "easy" ? "Match Winner" : "Match Master", "Won the Match Game!", "🧠");
    speak(`You won! Great matching, Journey!`);

    // best times
    const key = (mode === "easy") ? "bestTimeEasy" : "bestTimeHard";
    const best = STATE.match[key];
    if (!best || matchSeconds < best){
      STATE.match[key] = matchSeconds;
      saveState();
      unlockBadge(`best_${mode}`, "Fast Unicorn!", "New best time!", "⏱️");
    }

    completeMissionIf("m_match");
  }

  /* =========================================================
     Rainbow Runner (simple 1-button jump game)
     ========================================================= */
  let runnerOn = false;
  let runnerLoop = null;
  let unicornY = 0;
  let vy = 0;
  let gravity = -0.8; // upward is positive in our calc
  let jumping = false;

  let cloudX = 820;
  let starX = 520;
  let score = 0;
  let collected = 0;
  let oops = 0;

  function setupRunner(){
    $("#runnerStart")?.addEventListener("click", runnerStart);
    $("#runnerReset")?.addEventListener("click", runnerReset);
    $("#runnerJump")?.addEventListener("click", runnerJump);
    $("#readRunner")?.addEventListener("click", () => speak(
      "Rainbow Runner! Press Start. Tap Jump to hop over clouds and collect stars. Get 5 stars to complete a mission!"
    ));

    // Spacebar jump
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") runnerJump();
    });
  }

  function runnerReset(){
    runnerStop();
    unicornY = 0; vy = 0; jumping = false;
    cloudX = 820; starX = 520;
    score = 0; collected = 0; oops = 0;
    $("#runnerScore").textContent = "0";
    $("#runnerStars").textContent = "0";
    $("#runnerOops").textContent = "0";
    $("#runnerMsg").textContent = "Press Start, then Jump!";
    setRunnerPositions();
  }

  function runnerStart(){
    beep("tap");
    if (runnerOn) return;
    runnerOn = true;
    $("#runnerMsg").textContent = "Go! Jump over clouds! 🌈";
    runnerLoop = setInterval(runnerTick, 30);
  }

  function runnerStop(){
    runnerOn = false;
    if (runnerLoop) clearInterval(runnerLoop);
    runnerLoop = null;
  }

  function runnerJump(){
    if (!runnerOn) return;
    if (jumping) return;
    beep("tap");
    vy = 12.5;
    jumping = true;
  }

  function runnerTick(){
    // physics
    vy += gravity;
    unicornY += vy;
    if (unicornY <= 0){
      unicornY = 0;
      vy = 0;
      jumping = false;
    }

    // move obstacles
    cloudX -= 7.2;
    starX -= 7.2;

    if (cloudX < -80){
      cloudX = 820 + Math.random()*220;
      score += 1;
      $("#runnerScore").textContent = String(score);
    }
    if (starX < -80){
      starX = 820 + Math.random()*320;
    }

    setRunnerPositions();

    // collision check with cloud (hitbox)
    const uX = 68;
    const uW = 48, uH = 48;
    const uYpx = 120 + unicornY; // base from CSS bottom

    // cloud is at bottom 120px, approx size 60x44
    const cX = cloudX;
    const cY = 120;
    const cW = 60, cH = 44;

    if (rectHit(uX, uYpx, uW, uH, cX, cY, cW, cH) && unicornY < 8){
      oops += 1;
      $("#runnerOops").textContent = String(oops);
      $("#runnerMsg").textContent = "Oops! Try jumping a little earlier 😊";
      beep("bad");
      // push cloud away so it doesn't double count
      cloudX -= 40;
      if (oops >= 3){
        unlockBadge("runner_try", "Try Again Star", "You kept trying in Runner!", "🌈");
      }
    }

    // star pickup
    const sX = starX;
    const sY = 200; // star floats a bit above ground
    const sW = 42, sH = 42;
    if (rectHit(uX, uYpx, uW, uH, sX, sY, sW, sH)){
      collected += 1;
      $("#runnerStars").textContent = String(collected);
      addStars(2, "Star collected! ⭐⭐");
      beep("win");
      // move star away
      starX = 820 + Math.random()*320;

      if (collected >= 5){
        unlockBadge("runner_5", "Rainbow Runner", "Collected 5 stars!", "⭐");
        completeMissionIf("m_runner");
      }
    }
  }

  function setRunnerPositions(){
    const u = $("#runnerUnicorn");
    const cloud = $("#runnerCloud");
    const star = $("#runnerStar");
    if (!u || !cloud || !star) return;

    u.style.transform = `translateY(${-unicornY}px)`;
    cloud.style.left = `${cloudX}px`;
    cloud.style.bottom = `120px`;

    star.style.left = `${starX}px`;
    star.style.bottom = `240px`;
  }

  function rectHit(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /* =========================================================
     Color Magic (simple paint with stamps)
     ========================================================= */
  let paintColor = "#ff4fd8";
  let painting = false;
  let stampMode = null; // "hearts" | "stars" | null

  function setupColor(){
    const palette = $("#palette");
    const canvas = $("#paint");
    if (!palette || !canvas) return;

    const colors = ["#ff4fd8","#fb7185","#a78bfa","#60a5fa","#34d399","#fbbf24","#f97316","#ffffff"];
    palette.innerHTML = "";
    colors.forEach((c, idx) => {
      const b = document.createElement("button");
      b.className = "pColor" + (idx === 0 ? " active" : "");
      b.style.background = c;
      b.addEventListener("click", () => {
        beep("tap");
        paintColor = c;
        stampMode = null;
        $$(".pColor").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        $("#colorMsg").textContent = "Painting! Click/drag to draw.";
      });
      palette.appendChild(b);
    });

    const ctx = canvas.getContext("2d");
    resizePaintToCss(canvas, ctx);

    function pos(e){
      const r = canvas.getBoundingClientRect();
      const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
      const x = (clientX - r.left) * (canvas.width / r.width);
      const y = (clientY - r.top) * (canvas.height / r.height);
      return { x, y };
    }

    function drawDot(x,y){
      ctx.beginPath();
      ctx.fillStyle = paintColor;
      ctx.arc(x, y, 10, 0, Math.PI*2);
      ctx.fill();
    }

    function drawStamp(x,y){
      ctx.save();
      ctx.font = "38px system-ui, Apple Color Emoji, Segoe UI Emoji";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stampMode === "hearts" ? "💖" : "⭐", x, y);
      ctx.restore();
    }

    function onDown(e){
      painting = true;
      const p = pos(e);
      if (stampMode) drawStamp(p.x,p.y);
      else drawDot(p.x,p.y);
      addStars(1, "Color magic! ⭐");
      completeMissionIf("m_color"); // generous: first paint completes mission (kid-friendly)
      e.preventDefault?.();
    }
    function onMove(e){
      if (!painting) return;
      const p = pos(e);
      if (stampMode) return; // stamps only on click/tap
      drawDot(p.x,p.y);
      e.preventDefault?.();
    }
    function onUp(){ painting = false; }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    canvas.addEventListener("touchstart", onDown, { passive:false });
    canvas.addEventListener("touchmove", onMove, { passive:false });
    window.addEventListener("touchend", onUp);

    window.addEventListener("resize", () => resizePaintToCss(canvas, ctx));

    $("#clearPaint")?.addEventListener("click", () => {
      beep("bad");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      $("#colorMsg").textContent = "Cleared! Paint again 🎨";
    });

    $("#stampHearts")?.addEventListener("click", () => {
      beep("tap");
      stampMode = "hearts";
      $("#colorMsg").textContent = "Heart stamps 💖 (tap to stamp)";
    });

    $("#stampStars")?.addEventListener("click", () => {
      beep("tap");
      stampMode = "stars";
      $("#colorMsg").textContent = "Star stamps ⭐ (tap to stamp)";
    });

    $("#readColor")?.addEventListener("click", () => speak(
      "Color Magic! Pick a color and draw on the canvas. Use hearts or stars to stamp fun shapes!"
    ));
  }

  function resizePaintToCss(canvas, ctx){
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // keep reasonable internal resolution
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  /* =========================================================
     Wish Jar
     ========================================================= */
  function setupWishes(){
    const input = $("#wishInput");
    const list = $("#wishList");
    if (!input || !list) return;

    function render(){
      list.innerHTML = "";
      STATE.wishes.forEach((w, i) => {
        const row = document.createElement("div");
        row.className = "wishItem";
        row.innerHTML = `
          <div>💖 ${escapeHtml(w)}</div>
          <button data-i="${i}">✖</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          beep("tap");
          STATE.wishes.splice(i,1);
          saveState();
          render();
          setSub("Wish removed.");
        });
        list.appendChild(row);
      });

      if (STATE.wishes.length >= 3){
        unlockBadge("wishes3", "Wish Maker", "Added 3 wishes!", "💖");
        completeMissionIf("m_wishes");
      }
    }

    $("#addWish")?.addEventListener("click", () => {
      const v = input.value.trim();
      if (!v) return;
      beep("tap");
      STATE.wishes.unshift(v);
      input.value = "";
      saveState();
      render();
      addStars(2, "Wish added! ⭐⭐");
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#addWish").click();
    });

    $("#randomWish")?.addEventListener("click", () => {
      beep("tap");
      const ideas = [
        "I wish for a unicorn cupcake!",
        "I wish for sparkly rainbow shoes!",
        "I wish for a unicorn friend!",
        "I wish for glittery magic!",
        "I wish for a cozy unicorn blanket!"
      ];
      input.value = pick(ideas);
      speak("Here’s a surprise wish!");
    });

    $("#clearWishes")?.addEventListener("click", () => {
      beep("bad");
      const ok = confirm("Clear all wishes?");
      if (!ok) return;
      STATE.wishes = [];
      saveState();
      render();
      setSub("Wishes cleared.");
    });

    $("#readWishes")?.addEventListener("click", () => {
      if (!STATE.wishes.length) return speak("No wishes yet. Type a wish and press Add!");
      speak("Your wishes are: " + STATE.wishes.slice(0,5).join(". "));
    });

    render();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  /* =========================================================
     Badges UI
     ========================================================= */
  const BADGE_CATALOG = [
    { id:"match_easy", title:"Match Winner", desc:"Won Match on Easy!", emoji:"🧠" },
    { id:"match_hard", title:"Match Master", desc:"Won Match on Hard!", emoji:"🧠" },
    { id:"best_easy", title:"Fast Unicorn!", desc:"New best Easy time!", emoji:"⏱️" },
    { id:"best_hard", title:"Fast Unicorn!", desc:"New best Hard time!", emoji:"⏱️" },

    { id:"runner_try", title:"Try Again Star", desc:"Kept trying in Runner!", emoji:"🌈" },
    { id:"runner_5", title:"Rainbow Runner", desc:"Collected 5 stars!", emoji:"⭐" },

    { id:"wishes3", title:"Wish Maker", desc:"Added 3 wishes!", emoji:"💖" },

    { id:"mission_m_gallery", title:"Mission Star", desc:"Completed a mission!", emoji:"🎯" },
    { id:"mission_m_match", title:"Mission Star", desc:"Completed a mission!", emoji:"🎯" },
    { id:"mission_m_runner", title:"Mission Star", desc:"Completed a mission!", emoji:"🎯" },
    { id:"mission_m_color", title:"Mission Star", desc:"Completed a mission!", emoji:"🎯" },
    { id:"mission_m_wishes", title:"Mission Star", desc:"Completed a mission!", emoji:"🎯" },
  ];

  function renderBadges(){
    const grid = $("#badgeGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const owned = STATE.badges || {};
    $("#badges").textContent = String(Object.keys(owned).length);

    BADGE_CATALOG.forEach(b => {
      const isOwned = !!owned[b.id];
      const d = document.createElement("div");
      d.className = "badge" + (isOwned ? "" : " locked");
      d.innerHTML = `
        <div>${b.emoji} ${b.title}${isOwned ? " ✅" : ""}</div>
        <div class="bdesc">${b.desc}</div>
      `;
      grid.appendChild(d);
    });
  }

  /* =========================================================
     Sparkle background canvas
     ========================================================= */
  function setupSparkleBg(){
    const c = $("#sparkleBg");
    if (!c) return;
    const ctx = c.getContext("2d");
    let w=0,h=0,dpr=1;
    let dots=[];

    function resize(){
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.width = Math.floor(innerWidth*dpr);
      h = c.height = Math.floor(innerHeight*dpr);
      c.style.width = innerWidth + "px";
      c.style.height = innerHeight + "px";
      dots = Array.from({length: Math.floor((innerWidth*innerHeight)/18000)}, () => ({
        x: Math.random()*w, y: Math.random()*h,
        r: (Math.random()*1.6+1)*dpr,
        a: Math.random()*0.45+0.10,
        s: (Math.random()*0.45+0.12)*dpr,
        hue: 290 + Math.random()*60
      }));
    }
    window.addEventListener("resize", resize);
    resize();

    function tick(){
      ctx.clearRect(0,0,w,h);
      for (const d of dots){
        d.y += d.s;
        if (d.y > h + 10){ d.y = -10; d.x = Math.random()*w; }
        ctx.beginPath();
        ctx.fillStyle = `hsla(${d.hue}, 95%, 75%, ${d.a})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* =========================================================
     Init
     ========================================================= */
  function init(){
    // Header numbers
    $("#stars").textContent = String(STATE.stars|0);
    $("#badges").textContent = String(Object.keys(STATE.badges||{}).length);

    setupSparkleBg();
    setupTabs();
    setupHeaderBtns();
    setupMissions();

    setupGallery();
    setupMatch();
    setupRunner();
    setupColor();
    setupWishes();
    renderBadges();

    // gentle start message
    setTimeout(() => {
      setSub("Welcome, Journey! 🦄✨");
      speak("Welcome, Journey! Pick a tab and have fun in Unicorn World!");
    }, 450);
  }

  document.addEventListener("DOMContentLoaded", init);

})();
