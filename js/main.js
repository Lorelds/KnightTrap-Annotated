// App shell: screens, menus, settings, online lobby, and the glue between Game and the DOM.
// [ID] Kerangka aplikasi: layar, menu, pengaturan, lobi online, dan penghubung antara Game dan halaman.

// [ID] Angka tetap: kedalaman tiap level dan lama satu giliran (TURN_SECONDS).
import { DIFFICULTY, TURN_SECONDS } from './config.js';
// [ID] Fungsi aturan yang dibutuhkan layar.
import { createState, legalJumps, serialize, deserialize, squareName } from './rules.js';
// [ID] Skor menang (untuk menampilkan "Menang dalam n giliran").
import { WIN } from './ai.js';
// [ID] Tampilan papan dan gambar knight.
import { BoardView, knightSvg } from './board.js';
// [ID] Alur pertandingan.
import { Game } from './game.js';
// [ID] Sesi online dan perapi kode ruang.
import { OnlineSession, normalizeCode } from './net.js';
// [ID] Bahasa: atur, baca, terjemahkan.
import { setLang, getLang, t } from './i18n.js';

// [ID] Singkatan: $ = cari satu elemen dengan selector CSS.
const $ = (sel, root = document) => root.querySelector(sel);
// [ID] $$ = cari semua elemen, dalam bentuk array.
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- Settings (per-browser convenience only) --------------------------------
// [ID] ---- Pengaturan (disimpan di browser ini saja) ----
// [ID] Nama kunci penyimpanan pengaturan di localStorage.
const SETTINGS_KEY = 'knighttrap.settings';
// [ID] Pengaturan default: bahasa Indonesia, level Medium, manusia jalan duluan, Alpha-Beta ON.
const settings = { lang: 'id', diff: 'medium', first: 'human', prune: true };
// [ID] Coba baca pengaturan tersimpan.
try {
  // [ID] Timpa default dengan yang tersimpan.
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
// [ID] Gagal (misalnya mode privat): pakai default.
} catch {}
// [ID] Simpan pengaturan.
function saveSettings() {
  // [ID] Coba simpan.
  try {
    // [ID] Simpan sebagai teks JSON.
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // [ID] Gagal: abaikan.
  } catch {}
}

// ---- Screens ----------------------------------------------------------------
// [ID] ---- Layar ----
// [ID] Layar yang sedang tampil.
let currentScreen = 'menu';
// [ID] Tombol kembali (←) di tiap layar menuju ke layar mana.
const backTarget = { sp: 'menu', mp: 'menu', howto: 'menu', settings: 'menu', lobby: 'mp' };

// [ID] Tampilkan layar "name", sembunyikan yang lain.
function showScreen(name) {
  // [ID] Hanya layar dengan data-screen yang cocok yang diberi class is-active.
  for (const s of $$('.screen')) s.classList.toggle('is-active', s.dataset.screen === name);
  // [ID] Simpan layar saat ini.
  currentScreen = name;
  // [ID] Gulir ke atas.
  window.scrollTo(0, 0);
}

// ---- Toast & confirm ---------------------------------------------------------
// [ID] ---- Notifikasi singkat (toast) dan dialog konfirmasi ----
// [ID] Timer untuk menyembunyikan toast.
let toastTimer = 0;
// [ID] Tampilkan pesan singkat di bawah layar; bad = merah.
function toast(text, bad = false) {
  // [ID] Elemen toast.
  const el = $('#toast');
  // [ID] Isi teks.
  el.textContent = text;
  // [ID] Gaya merah kalau bad.
  el.classList.toggle('bad', bad);
  // [ID] Tampilkan.
  el.classList.add('show');
  // [ID] Batalkan timer lama.
  clearTimeout(toastTimer);
  // [ID] Sembunyikan setelah 2,8 detik.
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// [ID] Dialog "Keluar dari game?". Mengembalikan Promise true (keluar) atau false (lanjut).
function confirmDialog(text) {
  // [ID] Promise yang selesai saat pengguna memilih.
  return new Promise((resolve) => {
    // [ID] Lapisan gelap di belakang dialog.
    const wrap = document.createElement('div');
    // [ID] Class modal.
    wrap.className = 'modal';
    // [ID] Isi dialog: judul, tombol "Menu utama" (data-yes) dan "Lanjut main" (data-no).
    wrap.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <h2 style="font-size:24px;margin-top:0">${text}</h2>
        <div class="go-actions" style="margin-top:20px">
          <button class="btn btn-primary" data-yes>${t('mainMenu')}</button>
          <button class="btn" data-no>${getLang() === 'id' ? 'Lanjut main' : 'Keep playing'}</button>
        </div>
      </div>`;
    // [ID] Tutup dialog dan kirim jawaban.
    const done = (v) => {
      // [ID] Hapus dialog dari halaman.
      wrap.remove();
      // [ID] Selesaikan Promise.
      resolve(v);
    };
    // [ID] Saat diklik:
    wrap.addEventListener('click', (e) => {
      // [ID] klik di luar kartu atau tombol "lanjut": false,
      if (e.target === wrap || e.target.closest('[data-no]')) done(false);
      // [ID] tombol "menu utama": true.
      else if (e.target.closest('[data-yes]')) done(true);
    });
    // [ID] Pasang dialog di halaman.
    document.body.appendChild(wrap);
    // [ID] Fokus ke tombol "lanjut" (pilihan aman).
    $('[data-no]', wrap).focus();
  });
}

// ---- How to play ------------------------------------------------------------
// [ID] ---- Layar Cara Bermain ----
// [ID] Buat HTML papan mini 5x5 untuk ilustrasi.
function miniBoard(spec) {
  // spec: { k0, k1, legal: [], burned: [], trap: [], threat: [] } in 5x5 coordinates "r,c"
  // [ID] Ubah daftar koordinat [r, c] menjadi Set teks "r,c" supaya mudah dicek.
  const set = (arr) => new Set((arr || []).map((p) => p.join(',')));
  // [ID] Kotak bertitik (lompatan legal).
  const legal = set(spec.legal);
  // [ID] Kotak terbakar.
  const burned = set(spec.burned);
  // [ID] Kotak jebakan.
  const trap = set(spec.trap);
  // [ID] Kotak bergaris (tujuan lawan).
  const threat = set(spec.threat);
  // [ID] Mulai HTML.
  let html = '<div class="mini-board">';
  // [ID] Setiap baris,
  for (let r = 0; r < 5; r++) {
    // [ID] setiap kolom:
    for (let c = 0; c < 5; c++) {
      // [ID] kunci koordinat,
      const key = `${r},${c}`;
      // [ID] class dasar,
      const cls = ['cell'];
      // [ID] kotak gelap,
      if ((r + c) % 2) cls.push('dark');
      // [ID] bertitik,
      if (legal.has(key)) cls.push('legal');
      // [ID] terbakar,
      if (burned.has(key)) cls.push('burned');
      // [ID] jebakan,
      if (trap.has(key)) cls.push('trap');
      // [ID] bergaris,
      if (threat.has(key)) cls.push('threat');
      // [ID] isi kotak (knight atau kosong),
      let inner = '';
      // [ID] knight biru,
      if (spec.k0?.join(',') === key) inner = knightSvg(0);
      // [ID] knight oranye,
      if (spec.k1?.join(',') === key) inner = knightSvg(1);
      // [ID] tambahkan kotak.
      html += `<div class="${cls.join(' ')}" style="display:grid;place-items:center">${inner}</div>`;
    }
  }
  // [ID] Tutup HTML.
  return html + '</div>';
}

// [ID] Isi layar Cara Bermain dengan tiga langkah: Lompat, Bakar, Jebak.
function buildHowTo() {
  // [ID] Data tiga langkah.
  const steps = [
    // [ID] Langkah 1: Lompat, knight di tengah dengan 8 titik lompatan.
    {
      // [ID] Judul.
      title: t('step1Title'),
      // [ID] Penjelasan.
      text: t('step1Text'),
      // [ID] Papan mini.
      board: miniBoard({ k0: [2, 2], legal: [[0, 1], [0, 3], [1, 0], [1, 4], [3, 0], [3, 4], [4, 1], [4, 3]] }),
    },
    // [ID] Langkah 2: Bakar, kotak asal terbakar.
    {
      // [ID] Judul.
      title: t('step2Title'),
      // [ID] Penjelasan.
      text: t('step2Text'),
      // [ID] Papan mini.
      board: miniBoard({ k0: [0, 3], burned: [[2, 2]] }),
    },
    // [ID] Langkah 3: Jebak, satu kotak dihancurkan.
    {
      // [ID] Judul.
      title: t('step3Title'),
      // [ID] Penjelasan.
      text: t('step3Text'),
      // [ID] Papan mini: Biru di atas, Oranye di pojok kanan bawah, satu kotak terbakar, satu kotak dijebak.
      board: miniBoard({ k0: [0, 3], k1: [4, 4], burned: [[2, 2]], trap: [[2, 3]] }),
    },
  ];
  // [ID] Ubah setiap langkah menjadi kartu HTML lalu gabungkan.
  $('#howto-steps').innerHTML = steps
    // [ID] Kartu: papan mini, nomor, judul, penjelasan.
    .map(
      (s, i) => `<article class="step">${s.board}<h3><span class="step-num">${i + 1}</span>${s.title}</h3><p>${s.text}</p></article>`,
    )
    // [ID] Gabung tanpa pemisah.
    .join('');
  // [ID] Kotak aturan di bawah langkah-langkah.
  const rules = $('.lose-rule');
  // [ID] Hapus aturan tambahan lama (supaya tidak dobel saat bahasa diganti).
  for (const p of $$('.added-rule', rules)) p.remove();
  // [ID] Tambahkan aturan Batal lompat, Waktu (pakai TURN_SECONDS), dan Petunjuk.
  rules.insertAdjacentHTML('beforeend', `<p class="added-rule">${t('undoRule')}</p><p class="added-rule">${t('timeRule', TURN_SECONDS)}</p><p class="added-rule">${t('hintRule')}</p>`);
}

// ---- Game UI glue -----------------------------------------------------------
// [ID] ---- Penghubung game dan tampilan ----
// [ID] Papan permainan (dibuat sekali).
const board = new BoardView($('#board'), $('#board-shell'));
// [ID] Game yang sedang berjalan.
let game = null;
// [ID] Pengaturan game terakhir (untuk tombol Main lagi).
let gameConfig = null; // how to start a rematch
// [ID] Sesi online.
let session = null;
// [ID] Status online: nomor ronde, siapa yang minta main lagi, apakah lawan keluar.
let online = { round: 0, myRematch: false, peerRematch: false, left: false };

// [ID] Nama warna sisi: 0 = Biru, 1 = Oranye.
function colorName(side) {
  // [ID] (terjemahan)
  return side === 0 ? t('blue') : t('orange');
}

// [ID] Objek ui: fungsi-fungsi yang dipanggil game.js untuk memperbarui layar.
const ui = {
  // [ID] Perbarui status dan kartu pemain.
  update(g, text) {
    // [ID] State.
    const s = g.state;
    // [ID] Elemen status.
    const status = $('#status');
    // [ID] Warna status: pemenang kalau selesai, selain itu yang sedang jalan.
    const side = g.phase === 'over' ? g.winner : s.turn;
    // [ID] Simpan sisi untuk CSS.
    status.dataset.side = side;
    // [ID] Status merah saat fase jebakan.
    status.classList.toggle('trap-mode', g.phase === 'trap');
    // [ID] Teks status.
    $('#status-text').textContent = text;
    // [ID] Tombol "Batal lompat" hanya tampil saat pemain memilih jebakan.
    $('#undo-jump').hidden = !(g.phase === 'trap' && g.current?.kind === 'human');
    // [ID] Untuk setiap kartu pemain:
    for (const card of $$('.pcard')) {
      // [ID] sisinya,
      const sd = Number(card.dataset.side);
      // [ID] data pemainnya,
      const p = g.players[sd];
      // [ID] nama,
      $('.pcard-name', card).textContent = p.name;
      // [ID] keterangan (warna),
      $('.pcard-sub', card).textContent = p.sub;
      // [ID] jumlah lompatan legal,
      const mob = legalJumps(s, sd).length;
      // [ID] tulis angkanya,
      $('.pcard-mob b', card).textContent = mob;
      // [ID] angka merah kalau tinggal 1 atau 0,
      $('.pcard-mob', card).classList.toggle('danger', g.phase !== 'over' && mob <= 1);
      // [ID] sorot yang sedang jalan,
      card.classList.toggle('is-turn', g.phase !== 'over' && s.turn === sd);
      // [ID] sorot pemenang.
      card.classList.toggle('is-winner', g.phase === 'over' && g.winner === sd);
    }
  },
  // [ID] Tampilkan/sembunyikan tulisan "berpikir".
  thinking(on) {
    // [ID] (class on)
    $('#thinking').classList.toggle('on', on);
  },
  // [ID] Tampilkan sisa waktu giliran (null = sembunyikan).
  timer(seconds) {
    // [ID] Elemen penghitung waktu.
    const el = $('#turn-timer');
    // [ID] Tulis "n dtk", atau kosong kalau null.
    el.textContent = seconds === null ? '' : t('timerLeft', seconds);
    // [ID] Class low (merah) saat sisa 3 detik atau kurang.
    el.classList.toggle('low', seconds !== null && seconds <= 3);
  },
  // [ID] Waktu habis: tampilkan pesan.
  timeUp() {
    // [ID] Pesan singkat "Waktu habis..." di bawah layar.
    toast(t('timeUp'));
  },
  // [ID] Isi panel "Statistik AI" dengan hasil pencarian.
  stats(res) {
    // [ID] Fungsi bantu: isi elemen dengan id tertentu,
    const set = (id, html) => {
      // [ID] isi HTML elemen itu.
      $(id).innerHTML = html;
    };
    // [ID] Kedalaman.
    set('#st-depth', String(res.depth));
    // [ID] Posisi diperiksa (dengan pemisah ribuan).
    set('#st-nodes', res.nodes.toLocaleString());
    // [ID] Cabang dipangkas, atau "0 OFF" kalau Alpha-Beta mati.
    set('#st-cutoffs', res.prune ? res.cutoffs.toLocaleString() : '0 <span class="tag">OFF</span>');
    // [ID] Waktu: 1 desimal kalau di bawah 10 ms, selain itu dibulatkan.
    const ms = res.timeMs < 10 ? res.timeMs.toFixed(1) : Math.round(res.timeMs).toLocaleString();
    // [ID] Tulis waktu, plus label "batas 4 dtk" kalau waktu habis.
    set('#st-time', `${ms} ms${res.timedOut ? ` <span class="tag">${t('timedOut')}</span>` : ''}`);
    // [ID] Teks skor langkah.
    let score = '–';
    // [ID] Kalau ada skor:
    if (res.score != null) {
      // [ID] skor menang: "Menang dalam n giliran",
      if (res.score >= WIN / 2) score = t('scoreWin', WIN - res.score);
      // [ID] skor kalah: "Kalah dalam n giliran",
      else if (res.score <= -WIN / 2) score = t('scoreLoss', WIN + res.score);
      // [ID] selain itu angka evaluasi dengan tanda + atau -.
      else score = (res.score > 0 ? '+' : '') + (Number.isInteger(res.score) ? res.score : res.score.toFixed(1));
    }
    // [ID] Tulis skor.
    set('#st-score', score);
  },
  // [ID] Perbarui riwayat langkah.
  log(history) {
    // [ID] Elemen daftar riwayat.
    const ol = $('#log');
    // [ID] Riwayat kosong:
    if (!history.length) {
      // [ID] tulis "Belum ada langkah." lalu
      ol.innerHTML = `<li class="log-empty">${t('logEmpty')}</li>`;
      // [ID] selesai.
      return;
    }
    // [ID] Satu baris per langkah:
    ol.innerHTML = history
      // [ID] ubah setiap langkah menjadi <li>:
      .map(
        // [ID] nomor dan warna pemain,
        (h, i) => `<li class="s${h.side}"><span class="n">${i + 1}.</span><span class="sw"></span>` +
          // [ID] langkah "asal → tujuan", kotak jebakan (✕), dan tanda "makan" kalau langkah itu memakan musuh.
          `<span class="mv">${squareName(h.from)} → <b>${squareName(h.jump)}</b>${h.trap >= 0 ? `<span class="x">✕ ${squareName(h.trap)}</span>` : ''}${h.ate ? `<span class="x">${t('ateMark')}</span>` : ''}</span></li>`,
      )
      // [ID] gabungkan.
      .join('');
    // [ID] Gulir ke langkah terbaru.
    ol.scrollTop = ol.scrollHeight;
  },
  // [ID] Game selesai: siapkan layar game over.
  over(info) {
    // [ID] Game-nya.
    const g = info.game;
    // [ID] Sisi pemain di perangkat ini.
    const me = g.mySide;
    // [ID] Nama pemenang.
    const winName = g.players[info.winner].name;
    // [ID] Nama yang kalah.
    const loseName = g.players[info.loser].name;
    // [ID] Judul.
    let title;
    // [ID] Keterangan.
    let sub;
    // [ID] Gaya menang atau kalah.
    let win = true;
    // [ID] Keterangan untuk yang kalah: "dimakan" atau "tidak punya lompatan legal".
    const loserSub = t(info.eaten ? 'eatenSub' : 'trappedSub', loseName);
    // [ID] Mode lokal:
    if (g.mode === 'local') {
      // [ID] "<nama> Menang!",
      title = t('sideWins', winName);
      // [ID] keterangannya untuk yang kalah.
      sub = loserSub;
    // [ID] Mode AI atau online:
    } else {
      // [ID] menang kalau pemenangnya saya,
      win = me === info.winner;
      // [ID] "Kamu Menang!" atau "Kamu Kalah",
      title = win ? t('youWin') : t('youLose');
      // [ID] Mode AI:
      if (g.mode === 'ai') {
        // [ID] kalau ada yang dimakan: "Kamu memakan knight AI" atau "AI memakan knight-mu",
        if (info.eaten) sub = win ? t('youAteSub') : t('aiAteSub');
        // [ID] kalau tidak: "Knight AI terkurung" atau "AI berhasil mengurung knight-mu".
        else sub = win ? t('youWinSub') : t('aiWinSub');
      // [ID] Mode online: keterangan untuk yang kalah.
      } else sub = loserSub;
    }
    // [ID] Buka layar game over.
    openGameOver({ title, sub, win, moves: info.moves });
  },
};

// [ID] Buka layar game over dengan judul, keterangan, gaya menang, jumlah langkah. leftOnly = lawan keluar.
function openGameOver({ title, sub, win, moves, leftOnly = false }) {
  // [ID] Kartu game over.
  const card = $('#gameover .modal-card');
  // [ID] Gaya menang,
  card.classList.toggle('win', win);
  // [ID] Judul.
  $('#go-title').textContent = title;
  // [ID] Keterangan.
  $('#go-sub').textContent = sub;
  // [ID] Jumlah langkah.
  $('#go-moves').textContent = moves;
  // [ID] Sembunyikan "Main lagi" kalau lawan keluar.
  $('#go-rematch').hidden = leftOnly;
  // [ID] Aktifkan "Main lagi".
  $('#go-rematch').disabled = false;
  // [ID] Sembunyikan pesan tunggu.
  $('#go-wait').hidden = true;
  // [ID] Tampilkan.
  $('#gameover').hidden = false;
  // [ID] Fokus ke tombol utama.
  (leftOnly ? $('#go-menu') : $('#go-rematch')).focus();
}

// [ID] Tutup layar game over.
function closeGameOver() {
  // [ID] Sembunyikan.
  $('#gameover').hidden = true;
}

// [ID] Siapkan panel samping sesuai mode.
function resetSidePanels(mode) {
  // [ID] Panel "Statistik AI" hanya di mode AI.
  $('#ai-panel').hidden = mode !== 'ai';
  // [ID] Kosongkan semua angka statistik.
  for (const id of ['#st-depth', '#st-nodes', '#st-cutoffs', '#st-time', '#st-score']) $(id).textContent = '–';
  // [ID] Sembunyikan tulisan "berpikir".
  ui.thinking(false);
  // [ID] Status koneksi hanya di mode online.
  $('#net-pill').hidden = mode !== 'online';
}

// [ID] Mulai game baru dengan pengaturan cfg (opsional dari state tertentu).
function launch(cfg, state) {
  // [ID] Tinggalkan game lama.
  game?.dispose();
  // [ID] Tutup layar game over.
  closeGameOver();
  // [ID] Simpan pengaturan untuk Main lagi.
  gameConfig = cfg;
  // [ID] Siapkan panel samping.
  resetSidePanels(cfg.mode);
  // [ID] Setiap game mulai dengan kotak tujuan musuh tersembunyi (tombol P untuk menampilkan).
  $('#board-shell').classList.remove('hints-on'); // every game starts with the enemy's squares hidden
  // [ID] Buat game baru.
  game = new Game({ board, ui, ...cfg });
  // [ID] Tulis mode di atas layar:
  $('#game-mode').textContent =
    // [ID] "Single Player · Hard", "Multiplayer · Lokal", atau "Multiplayer · Online".
    cfg.mode === 'ai' ? t('modeAi', t(cfg.level)) : cfg.mode === 'local' ? t('modeLocal') : t('modeOnline');
  // [ID] Pindah ke layar game.
  showScreen('game');
  // [ID] Mulai.
  game.start(state ?? createState());
}

// [ID] Mulai game Single Player.
function startAiGame() {
  // [ID] Pemain jalan duluan? (pilihan "Kamu", atau "Acak" dengan peluang 50%).
  const humanFirst = settings.first === 'human' || (settings.first === 'random' && Math.random() < 0.5);
  // [ID] Sisi pemain: 0 kalau duluan, 1 kalau kedua.
  const hs = humanFirst ? 0 : 1;
  // [ID] Daftar pemain.
  const players = [];
  // [ID] Pemain manusia.
  players[hs] = { kind: 'human', name: t('you'), sub: colorName(hs) };
  // [ID] AI di sisi lainnya, misalnya "AI · Hard".
  players[hs ^ 1] = { kind: 'ai', name: `AI · ${t(settings.diff)}`, sub: colorName(hs ^ 1) };
  // [ID] Samakan tombol Alpha-Beta di panel game.
  $('#game-ab').checked = settings.prune;
  // [ID] Label ON/OFF.
  $('#ab-state').textContent = settings.prune ? 'ON' : 'OFF';
  // [ID] Mulai game: mode AI, level, pemain, dan pengaturan AI (kedalaman dari DIFFICULTY, pruning ON/OFF).
  launch({ mode: 'ai', level: settings.diff, players, ai: { depth: DIFFICULTY[settings.diff], prune: settings.prune } });
}

// [ID] Mulai game lokal (dua pemain di satu perangkat).
function startLocalGame() {
  // [ID] Mulai dengan:
  launch({
    // [ID] mode lokal,
    mode: 'local',
    // [ID] dua pemain manusia:
    players: [
      // [ID] Pemain 1 (biru),
      { kind: 'human', name: t('player', 1), sub: colorName(0) },
      // [ID] Pemain 2 (oranye).
      { kind: 'human', name: t('player', 2), sub: colorName(1) },
    ],
  });
}

// ---- Online -----------------------------------------------------------------
// [ID] ---- Mode online ----
// [ID] Tampilkan status koneksi (titik warna dan teks) di lobi dan di layar game.
function setNetStatus(kind, text) {
  // [ID] Warna titik: ok (hijau), wait (kuning), bad (merah).
  for (const dot of [$('#lobby-dot'), $('#net-pill .dot')]) dot.className = `dot ${kind}`;
  // [ID] Teks di lobi.
  $('#lobby-status').textContent = text;
  // [ID] Teks di layar game.
  $('#net-pill .net-text').textContent = text;
}

// [ID] Daftar pemain online: saya (human) dan lawan (remote).
function onlinePlayers(mySide) {
  // [ID] Daftar.
  const p = [];
  // [ID] Saya.
  p[mySide] = { kind: 'human', name: t('you'), sub: colorName(mySide) };
  // [ID] Lawan.
  p[mySide ^ 1] = { kind: 'remote', name: t('opponent'), sub: colorName(mySide ^ 1) };
  // [ID] Hasil.
  return p;
}

// [ID] Host memulai ronde online.
function startOnlineRound() {
  // Sides swap every round so both players get to move first.
  // [ID] Sisi bergantian setiap ronde supaya kedua pemain sama-sama dapat jalan duluan.
  const guestSide = online.round % 2 === 0 ? 1 : 0;
  // [ID] Ronde berikutnya.
  online.round++;
  // [ID] Reset permintaan main lagi.
  online.myRematch = online.peerRematch = false;
  // [ID] Posisi awal.
  const state = createState();
  // [ID] Kirim ke tamu: mulai, sisinya, dan state awal.
  session.send({ t: 'start', guestSide, state: serialize(state) });
  // [ID] Host memulai game dengan sisi yang lain.
  launch({ mode: 'online', role: 'host', net: session, players: onlinePlayers(guestSide ^ 1) }, state);
}

// [ID] Tamu memulai ronde setelah menerima pesan "start".
function beginGuestRound(msg) {
  // [ID] Sisi tamu (hanya 0 atau 1).
  const guestSide = msg.guestSide === 0 ? 0 : 1;
  // [ID] State dari host.
  let state;
  // [ID] Coba ubah dan periksa.
  try {
    // [ID] Ubah ke state.
    state = deserialize(msg.state);
  // [ID] Rusak:
  } catch {
    // [ID] abaikan.
    return;
  }
  // [ID] Reset permintaan main lagi.
  online.myRematch = online.peerRematch = false;
  // [ID] Mulai game sebagai tamu.
  launch({ mode: 'online', role: 'guest', net: session, players: onlinePlayers(guestSide) }, state);
}

// [ID] Buat sesi online baru dan pasang semua pengendali event.
function newSession() {
  // [ID] Tutup sesi lama.
  endSession();
  // [ID] Reset status online.
  online = { round: 0, myRematch: false, peerRematch: false, left: false };
  // [ID] Sesi baru.
  session = new OnlineSession();
  // [ID] Pasang pengendali:
  session
    // [ID] perubahan status koneksi:
    .on('status', (s) => {
      // [ID] "Terhubung" (hijau),
      if (s === 'connected') setNetStatus('ok', t('netConnected'));
      // [ID] "Koneksi tidak stabil" (kuning).
      else if (s === 'unstable') setNetStatus('wait', t('netUnstable'));
    })
    // [ID] lawan tersambung:
    .on('connected', () => {
      // [ID] host langsung memulai ronde.
      if (session.role === 'host') startOnlineRound();
    })
    // [ID] pesan masuk:
    .on('message', (msg) => {
      // [ID] "start" untuk tamu: mulai ronde,
      if (msg.t === 'start' && session.role === 'guest') beginGuestRound(msg);
      // [ID] "full": ruang penuh,
      else if (msg.t === 'full') {
        // [ID] tampilkan pesan merah,
        toast(t('netRoomFull'), true);
        // [ID] tutup sesi,
        endSession();
        // [ID] kembali ke layar multiplayer.
        showScreen('mp');
      // [ID] "rematch": lawan ingin main lagi:
      } else if (msg.t === 'rematch') {
        // [ID] catat,
        online.peerRematch = true;
        // [ID] kalau saya juga sudah minta dan saya host: mulai ronde,
        if (online.myRematch && session.role === 'host') startOnlineRound();
        // [ID] kalau layar game over terbuka:
        else if (!$('#gameover').hidden) {
          // [ID] tampilkan pesan,
          $('#go-wait').hidden = false;
          // [ID] "Lawan ingin main lagi!",
          $('#go-wait').textContent = t('oppWantsRematch');
        // [ID] selain itu tampilkan toast.
        } else toast(t('oppWantsRematch'));
      // [ID] pesan lain diteruskan ke game (langkah, state, reject).
      } else game?.onNetMessage(msg);
    })
    // [ID] lawan keluar:
    .on('left', () => {
      // [ID] catat,
      online.left = true;
      // [ID] status merah "Lawan keluar dari game",
      setNetStatus('bad', t('netLeft'));
      // [ID] masih di lobi: cukup itu,
      if (currentScreen === 'lobby') return;
      // [ID] game masih berjalan:
      if (game && game.phase !== 'over') {
        // [ID] hentikan game,
        game.dispose();
        // [ID] tampilkan layar game over "Lawan keluar" tanpa tombol Main lagi,
        openGameOver({ title: t('netLeft'), sub: '', win: true, moves: game.state.moves, leftOnly: true });
      // [ID] layar game over sudah terbuka:
      } else if (!$('#gameover').hidden) {
        // [ID] sembunyikan Main lagi,
        $('#go-rematch').hidden = true;
        // [ID] tampilkan pesan,
        $('#go-wait').hidden = false;
        // [ID] "Lawan keluar dari game".
        $('#go-wait').textContent = t('netLeft');
      }
    });
  // [ID] Sesi baru.
  return session;
}

// [ID] Tutup sesi online.
function endSession() {
  // [ID] Tutup kalau ada.
  session?.close();
  // [ID] Lupakan.
  session = null;
}

// [ID] Tombol "Buat ruang".
async function hostRoom() {
  // [ID] Sesi baru.
  const s = newSession();
  // [ID] Kode sementara.
  $('#room-code').textContent = '·····';
  // [ID] Label "Kode ruang".
  $('#lobby-label').textContent = t('roomCode');
  // [ID] Petunjuk "Bagikan kode ini…".
  $('#lobby-hint').textContent = t('lobbyHint');
  // [ID] Tombol salin disembunyikan dulu.
  $('#copy-code').hidden = true;
  // [ID] "Membuat ruang…".
  setNetStatus('wait', t('netCreating'));
  // [ID] Pindah ke lobi.
  showScreen('lobby');
  // [ID] Coba buat ruang.
  try {
    // [ID] Tunggu kode ruang.
    const code = await s.host();
    // [ID] Sesi sudah diganti saat menunggu: selesai.
    if (session !== s) return;
    // [ID] Tampilkan kode.
    $('#room-code').textContent = code;
    // [ID] Tampilkan tombol salin.
    $('#copy-code').hidden = false;
    // [ID] "Menunggu lawan bergabung…".
    setNetStatus('wait', t('netWaiting'));
  // [ID] Gagal:
  } catch (err) {
    // [ID] sesi sudah diganti: abaikan,
    if (session !== s) return;
    // [ID] catat,
    console.warn(err);
    // [ID] tampilkan pesan error,
    toast(err.message === 'load-fail' ? t('netLoadFail') : t('netError'), true);
    // [ID] tutup sesi,
    endSession();
    // [ID] kembali ke layar multiplayer.
    showScreen('mp');
  }
}

// [ID] Form "Gabung" dengan kode ruang.
async function joinRoom(raw) {
  // [ID] Rapikan kode.
  const code = normalizeCode(raw);
  // [ID] Panjang harus 4–6:
  if (code.length < 4 || code.length > 6) {
    // [ID] pesan error,
    toast(t('netBadCode'), true);
    // [ID] fokus ke kolom kode,
    $('#join-code').focus();
    // [ID] selesai.
    return;
  }
  // [ID] Sesi baru.
  const s = newSession();
  // [ID] Tampilkan kode.
  $('#room-code').textContent = code;
  // [ID] Label.
  $('#lobby-label').textContent = t('roomCode');
  // [ID] "Menghubungkan ke ruang…".
  $('#lobby-hint').textContent = t('joiningHint');
  // [ID] Tanpa tombol salin.
  $('#copy-code').hidden = true;
  // [ID] "Menghubungkan…".
  setNetStatus('wait', t('netConnecting'));
  // [ID] Pindah ke lobi.
  showScreen('lobby');
  // [ID] Coba gabung.
  try {
    // [ID] Tunggu tersambung (game dimulai oleh pesan "start" dari host).
    await s.join(code);
  // [ID] Gagal:
  } catch (err) {
    // [ID] sesi sudah diganti: abaikan,
    if (session !== s) return;
    // [ID] catat,
    console.warn(err);
    // [ID] pilih pesan: gagal memuat, ruang tidak ditemukan, atau koneksi gagal,
    const msg = err.message === 'load-fail' ? t('netLoadFail') : err.type === 'peer-unavailable' ? t('netRoomNotFound') : t('netError');
    // [ID] tampilkan,
    toast(msg, true);
    // [ID] tutup sesi,
    endSession();
    // [ID] kembali.
    showScreen('mp');
  }
}

// ---- Wiring -----------------------------------------------------------------
// [ID] ---- Pemasangan event ----
// [ID] Tandai tombol pilihan yang aktif dalam satu grup (atribut aria-checked).
function selectRadio(group, attr, value) {
  // [ID] Untuk setiap tombol dalam grup: aktif kalau nilainya cocok.
  for (const b of $$(`[${attr}]`, group)) b.setAttribute('aria-checked', String(b.getAttribute(attr) === value));
}

// [ID] Terapkan semua pengaturan ke tampilan.
function applySettingsToUi() {
  // [ID] Bahasa.
  setLang(settings.lang);
  // [ID] Pilihan bahasa.
  selectRadio($('#lang-seg'), 'data-lang', settings.lang);
  // [ID] Pilihan level.
  selectRadio($('#diff-grid'), 'data-diff', settings.diff);
  // [ID] Pilihan siapa jalan duluan.
  selectRadio($('#first-seg'), 'data-first', settings.first);
  // [ID] Saklar Alpha-Beta.
  $('#sp-ab').checked = settings.prune;
  // [ID] Bangun ulang Cara Bermain (teksnya ikut bahasa).
  buildHowTo();
}

// [ID] Tombol kembali di layar game.
async function leaveGame() {
  // [ID] Game sedang berjalan (sudah ada langkah, belum selesai)?
  const inProgress = game && game.phase !== 'over' && game.state.moves > 0 && !online.left;
  // [ID] Kalau ya, minta konfirmasi; batal kalau pengguna memilih lanjut main.
  if (inProgress && !(await confirmDialog(t('leaveConfirm')))) return;
  // [ID] Tinggalkan game.
  game?.dispose();
  // [ID] Lupakan.
  game = null;
  // [ID] Tutup game over.
  closeGameOver();
  // [ID] Mode online: tutup sesi.
  if (gameConfig?.mode === 'online') endSession();
  // [ID] Kembali ke menu.
  showScreen('menu');
}

// [ID] Persiapan saat halaman dibuka.
function init() {
  // [ID] Terapkan pengaturan.
  applySettingsToUi();
  // [ID] Tampilkan menu.
  showScreen('menu');
  // [ID] Riwayat kosong.
  ui.log([]);

  // [ID] Satu pengendali klik untuk tombol navigasi:
  document.addEventListener('click', (e) => {
    // [ID] tombol dengan data-go (pindah layar)?
    const go = e.target.closest('[data-go]');
    // [ID] Kalau ya:
    if (go) {
      // [ID] pindah layar,
      showScreen(go.dataset.go);
      // [ID] selesai.
      return;
    }
    // [ID] Tombol kembali: pindah ke layar tujuannya.
    if (e.target.closest('[data-back]')) showScreen(backTarget[currentScreen] || 'menu');
  });

  // [ID] Pilih level:
  $('#diff-grid').addEventListener('click', (e) => {
    // [ID] kartu yang diklik,
    const b = e.target.closest('[data-diff]');
    // [ID] bukan kartu: abaikan,
    if (!b) return;
    // [ID] simpan level,
    settings.diff = b.dataset.diff;
    // [ID] tandai kartu,
    selectRadio($('#diff-grid'), 'data-diff', settings.diff);
    // [ID] simpan pengaturan.
    saveSettings();
  });
  // [ID] Pilih siapa jalan duluan:
  $('#first-seg').addEventListener('click', (e) => {
    // [ID] tombol yang diklik,
    const b = e.target.closest('[data-first]');
    // [ID] bukan tombol: abaikan,
    if (!b) return;
    // [ID] simpan pilihan,
    settings.first = b.dataset.first;
    // [ID] tandai,
    selectRadio($('#first-seg'), 'data-first', settings.first);
    // [ID] simpan pengaturan.
    saveSettings();
  });
  // [ID] Saklar Alpha-Beta di layar Single Player:
  $('#sp-ab').addEventListener('change', (e) => {
    // [ID] simpan,
    settings.prune = e.target.checked;
    // [ID] simpan pengaturan.
    saveSettings();
  });
  // [ID] Tombol Mulai di layar Single Player: mulai game lawan AI.
  $('#sp-start').addEventListener('click', startAiGame);

  // [ID] Saklar Alpha-Beta di panel game:
  $('#game-ab').addEventListener('change', (e) => {
    // [ID] simpan,
    settings.prune = e.target.checked;
    // [ID] label ON/OFF,
    $('#ab-state').textContent = settings.prune ? 'ON' : 'OFF';
    // [ID] samakan saklar di layar Single Player,
    $('#sp-ab').checked = settings.prune;
    // [ID] langsung berlaku untuk langkah AI berikutnya,
    if (game?.ai) game.ai.prune = settings.prune;
    // [ID] simpan pengaturan.
    saveSettings();
  });

  // [ID] Tombol main lokal.
  $('#mp-local').addEventListener('click', startLocalGame);
  // [ID] Tombol buat ruang.
  $('#mp-host').addEventListener('click', hostRoom);
  // [ID] Form gabung:
  $('#join-form').addEventListener('submit', (e) => {
    // [ID] jangan muat ulang halaman,
    e.preventDefault();
    // [ID] gabung dengan kode yang diketik.
    joinRoom($('#join-code').value);
  });
  // [ID] Saat mengetik kode: rapikan otomatis (huruf besar, maks. 6).
  $('#join-code').addEventListener('input', (e) => {
    // [ID] (rapikan)
    e.target.value = normalizeCode(e.target.value).slice(0, 6);
  });
  // [ID] Tombol kembali di lobi:
  $('#lobby-cancel').addEventListener('click', () => {
    // [ID] tutup sesi,
    endSession();
    // [ID] kembali ke layar multiplayer.
    showScreen('mp');
  });
  // [ID] Tombol salin kode:
  $('#copy-code').addEventListener('click', async () => {
    // [ID] coba salin ke clipboard,
    try {
      // [ID] salin,
      await navigator.clipboard.writeText($('#room-code').textContent);
      // [ID] "Kode disalin".
      toast(t('copied'));
    // [ID] gagal: tampilkan kodenya supaya bisa disalin manual.
    } catch {
      // [ID] (tampilkan kode)
      toast($('#room-code').textContent);
    }
  });

  // [ID] Pilih bahasa:
  $('#lang-seg').addEventListener('click', (e) => {
    // [ID] tombol yang diklik,
    const b = e.target.closest('[data-lang]');
    // [ID] bukan tombol: abaikan,
    if (!b) return;
    // [ID] simpan bahasa,
    settings.lang = b.dataset.lang;
    // [ID] terapkan (semua teks berganti),
    applySettingsToUi();
    // [ID] simpan.
    saveSettings();
  });

  // [ID] Tombol kembali di layar game.
  $('#game-exit').addEventListener('click', leaveGame);
  // [ID] Tombol Batal lompat.
  $('#undo-jump').addEventListener('click', () => game?.undoJump());
  // [ID] Tombol Esc saat memilih jebakan: batal lompat.
  document.addEventListener('keydown', (e) => {
    // [ID] (batal lompat)
    if (e.key === 'Escape' && game?.phase === 'trap') game.undoJump();
    // [ID] Tombol P biasa (bukan ditahan, tanpa Ctrl/Cmd/Alt).
    const plainP = (e.key === 'p' || e.key === 'P') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey;
    // [ID] Hanya di layar game, dan bukan saat mengetik di kolom input:
    if (plainP && currentScreen === 'game' && !e.target.closest?.('input, textarea, select')) {
      // [ID] tampilkan/sembunyikan kotak tujuan musuh.
      $('#board-shell').classList.toggle('hints-on');
    }
  });

  // [ID] Tombol Menu utama di game over:
  $('#go-menu').addEventListener('click', () => {
    // [ID] tinggalkan game,
    game?.dispose();
    // [ID] lupakan,
    game = null;
    // [ID] tutup game over,
    closeGameOver();
    // [ID] mode online: tutup sesi,
    if (gameConfig?.mode === 'online') endSession();
    // [ID] ke menu.
    showScreen('menu');
  });
  // [ID] Tombol Main lagi:
  $('#go-rematch').addEventListener('click', () => {
    // [ID] belum pernah main: abaikan,
    if (!gameConfig) return;
    // [ID] mode AI: langsung game baru,
    if (gameConfig.mode === 'ai') return startAiGame();
    // [ID] mode lokal: langsung game baru,
    if (gameConfig.mode === 'local') return startLocalGame();
    // [ID] online tanpa sesi atau lawan sudah keluar: tidak bisa,
    if (!session || online.left) return;
    // [ID] catat saya minta main lagi,
    online.myRematch = true;
    // [ID] beri tahu lawan,
    session.send({ t: 'rematch' });
    // [ID] kalau lawan sudah minta dan saya host: mulai,
    if (online.peerRematch && session.role === 'host') return startOnlineRound();
    // [ID] selain itu: matikan tombol,
    $('#go-rematch').disabled = true;
    // [ID] tampilkan pesan tunggu,
    $('#go-wait').hidden = false;
    // [ID] "Menunggu lawan setuju main lagi…".
    $('#go-wait').textContent = t('waitRematch');
  });

  // [ID] Saat halaman ditutup: tutup sesi online (lawan diberi tahu).
  window.addEventListener('beforeunload', () => session?.close());
}

// [ID] Jalankan persiapan.
init();
