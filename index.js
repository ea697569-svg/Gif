// ===== HIDDEN SEARCH ENGINE =====
// id: [categories/tags it belongs to, related words that should also find it]
const GIF_ENGINE = {
  "101": { categories: ["sports", "football", "messi"], related: ["happy", "celebration"] },
  "102": { categories: ["sports", "football"],          related: ["happy"] },
  "103": { categories: ["sports", "football", "gif"],   related: ["happy"] },
  "104": { categories: ["animals", "cat", "cute"],      related: ["love", "happy"] },
  "201": { categories: ["memes", "motivation"],         related: ["sad", "never give up"] },
  "202": { categories: ["memes", "motivation"],         related: ["sad"] }
};
// =================================

// Filter by ID, category, or related tags (called on every keystroke)
function filterItems() {
  const searchInput = document.getElementById('search-bar').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.grid-card');

  cards.forEach(card => {
    const itemId = card.getAttribute('data-id');
    const engine = GIF_ENGINE[itemId] || { categories: [], related: [] };

    const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
    const allTags = [itemId, cardCategory, ...engine.categories, ...engine.related];

    const match = allTags.some(tag => tag.includes(searchInput));
    card.style.display = match ? "flex" : "none";
  });
}

// Called when a category/reaction is clicked in the mega menu
function filterByCategory(category) {
  document.getElementById('search-bar').value = category;
  filterItems();

  // Close the open Bootstrap dropdown
  const openDropdown = document.querySelector('.dropdown-menu.show');
  if (openDropdown) {
    bootstrap.Dropdown.getOrCreateInstance(
      openDropdown.closest('.nav-item').querySelector('[data-bs-toggle="dropdown"]')
    ).hide();
  }
}

/* ===== DRAG & SHARE =====
   1. Every card is draggable — dragging hands the browser the image
      so you can drop it straight into WhatsApp / Discord / Telegram.
   2. The Copy button copies the actual image (falls back to URL). */

document.querySelectorAll('.grid-card').forEach(card => {
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', e => {
    const img = card.querySelector('.media-item');
    e.dataTransfer.setData('text/uri-list', img.src);  // apps that accept a link
    e.dataTransfer.setData('text/plain', img.src);     // plain-text targets
    e.dataTransfer.effectAllowed = 'copyLink';
  });
});

function showCopied(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  btn.classList.add('copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 1500);
}

/* ===== GIF CREATOR (upload video -> make GIF in the browser) ===== */
let creatorVideoURL = null;

function toggleCreator() {
  const panel = document.getElementById('creator-panel');
  const willOpen = panel.style.display === 'none';
  hideGamePanels();
  if (willOpen) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function loadCreatorVideo(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (creatorVideoURL) URL.revokeObjectURL(creatorVideoURL);
  creatorVideoURL = URL.createObjectURL(file);

  const video = document.getElementById('creator-video');
  video.src = creatorVideoURL;
  video.style.display = 'block';
  document.getElementById('creator-options').style.display = 'block';
  document.getElementById('gif-result').style.display = 'none';
  document.getElementById('creator-status').textContent = '';

  // When metadata loads, set the start slider's max to the video length
  video.onloadedmetadata = () => {
    document.getElementById('gif-start').max = Math.max(0, video.duration - 1).toFixed(1);
    updateCreatorLabels();
  };
}

function updateCreatorLabels() {
  document.getElementById('start-label').textContent =
    parseFloat(document.getElementById('gif-start').value).toFixed(1) + 's';
  document.getElementById('len-label').textContent =
    parseFloat(document.getElementById('gif-length').value).toFixed(1) + 's';
}

function makeGif() {
  if (!creatorVideoURL) return;
  const btn = document.getElementById('make-gif-btn');
  const status = document.getElementById('creator-status');
  btn.disabled = true;
  btn.textContent = '⏳ Building GIF...';
  status.textContent = 'Extracting frames — keep this tab open.';

  gifshot.createGIF({
    video: [creatorVideoURL],
    start: parseFloat(document.getElementById('gif-start').value),
    length: parseFloat(document.getElementById('gif-length').value),
    gifWidth: 480,
    gifHeight: 270,
    frameRate: 10,
    quality: 10,
    text: document.getElementById('gif-text').value || undefined,
    fontSize: '28px',
    fontColor: '#ffffff',
    textStrokeColor: '#000000',
    textStrokeWidth: 3,
  }, function (result) {
    btn.disabled = false;
    btn.textContent = '⚡ Make GIF';
    if (!result.error) {
      document.getElementById('gif-output').src = result.image;
      const dl = document.getElementById('gif-download');
      dl.href = result.image;
      document.getElementById('gif-result').style.display = 'block';
      status.textContent = '✅ Done! Download it and drop it into your image/ folder to add it to the site.';
    } else {
      status.textContent = '❌ ' + result.errorMsg;
    }
  });
}

/* ===== THEATER (fullscreen GIF viewer) ===== */
let theaterCard = null;

function openTheater(card) {
  theaterCard = card;
  const img = card.querySelector('.media-item');
  document.getElementById('theater-img').src = img.src;
  document.getElementById('theater-id').textContent = 'ID: ' + card.getAttribute('data-id');
  document.getElementById('theater-download').href = img.src;
  document.getElementById('theater').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeTheater() {
  document.getElementById('theater').style.display = 'none';
  document.body.style.overflow = '';
  theaterCard = null;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTheater(); });

async function copyTheaterGif() {
  if (!theaterCard) return;
  const img = theaterCard.querySelector('.media-item');
  await copyImageOrLink(img.src, '✅ Image copied!', '🔗 Link copied!');
  bumpTrend(theaterCard.getAttribute('data-id'));
}

async function shareTheaterLink() {
  if (!theaterCard) return;
  const id = theaterCard.getAttribute('data-id');
  const url = location.origin + location.pathname + '?gif=' + id;
  try {
    await navigator.clipboard.writeText(url);
    toast('🔗 Share link copied!');
  } catch (e) {
    prompt('Copy this link:', url);
  }
}

// Open theater automatically if the page was opened with ?gif=ID
function openFromUrl() {
  const id = new URLSearchParams(location.search).get('gif');
  if (!id) return;
  const card = document.querySelector(`.grid-card[data-id="${id}"]`);
  if (card) openTheater(card);
}

/* ===== REACTION ROULETTE ===== */
function roulette() {
  const cards = [...document.querySelectorAll('.grid-card')].filter(c => c.style.display !== 'none');
  if (!cards.length) return;
  const pick = cards[Math.floor(Math.random() * cards.length)];
  openTheater(pick);
  toast('🎲 The wheel chose ID ' + pick.getAttribute('data-id') + '!');
}

/* ===== SHARED COPY HELPERS ===== */
async function copyImageOrLink(src, okMsg, linkMsg) {
  try {
    const blob = await (await fetch(src)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast(okMsg);
    return;
  } catch (e) { console.warn('Image copy failed:', e); }
  try {
    await navigator.clipboard.writeText(src);
    toast(linkMsg);
    return;
  } catch (e) { console.warn('Clipboard API failed:', e); }
  try {
    const ta = document.createElement('textarea');
    ta.value = src; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast(linkMsg);
  } catch (e) {
    toast('❌ Copy failed — drag the GIF instead');
  }
}

// Card copy button now routes through the helper
async function copyGif(event, id) {
  event.stopPropagation();
  const card = event.target.closest('.grid-card');
  await copyImageOrLink(card.querySelector('.media-item').src, '✅ Image copied!', '🔗 Link copied!');
  bumpTrend(id);
}

function showCopied(btn, text) {
  const original = btn.textContent;
  btn.textContent = text;
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
}

/* ===== TOAST (little popup message) ===== */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ===== GIF GUESS GAME ===== */
const GUESS_CATEGORIES = ["sports", "animals", "memes", "happy", "sad", "love"];
const GUESS_ROUNDS = 8;
let guessState = { round: 0, score: 0, correct: "", lock: false };

function startGuessGame(hard = false) {
  hideGamePanels();
  const panel = document.getElementById('guess-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  guessState = { round: 0, score: 0, correct: "", lock: false, hard, timeLeft: 45, timer: null };
  document.getElementById('guess-end').style.display = 'none';
  document.getElementById('guess-options').style.display = 'grid';
  const timerEl = document.getElementById('guess-timer');
  if (hard) {
    timerEl.style.display = 'block';
    document.getElementById('guess-time').textContent = '45';
    guessState.timer = setInterval(() => {
      guessState.timeLeft--;
      document.getElementById('guess-time').textContent = guessState.timeLeft;
      if (guessState.timeLeft <= 0) { clearInterval(guessState.timer); failHard('⏰ Time\'s up!'); }
    }, 1000);
  } else timerEl.style.display = 'none';
  nextGuessRound();
}

function nextGuessRound() {
  const cards = [...document.querySelectorAll('.grid-card')];
  if (!cards.length) return;
  guessState.lock = false;
  guessState.round++;
  document.getElementById('guess-round').textContent = guessState.round;
  document.getElementById('guess-score').textContent = guessState.score;
  document.getElementById('guess-feedback').textContent = '';

  const known = cards.filter(c =>
    GIF_ENGINE[c.getAttribute('data-id')] || c.getAttribute('data-category'));
  const pool = known.length ? known : cards;
  const card = pool[Math.floor(Math.random() * pool.length)];
  const engine = GIF_ENGINE[card.getAttribute('data-id')]
    || { categories: [(card.getAttribute('data-category') || 'misc')] };
  guessState.correct = engine.categories[0];

  document.getElementById('guess-img').src = card.querySelector('.media-item').src;

  // 1 correct + 3 random wrong options, shuffled
  const wrongs = GUESS_CATEGORIES.filter(c => c !== guessState.correct)
    .sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [guessState.correct, ...wrongs].sort(() => Math.random() - 0.5);

  document.getElementById('guess-options').innerHTML = options.map(c =>
    `<button class="btn btn-outline-light text-capitalize" onclick="answerGuess('${c}', this)">${c}</button>`
  ).join('');
}

function answerGuess(pick, btn) {
  if (guessState.lock) return;
  guessState.lock = true;
  const fb = document.getElementById('guess-feedback');
  if (pick === guessState.correct) {
    guessState.score++;
    btn.classList.replace('btn-outline-light', 'btn-success');
    fb.style.color = '#28a745';
    fb.textContent = '✅ Correct!';
  } else {
    btn.classList.replace('btn-outline-light', 'btn-danger');
    fb.style.color = '#dc3545';
    fb.textContent = `❌ Nope — it was "${guessState.correct}"!`;
  }
  document.getElementById('guess-score').textContent = guessState.score;

  setTimeout(() => {
    if (guessState.round >= GUESS_ROUNDS) endGuessGame();
    else nextGuessRound();
  }, 1100);
}

function endGuessGame() {
  if (guessState.hard) {
    clearInterval(guessState.timer);
    document.getElementById('guess-timer').style.display = 'none';
    if (guessState.score >= 6) return winHard(`⚡ Hard Mode crushed: ${guessState.score}/${GUESS_ROUNDS} in time!`);
    return failHard(`😈 Hard Mode needs 6+ correct in 45s — you got ${guessState.score}.`);
  }
  document.getElementById('guess-options').style.display = 'none';
  document.getElementById('guess-feedback').textContent = '';
  const end = document.getElementById('guess-end');
  end.style.display = 'block';
  const s = guessState.score, max = GUESS_ROUNDS;
  let msg = `You scored ${s}/${max} `;
  msg += s === max ? '— PERFECT! 🏆' : s >= 6 ? '— Sharp eyes! 🎯' : s >= 4 ? '— Not bad! 😄' : '— The GIFs fooled you! 😂';
  document.getElementById('guess-final').textContent = msg;
  if (s >= 6) toast('🏆 Game Master! ' + s + '/' + max);
}

/* ===== TRENDING BADGES (counts copies locally, top 2 get 🔥) ===== */
function bumpTrend(id) {
  const trends = JSON.parse(localStorage.getItem('gifTrends') || '{}');
  trends[id] = (trends[id] || 0) + 1;
  localStorage.setItem('gifTrends', JSON.stringify(trends));
  renderTrends(trends);
}

function renderTrends(trends) {
  const top = Object.entries(trends).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  document.querySelectorAll('.grid-card').forEach(card => {
    const label = card.querySelector('.item-id-label');
    const base = 'ID: ' + card.getAttribute('data-id');
    label.textContent = top.includes(card.getAttribute('data-id')) ? '🔥 ' + base : base;
  });
}

// Restore trends on page load
(function initTrends() {
  const trends = JSON.parse(localStorage.getItem('gifTrends') || '{}');
  if (Object.keys(trends).length) renderTrends(trends);
})();

/* ===== KEYBOARD SHORTCUTS =====
   1-9 = copy that card's GIF   R = roulette   G = GIF Guess   B = battle   M = memory   / = search   Esc = close */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if (e.key === '/') { e.preventDefault(); document.getElementById('search-bar').focus(); }
  else if (k === 'r') roulette();
  else if (k === 'g') startGuessGame();
  else if (k === 'b') startBattle();
  else if (k === 'm') startMemory();
  else if (/^[1-9]$/.test(e.key)) {
    const card = document.querySelectorAll('.grid-card')[parseInt(e.key) - 1];
    if (card) {
      copyImageOrLink(card.querySelector('.media-item').src, '✅ Image copied!', '🔗 Link copied!');
      bumpTrend(card.getAttribute('data-id'));
      toast('⌨️ Copied ID ' + card.getAttribute('data-id'));
    }
  }
});

/* ===== GIF BATTLE ===== */
let battleState = { imgs: [], lock: false };

function startBattle() {
  hideGamePanels();
  const panel = document.getElementById('battle-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  battleState.lock = false;
  newBattlePair();
  renderBattleScores();
}

function newBattlePair() {
  const cards = [...document.querySelectorAll('.grid-card')];
  if (cards.length < 2) return;
  const shuffled = cards.sort(() => Math.random() - 0.5);
  battleState.imgs = [shuffled[0], shuffled[1]];
  document.getElementById('battle-img-0').src = battleState.imgs[0].querySelector('.media-item').src;
  document.getElementById('battle-img-1').src = battleState.imgs[1].querySelector('.media-item').src;
  document.getElementById('battle-feedback').textContent = '';
}

function voteBattle(side) {
  if (battleState.lock || !battleState.imgs.length) return;
  battleState.lock = true;
  const id = battleState.imgs[side].getAttribute('data-id');
  const votes = JSON.parse(localStorage.getItem('gifBattles') || '{}');
  votes[id] = (votes[id] || 0) + 1;
  localStorage.setItem('gifBattles', JSON.stringify(votes));
  document.getElementById('battle-feedback').textContent = '💚 Got your vote!';
  renderBattleScores();
  setTimeout(() => { battleState.lock = false; newBattlePair(); }, 900);
}

function renderBattleScores() {
  const votes = JSON.parse(localStorage.getItem('gifBattles') || '{}');
  battleState.imgs.forEach((card, i) => {
    document.getElementById('battle-score-' + i).textContent =
      (votes[card.getAttribute('data-id')] || 0) + ' ❤️';
  });
}

/* ===== MEMORY MATCH ===== */
let memState = { first: null, lock: false, clicks: 0, pairs: 0 };

function startMemory(hard = false) {
  hideGamePanels();
  const panel = document.getElementById('memory-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  memState = { first: null, lock: false, clicks: 0, pairs: 0, hard, timeLeft: 60, timer: null };
  const timerEl = document.getElementById('memory-timer');
  if (hard) {
    timerEl.style.display = 'block';
    document.getElementById('mem-time').textContent = '60';
    memState.timer = setInterval(() => {
      memState.timeLeft--;
      document.getElementById('mem-time').textContent = memState.timeLeft;
      if (memState.timeLeft <= 0) { clearInterval(memState.timer); failHard('⏰ Time\'s up!'); }
    }, 1000);
  } else timerEl.style.display = 'none';
  document.getElementById('memory-end').style.display = 'none';
  document.getElementById('mem-clicks').textContent = '0';
  document.getElementById('mem-pairs').textContent = '0';

  // 6 site GIFs, duplicated = 12 tiles, shuffled
  const imgs = [...document.querySelectorAll('.grid-card .media-item')].map(i => i.src);
  const picked = imgs.slice(0, 6);
  const tiles = [...picked, ...picked].sort(() => Math.random() - 0.5);

  document.getElementById('memory-grid').innerHTML = tiles.map((src, i) => `
    <div class="mem-tile" data-src="${src}" onclick="flipTile(this)">
      <img src="${src}" class="mem-img" alt="?" style="visibility:hidden;">
      <span class="mem-back">🎴</span>
    </div>`).join('');
}

function flipTile(tile) {
  if (memState.lock || tile.classList.contains('matched') || tile === memState.first) return;
  tile.querySelector('.mem-img').style.visibility = 'visible';
  tile.querySelector('.mem-back').style.display = 'none';
  memState.clicks++;
  document.getElementById('mem-clicks').textContent = memState.clicks;

  if (!memState.first) { memState.first = tile; return; }

  if (memState.first.dataset.src === tile.dataset.src) {
    memState.first.classList.add('matched');
    tile.classList.add('matched');
    memState.first = null;
    memState.pairs++;
    document.getElementById('mem-pairs').textContent = memState.pairs;
    if (memState.pairs === 6) {
      document.getElementById('memory-grid').style.display = 'none';
      const end = document.getElementById('memory-end');
      end.style.display = 'block';
      if (memState.hard) {
        clearInterval(memState.timer);
        document.getElementById('memory-timer').style.display = 'none';
        winHard(`🧠 Memory Master: solved in ${memState.clicks} clicks under pressure!`);
      } else {
        document.getElementById('memory-final').textContent =
          `🎉 Solved in ${memState.clicks} clicks!`;
      }
    }
  } else {
    memState.lock = true;
    const a = memState.first, b = tile;
    memState.first = null;
    setTimeout(() => {
      a.querySelector('.mem-img').style.visibility = 'hidden';
      a.querySelector('.mem-back').style.display = '';
      b.querySelector('.mem-img').style.visibility = 'hidden';
      b.querySelector('.mem-back').style.display = '';
      memState.lock = false;
    }, 700);
  }
}

/* helper: only one game panel open at a time */
function hideGamePanels() {
  ['guess-panel', 'battle-panel', 'memory-panel', 'creator-panel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('memory-grid').style.display = 'grid';
}

/* ===== HARD MODE REWARDS ===== */
function winHard(msg) {
  toast('🏆 ' + msg);
  localStorage.setItem('secretUnlocked', '1');
  localStorage.setItem('premiumEarned', '1');  // earns cheapest premium GIF
  renderVault();
  document.getElementById('vault-panel').style.display = 'block';
  document.getElementById('vault-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  // show game end screens gracefully
  ['guess-end', 'memory-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  });
  const gf = document.getElementById('guess-final');
  if (gf) gf.textContent = '🏆 ' + msg;
  const mf = document.getElementById('memory-final');
  if (mf) mf.textContent = '🏆 ' + msg;
}

function failHard(msg) {
  toast('😈 ' + msg);
  const gf = document.getElementById('guess-final');
  if (gf) { document.getElementById('guess-end').style.display = 'block'; gf.textContent = msg; }
  const mf = document.getElementById('memory-final');
  if (mf && memState.pairs === 6) { document.getElementById('memory-end').style.display = 'block'; mf.textContent = msg; }
  document.getElementById('guess-options').style.display = 'none';
  document.getElementById('memory-grid').style.display = 'none';
  document.getElementById('guess-timer').style.display = 'none';
  document.getElementById('memory-timer').style.display = 'none';
}

function renderVault() {
  const unlocked = localStorage.getItem('secretUnlocked') === '1';
  document.getElementById('vault-locked').style.display = unlocked ? 'none' : 'block';
  document.getElementById('vault-unlocked').style.display = unlocked ? 'block' : 'none';
}

async function copySecretGif() {
  await copyImageOrLink('image/special-gift.gif', '🌟 Secret GIF copied!', '🔗 Secret link copied!');
}

// Show vault state on load
renderVault();

/* ===== 🕹️ CHEAT CODES =====
   Type "golden" anywhere on the page (not in an input)
   OR press the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
   → instantly unlocks the Secret Vault + free Premium GIF */
let keyBuffer = '';
const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
let konamiPos = 0;

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;

  // Typed-word cheat: "golden"
  if (e.key.length === 1) {
    keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-10);
    if (keyBuffer.endsWith('golden')) return activateCheat('🕹️ CHEAT: "golden" typed!');
  }

  // Konami code progress
  if (e.key.toLowerCase() === KONAMI[konamiPos]) {
    konamiPos++;
    if (konamiPos === KONAMI.length) { konamiPos = 0; return activateCheat('🕹️ KONAMI CODE!'); }
  } else {
    konamiPos = (e.key.toLowerCase() === KONAMI[0]) ? 1 : 0;
  }
});

function activateCheat(msg) {
  localStorage.setItem('secretUnlocked', '1');
  localStorage.setItem('premiumEarned', '1');
  renderVault();
  document.getElementById('vault-panel').style.display = 'block';
  document.getElementById('vault-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(msg + ' Vault unlocked! 🏆');
  keyBuffer = '';
}

/* ===== LIVE DASHBOARD GIFS (IndexedDB — handles big files) ===== */
const idbHome = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('oursgif-db', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('gifs', { keyPath: 'id' });
      r.onsuccess = () => { idbHome.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  all() { return new Promise(res => {
    const t = idbHome.db.transaction('gifs').objectStore('gifs').getAll();
    t.onsuccess = () => res(t.result || []);
  }); }
};

(async function loadCustomGifs() {
  let custom = JSON.parse(localStorage.getItem('customGifs') || '[]');  // legacy fallback
  try {
    await idbHome.open();
    const fromDb = await idbHome.all();
    if (fromDb.length || !custom.length) custom = fromDb;
  } catch (e) { console.warn('IndexedDB unavailable, using localStorage fallback'); }

  if (!custom.length) return;
  const grid = document.getElementById('media-grid');
  if (!grid) return;

  custom.forEach(g => {
    if (!GIF_ENGINE[g.id]) GIF_ENGINE[g.id] = { categories: [g.cat], related: g.tags || [] };

    const card = document.createElement('div');
    card.className = 'grid-card';
    card.setAttribute('data-id', g.id);
    card.setAttribute('draggable', 'true');
    card.onclick = () => openTheater(card);
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/uri-list', g.src);
      e.dataTransfer.setData('text/plain', g.src);
    });
    card.innerHTML = `
      <img class="media-item" src="${g.src}" alt="GIF">
      <div class="item-id-label">ID: ${g.id} · ⭐ custom</div>
      <button class="copy-btn" onclick="copyGif(event, '${g.id}')">📋 Copy GIF</button>`;
    grid.appendChild(card);
  });

  const trends = JSON.parse(localStorage.getItem('gifTrends') || '{}');
  if (Object.keys(trends).length) renderTrends(trends);
})();