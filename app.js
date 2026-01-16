(() => {
  "use strict";

  // Allows index.html to show a helpful banner if JS fails to run
  window.__UNICORN_BOOT_OK__ = true;

  /* ---------------- Helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
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

  /* ---------------- Images ---------------- */
  // Put ALL your new images in window.UNICORN_IMAGES in index.html
  // and they will automatically appear in Gallery + Match.
  const IMAGES = (window.UNICORN_IMAGES && window.UNICORN_IMAGES.length)
    ? window.UNICORN_IMAGES
    : [
      { src: "./assets_journey_unicorn/images/unicorn1.jpg", caption: "Rainbow Unicorn ✨" },
      { src: "./assets_journey_unicorn/images/unicorn2.jpg", caption: "Cute Unicorn 💖" },
      { src: "./assets_journey_unicorn/images/unicorn3.jpg", caption: "Dreamy Unicorn ⭐" },
    ];

  /* ---------------- State ---------------- */
  const STATE = store.get("uw_state", {
    stars: 0,
    badges: {},
    mission: null,
    wishes: [],
    match: { bestEasy: null, bestHard: null },
    pet: { happy: 70, sparkle: 55, energy: 70, level: 1 },
    dress: { bg: 0 },
  });

  function saveState(){ store.set("uw_state", STATE); }
  function setSub(text){ const el = $("#subline"); if (el) el.textContent = text; }
  function addStars(n, why=""){
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

  /* ---------------- Tabs (with hooks) ---------------- */
  const TAB_HOOKS = {};
  function setupTabs(){
    $$(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        beep("tap");
        $$(".tab").forEach(b => b.classList.remove("active"));
        $$(".panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const name = btn.dataset.tab;
        $(`#tab-${name}`)?.classList.add("active");

        const t = {
          home:"Welcome home 🦄",
          gallery:"Unicorn Gallery",
          dressup:"Unicorn Dress‑Up",
          pet:"Unicorn Pet",
          match:"Match Game",
          runner:"Rainbow Runner",
          color:"Color Magic",
          wishes:"Wish Jar",
          trophies:"Trophies"
        };
        setSub(t[name] || "Unicorn time!");
        TAB_HOOKS[name]?.();
      });
    });

    $("#btnQuickMatch")?.addEventListener("click", () => clickTab("match"));
    $("#btnQuickColor")?.addEventListener("click", () => clickTab("color"));
    $("#btnQuickWish")?.addEventListener("click", () => clickTab("wishes"));
  }
  function clickTab(name){
    const btn = $(`.tab[data-tab="${name}"]`);
    if (btn) btn.click();
  }

  /* ---------------- Header Buttons ---------------- */
  function setupHeaderBtns(){
    const soundBtn = $("#soundBtn");
    const ttsBtn = $("#ttsBtn");

    const paint = () => {
      soundBtn.textContent = soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
      ttsBtn.textContent = ttsOn ? "🗣️ Read: ON" : "🔕 Read: OFF";
    };
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
      const ok = confirm("Reset Unicorn World? (clears stars, badges, wishes)");
      if (!ok) return;
      localStorage.removeItem("uw_state");
      location.reload();
    });
  }

  /* =========================================================
     HOME (more fun)
     ========================================================= */
  function setupHome(){
    const spells = [
      "✨ Rainbow Sparkle Spell: Clap 3 times!",
      "💖 Kindness Spell: Give someone a hug!",
      "⭐ Star Spell: Find 5 things that glitter!",
      "🦄 Unicorn Spell: Do your silliest unicorn pose!",
      "🌈 Magic Spell: Draw a rainbow with your finger!"
    ];
    const box = $("#homeTip");
    if (box) box.textContent = pick(spells);

    setupMissions();
  }

  function setupMissions(){
    const missions = [
      { t:"🖼️ Find 3 unicorn pictures", d:"Open the Gallery and tap 3 unicorns!" },
      { t:"🧠 Win Match Game", d:"Try Easy mode and find all the pairs." },
      { t:"🌈 Grab 5 stars", d:"Play Rainbow Runner and collect 5 stars." },
      { t:"🎨 Paint a rainbow", d:"Pick colors and draw a rainbow in Color Magic." },
      { t:"👗 Make a fancy outfit", d:"Go to Dress‑Up and drag 3 accessories." },
      { t:"🐾 Make your unicorn happy", d:"Feed + Brush + Play your pet unicorn." },
      { t:"💖 Add a wish", d:"Go to Wish Jar and add one wish." },
    ];

    const box = $("#missionBox");
    const setMission = (m) => {
      STATE.mission = m;
      if (box) box.innerHTML = `${m.t}<span class="small">${m.d}</span>`;
      saveState();
    };

    if (STATE.mission) setMission(STATE.mission);
    else setMission(pick(missions));

    $("#newMission")?.addEventListener("click", () => {
      beep("tap");
      setMission(pick(missions));
      speak("New mission! " + STATE.mission.t);
    });

    $("#readMission")?.addEventListener("click", () => {
      if (!STATE.mission) return;
      speak(STATE.mission.t + ". " + STATE.mission.d);
    });
  }

  /* =========================================================
     GALLERY
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
        <div class="gCap">${it.caption || `Unicorn ${idx+1}`}</div>
      `;
      d.addEventListener("click", () => {
        beep("tap");
        openModal(it.src, it.caption || "Unicorn!");
        addStars(1, "Unicorn spotted! ⭐");
      });
      box.appendChild(d);
    });

    $("#closeModal")?.addEventListener("click", closeModal);
    $("#modal")?.addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
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
     DRESS-UP (drag accessories)
     ========================================================= */
  function setupDressup(){
    const stage = $("#dressStage");
    const base = $("#dressBase");
    const bgSwatches = $("#bgSwatches");
    const accSwatches = $("#accSwatches");
    if (!stage || !base || !bgSwatches || !accSwatches) return;

    // Use one of the unicorn pics as the base
    base.src = (IMAGES[0] && IMAGES[0].src) ? IMAGES[0].src : "";

    const bgs = [
      { name:"Candy", css:"radial-gradient(900px 520px at 30% 20%, rgba(255,79,216,.25), transparent 62%), radial-gradient(900px 520px at 70% 80%, rgba(96,165,250,.18), transparent 62%), rgba(0,0,0,.18)" },
      { name:"Rainbow", css:"linear-gradient(135deg, rgba(255,79,216,.22), rgba(96,165,250,.18), rgba(52,211,153,.16))" },
      { name:"Princess", css:"radial-gradient(circle at 30% 30%, rgba(255,255,255,.18) 0 180px, transparent 260px), radial-gradient(circle at 70% 70%, rgba(255,79,216,.14) 0 220px, transparent 320px), rgba(0,0,0,.18)" },
      { name:"Night", css:"radial-gradient(circle at 30% 25%, rgba(167,139,250,.20) 0 180px, transparent 280px), radial-gradient(circle at 70% 70%, rgba(96,165,250,.14) 0 240px, transparent 340px), rgba(0,0,0,.22)" },
    ];

    const accessories = ["👑","🎀","💎","🌸","🕶️","🪄","✨","💖","⭐","🌈"];

    const setBg = (i) => {
      STATE.dress.bg = i;
      stage.style.background = bgs[i].css;
      saveState();
    };

    // Render swatches once
    if (!bgSwatches.childElementCount){
      bgs.forEach((b, i) => {
        const s = document.createElement("button");
        s.className = "swatch";
        s.style.setProperty("--sw", b.css);
        s.title = b.name;
        s.addEventListener("click", () => { beep("tap"); setBg(i); });
        bgSwatches.appendChild(s);
      });
    }

    if (!accSwatches.childElementCount){
      accessories.forEach((emo) => {
        const s = document.createElement("button");
        s.className = "swatch accSwatch";
        s.dataset.emoji = emo;
        s.title = "Drag: " + emo;
        s.addEventListener("click", () => {
          beep("tap");
          spawnAccessory(emo);
        });
        accSwatches.appendChild(s);
      });
    }

    function spawnAccessory(emo){
      const el = document.createElement("div");
      el.className = "dressItem";
      el.textContent = emo;
      // Start near the center
      const r = stage.getBoundingClientRect();
      const x = r.width * 0.5 + (Math.random()*40 - 20);
      const y = r.height * 0.35 + (Math.random()*40 - 20);
      el.style.left = x + "px";
      el.style.top = y + "px";
      stage.appendChild(el);
      makeDraggable(el, stage);
      el.addEventListener("dblclick", () => { beep("bad"); el.remove(); });
      addStars(1, "Dress-up magic! ⭐");
      // Badge for adding 3 items
      if ($$("#dressStage .dressItem").length >= 3){
        unlockBadge("dress_3", "Style Star", "Added 3 accessories!", "👗");
      }
    }

    $("#dressRandom")?.addEventListener("click", () => {
      beep("tap");
      setBg((Math.random()*bgs.length)|0);
      // Clear and add a few
      $$("#dressStage .dressItem").forEach(n => n.remove());
      const count = 3 + ((Math.random()*3)|0);
      for (let i=0;i<count;i++) spawnAccessory(pick(accessories));
      speak("Surprise unicorn outfit!");
    });

    $("#dressClear")?.addEventListener("click", () => {
      beep("bad");
      $$("#dressStage .dressItem").forEach(n => n.remove());
      speak("All clean! Pick new accessories.");
    });

    $("#dressSnap")?.addEventListener("click", () => {
      sparkleBurst(18);
      addStars(5, "Sparkle photo! ⭐⭐⭐⭐⭐");
      unlockBadge("dress_photo", "Sparkle Photo", "Took a sparkle photo!", "📸");
      speak("Sparkle photo! Amazing!");
    });

    $("#readDress")?.addEventListener("click", () => speak(
      "Dress up! Tap an accessory to add it, then drag it onto the unicorn. Double click to remove."
    ));

    // Restore saved background
    setBg(Math.min(bgs.length-1, Math.max(0, STATE.dress.bg|0)));
  }

  function makeDraggable(el, boundsEl){
    let dragging=false, ox=0, oy=0;
    const onDown = (e) => {
      dragging = true;
      const p = getPoint(e);
      const r = el.getBoundingClientRect();
      ox = p.x - r.left;
      oy = p.y - r.top;
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault?.();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = getPoint(e);
      const br = boundsEl.getBoundingClientRect();
      let x = p.x - br.left - ox;
      let y = p.y - br.top - oy;
      x = Math.max(0, Math.min(br.width - 30, x));
      y = Math.max(0, Math.min(br.height - 30, y));
      el.style.left = x + "px";
      el.style.top = y + "px";
      e.preventDefault?.();
    };
    const onUp = () => { dragging=false; };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    function getPoint(e){
      return { x: e.clientX ?? (e.touches && e.touches[0].clientX), y: e.clientY ?? (e.touches && e.touches[0].clientY) };
    }
  }

  /* =========================================================
     UNICORN PET
     ========================================================= */
  let petTimer = null;
  function setupPet(){
    const base = $("#petBase");
    const msg = $("#petMsg");
    const float = $("#petFloat");
    if (!base || !msg || !float) return;

    base.src = (IMAGES[1] && IMAGES[1].src) ? IMAGES[1].src : (IMAGES[0]?.src || "");

    const clamp = (v) => Math.max(0, Math.min(100, v));
    const paint = () => {
      $("#petHappy").style.width = clamp(STATE.pet.happy) + "%";
      $("#petSparkle").style.width = clamp(STATE.pet.sparkle) + "%";
      $("#petEnergy").style.width = clamp(STATE.pet.energy) + "%";
      saveState();
    };

    const pop = (emoji, text) => {
      float.textContent = emoji;
      float.style.opacity = 1;
      float.animate([
        { transform:"translateX(-50%) translateY(0)", opacity:1 },
        { transform:"translateX(-50%) translateY(-40px)", opacity:0 }
      ], { duration: 900, easing:"cubic-bezier(.2,.8,.2,1)" });
      setTimeout(() => float.style.opacity = 0, 950);
      msg.textContent = text;
    };

    const act = (dh, ds, de, emoji, text) => {
      beep("tap");
      STATE.pet.happy = clamp((STATE.pet.happy|0) + dh);
      STATE.pet.sparkle = clamp((STATE.pet.sparkle|0) + ds);
      STATE.pet.energy = clamp((STATE.pet.energy|0) + de);
      addStars(2, "Pet care! ⭐⭐");
      pop(emoji, text);
      paint();
      checkPetLevel();
    };

    function checkPetLevel(){
      const avg = (STATE.pet.happy + STATE.pet.sparkle + STATE.pet.energy)/3;
      const target = 60 + (STATE.pet.level-1)*8;
      if (avg >= target && STATE.pet.level < 10){
        STATE.pet.level++;
        unlockBadge("pet_level_" + STATE.pet.level, "Pet Level " + STATE.pet.level, "Your unicorn leveled up!", "🐾");
        addStars(8, "Level up! ⭐⭐⭐⭐⭐⭐⭐⭐");
        speak("Level up! Your unicorn is super happy!");
      }
      if (avg >= 85){
        unlockBadge("pet_love", "Best Friends", "Kept your unicorn super happy!", "💞");
      }
      saveState();
    }

    $("#petFeed")?.addEventListener("click", () => act(10, 6, 6, "🍓", "Nom nom! So yummy!"));
    $("#petBrush")?.addEventListener("click", () => act(8, 12, -2, "✨", "Brush brush! Extra sparkly!"));
    $("#petBath")?.addEventListener("click", () => act(6, 10, -4, "🫧", "Bubble bath! So clean!"));
    $("#petPlay")?.addEventListener("click", () => act(12, 4, -8, "🎀", "Yay! Playing together!"));
    $("#petTalk")?.addEventListener("click", () => { beep("tap"); speak(pick([
      "I love rainbows!",
      "Can we be best friends?",
      "Your sparkle is my favorite!",
      "Let\'s go to Unicorn Land!"
    ])); pop("💬","Your unicorn says something sweet 💖"); });
    $("#petSleep")?.addEventListener("click", () => act(-2, -2, 18, "😴", "Zzz... feeling rested!"));
    $("#petReset")?.addEventListener("click", () => { beep("bad"); STATE.pet = { happy:70, sparkle:55, energy:70, level:1 }; paint(); msg.textContent = "All reset!"; });
    $("#readPet")?.addEventListener("click", () => speak("Unicorn Pet! Feed, brush, bubble bath, and play to fill the hearts."));

    if (!petTimer){
      petTimer = setInterval(() => {
        // gentle decay
        STATE.pet.happy = clamp((STATE.pet.happy|0) - 1);
        STATE.pet.sparkle = clamp((STATE.pet.sparkle|0) - 1);
        STATE.pet.energy = clamp((STATE.pet.energy|0) - 1);
        paint();
      }, 22000);
    }

    paint();
  }

  function sparkleBurst(n=14){
    for (let i=0;i<n;i++){
      const s = document.createElement("div");
      s.textContent = pick(["✨","⭐","💖","🌈"]);
      s.style.position = "fixed";
      s.style.left = (window.innerWidth*0.3 + Math.random()*window.innerWidth*0.4) + "px";
      s.style.top = (window.innerHeight*0.3 + Math.random()*window.innerHeight*0.3) + "px";
      s.style.fontSize = (20 + Math.random()*18) + "px";
      s.style.zIndex = "999";
      s.style.pointerEvents = "none";
      document.body.appendChild(s);
      const dx = (Math.random()*260 - 130);
      const dy = -(80 + Math.random()*220);
      s.animate([
        { transform:`translate(0,0)`, opacity:1 },
        { transform:`translate(${dx}px,${dy}px)`, opacity:0 }
      ], { duration: 900 + Math.random()*500, easing:"cubic-bezier(.2,.8,.2,1)" });
      setTimeout(() => s.remove(), 1600);
    }
  }

  /* =========================================================
     MATCH GAME (FIXED flip + MORE images automatically)
     ========================================================= */
  let matchTimer=null, matchSeconds=0, matchRunning=false;
  let flips=0, matches=0, first=null, lock=false;

  function setupMatch(){
    $("#startMatchEasy")?.addEventListener("click", () => startMatch("easy"));
    $("#startMatchHard")?.addEventListener("click", () => startMatch("hard"));
    $("#resetMatch")?.addEventListener("click", resetMatch);
    $("#readMatch")?.addEventListener("click", () => speak(
      "Match Game! Tap cards to flip. Find pairs to win!"
    ));
  }

  function startMatch(mode){
    beep("tap");
    resetMatch();

    const board = $("#matchBoard");
    const msg = $("#matchMsg");
    if (!board || !msg) return;

    // easy = 8 cards (4 pairs) | hard = 12 cards (6 pairs)
    const pairs = (mode === "easy") ? 4 : 6;

    // Use as many unique images as possible, then repeat if needed
    const pool = shuffle(IMAGES);
    const chosen = [];
    for (let i=0; i<pairs; i++){
      chosen.push(pool[i % pool.length]);
    }

    // Build pair deck
    const deck = shuffle([...chosen, ...chosen].map((it, i) => ({
      id: it.src + "::" + (i < pairs ? "a" : "b"),
      key: it.src, // pair by src
      src: it.src
    })));

    board.className = "matchBoard " + mode;
    board.innerHTML = "";

    flips=0; matches=0; first=null; lock=false;
    $("#flipCount").textContent = "0";
    $("#matchCount").textContent = "0";
    $("#matchTime").textContent = "0";
    msg.textContent = "Find all pairs! ✨";

    deck.forEach((it) => {
      const tile = document.createElement("div");
      tile.className = "cardTile";
      tile.dataset.key = it.key;
      tile.innerHTML = `
        <div class="face back"></div>
        <div class="face front"><img src="${it.src}" alt="Unicorn card"></div>
      `;
      tile.addEventListener("click", () => flipTile(tile));
      board.appendChild(tile);
    });

    matchSeconds=0;
    matchTimer = setInterval(() => {
      matchSeconds++;
      $("#matchTime").textContent = String(matchSeconds);
    }, 1000);
    matchRunning=true;
  }

  function resetMatch(){
    matchRunning=false;
    if (matchTimer) clearInterval(matchTimer);
    matchTimer=null;
    matchSeconds=0;
    flips=0; matches=0; first=null; lock=false;
    $("#flipCount").textContent = "0";
    $("#matchCount").textContent = "0";
    $("#matchTime").textContent = "0";
    $("#matchMsg").textContent = "Press Easy to start!";
    const board = $("#matchBoard");
    if (board) board.innerHTML = "";
  }

  function flipTile(tile){
    if (!matchRunning || lock) return;
    if (tile.classList.contains("matched") || tile.classList.contains("flipped")) return;

    beep("tap");
    tile.classList.add("flipped");
    flips++;
    $("#flipCount").textContent = String(flips);

    if (!first){ first = tile; return; }

    const a = first.dataset.key;
    const b = tile.dataset.key;

    if (a === b){
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
        if (matches >= totalPairs) winMatch(totalPairs);
      }, 220);
    } else {
      lock = true;
      setTimeout(() => {
        first.classList.remove("flipped");
        tile.classList.remove("flipped");
        first = null;
        lock = false;
      }, 520);
    }
  }

  function winMatch(totalPairs){
    if (matchTimer) clearInterval(matchTimer);
    matchTimer=null;
    matchRunning=false;

    const hard = $("#matchBoard")?.classList.contains("hard");
    $("#matchMsg").textContent = `You won! 🎉 ${totalPairs} pairs in ${matchSeconds}s!`;

    addStars(10, "Match win! ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐");
    unlockBadge(hard ? "match_hard" : "match_easy",
      hard ? "Match Master" : "Match Winner",
      "Won the Match Game!",
      "🧠"
    );
    speak("You won! Great job Journey!");
  }

  /* =========================================================
     RAINBOW RUNNER (more elements)
     ========================================================= */
  let runnerOn=false, runnerLoop=null;
  let uY=0, vy=0, jumping=false;
  let speed=7.2;
  let cloudX=820, spikeX=1100, starX=640, star2X=980;
  let powerX=1500, powerType="shield", shield=0, magnetUntil=0;
  let score=0, collected=0, oops=0;

  function setupRunner(){
    $("#runnerStart")?.addEventListener("click", runnerStart);
    $("#runnerReset")?.addEventListener("click", runnerReset);
    $("#runnerJump")?.addEventListener("click", runnerJump);
    $("#readRunner")?.addEventListener("click", () => speak(
      "Rainbow Runner! Press start, then jump over clouds. Grab stars. Collect a bubble shield or star magnet power up."
    ));

    // make sure visuals are set even before pressing start
    runnerReset();

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") runnerJump();
    });
  }

  function runnerReset(){
    runnerStop();
    uY=0; vy=0; jumping=false;
    speed=7.2;
    cloudX=900; spikeX=1300; starX=780; star2X=1180;
    powerX=1600; powerType = "shield"; shield=0; magnetUntil=0;
    score=0; collected=0; oops=0;
    $("#runnerScore").textContent = "0";
    $("#runnerStars").textContent = "0";
    $("#runnerOops").textContent = "0";
    $("#runnerMsg").textContent = "Press Start, then Jump!";
    setRunnerPositions();
  }

  function runnerStart(){
    beep("tap");
    if (runnerOn) return;
    runnerOn=true;
    $("#runnerMsg").textContent = "Go! Jump + grab stars! 🌈⭐";
    runnerLoop = setInterval(runnerTick, 30);
  }

  function runnerStop(){
    runnerOn=false;
    if (runnerLoop) clearInterval(runnerLoop);
    runnerLoop=null;
  }

  function runnerJump(){
    if (!runnerOn || jumping) return;
    beep("tap");
    vy=12.5;
    jumping=true;
  }

  function runnerTick(){
    // physics
    vy -= 0.8;
    uY += vy;
    if (uY <= 0){ uY=0; vy=0; jumping=false; }

    // move things
    cloudX -= speed;
    spikeX -= speed;
    starX -= speed;
    star2X -= speed;
    powerX -= speed;

    // ramp difficulty slowly (gentler)
    score += 0.018;
    speed = 7.0 + Math.min(3.6, score/22);

    if (cloudX < -80) cloudX = 880 + Math.random()*320;
    if (spikeX < -80) spikeX = 1180 + Math.random()*440;

    // keep stars away from obstacles so it feels fair
    if (starX < -80) starX = safeStarX(900, 520);
    if (star2X < -80) star2X = safeStarX(1100, 560);

    // power-up (shield 🫧 or magnet 🧲)
    if (powerX < -80){
      powerX = 1500 + Math.random()*650;
      powerType = Math.random() < 0.55 ? "shield" : "magnet";
    }

    $("#runnerScore").textContent = String(score|0);
    setRunnerPositions();

    // collision (cloud + spike) — shield blocks one bonk
    const uX=68, uW=48, uH=48;
    const uYpx = 120 + uY;

    // cloud at bottom
    if (rectHit(uX,uYpx,uW,uH, cloudX,120,60,44) && uY < 8){
      if (shield > 0){
        shield--;
        beep("win");
        $("#runnerMsg").textContent = "🫧 Shield saved you!";
        cloudX -= 120;
      } else {
        oops++;
        $("#runnerOops").textContent = String(oops);
        $("#runnerMsg").textContent = "Oops! Jump earlier 😊";
        beep("bad");
        cloudX -= 80;
      }
    }

    // spike (remixed obstacle)
    if (rectHit(uX,uYpx,uW,uH, spikeX,120,44,44) && uY < 8){
      if (shield > 0){
        shield--;
        beep("win");
        $("#runnerMsg").textContent = "🫧 Shield saved you!";
        spikeX -= 140;
      } else {
        oops++;
        $("#runnerOops").textContent = String(oops);
        $("#runnerMsg").textContent = "Boop! You hit a rainbow bump 🌈";
        beep("bad");
        spikeX -= 110;
      }
    }

    // power-up pickup
    const gotP = rectHit(uX,uYpx,uW,uH, powerX,RUNNER_POWER_Y,46,46);
    if (gotP){
      if (powerType === "shield"){
        shield = 1;
        $("#runnerMsg").textContent = "🫧 Bubble Shield ON! (blocks 1 hit)";
        unlockBadge("runner_shield", "Bubble Shield", "Used a shield power‑up!", "🫧");
      } else {
        magnetUntil = Date.now() + 6500;
        $("#runnerMsg").textContent = "🧲 Star Magnet ON!";
        unlockBadge("runner_magnet", "Star Magnet", "Used a magnet power‑up!", "🧲");
      }
      beep("win");
      addStars(3, "Power-up! ⭐⭐⭐");
      powerX = 1500 + Math.random()*650;
      powerType = Math.random() < 0.55 ? "shield" : "magnet";
    }

    // stars pickups
    // Stars were previously placed too high for the unicorn's jump arc.
    // Keep them reachable and fun.
    const magnetOn = Date.now() < magnetUntil;
    const starY1 = RUNNER_STAR_Y1, starY2 = RUNNER_STAR_Y2;
    const got1 = rectHit(uX,uYpx,uW,uH, starX,starY1,42,42) || (magnetOn && Math.abs(starX - uX) < 180);
    const got2 = rectHit(uX,uYpx,uW,uH, star2X,starY2,42,42) || (magnetOn && Math.abs(star2X - uX) < 180);
    if (got1 || got2){
      collected++;
      $("#runnerStars").textContent = String(collected);
      addStars(2, "Star collected! ⭐⭐");
      beep("win");
      if (got1) starX = safeStarX(900, 520);
      if (got2) star2X = safeStarX(1100, 560);

      if (collected >= 7){
        unlockBadge("runner_7", "Rainbow Sprinter", "Collected 7 stars!", "⭐");
      }
    }
  }

  function safeStarX(min, spread){
    let x = min + Math.random()*spread;
    const tooClose = (a,b,dist) => Math.abs(a-b) < dist;
    // nudge away from obstacles
    if (tooClose(x, cloudX, 180)) x += 220;
    if (tooClose(x, spikeX, 180)) x += 220;
    return x;
  }

  function setRunnerPositions(){
    const u=$("#runnerUnicorn"), cloud=$("#runnerCloud"), star=$("#runnerStar");
    if (!u || !cloud || !star) return;

    u.style.transform = `translateY(${-uY}px)`;
    cloud.style.left = `${cloudX}px`;
    cloud.style.bottom = `120px`;
    star.style.left = `${starX}px`;
    // Keep stars within reachable jump height.
    star.style.bottom = `${RUNNER_STAR_Y1}px`;

    // add a second star + spike if they exist in DOM (optional)
    const star2 = $("#runnerStar2");
    const spike = $("#runnerSpike");
    if (star2){
      star2.style.left = `${star2X}px`;
      star2.style.bottom = `${RUNNER_STAR_Y2}px`;
    }
    if (spike){
      spike.style.left = `${spikeX}px`;
      spike.style.bottom = `120px`;
    }

    const p = $("#runnerPower");
    if (p){
      p.style.left = `${powerX}px`;
      p.style.bottom = `${RUNNER_POWER_Y}px`;
      p.textContent = (powerType === "shield") ? "🫧" : "🧲";
      // little visual hint when active
      p.style.opacity = 0.95;
    }
  }

  function rectHit(ax,ay,aw,ah, bx,by,bw,bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /* =========================================================
     COLOR MAGIC (FIXED)
     - lazy init when tab opens
     - correct canvas sizing + coords
     ========================================================= */
  let colorReady=false;
  let paintColor="#ff4fd8";
  let stampMode=null;
  let painting=false;
  let ctx=null, canvas=null;

  function setupColor(){
    // run once tab opens (canvas has real size)
    TAB_HOOKS.color = () => {
      if (!colorReady) initColor();
      else resizeCanvas();
    };
  }

  function initColor(){
    canvas = $("#paint");
    const palette = $("#palette");
    if (!canvas || !palette) return;

    ctx = canvas.getContext("2d");
    colorReady = true;

    // build palette
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
        $("#colorMsg").textContent = "Painting! Drag to draw 🎨";
      });
      palette.appendChild(b);
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x, y };
    };

    const drawDot = (x,y) => {
      ctx.beginPath();
      ctx.fillStyle = paintColor;
      ctx.arc(x, y, 10, 0, Math.PI*2);
      ctx.fill();
    };

    const drawStamp = (x,y) => {
      ctx.save();
      ctx.font = "38px system-ui, Apple Color Emoji, Segoe UI Emoji";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stampMode === "hearts" ? "💖" : "⭐", x, y);
      ctx.restore();
    };

    const down = (e) => {
      painting = true;
      const p = getPos(e);
      if (stampMode) drawStamp(p.x,p.y);
      else drawDot(p.x,p.y);
      addStars(1, "Magic paint! ⭐");
      e.preventDefault?.();
    };
    const move = (e) => {
      if (!painting) return;
      if (stampMode) return;
      const p = getPos(e);
      drawDot(p.x,p.y);
      e.preventDefault?.();
    };
    const up = () => { painting = false; };

    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

    canvas.addEventListener("touchstart", down, { passive:false });
    canvas.addEventListener("touchmove", move, { passive:false });
    window.addEventListener("touchend", up);

    $("#clearPaint")?.addEventListener("click", () => {
      beep("bad");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      $("#colorMsg").textContent = "All clean! Paint again ✨";
    });

    $("#stampHearts")?.addEventListener("click", () => {
      beep("tap");
      stampMode="hearts";
      $("#colorMsg").textContent = "Heart stamps 💖 (tap to stamp)";
    });

    $("#stampStars")?.addEventListener("click", () => {
      beep("tap");
      stampMode="stars";
      $("#colorMsg").textContent = "Star stamps ⭐ (tap to stamp)";
    });

    $("#readColor")?.addEventListener("click", () => speak(
      "Color Magic! Pick a color and drag to draw. Tap hearts or stars to stamp!"
    ));
  }

  function resizeCanvas(){
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    // If tab is hidden, r.width may be 0. Skip until visible.
    if (r.width < 10 || r.height < 10) return;

    // Preserve artwork by copying
    const old = document.createElement("canvas");
    old.width = canvas.width;
    old.height = canvas.height;
    old.getContext("2d").drawImage(canvas,0,0);

    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // draw old back scaled
    ctx.drawImage(old, 0, 0, old.width/dpr, old.height/dpr);
  }

  /* =========================================================
     WISH JAR (more kid-friendly)
     ========================================================= */
  function setupWishes(){
    const input = $("#wishInput");
    const list = $("#wishList");
    if (!input || !list) return;

    // Big easy buttons (one tap)
    const presets = [
      "🧁 Unicorn cupcake!",
      "👗 Rainbow dress!",
      "🦄 A unicorn friend!",
      "✨ Glitter magic!",
      "🎀 Sparkly bow!",
      "🌈 A rainbow room!"
    ];

    // Inject quick buttons under the input (if not already)
    const card = $("#tab-wishes .card");
    if (card && !$("#wishQuick")){
      const wrap = document.createElement("div");
      wrap.id = "wishQuick";
      wrap.style.marginTop = "10px";
      wrap.innerHTML = `<div class="note">Tap a wish button! (or type one)</div>`;
      const row = document.createElement("div");
      row.className = "miniRow";
      presets.forEach(p => {
        const b = document.createElement("button");
        b.className = "btn";
        b.textContent = p;
        b.addEventListener("click", () => {
          beep("tap");
          addWish(p);
        });
        row.appendChild(b);
      });
      wrap.appendChild(row);

      // Launch wish button
      const launch = document.createElement("button");
      launch.className = "btn primary";
      launch.textContent = "🚀 Launch a Wish!";
      launch.style.marginTop = "10px";
      launch.addEventListener("click", () => {
        if (!STATE.wishes.length){
          speak("Add a wish first!");
          return;
        }
        launchWishAnimation();
      });
      wrap.appendChild(launch);

      card.appendChild(wrap);
    }

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
        });
        list.appendChild(row);
      });

      if (STATE.wishes.length >= 3){
        unlockBadge("wishes3", "Wish Maker", "Added 3 wishes!", "💖");
      }
    }

    function addWish(v){
      STATE.wishes.unshift(v);
      saveState();
      render();
      addStars(2, "Wish added! ⭐⭐");
      speak("Wish added!");
    }

    $("#addWish")?.addEventListener("click", () => {
      const v = input.value.trim();
      if (!v) return;
      beep("tap");
      input.value = "";
      addWish(v);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#addWish").click();
    });

    $("#randomWish")?.addEventListener("click", () => {
      beep("tap");
      input.value = pick(presets);
      speak("Pick this wish or press add!");
    });

    $("#clearWishes")?.addEventListener("click", () => {
      beep("bad");
      const ok = confirm("Clear all wishes?");
      if (!ok) return;
      STATE.wishes = [];
      saveState();
      render();
    });

    $("#readWishes")?.addEventListener("click", () => {
      if (!STATE.wishes.length) return speak("No wishes yet. Tap a wish button!");
      speak("Your wishes are: " + STATE.wishes.slice(0,5).join(". "));
    });

    function launchWishAnimation(){
      beep("win");
      addStars(5, "Wish launched! ⭐⭐⭐⭐⭐");
      unlockBadge("wish_launch", "Wish Launcher", "Launched a wish!", "🚀");
      const msg = $("#wishMsg");
      if (msg) msg.textContent = "✨ Your wish flew to Unicorn Sky! ✨";
      speak("Your wish flew to Unicorn Sky!");

      // quick confetti-ish sparkle burst
      for (let i=0;i<18;i++){
        const s = document.createElement("div");
        s.textContent = pick(["✨","⭐","💖","🌈"]);
        s.style.position = "fixed";
        s.style.left = (window.innerWidth*0.3 + Math.random()*window.innerWidth*0.4) + "px";
        s.style.top = (window.innerHeight*0.35 + Math.random()*window.innerHeight*0.2) + "px";
        s.style.fontSize = (20 + Math.random()*16) + "px";
        s.style.zIndex = "999";
        s.style.pointerEvents = "none";
        document.body.appendChild(s);

        const dx = (Math.random()*240 - 120);
        const dy = -(80 + Math.random()*180);
        s.animate([
          { transform:`translate(0,0)`, opacity:1 },
          { transform:`translate(${dx}px,${dy}px)`, opacity:0 }
        ], { duration: 900 + Math.random()*400, easing:"cubic-bezier(.2,.8,.2,1)" });

        setTimeout(() => s.remove(), 1400);
      }
    }

    render();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  /* =========================================================
     Badges
     ========================================================= */
  const BADGE_CATALOG = [
    { id:"match_easy", title:"Match Winner", desc:"Won Match on Easy!", emoji:"🧠" },
    { id:"match_hard", title:"Match Master", desc:"Won Match on Hard!", emoji:"🧠" },
    { id:"runner_7", title:"Rainbow Sprinter", desc:"Collected 7 stars!", emoji:"⭐" },
    { id:"wishes3", title:"Wish Maker", desc:"Added 3 wishes!", emoji:"💖" },
    { id:"wish_launch", title:"Wish Launcher", desc:"Launched a wish!", emoji:"🚀" },
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
     Sparkle background
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
        s: (Math.random()*0.55+0.12)*dpr,
        hue: 285 + Math.random()*70
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
    try{
      $("#stars").textContent = String(STATE.stars|0);
      $("#badges").textContent = String(Object.keys(STATE.badges||{}).length);

      setupSparkleBg();
      TAB_HOOKS.dressup = setupDressup;
      TAB_HOOKS.pet = setupPet;
      setupTabs();
      setupHeaderBtns();
      setupHome();

      setupGallery();
      setupDressup();
      setupPet();
      setupMatch();
      setupRunner();
      setupColor();
      setupWishes();
      renderBadges();

      setTimeout(() => {
        setSub("Welcome, Journey! 🦄✨");
        speak("Welcome, Journey! Pick a tab and have fun in Unicorn World!");
      }, 450);
    }catch(err){
      console.error("Unicorn World boot error:", err);
      const w = document.getElementById('jsWarning');
      if (w){
        w.classList.add('show');
        w.innerHTML = `<b>Oops!</b> Unicorn World hit a bug.<div class="small">Open DevTools → Console and look for <code>Unicorn World boot error</code>.</div>`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
