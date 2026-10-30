// App shell: screens, menus, settings, online lobby, and the glue between Game and the DOM.
// [ID] Kerangka aplikasi: layar, menu, pengaturan, lobi online, poin & leaderboard, dan penghubung antara Game dan halaman.

// [ID] Kedalaman per level dan pengaturan leaderboard.
import { DIFFICULTY, LEADERBOARD } from './config.js';
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
// [ID] Suara.
import { sfx, setSoundEnabled, unlockAudio } from './audio.js';
// [ID] Bara latar belakang dan cek "kurangi animasi".
import { startBackgroundEmbers, reducedMotion } from './fx.js';
// [ID] Fungsi poin dan nama tim.
import {
  // [ID] hitung skor, mode berpoin, bersihkan/cek nama, kunci nama, poin default, periksa poin, nilai per level, daftar level.
  scoreGame, pointsEnabled, cleanName, validName, nameKey, defaultRules, normalizeRules, levelValues, LEVELS,
} from './scoring.js';
// [ID] Tabel poin per level.
import { pointsTable } from './points-table.js';

// [ID] Singkatan: $ = cari satu elemen dengan selector CSS.
const $ = (sel, root = document) => root.querySelector(sel);
// [ID] $$ = cari semua elemen, dalam bentuk array.
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---- Settings (per-browser convenience only) --------------------------------
// [ID] ---- Pengaturan (disimpan di browser ini saja) ----
// [ID] Nama kunci penyimpanan pengaturan di localStorage.
const SETTINGS_KEY = 'knighttrap.settings';
// [ID] Nilai default: suara ON, bahasa Indonesia, level Medium, pemain jalan duluan, Alpha-Beta ON.
const settings = { sound: true, lang: 'id', diff: 'medium', first: 'human', prune: true };
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

// Team name for the leaderboard, and scores that could not be sent yet.
// [ID] Nama tim untuk leaderboard, dan skor yang belum terkirim.
// [ID] Kunci penyimpanan nama tim.
const TEAM_KEY = 'knighttrap.team';
// [ID] Kunci penyimpanan skor yang tertunda.
const PENDING_KEY = 'knighttrap.pending';
// [ID] Nama tim saat ini.
let team = '';
// [ID] Coba baca nama tim tersimpan.
try {
  // [ID] Bersihkan namanya.
  team = cleanName(localStorage.getItem(TEAM_KEY) || '');
  // [ID] Tidak sah: kosongkan.
  if (!validName(team)) team = '';
// [ID] Gagal: biarkan kosong.
} catch {}
// [ID] Ganti nama tim.
function setTeam(name) {
  // [ID] Simpan di variabel.
  team = name;
  // [ID] Coba simpan di browser.
  try {
    // [ID] Simpan.
    localStorage.setItem(TEAM_KEY, name);
  // [ID] Gagal: abaikan.
  } catch {}
  // [ID] Tampilkan di layar Single Player.
  $('#sp-team-name').textContent = team || '—';
}
// [ID] Baca daftar skor tertunda.
function loadPending() {
  // [ID] Coba baca.
  try {
    // [ID] Ubah teks JSON menjadi array.
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    // [ID] Pastikan hasilnya array.
    return Array.isArray(list) ? list : [];
  // [ID] Gagal:
  } catch {
    // [ID] daftar kosong.
    return [];
  }
}
// [ID] Simpan daftar skor tertunda.
function savePending(list) {
  // [ID] Coba simpan.
  try {
    // [ID] Simpan sebagai JSON.
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  // [ID] Gagal: abaikan.
  } catch {}
}

// ---- Screens ----------------------------------------------------------------
// [ID] ---- Layar ----
// [ID] Layar yang sedang tampil.
let currentScreen = 'menu';
// [ID] Tujuan tombol "kembali" untuk setiap layar.
const backTarget = { sp: 'menu', mp: 'menu', howto: 'menu', settings: 'menu', lobby: 'mp', board: 'menu' };

// [ID] Tampilkan layar "name", sembunyikan yang lain.
function showScreen(name) {
  // [ID] Hanya layar dengan data-screen yang cocok yang diberi class is-active.
  for (const s of $$('.screen')) s.classList.toggle('is-active', s.dataset.screen === name);
  // [ID] Simpan layar saat ini.
  currentScreen = name;
  // [ID] Gulir ke atas.
  window.scrollTo(0, 0);
  // [ID] Animasi papan menu hanya jalan di layar menu,
  if (name === 'menu') startMenuBoard();
  // [ID] selain itu dihentikan.
  else stopMenuBoard();
  // [ID] Leaderboard hanya diperbarui selama layarnya terbuka,
  if (name === 'board') startLeaderboard();
  // [ID] selain itu dihentikan.
  else stopLeaderboard();
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
          <button class="btn btn-primary btn-lg" data-yes>${t('mainMenu')}</button>
          <button class="btn btn-ghost" data-no>${getLang() === 'id' ? 'Lanjut main' : 'Keep playing'}</button>
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

// [ID] Dialog isi nama tim. Mengembalikan Promise berisi nama, atau null kalau batal.
function nameDialog() {
  // [ID] Promise yang selesai saat pengguna menyimpan atau batal.
  return new Promise((resolve) => {
    // [ID] Lapisan gelap.
    const wrap = document.createElement('div');
    // [ID] Class modal.
    wrap.className = 'modal';
    // [ID] Isi: judul, petunjuk, kolom nama (maks. 20 karakter), pesan error, tombol Simpan dan Batal.
    wrap.innerHTML = `
      <form class="modal-card name-card" role="dialog" aria-modal="true" aria-labelledby="name-title" novalidate>
        <h2 id="name-title" style="font-size:24px">${t('teamName')}</h2>
        <p>${t('teamPrompt')}</p>
        <input class="name-input" maxlength="${LEADERBOARD.nameMax}" autocomplete="off" spellcheck="false" aria-label="${t('teamName')}">
        <p class="name-error" aria-live="polite"></p>
        <div class="go-actions">
          <button class="btn btn-primary btn-lg" type="submit">${t('save')}</button>
          <button class="btn btn-ghost" type="button" data-no>${t('cancel')}</button>
        </div>
      </form>`;
    // [ID] Kolom nama.
    const input = $('input', wrap);
    // [ID] Isi dengan nama sekarang.
    input.value = team;
    // [ID] Tutup dialog dan kirim jawaban.
    const done = (v) => {
      // [ID] Hapus dialog.
      wrap.remove();
      // [ID] Selesaikan Promise.
      resolve(v);
    };
    // [ID] Klik di luar atau tombol Batal: null.
    wrap.addEventListener('click', (e) => {
      // [ID] (batal)
      if (e.target === wrap || e.target.closest('[data-no]')) done(null);
    });
    // [ID] Tombol Esc: batal.
    wrap.addEventListener('keydown', (e) => {
      // [ID] (batal)
      if (e.key === 'Escape') done(null);
    });
    // [ID] Saat form dikirim (Simpan atau Enter):
    $('form', wrap).addEventListener('submit', (e) => {
      // [ID] jangan muat ulang halaman,
      e.preventDefault();
      // [ID] bersihkan nama,
      const name = cleanName(input.value);
      // [ID] kalau panjangnya tidak sah:
      if (!validName(name)) {
        // [ID] tampilkan pesan "Nama harus 2–20 karakter",
        $('.name-error', wrap).textContent = t('teamInvalid', LEADERBOARD.nameMin, LEADERBOARD.nameMax);
        // [ID] fokus kembali ke kolom,
        input.focus();
        // [ID] berhenti.
        return;
      }
      // [ID] Nama sah: kirim.
      done(name);
    });
    // [ID] Pasang dialog.
    document.body.appendChild(wrap);
    // [ID] Fokus ke kolom nama.
    input.focus();
    // [ID] Pilih semua teks supaya mudah diganti.
    input.select();
  });
}

// Asks for the team name once; later games reuse it.
// [ID] Minta nama tim sekali saja; game berikutnya memakai nama yang sama. force = paksa tampilkan dialog (tombol Ganti).
async function ensureTeam(force = false) {
  // [ID] Sudah punya nama dan tidak dipaksa: pakai.
  if (team && !force) return team;
  // [ID] Tampilkan dialog.
  const name = await nameDialog();
  // [ID] Kalau diisi, simpan.
  if (name) setTeam(name);
  // [ID] Nama (atau null kalau batal).
  return name;
}

// ---- Menu decoration: a perspective board that burns and traps squares -----
// [ID] ---- Hiasan menu: papan miring yang kotaknya menyala dan berlubang acak ----
// [ID] Timer animasi menu.
let menuTimer = 0;
// [ID] Daftar 49 kotak hiasan.
const menuCells = [];
// [ID] Buat kotak hiasan.
function buildMenuBoard() {
  // [ID] Wadah papan menu.
  const el = $('#menu-board');
  // [ID] 49 kotak.
  for (let i = 0; i < 49; i++) {
    // [ID] Satu <span>.
    const s = document.createElement('span');
    // [ID] Masukkan ke wadah.
    el.appendChild(s);
    // [ID] Simpan.
    menuCells.push(s);
  }
}
// [ID] Mulai animasi menu.
function startMenuBoard() {
  // [ID] Sudah jalan, atau animasi dikurangi: jangan.
  if (menuTimer || reducedMotion()) return;
  // [ID] Setiap 650 ms:
  menuTimer = setInterval(() => {
    // [ID] pilih satu kotak acak,
    const c = menuCells[Math.floor(Math.random() * 49)];
    // [ID] kalau sudah menyala/berlubang: kembalikan normal,
    if (c.classList.contains('lit') || c.classList.contains('pit')) c.className = '';
    // [ID] kalau normal: 70% menyala, 30% berlubang.
    else c.className = Math.random() < 0.7 ? 'lit' : 'pit';
  }, 650);
}
// [ID] Hentikan animasi menu.
function stopMenuBoard() {
  // [ID] Hentikan timer.
  clearInterval(menuTimer);
  // [ID] Tandai berhenti.
  menuTimer = 0;
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
      // [ID] Papan mini.
      board: miniBoard({ k0: [0, 3], k1: [4, 4], burned: [[2, 2]], trap: [[2, 3]], threat: [[3, 2]] }),
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

// [ID] Skor yang sedang tampil (untuk menghitung "+N").
let liveScore = 0;
// [ID] Game Single Player yang selesai dan menunggu tombol "Kirim skor".
let lastGame = null; // finished Single Player game waiting for "Submit score"

// [ID] Riwayat game dalam bentuk daftar { jump, trap }.
const gameMoves = (g) => g.history.map(({ jump, trap }) => ({ jump, trap }));
// [ID] Hitung skor game g saat ini dengan nilai poin yang dipakai game itu.
const currentScore = (g) => scoreGame(gameMoves(g), { mode: g.mode, level: g.level, humanSide: g.mySide, rules: g.rules });

// Point values: the defaults until /api/config answers with the admin's saved copy.
// [ID] Nilai poin: default sampai /api/config mengirim nilai yang disimpan admin.
let rules = defaultRules();

// [ID] Ambil nilai poin terbaru dari server.
async function loadRules() {
  // [ID] Coba ambil.
  try {
    // [ID] Minta /api/config (tanpa cache).
    const res = await fetch('/api/config', { cache: 'no-store' });
    // [ID] Kalau berhasil, baca JSON.
    const data = res.ok ? await res.json() : null;
    // [ID] Periksa nilainya.
    const fresh = normalizeRules(data?.rules);
    // [ID] Sah: pakai.
    if (fresh) rules = fresh;
  // [ID] Server tidak ada (misalnya npx serve): tetap pakai default.
  } catch {}
  // [ID] Perbarui tampilan poin.
  renderPointsInfo();
}

// [ID] Tampilkan poin per level di kartu kesulitan dan di tabel.
function renderPointsInfo() {
  // [ID] Untuk setiap level:
  for (const lvl of LEVELS) {
    // [ID] cari label poin di kartunya,
    const el = $(`[data-pts="${lvl}"]`);
    // [ID] tulis "+N poin/langkah".
    if (el) el.textContent = t('ptsPerMove', levelValues(rules, lvl).move);
  }
  // [ID] Tabel "Cara dapat poin" dengan level terpilih disorot.
  $('#sp-points').innerHTML = pointsTable(rules, t, settings.diff);
}

// [ID] Putar ulang animasi kilat di elemen.
function flash(el) {
  // [ID] Hapus class.
  el.classList.remove('flash');
  // [ID] Paksa hitung ulang supaya animasi bisa diulang.
  void el.offsetWidth;
  // [ID] Pasang lagi.
  el.classList.add('flash');
}

// [ID] Perbarui skor di pojok atas dan munculkan "+N" di papan.
function updateScore(history, sc) {
  // [ID] Sembunyikan kotak skor kalau mode tidak berpoin.
  $('#score-pill').hidden = !sc;
  // [ID] Tidak berpoin: selesai.
  if (!sc) return;
  // [ID] Poin yang baru didapat.
  const gained = sc.total - liveScore;
  // [ID] Simpan skor baru.
  liveScore = sc.total;
  // [ID] Tulis skor.
  $('#score-val').textContent = sc.total.toLocaleString();
  // [ID] Langkah terakhir.
  const last = history.at(-1);
  // [ID] Kalau ada poin baru dan itu langkah pemain:
  if (gained > 0 && last?.side === game.mySide) {
    // [ID] munculkan "+N" di kotak pendaratan,
    board.popText(last.jump, `+${gained}`);
    // [ID] kilatkan angka skor.
    flash($('#score-val'));
  }
}

// [ID] Rincian poin di layar game over.
function renderBreakdown(sc, level, used) {
  // [ID] Nilai poin level ini.
  const per = levelValues(used, level);
  // [ID] Label level dan pengali, misalnya "Hard · ×2".
  $('#go-mult').textContent = `${t(level)} · ×${sc.mult}`;
  // [ID] Baris "Langkah (n × poin)".
  const rows = [[t('ptMoves', sc.humanMoves, per.move), sc.movePoints]];
  // [ID] Kalau menang, tambah baris "Bonus menang".
  if (sc.won) rows.push([t('ptWin'), sc.winPoints]);
  // [ID] Tulis daftar rincian:
  $('#go-breakdown').innerHTML =
    // [ID] setiap baris rincian,
    rows.map(([label, v]) => `<li><span>${label}</span><b>+${v.toLocaleString()}</b></li>`).join('') +
    // [ID] lalu baris Total.
    `<li class="total"><span>${t('ptTotal')}</span><b>${sc.total.toLocaleString()}</b></li>`;
}

// [ID] ID unik untuk setiap game (supaya server menolak game yang dikirim dua kali).
function newGameId() {
  // [ID] Pakai UUID bawaan browser kalau ada.
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // [ID] Cadangan: waktu + angka acak.
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

// [ID] Tulis status pengiriman skor; kind 'ok' = hijau, 'bad' = merah.
function setSubmitStatus(text, kind = '') {
  // [ID] Elemen status.
  const el = $('#go-submit-status');
  // [ID] Teks.
  el.textContent = text;
  // [ID] Class warna.
  el.className = `go-submit-status ${kind}`;
}

// POST one game. kind: 'ok' | 'rate' | 'dup' | 'rejected' | 'offline'.
// [ID] Kirim satu game ke server. Hasil kind: 'ok' (berhasil), 'rate' (terlalu cepat), 'dup' (sudah dikirim),
// [ID] 'rejected' (ditolak), 'offline' (server tidak bisa dihubungi).
async function postScore(payload) {
  // [ID] Respons server.
  let res;
  // [ID] Coba kirim.
  try {
    // [ID] POST ke /api/score:
    res = await fetch('/api/score', {
      // [ID] metode POST,
      method: 'POST',
      // [ID] isi berupa JSON,
      headers: { 'Content-Type': 'application/json' },
      // [ID] data game.
      body: JSON.stringify(payload),
    });
  // [ID] Jaringan gagal:
  } catch {
    // [ID] offline.
    return { kind: 'offline' };
  }
  // [ID] Isi jawaban.
  let data = null;
  // [ID] Coba baca JSON.
  try {
    // [ID] Baca.
    data = await res.json();
  // [ID] Bukan JSON: biarkan null.
  } catch {}
  // [ID] Berhasil.
  if (res.ok && data?.ok) return { kind: 'ok', data };
  // [ID] 429 = terlalu cepat.
  if (res.status === 429) return { kind: 'rate' };
  // [ID] 409 = game sudah pernah dikirim.
  if (res.status === 409) return { kind: 'dup' };
  // [ID] 400 = data ditolak (misalnya langkah ilegal).
  if (res.status === 400 && data) return { kind: 'rejected', data };
  // 404 on a plain static server, 503 without Redis, 5xx: keep the game for later.
  // [ID] Selain itu (404, 503, 5xx): anggap offline, simpan untuk dikirim nanti.
  return { kind: 'offline' };
}

// [ID] Tombol "Kirim skor" ditekan.
async function submitLastGame() {
  // [ID] Game yang akan dikirim.
  const g = lastGame;
  // [ID] Tidak ada, atau sudah dikirim: selesai.
  if (!g || g.sent) return;
  // [ID] Pastikan ada nama tim.
  const name = await ensureTeam();
  // [ID] Batal isi nama, atau game sudah berganti: selesai.
  if (!name || lastGame !== g) return;
  // [ID] Tombol kirim.
  const btn = $('#go-submit');
  // [ID] Matikan tombol supaya tidak diklik dua kali.
  btn.disabled = true;
  // [ID] "Mengirim…".
  setSubmitStatus(t('submitting'));
  // [ID] Data yang dikirim: nama, level, sisi pemain, ID game, daftar langkah (tanpa skor!).
  const payload = { name, difficulty: g.difficulty, side: g.side, id: g.id, moves: g.moves };
  // [ID] Kirim.
  const r = await postScore(payload);
  // [ID] Game sudah berganti saat menunggu: selesai.
  if (lastGame !== g) return;
  // [ID] Terlalu cepat:
  if (r.kind === 'rate') {
    // [ID] aktifkan tombol lagi,
    btn.disabled = false;
    // [ID] "Terlalu cepat. Coba lagi…",
    setSubmitStatus(t('submitRate'), 'bad');
    // [ID] selesai.
    return;
  }
  // [ID] Selain itu, game dianggap sudah ditangani.
  g.sent = true;
  // [ID] Berhasil:
  if (r.kind === 'ok') {
    // [ID] "Terkirim! +poin · peringkat · total tim" (poin dihitung server).
    setSubmitStatus(t('submitted', r.data.score.total.toLocaleString(), r.data.rank, r.data.team.total.toLocaleString()), 'ok');
  }
  // [ID] Sudah pernah dikirim.
  else if (r.kind === 'dup') setSubmitStatus(t('submitDup'), 'bad');
  // [ID] Ditolak server, tampilkan kode alasannya.
  else if (r.kind === 'rejected') setSubmitStatus(`${t('submitRejected')} (${r.data.error})`, 'bad');
  // [ID] Offline:
  else {
    // [ID] simpan di daftar tertunda,
    savePending([...loadPending(), payload]);
    // [ID] "Leaderboard offline. Skor disimpan…".
    setSubmitStatus(t('submitOffline'), 'bad');
  }
}

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
      // [ID] merah berkedip kalau tinggal 1 atau 0,
      $('.pcard-mob', card).classList.toggle('danger', g.phase !== 'over' && mob <= 1);
      // [ID] sorot yang sedang jalan,
      card.classList.toggle('is-turn', g.phase !== 'over' && s.turn === sd);
      // [ID] sorot emas pemenang.
      card.classList.toggle('is-winner', g.phase === 'over' && g.winner === sd);
    }
  },
  // [ID] Nyalakan/matikan animasi "berpikir".
  thinking(on) {
    // [ID] (class on)
    $('#thinking').classList.toggle('on', on);
  },
  // [ID] Isi panel "Otak AI" dengan hasil pencarian.
  stats(res) {
    // [ID] Fungsi bantu: isi elemen dan kilatkan.
    const set = (id, html) => {
      // [ID] Elemen.
      const el = $(id);
      // [ID] Isi.
      el.innerHTML = html;
      // [ID] Hapus class kilat.
      el.classList.remove('flash');
      // [ID] Paksa hitung ulang.
      void el.offsetWidth;
      // [ID] Kilatkan.
      el.classList.add('flash');
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
  // [ID] Perbarui riwayat langkah (dan skor).
  log(history) {
    // [ID] Elemen daftar riwayat.
    const ol = $('#log');
    // [ID] Skor saat ini (hanya mode Single Player).
    const sc = game && pointsEnabled(game.mode) ? currentScore(game) : null;
    // [ID] Riwayat kosong:
    if (!history.length) {
      // [ID] "Belum ada langkah.",
      ol.innerHTML = `<li class="log-empty" style="display:block;background:none">${t('logEmpty')}</li>`;
      // [ID] reset skor,
      updateScore(history, sc);
      // [ID] selesai.
      return;
    }
    // [ID] Satu baris per langkah:
    ol.innerHTML = history
      // [ID] ubah setiap langkah menjadi <li>:
      .map(
        // [ID] nomor dan warna pemain,
        (h, i) => `<li class="s${h.side}"><span class="n">${i + 1}.</span><span class="sw"></span>` +
          // [ID] "asal → tujuan" dan "✕ jebakan",
          `<span class="mv">${squareName(h.from)} → <b>${squareName(h.jump)}</b>${h.trap >= 0 ? `<span class="x">✕ ${squareName(h.trap)}</span>` : ''}</span>` +
          // [ID] poin langkah ini kalau ada ("+20").
          (sc?.steps[i] ? `<span class="pts">+${sc.steps[i].toLocaleString()}</span>` : '') + '</li>',
      )
      // [ID] gabungkan.
      .join('');
    // [ID] Gulir ke langkah terbaru.
    ol.scrollTop = ol.scrollHeight;
    // [ID] Perbarui skor dan "+N".
    updateScore(history, sc);
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
    // [ID] Mode lokal:
    if (g.mode === 'local') {
      // [ID] "<nama> Menang!",
      title = t('sideWins', winName);
      // [ID] "<nama> tidak punya lompatan legal.".
      sub = t('trappedSub', loseName);
    // [ID] Mode AI atau online:
    } else {
      // [ID] menang kalau pemenangnya saya,
      win = me === info.winner;
      // [ID] "Kamu Menang!" atau "Kamu Kalah",
      title = win ? t('youWin') : t('youLose');
      // [ID] keterangan khusus mode AI,
      if (g.mode === 'ai') sub = win ? t('youWinSub') : t('aiWinSub');
      // [ID] keterangan mode online.
      else sub = t('trappedSub', loseName);
    }
    // [ID] Skor akhir.
    let score = null;
    // [ID] Hanya mode Single Player:
    if (pointsEnabled(g.mode)) {
      // [ID] hitung skor,
      score = currentScore(g);
      // [ID] tampilkan rinciannya.
      renderBreakdown(score, g.level, g.rules);
    }
    // [ID] Buka layar game over.
    openGameOver({ title, sub, win, winnerSide: info.winner, moves: info.moves, score });
    // [ID] Simpan game ini untuk tombol "Kirim skor".
    if (score) lastGame = { difficulty: g.level, side: me, id: newGameId(), moves: gameMoves(g), sent: false };
  },
};

// [ID] Tampilkan layar game over. leftOnly = lawan online keluar (tanpa tombol Main lagi).
function openGameOver({ title, sub, win, winnerSide, moves, leftOnly = false, score = null }) {
  // [ID] Kartu game over.
  const card = $('#gameover .modal-card');
  // [ID] Gaya menang,
  card.classList.toggle('win', win);
  // [ID] atau kalah.
  card.classList.toggle('lose', !win);
  // [ID] Judul.
  $('#go-title').textContent = title;
  // [ID] Keterangan.
  $('#go-sub').textContent = sub;
  // [ID] Jumlah langkah.
  $('#go-moves').textContent = moves;
  // [ID] Warna knight di atas kartu sesuai pemenang.
  $('#go-glyph').setAttribute('class', `kglyph p${winnerSide ?? 0}`);
  // [ID] Sembunyikan "Main lagi" kalau lawan keluar.
  $('#go-rematch').hidden = leftOnly;
  // [ID] Aktifkan "Main lagi".
  $('#go-rematch').disabled = false;
  // [ID] Sembunyikan pesan tunggu.
  $('#go-wait').hidden = true;
  // [ID] Bagian poin hanya kalau ada skor.
  $('#go-score').hidden = !score;
  // [ID] Aktifkan "Kirim skor".
  $('#go-submit').disabled = false;
  // [ID] Kosongkan status kirim.
  setSubmitStatus('');
  // [ID] Lupakan game sebelumnya.
  lastGame = null;
  // [ID] Tampilkan.
  $('#gameover').hidden = false;
  // [ID] Fokus ke tombol utama.
  (leftOnly ? $('#go-menu') : $('#go-rematch')).focus();
}

// [ID] Tutup layar game over.
function closeGameOver() {
  // [ID] Sembunyikan.
  $('#gameover').hidden = true;
  // [ID] Lupakan game yang menunggu dikirim.
  lastGame = null;
}

// [ID] Siapkan panel samping sesuai mode.
function resetSidePanels(mode) {
  // [ID] Panel "Otak AI" hanya di mode AI.
  $('#ai-panel').hidden = mode !== 'ai';
  // [ID] Kosongkan semua angka statistik.
  for (const id of ['#st-depth', '#st-nodes', '#st-cutoffs', '#st-time', '#st-score']) $(id).textContent = '–';
  // [ID] Matikan animasi berpikir.
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
  // The game keeps the point values it started with, even if the admin changes them mid-game.
  // [ID] Game memakai nilai poin saat dimulai, walaupun admin mengubahnya di tengah game.
  // [ID] Kedalaman AI diambil dari DIFFICULTY sesuai level.
  launch({ mode: 'ai', level: settings.diff, players, rules, ai: { depth: DIFFICULTY[settings.diff], prune: settings.prune } });
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
        // [ID] tampilkan layar "lawan keluar" tanpa tombol main lagi,
        openGameOver({ title: t('netLeft'), sub: '', win: true, winnerSide: game.mySide, moves: game.state.moves, leftOnly: true });
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

// ---- Leaderboard ------------------------------------------------------------
// [ID] ---- Leaderboard ----
// [ID] Timer pembaruan otomatis.
let lbTimer = 0;
// [ID] Sedang memuat (supaya tidak dua permintaan sekaligus).
let lbBusy = false;

// [ID] Ubah karakter HTML berbahaya menjadi kode aman (&, <, >, ", ') supaya nama tim tidak bisa menyisipkan HTML.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// [ID] Mulai pembaruan leaderboard.
function startLeaderboard() {
  // [ID] Sudah jalan: selesai.
  if (lbTimer) return;
  // [ID] Belum ada isi: "Memuat…".
  if (!$('#lb-list').children.length) $('#lb-status').textContent = t('lbLoading');
  // [ID] Muat sekarang.
  refreshLeaderboard();
  // [ID] Lalu setiap 15 detik.
  lbTimer = setInterval(refreshLeaderboard, LEADERBOARD.pollMs);
}
// [ID] Hentikan pembaruan.
function stopLeaderboard() {
  // [ID] Hentikan timer.
  clearInterval(lbTimer);
  // [ID] Tandai berhenti.
  lbTimer = 0;
}

// [ID] Tampilkan berapa skor yang masih tersimpan di perangkat.
function renderPending() {
  // [ID] Jumlahnya.
  const n = loadPending().length;
  // [ID] Sembunyikan kalau nol.
  $('#lb-pending').hidden = n === 0;
  // [ID] "n skor tersimpan di perangkat ini…".
  $('#lb-pending').textContent = n ? t('lbPending', n) : '';
}

// [ID] Gambar tabel leaderboard.
function renderLeaderboard(teams) {
  // [ID] Kunci tim saya (untuk disorot).
  const me = team ? nameKey(team) : '';
  // [ID] Isi daftar:
  $('#lb-list').innerHTML = teams.length
    // [ID] kalau ada tim:
    ? teams
        // [ID] satu baris per tim:
        .map(
          // [ID] class "me" untuk tim saya, top1–3 untuk tiga besar,
          (tm) => `<li class="lb-row${tm.key === me ? ' me' : ''}${tm.rank <= 3 ? ` top${tm.rank}` : ''}">` +
            // [ID] peringkat dan nama (di-escape),
            `<span class="lb-rank">${tm.rank}</span><span class="lb-name">${esc(tm.name)}</span>` +
            // [ID] total poin, jumlah menang, jumlah game.
            `<b>${Number(tm.total).toLocaleString()}</b><span>${Number(tm.wins)}</span><span>${Number(tm.games)}</span></li>`,
        )
        // [ID] gabungkan,
        .join('')
    // [ID] kalau kosong: "Belum ada skor".
    : `<li class="lb-empty">${t('lbEmpty')}</li>`;
}

// Sends the oldest saved score, one per refresh so the per-IP rate limit is respected.
// [ID] Kirim satu skor tertunda (yang paling lama) per pembaruan, supaya tidak melanggar batas 1 per 10 detik.
async function flushPending() {
  // [ID] Daftar tertunda.
  const list = loadPending();
  // [ID] Kosong: tidak ada yang dikirim.
  if (!list.length) return false;
  // [ID] Kirim yang pertama.
  const r = await postScore(list[0]);
  // [ID] Terlalu cepat atau masih offline: coba lagi nanti.
  if (r.kind === 'rate' || r.kind === 'offline') return false;
  // [ID] Selain itu (berhasil, duplikat, atau ditolak), hapus dari daftar.
  savePending(loadPending().slice(1));
  // [ID] Tidak berhasil: selesai.
  if (r.kind !== 'ok') return false;
  // [ID] Berhasil: "Skor tersimpan berhasil dikirim.".
  toast(t('pendingSent'));
  // [ID] Ada yang terkirim.
  return true;
}

// [ID] Ambil data leaderboard dari server.
async function fetchLeaderboard() {
  // [ID] Coba ambil.
  try {
    // [ID] GET /api/leaderboard.
    const res = await fetch('/api/leaderboard', { cache: 'no-store' });
    // [ID] Berhasil: kembalikan JSON.
    if (res.ok) return await res.json();
  // [ID] Gagal: abaikan.
  } catch {}
  // [ID] Tidak ada data.
  return null;
}

// [ID] Perbarui layar leaderboard.
async function refreshLeaderboard() {
  // [ID] Sedang memuat: jangan dobel.
  if (lbBusy) return;
  // [ID] Tandai memuat.
  lbBusy = true;
  // [ID] Ikon refresh berputar.
  $('#lb-refresh').classList.add('spin');
  // [ID] Ambil data.
  let data = await fetchLeaderboard();
  // [ID] Kalau online dan ada skor tertunda yang berhasil dikirim, ambil ulang supaya langsung terlihat.
  if (data?.ok && (await flushPending())) data = (await fetchLeaderboard()) ?? data;
  // [ID] Selesai memuat.
  lbBusy = false;
  // [ID] Hentikan putaran ikon.
  $('#lb-refresh').classList.remove('spin');
  // [ID] Sudah pindah layar: jangan gambar.
  if (currentScreen !== 'board') return;
  // [ID] Data sah:
  if (data?.ok && Array.isArray(data.teams)) {
    // [ID] titik hijau,
    $('#lb-dot').className = 'dot ok';
    // [ID] "Diperbarui <jam>",
    $('#lb-status').textContent = t('lbUpdated', new Date().toLocaleTimeString(getLang() === 'id' ? 'id-ID' : 'en-GB'));
    // [ID] gambar tabel.
    renderLeaderboard(data.teams);
  // [ID] Gagal:
  } else {
    // [ID] titik merah,
    $('#lb-dot').className = 'dot bad';
    // [ID] "Leaderboard offline".
    $('#lb-status').textContent = t('lbOffline');
  }
  // [ID] Tampilkan jumlah skor tertunda.
  renderPending();
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
  // [ID] Suara.
  setSoundEnabled(settings.sound);
  // [ID] Saklar suara di Pengaturan.
  $('#set-sound').checked = settings.sound;
  // [ID] Ikon suara di layar game.
  $('#game-sound').classList.toggle('is-off', !settings.sound);
  // [ID] Pilihan bahasa.
  selectRadio($('#lang-seg'), 'data-lang', settings.lang);
  // [ID] Pilihan level.
  selectRadio($('#diff-grid'), 'data-diff', settings.diff);
  // [ID] Pilihan siapa jalan duluan.
  selectRadio($('#first-seg'), 'data-first', settings.first);
  // [ID] Saklar Alpha-Beta.
  $('#sp-ab').checked = settings.prune;
  // [ID] Nama tim.
  $('#sp-team-name').textContent = team || '—';
  // [ID] Bangun ulang Cara Bermain (teksnya ikut bahasa).
  buildHowTo();
  // [ID] Tampilkan poin per level.
  renderPointsInfo();
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
  // [ID] Buat papan hiasan menu.
  buildMenuBoard();
  // [ID] Terapkan pengaturan.
  applySettingsToUi();
  // [ID] Mulai bara latar belakang.
  startBackgroundEmbers($('#bg-embers'));
  // [ID] Tampilkan menu.
  showScreen('menu');
  // [ID] Riwayat kosong.
  ui.log([]);
  // [ID] Ambil nilai poin dari server.
  loadRules();

  // [ID] Aktifkan audio pada sentuhan/klik pertama (aturan browser).
  document.addEventListener('pointerdown', unlockAudio, { once: true });

  // [ID] Satu pengendali klik untuk tombol navigasi:
  document.addEventListener('click', (e) => {
    // [ID] tombol dengan data-go (pindah layar)?
    const go = e.target.closest('[data-go]');
    // [ID] Kalau ya:
    if (go) {
      // [ID] bunyi pilih,
      sfx.select();
      // [ID] pindah layar,
      showScreen(go.dataset.go);
      // [ID] layar Single Player: ambil nilai poin terbaru,
      if (go.dataset.go === 'sp') loadRules();
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
    // [ID] sorot baris tabel poin,
    renderPointsInfo();
    // [ID] bunyi,
    sfx.select();
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
  // [ID] Tombol Mulai: minta nama tim dulu kalau belum ada, lalu mulai game.
  $('#sp-start').addEventListener('click', async () => {
    // [ID] (mulai kalau nama tersedia)
    if (await ensureTeam()) startAiGame();
  });
  // [ID] Tombol Ganti nama tim.
  $('#sp-team-change').addEventListener('click', () => ensureTeam(true));
  // [ID] Tombol Kirim skor.
  $('#go-submit').addEventListener('click', submitLastGame);
  // [ID] Tombol refresh leaderboard.
  $('#lb-refresh').addEventListener('click', refreshLeaderboard);

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

  // [ID] Saklar suara di Pengaturan:
  $('#set-sound').addEventListener('change', (e) => {
    // [ID] simpan,
    settings.sound = e.target.checked;
    // [ID] terapkan,
    applySettingsToUi();
    // [ID] simpan pengaturan.
    saveSettings();
  });
  // [ID] Tombol suara di layar game (bolak-balik ON/OFF):
  $('#game-sound').addEventListener('click', () => {
    // [ID] balik nilainya,
    settings.sound = !settings.sound;
    // [ID] terapkan,
    applySettingsToUi();
    // [ID] simpan.
    saveSettings();
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
