// Knight Trap test runner. No framework: `node tests/run.mjs` (add --quick for 20 games per match-up).
// [ID] Semua pengujian Knight Trap (proposal Bab 2.2), tanpa framework. Jalankan: node tests/run.mjs (tambah --quick untuk 20 game per pasangan).
// [ID] Pengukur waktu presisi tinggi dari Node.js.
import { performance } from 'node:perf_hooks';
// [ID] Kedalaman per level dan pengaturan AI.
import { DIFFICULTY, AI as AICFG } from '../js/config.js';
// [ID] Fungsi aturan yang diuji.
import {
  // [ID] buat/salin state, lompatan legal, lompat, jebak, ganti giliran, langkah lengkap,
  createState, cloneState, legalJumps, applyJump, applyTrap, endTurn, applyMove,
  // [ID] validasi, pemenang, bisa bergerak, kotak terbuka, status kotak, serialisasi.
  validateMove, winner, canMove, isOpen, EMPTY, BURNED, TRAP, serialize, deserialize,
} from '../js/rules.js';
// [ID] Fungsi AI: pencarian, pemain acak, pemain greedy, evaluasi, bobot split.
import { search, randomMove, greedyMove, evaluate, SPLIT_WEIGHT } from '../js/ai.js';

// [ID] Mode cepat kalau ada argumen --quick.
const QUICK = process.argv.includes('--quick');
// [ID] Jumlah game per level per lawan: 20 (cepat) atau 100 (penuh, sesuai proposal).
const GAMES = QUICK ? 20 : 100;
// [ID] Seed dasar angka acak, supaya hasil bisa diulang persis.
const BASE_SEED = 20261028;

// [ID] Jumlah cek gagal.
let failures = 0;
// [ID] Jumlah cek lulus.
let passes = 0;
// [ID] Satu cek: lulus kalau cond benar; kalau gagal, tampilkan nama dan detail.
function check(name, cond, detail = '') {
  // [ID] Lulus: tambah hitungan.
  if (cond) passes++;
  // [ID] Gagal:
  else {
    // [ID] tambah hitungan gagal,
    failures++;
    // [ID] tampilkan pesan FAIL.
    console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`);
  }
}

// [ID] Generator angka acak dengan seed (mulberry32): seed sama → urutan angka sama.
function mulberry32(seed) {
  // [ID] State awal (dipaksa 32-bit tak bertanda).
  let a = seed >>> 0;
  // [ID] Fungsi yang mengembalikan angka acak 0..1 setiap dipanggil.
  return () => {
    // [ID] Majukan state dengan konstanta.
    a = (a + 0x6d2b79f5) >>> 0;
    // [ID] Salin state.
    let t = a;
    // [ID] Aduk bit (operasi XOR, geser, kali 32-bit).
    t = Math.imul(t ^ (t >>> 15), t | 1);
    // [ID] Aduk lagi.
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // [ID] Ubah menjadi angka 0..1.
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [ID] Ubah nama kotak (misalnya "a1") menjadi indeks (42).
const sq = (name) => (7 - Number(name[1])) * 7 + 'abcdefg'.indexOf(name[0]);
// [ID] Ratakan teks ke kanan (untuk tabel hasil).
const pad = (v, n) => String(v).padStart(n);

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 1: Aturan ----
console.log('\n1. Rules');
{
  // [ID] Posisi awal.
  const s = createState();
  // [ID] P1 mulai di a1.
  check('start: P1 on a1', s.pos[0] === sq('a1'));
  // [ID] P2 mulai di g7.
  check('start: P2 on g7', s.pos[1] === sq('g7'));
  // [ID] P1 jalan duluan.
  check('start: P1 moves first', s.turn === 0);
  // [ID] Dari a1 hanya bisa ke b3 dan c2.
  check('a1 legal jumps = b3, c2', JSON.stringify(legalJumps(s).sort((a, b) => a - b)) === JSON.stringify([sq('b3'), sq('c2')].sort((a, b) => a - b)));

  // [ID] Salinan untuk mencoba lompat.
  const t = cloneState(s);
  // [ID] Lompat ke b3.
  const from = applyJump(t, sq('b3'));
  // [ID] Knight pindah.
  check('jump moves knight', t.pos[0] === sq('b3'));
  // [ID] Kotak asal a1 terbakar.
  check('origin square burns', from === sq('a1') && t.cells[sq('a1')] === BURNED);
  // [ID] Jebak d4.
  applyTrap(t, sq('d4'));
  // [ID] d4 menjadi jebakan.
  check('trap marks square', t.cells[sq('d4')] === TRAP);
  // [ID] Akhiri giliran.
  endTurn(t);
  // [ID] Giliran pindah ke P2 dan hitungan bertambah.
  check('turn passes', t.turn === 1 && t.moves === 1);

  // Cannot land on burned, trap or occupied squares.
  // [ID] Tidak boleh mendarat di kotak terbakar, jebakan, atau ditempati.
  // [ID] Posisi uji: P1 di d4, P2 di e6.
  const u = createState({ p1: sq('d4'), p2: sq('e6'), first: 0 });
  // [ID] b3 terbakar.
  u.cells[sq('b3')] = BURNED;
  // [ID] c6 jebakan.
  u.cells[sq('c6')] = TRAP;
  // [ID] Lompatan legal dari d4.
  const j = legalJumps(u);
  // [ID] b3 tidak boleh.
  check('blocked: burned square', !j.includes(sq('b3')));
  // [ID] c6 tidak boleh.
  check('blocked: trap square', !j.includes(sq('c6')));
  // [ID] e6 (lawan) tidak boleh.
  check('blocked: opponent square', !j.includes(sq('e6')));
  // [ID] Kotak terbuka tetap boleh.
  check('open squares still legal', j.includes(sq('f5')) && j.includes(sq('b5')));

  // Trap validation.
  // [ID] Validasi jebakan.
  // [ID] Langkah sah.
  check('valid move accepted', validateMove(u, { jump: sq('f5'), trap: sq('a1') }));
  // [ID] Jebakan di kotak terbakar ditolak.
  check('trap on burned rejected', !validateMove(u, { jump: sq('f5'), trap: sq('b3') }));
  // [ID] Jebakan di kotak lawan ditolak.
  check('trap on opponent rejected', !validateMove(u, { jump: sq('f5'), trap: sq('e6') }));
  // [ID] Jebakan di kotak sendiri yang baru ditolak.
  check('trap on own new square rejected', !validateMove(u, { jump: sq('f5'), trap: sq('f5') }));
  // [ID] Jebakan di kotak asal (baru terbakar) ditolak.
  check('trap on burned origin rejected', !validateMove(u, { jump: sq('f5'), trap: sq('d4') }));
  // [ID] Lompatan bukan huruf L ditolak.
  check('illegal jump rejected', !validateMove(u, { jump: sq('d5'), trap: sq('a1') }));
  // [ID] Melewati jebakan padahal masih ada kotak terbuka ditolak.
  check('missing trap rejected while squares are open', !validateMove(u, { jump: sq('f5'), trap: -1 }));
  // [ID] Data aneh ditolak.
  check('garbage rejected', !validateMove(u, { jump: 'x', trap: 3 }) && !validateMove(u, null));

  // Loss detection: P1 on a1 with b3 and c2 gone loses on its turn.
  // [ID] Deteksi kalah: P1 di a1, b3 dan c2 sudah tertutup → P1 kalah di gilirannya.
  // [ID] Posisi awal.
  const v = createState();
  // [ID] Tutup b3.
  v.cells[sq('b3')] = TRAP;
  // [ID] Tutup c2.
  v.cells[sq('c2')] = BURNED;
  // [ID] P1 tidak bisa bergerak → P2 menang.
  check('no legal jump -> side to move loses', winner(v) === 1 && !canMove(v));
  // [ID] Kalau giliran P2,
  v.turn = 1;
  // [ID] P2 masih bisa bergerak → belum ada pemenang.
  check('other side still alive', winner(v) === null);

  // Trap skipped only when nothing is open.
  // [ID] Jebakan boleh dilewati hanya kalau tidak ada kotak terbuka.
  // [ID] Posisi uji.
  const w = createState({ p1: sq('a1'), p2: sq('g7'), first: 0 });
  // [ID] Bakar semua kotak kecuali a1, g7, b3.
  for (let i = 0; i < 49; i++) if (i !== sq('a1') && i !== sq('g7') && i !== sq('b3')) w.cells[i] = BURNED;
  // [ID] Lompat ke b3 tanpa jebakan: sah.
  check('no open square after jump -> trap -1 valid', validateMove(w, { jump: sq('b3'), trap: -1 }));
  // [ID] Lompat ke b3 dengan jebakan: tidak sah (tidak ada kotak terbuka).
  check('no open square after jump -> real trap invalid', !validateMove(w, { jump: sq('b3'), trap: sq('c5') }));

  // [ID] Ubah ke JSON lalu kembali.
  const r = deserialize(JSON.parse(JSON.stringify(serialize(u))));
  // [ID] Hasilnya sama.
  check('serialize round trip', r.pos[0] === u.pos[0] && r.cells[sq('c6')] === TRAP && r.turn === u.turn);
  // [ID] Apakah melempar error.
  let threw = false;
  // [ID] Data rusak (cells hanya 2) harus melempar error.
  try { deserialize({ cells: [1, 2], pos: [0, 1] }); } catch { threw = true; }
  // [ID] Benar melempar error.
  check('deserialize rejects bad payload', threw);

  // Evaluation sanity.
  // [ID] Cek kewajaran fungsi evaluasi.
  // [ID] Posisi awal.
  const e = createState();
  // [ID] Posisi awal simetris: skor P1 = minus skor P2.
  check('start position is symmetric (P1 gets tie squares)', evaluate(e, 0) === -evaluate(e, 1));
  // Split board: P1 can only reach b3, c2; P2 can reach f5, e6, g3, g5.
  // [ID] Papan terbelah: P1 hanya bisa ke b3, c2; P2 ke f5, e6, g3, g5.
  // [ID] Posisi uji.
  const split = createState({ p1: sq('a1'), p2: sq('g7'), first: 0 });
  // [ID] Kotak yang tetap terbuka.
  const keep = new Set(['a1', 'g7', 'b3', 'c2', 'f5', 'e6', 'g3', 'g5'].map(sq));
  // [ID] Bakar sisanya.
  for (let i = 0; i < 49; i++) if (!keep.has(i)) split.cells[i] = BURNED;
  // [ID] Skor P2 = (4 - 2) x 100 = 200.
  check('DFS split: area difference x weight', evaluate(split, 1) === 2 * SPLIT_WEIGHT, String(evaluate(split, 1)));
  // [ID] Bobot split lebih besar dari skor wilayah maksimum.
  check('split weight outranks territory', SPLIT_WEIGHT > 49 + 4);
  // BFS territory: P1 to move on an open board gets the tie squares.
  // [ID] Wilayah BFS: knight di tengah (d4) unggul dari knight di pojok (g7).
  // [ID] Posisi uji.
  const terr = createState({ p1: sq('d4'), p2: sq('g7'), first: 0 });
  // [ID] Skor P1 positif.
  check('BFS territory favors the central knight', evaluate(terr, 0) > 0);
}
// [ID] Ringkasan bagian 1.
console.log(`   ${passes} checks passed so far, ${failures} failed`);

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 2: Kebenaran Alpha-Beta (dibandingkan dengan Minimax biasa) ----
console.log('\n2. Alpha-Beta correctness (Alpha-Beta vs plain Minimax, same eval/order, no time limit)');
// [ID] 30 posisi uji.
const positions = [];
{
  // [ID] Seed pertama.
  let seed = BASE_SEED;
  // [ID] Kumpulkan sampai 30 posisi.
  while (positions.length < 30) {
    // [ID] Angka acak dari seed ini.
    const rng = mulberry32(seed);
    // [ID] Main acak 4 sampai 8 giliran.
    const turns = 4 + Math.floor(rng() * 5);
    // [ID] Posisi awal.
    const s = createState();
    // [ID] Apakah berhasil.
    let ok = true;
    // [ID] Mainkan giliran acak.
    for (let i = 0; i < turns; i++) {
      // [ID] Langkah acak.
      const m = randomMove(s, rng);
      // [ID] Tidak ada langkah (game selesai terlalu cepat): batal.
      if (!m) { ok = false; break; }
      // [ID] Terapkan.
      applyMove(s, m);
    }
    // [ID] Simpan kalau berhasil dan game belum selesai.
    if (ok && winner(s) === null) positions.push({ seed, turns, s });
    // [ID] Seed berikutnya.
    seed++;
  }
  // [ID] Tampilkan seed yang dipakai (supaya bisa diulang).
  console.log(`   30 positions from seeds ${positions[0].seed}..${positions.at(-1).seed} (seed ${BASE_SEED} + k, random play of 4-8 turns)`);
  // [ID] Judul tabel.
  console.log('   depth | identical score | identical move | nodes Minimax | nodes Alpha-Beta | saved | cutoffs | ms MM | ms AB');
  // [ID] Untuk kedalaman 1, 2, 3:
  for (const depth of [1, 2, 3]) {
    // [ID] Penghitung: skor sama, langkah sama, node Minimax, node Alpha-Beta, cutoff, waktu.
    let sameScore = 0, sameMove = 0, nMM = 0, nAB = 0, cut = 0, tMM = 0, tAB = 0;
    // [ID] Untuk setiap posisi:
    for (const p of positions) {
      // [ID] Minimax biasa (prune: false), tanpa batas waktu.
      const mm = search(p.s, { depth, prune: false, timeLimitMs: Infinity, now: performance.now.bind(performance) });
      // [ID] Alpha-Beta (prune: true), tanpa batas waktu.
      const ab = search(p.s, { depth, prune: true, timeLimitMs: Infinity, now: performance.now.bind(performance) });
      // [ID] Skor sama: hitung.
      if (mm.score === ab.score) sameScore++;
      // [ID] Beda: tampilkan.
      else console.log(`   mismatch seed ${p.seed} depth ${depth}: MM ${mm.score} AB ${ab.score}`);
      // [ID] Langkah sama: hitung.
      if (mm.move.jump === ab.move.jump && mm.move.trap === ab.move.trap) sameMove++;
      // [ID] Jumlahkan node, cutoff, dan waktu.
      nMM += mm.nodes; nAB += ab.nodes; cut += ab.cutoffs; tMM += mm.timeMs; tAB += ab.timeMs;
    }
    // [ID] Persentase node yang dihemat Alpha-Beta.
    const saved = (100 * (1 - nAB / nMM)).toFixed(1) + '%';
    // [ID] Satu baris tabel.
    console.log(`   ${pad(depth, 5)} | ${pad(sameScore + '/30', 15)} | ${pad(sameMove + '/30', 13)} | ${pad(nMM, 13)} | ${pad(nAB, 16)} | ${pad(saved, 5)} | ${pad(cut, 7)} | ${pad(tMM.toFixed(0), 5)} | ${pad(tAB.toFixed(0), 5)}`);
    // [ID] Harus 30/30 skor sama.
    check(`depth ${depth}: identical scores`, sameScore === 30);
    // [ID] Harus 30/30 langkah sama.
    check(`depth ${depth}: identical moves`, sameMove === 30);
  }
}

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 3: Kekuatan AI (win rate) ----
console.log(`\n3. Strength (${GAMES} games per level per opponent, AI alternates first/second, 4 s limit, Alpha-Beta on)`);
// [ID] Waktu berpikir per level (dipakai bagian 4).
const timing = {};
// [ID] Win rate per level.
const winRates = {};
{
  // [ID] Judul tabel.
  console.log('   level  | depth | vs random | vs greedy');
  // [ID] Untuk setiap level:
  for (const [level, depth] of Object.entries(DIFFICULTY)) {
    // [ID] daftar waktu,
    timing[level] = [];
    // [ID] win rate.
    winRates[level] = {};
    // [ID] Lawan: acak dan greedy.
    for (const [oppName, opp] of [['random', randomMove], ['greedy', greedyMove]]) {
      // [ID] Jumlah menang AI.
      let wins = 0;
      // [ID] Mainkan GAMES game.
      for (let g = 0; g < GAMES; g++) {
        // [ID] Seed unik per level, nomor game, dan lawan.
        const rng = mulberry32(BASE_SEED * 7 + depth * 100003 + g * 31 + (oppName === 'greedy' ? 17 : 0));
        // [ID] AI bergantian jalan pertama/kedua.
        const aiSide = g % 2;
        // [ID] Posisi awal.
        const s = createState();
        // [ID] Apakah ada langkah ilegal.
        let illegal = false;
        // [ID] Main sampai ada pemenang.
        while (winner(s) === null) {
          // [ID] Langkah giliran ini.
          let move;
          // [ID] Giliran AI:
          if (s.turn === aiSide) {
            // [ID] cari langkah dengan batas waktu 4 detik,
            const res = search(s, { depth, prune: true, timeLimitMs: AICFG.timeLimitMs, now: performance.now.bind(performance) });
            // [ID] catat waktunya,
            timing[level].push(res.timeMs);
            // [ID] pakai langkahnya.
            move = res.move;
          // [ID] Giliran lawan:
          } else {
            // [ID] langkah acak atau greedy.
            move = opp(s, rng);
          }
          // [ID] Langkah harus sah; kalau tidak, catat dan berhenti.
          if (!validateMove(s, move)) { illegal = true; break; }
          // [ID] Terapkan.
          applyMove(s, move);
        }
        // [ID] Semua langkah harus sah.
        check(`${level} vs ${oppName} game ${g}: only legal moves`, !illegal);
        // [ID] Hitung kemenangan AI.
        if (winner(s) === aiSide) wins++;
      }
      // [ID] Persentase menang.
      winRates[level][oppName] = (100 * wins) / GAMES;
    }
    // [ID] Satu baris tabel.
    console.log(`   ${level.padEnd(6)} | ${pad(depth, 5)} | ${pad(winRates[level].random.toFixed(0) + '%', 9)} | ${pad(winRates[level].greedy.toFixed(0) + '%', 9)}`);
    // [ID] Target proposal: Medium ke atas menang minimal 90% melawan pemain acak.
    if (depth >= 2) check(`${level}: >= 90% vs random`, winRates[level].random >= 90, `${winRates[level].random}%`);
  }
}

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 4: Waktu respons per langkah AI ----
console.log('\n4. Response time per AI move (Node, same code as the browser worker)');
{
  // [ID] Judul tabel.
  console.log('   level  | moves | avg ms | p95 ms | max ms');
  // [ID] Untuk setiap level:
  for (const [level, times] of Object.entries(timing)) {
    // [ID] waktu diurutkan,
    const sorted = [...times].sort((a, b) => a - b);
    // [ID] rata-rata,
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    // [ID] p95 (95% langkah di bawah angka ini),
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    // [ID] maksimum,
    const max = sorted.at(-1);
    // [ID] satu baris tabel,
    console.log(`   ${level.padEnd(6)} | ${pad(times.length, 5)} | ${pad(avg.toFixed(1), 6)} | ${pad(p95.toFixed(1), 6)} | ${pad(max.toFixed(1), 6)}`);
    // [ID] target: semua level di bawah 4 detik,
    check(`${level}: max < 4000 ms`, max < 4000, `${max.toFixed(0)} ms`);
    // [ID] target: Easy sampai Hard di bawah 1 detik.
    if (level !== 'expert') check(`${level}: max < 1000 ms`, max < 1000, `${max.toFixed(0)} ms`);
  }
}

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 5: Validasi host online (memakai Game asli dengan papan dan jaringan tiruan) ----
console.log('\n5. Online host validation (real Game class, stubbed board and network)');
{
  // [ID] Muat kelas Game.
  const { Game } = await import('../js/game.js');
  // [ID] Muat pengatur suara.
  const { setSoundEnabled } = await import('../js/audio.js');
  // [ID] Matikan suara (Node tidak punya audio).
  setSoundEnabled(false);
  // [ID] Pesan yang dikirim host.
  const sent = [];
  // [ID] Fungsi kosong.
  const noop = () => {};
  // [ID] Papan tiruan tanpa tampilan.
  const board = { render: noop, animateJump: async () => {}, burn: noop, trap: async () => {}, victory: noop };
  // [ID] UI tiruan.
  const ui = { update: noop, thinking: noop, stats: noop, log: noop, over: noop };
  // [ID] Game sebagai host online:
  const g = new Game({
    // [ID] papan, ui, mode online, peran host, jaringan tiruan yang mencatat pesan,
    board, ui, mode: 'online', role: 'host', net: { send: (m) => sent.push(m) },
    // [ID] host = manusia di sisi 0, tamu = remote di sisi 1.
    players: [{ kind: 'human', name: 'host' }, { kind: 'remote', name: 'guest' }],
  });
  // [ID] Mulai.
  g.start(createState());
  // [ID] Tunggu antrian pesan selesai diproses (plus jeda animasi).
  const flush = () => g.netQueue.then(() => new Promise((r) => setTimeout(r, 400)));

  // Guest tries to move on the host's turn.
  // [ID] Tamu mencoba melangkah saat giliran host.
  g.onNetMessage({ t: 'move', jump: sq('f5'), trap: sq('d4') });
  // [ID] Tunggu.
  await flush();
  // [ID] Harus ditolak dan state tidak berubah.
  check('out-of-turn guest move rejected', sent.at(-1)?.t === 'reject' && g.state.moves === 0);

  // Host plays a1 -> b3, trap d4 through the same input path as clicks.
  // [ID] Host main a1 → b3, jebak d4, lewat jalur yang sama seperti klik.
  await g.handleCell(sq('b3'));
  // [ID] Klik kedua: jebakan.
  await g.handleCell(sq('d4'));
  // [ID] Langkah tercatat, state dikirim ke tamu, dan sekarang menunggu tamu.
  check('host move applied and broadcast', g.state.moves === 1 && sent.at(-1)?.t === 'state' && g.phase === 'remote');

  // [ID] Simpan state sebelum uji langkah ilegal.
  const before = JSON.stringify(serialize(g.state));
  // [ID] Uji beberapa langkah ilegal dari tamu:
  for (const bad of [
    // [ID] bukan gerak L dari g7,
    { jump: sq('g6'), trap: sq('a7') }, // not a knight move from g7
    // [ID] jebakan di kotak yang sudah dijebak,
    { jump: sq('f5'), trap: sq('d4') }, // trap on an existing trap
    // [ID] jebakan di kotak knight host,
    { jump: sq('f5'), trap: sq('b3') }, // trap on the host knight
    // [ID] melewati jebakan padahal masih ada kotak,
    { jump: sq('f5'), trap: -1 }, // skipping the trap while squares are open
    // [ID] tipe data salah.
    { jump: 'f5', trap: 3 }, // wrong types
  ]) {
    // [ID] Kosongkan catatan pesan.
    sent.length = 0;
    // [ID] Kirim langkah ilegal.
    g.onNetMessage({ t: 'move', ...bad });
    // [ID] Tunggu.
    await flush();
    // [ID] Harus ditolak dan state tetap sama.
    check(`illegal guest move rejected ${JSON.stringify(bad)}`, sent[0]?.t === 'reject' && JSON.stringify(serialize(g.state)) === before);
  }

  // [ID] Kosongkan catatan pesan.
  sent.length = 0;
  // [ID] Langkah sah dari tamu.
  g.onNetMessage({ t: 'move', jump: sq('f5'), trap: sq('a7') });
  // [ID] Tunggu.
  await flush();
  // [ID] Diterima, dikirim balik, dan giliran kembali ke host.
  check('legal guest move accepted and broadcast', g.state.moves === 2 && sent[0]?.t === 'state' && g.phase === 'jump');
  // [ID] Selesai.
  g.dispose();
}

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 6: Poin dan leaderboard (scoring.js, server, handler /api dengan Redis tiruan) ----
console.log('\n6. Points and leaderboard (scoring.js, server replay and /api handlers with a mock Redis)');
{
  // [ID] Poin default.
  const { SCORING } = await import('../js/config.js');
  // [ID] Fungsi poin.
  const { scoreGame, pointsEnabled, cleanName, validName, normalizeRules, defaultRules, levelValues } = await import('../js/scoring.js');
  // [ID] Logika server.
  const { submitScore, readLeaderboard, updateRules, getRules } = await import('../api/_lib/leaderboard.js');
  // [ID] Pemasang Redis tiruan.
  const { setRedis } = await import('../api/_lib/redis.js');

  // Finished games from seeded random play: one P1 wins, one P1 loses.
  // [ID] Buat dua game selesai dari permainan acak ber-seed: satu P1 menang, satu P1 kalah.
  const playOut = (seed) => {
    // [ID] Angka acak.
    const rng = mulberry32(seed);
    // [ID] Posisi awal.
    const s = createState();
    // [ID] Daftar langkah.
    const moves = [];
    // [ID] Main sampai selesai.
    while (winner(s) === null) {
      // [ID] Langkah acak.
      const m = randomMove(s, rng);
      // [ID] Simpan.
      moves.push(m);
      // [ID] Terapkan.
      applyMove(s, m);
    }
    // [ID] Langkah dan pemenang.
    return { moves, w: winner(s) };
  };
  // [ID] Game di mana P1 menang.
  let winGame = null;
  // [ID] Game di mana P1 kalah.
  let lossGame = null;
  // [ID] Coba seed berurutan sampai dapat keduanya.
  for (let seed = BASE_SEED; !(winGame && lossGame); seed++) {
    // [ID] Mainkan.
    const g = playOut(seed);
    // [ID] P1 menang: simpan kalau belum ada.
    if (g.w === 0) winGame ??= g.moves;
    // [ID] P1 kalah: simpan kalau belum ada.
    else lossGame ??= g.moves;
  }

  // [ID] Untuk setiap level dan pengalinya:
  for (const [level, mult] of Object.entries(SCORING.multiplier)) {
    // [ID] skor game kalah,
    const l = scoreGame(lossGame, { level, humanSide: 0 });
    // [ID] poin per langkah = 10 x pengali,
    check(`${level}: ${SCORING.move * mult} points per move`, l.humanMoves > 0 && l.movePoints === l.humanMoves * SCORING.move * mult);
    // [ID] kalah tetap dapat poin langkah, tanpa bonus,
    check(`${level}: loss keeps move points, no win bonus`, l.finished && !l.won && l.winPoints === 0 && l.total === l.movePoints);
    // [ID] skor game menang,
    const w = scoreGame(winGame, { level, humanSide: 0 });
    // [ID] bonus menang = 200 x pengali,
    check(`${level}: win bonus ${SCORING.win * mult}`, w.won && w.winPoints === SCORING.win * mult);
    // [ID] total = (langkah x 10 + 200) x pengali,
    check(`${level}: total = moves + win`, w.total === w.movePoints + w.winPoints && w.total === (w.humanMoves * SCORING.move + SCORING.win) * mult);
    // [ID] jumlah poin per langkah = total poin langkah.
    check(`${level}: per-move points add up to the move points`, w.steps.reduce((a, b) => a + b, 0) === w.movePoints && w.steps.length === winGame.length);
  }
  // [ID] Poin per langkah di level Easy.
  const steps = scoreGame(winGame, { level: 'easy', humanSide: 0 }).steps;
  // [ID] Langkah pemain (indeks genap) = 10, langkah lawan = 0.
  check('every human move earns the same points, AI moves earn none', steps.every((p, i) => p === (i % 2 === 0 ? SCORING.move : 0)));
  // [ID] Total game menang di Easy.
  const easy = scoreGame(winGame, { level: 'easy', humanSide: 0 }).total;
  // [ID] Game yang sama di Expert = 2,5 x Easy.
  check('same game scores x2.5 on Expert vs Easy', scoreGame(winGame, { level: 'expert', humanSide: 0 }).total === 2.5 * easy);
  // [ID] Pengali sesuai permintaan: 1, 1.5, 2, 2.5.
  check('multipliers are 1, 1.5, 2, 2.5', JSON.stringify(SCORING.multiplier) === JSON.stringify({ easy: 1, medium: 1.5, hard: 2, expert: 2.5 }));
  // [ID] Skor satu langkah dengan jebakan di tempat berbeda.
  const traps = [sq('f5'), sq('d4')].map((tr) => scoreGame([{ jump: sq('b3'), trap: tr }], { level: 'easy', humanSide: 0 }).total);
  // [ID] Letak jebakan tidak mempengaruhi poin.
  check('where the trap goes does not change the points', traps[0] === SCORING.move && traps[1] === SCORING.move);

  // [ID] Mode lokal tidak memberi poin.
  check('Local mode gives no points', !pointsEnabled('local') && scoreGame(winGame, { mode: 'local', level: 'expert', humanSide: 0 }).total === 0);
  // [ID] Mode online tidak memberi poin.
  check('Online mode gives no points', !pointsEnabled('online') && scoreGame(winGame, { mode: 'online', level: 'expert', humanSide: 0 }).total === 0);
  // [ID] Single Player memberi poin.
  check('Single Player gives points', pointsEnabled('ai'));

  // [ID] Bersihkan nama yang berisi HTML.
  const cleaned = cleanName('  <script>Tim   A</script> ');
  // [ID] Karakter HTML hilang dan spasi dirapikan.
  check('name markup stripped', !/[<>&"']/.test(cleaned) && cleaned === 'scriptTim A/script', cleaned);
  // [ID] Batas panjang nama 2..20.
  check('name length 2..20', !validName('A') && validName('AB') && validName('x'.repeat(20)) && !validName('x'.repeat(21)));

  // In-memory stand-in for the Upstash client: same method names and return shapes.
  // [ID] Redis tiruan di memori: nama fungsi dan bentuk hasilnya sama dengan Upstash.
  const mockRedis = () => {
    // [ID] Kunci biasa.
    const kv = new Map();
    // [ID] Sorted set.
    const zsets = new Map();
    // [ID] Hash.
    const hashes = new Map();
    // [ID] Ambil (atau buat) sorted set.
    const zset = (k) => zsets.get(k) ?? zsets.set(k, new Map()).get(k);
    // [ID] Ambil (atau buat) hash.
    const hash = (k) => hashes.get(k) ?? hashes.set(k, new Map()).get(k);
    // [ID] Perintah-perintah Redis:
    const ops = {
      // [ID] SET dengan opsi nx (hanya kalau belum ada):
      async set(k, v, o = {}) {
        // [ID] sudah ada dan nx: gagal (null),
        if (o.nx && kv.has(k)) return null;
        // [ID] simpan,
        kv.set(k, String(v));
        // [ID] berhasil.
        return 'OK';
      },
      // [ID] ZINCRBY: tambah skor anggota sorted set:
      async zincrby(k, inc, m) {
        // [ID] sorted set,
        const z = zset(k);
        // [ID] tambah,
        z.set(m, (z.get(m) ?? 0) + inc);
        // [ID] skor baru.
        return z.get(m);
      },
      // [ID] ZCOUNT: hitung anggota dengan skor di atas batas:
      async zcount(k, min) {
        // [ID] "(" berarti lebih besar (bukan sama dengan),
        const excl = String(min).startsWith('(');
        // [ID] angka batasnya,
        const lo = Number(String(min).replace('(', ''));
        // [ID] hitung.
        return [...zset(k).values()].filter((v) => (excl ? v > lo : v >= lo)).length;
      },
      // [ID] ZRANGE: ambil anggota urut skor:
      async zrange(k, a, b, o = {}) {
        // [ID] urutkan (besar dulu kalau rev), ambil posisi a..b,
        const rows = [...zset(k).entries()].sort((x, y) => (o.rev ? y[1] - x[1] : x[1] - y[1])).slice(a, b + 1);
        // [ID] dengan skor: [anggota, skor, anggota, skor, ...].
        return o.withScores ? rows.flat() : rows.map((r) => r[0]);
      },
      // [ID] HINCRBY: tambah angka di hash:
      async hincrby(k, f, n) {
        // [ID] hash,
        const h = hash(k);
        // [ID] tambah,
        h.set(f, String(Number(h.get(f) ?? 0) + n));
        // [ID] nilai baru.
        return Number(h.get(f));
      },
      // [ID] HSETNX: set di hash hanya kalau belum ada:
      async hsetnx(k, f, v) {
        // [ID] hash,
        const h = hash(k);
        // [ID] sudah ada: 0,
        if (h.has(f)) return 0;
        // [ID] simpan,
        h.set(f, String(v));
        // [ID] berhasil: 1.
        return 1;
      },
      // [ID] GET:
      async get(k) {
        // [ID] nilai atau null.
        return kv.get(k) ?? null;
      },
      // [ID] DEL:
      async del(k) {
        // [ID] 1 kalau terhapus.
        return kv.delete(k) ? 1 : 0;
      },
      // [ID] INCR: tambah 1:
      async incr(k) {
        // [ID] tambah,
        kv.set(k, String(Number(kv.get(k) ?? 0) + 1));
        // [ID] nilai baru.
        return Number(kv.get(k));
      },
      // [ID] EXPIRE: diabaikan di tiruan.
      async expire() {
        // [ID] (selalu berhasil)
        return 1;
      },
      // [ID] HMGET: ambil beberapa field hash sekaligus:
      async hmget(k, ...fields) {
        // [ID] hash,
        const h = hashes.get(k);
        // [ID] objek field → nilai, atau null kalau hash tidak ada.
        return h ? Object.fromEntries(fields.map((f) => [f, h.get(f) ?? null])) : null;
      },
    };
    // [ID] Tiruan multi()/pipeline(): mencatat perintah berantai, lalu exec() menjalankan semuanya.
    const batch = () => {
      // [ID] Perintah yang dicatat.
      const queue = [];
      // [ID] Proxy: setiap nama fungsi mencatat perintah; "exec" menjalankan antrian.
      const chain = new Proxy({}, {
        // [ID] Saat properti diakses:
        get: (_, op) => op === 'exec'
          // [ID] exec: jalankan semua perintah, kembalikan daftar hasil,
          ? async () => { const out = []; for (const [n, args] of queue) out.push(await ops[n](...args)); return out; }
          // [ID] perintah lain: catat, kembalikan chain supaya bisa dirangkai.
          : (...args) => { queue.push([op, args]); return chain; },
      });
      // [ID] Objek berantai.
      return chain;
    };
    // [ID] Redis tiruan lengkap.
    return { ...ops, multi: batch, pipeline: batch };
  };

  // [ID] Redis tiruan untuk tes.
  const redis = mockRedis();
  // [ID] Isi kiriman default (bisa ditimpa).
  const body = (over = {}) => ({ name: 'Tim Alpha', difficulty: 'hard', side: 0, id: 'game-0001', moves: winGame, ...over });
  // [ID] Skor yang benar untuk game menang di Hard.
  const expected = scoreGame(winGame, { level: 'hard', humanSide: 0 }).total;

  // [ID] Kirim game sah dengan skor PALSU 999999.
  let r = await submitScore(redis, body({ score: 999999, total: 999999 }), '10.0.0.1', 1000);
  // [ID] Diterima.
  check('server: finished legal game accepted', r.status === 200, JSON.stringify(r.body));
  // [ID] Skor palsu diabaikan; total dihitung server dari langkah.
  check('server: forged score ignored, total comes from the replay', r.body.score?.total === expected && r.body.team?.total === expected, `${r.body.team?.total} vs ${expected}`);

  // Swap one human move for a jump that is not legal in that position.
  // [ID] Ganti satu langkah pemain dengan lompatan yang tidak sah di posisi itu.
  // [ID] Salin daftar langkah.
  const tampered = winGame.map((m) => ({ ...m }));
  // [ID] Posisi sebelum langkah ke-3.
  const before = createState();
  // [ID] Mainkan 2 langkah pertama.
  for (let i = 0; i < 2; i++) applyMove(before, tampered[i]);
  // [ID] Lompatan legal di posisi itu.
  const legal = legalJumps(before);
  // [ID] Pilih kotak yang bukan lompatan legal.
  tampered[2].jump = [...Array(49).keys()].find((x) => !legal.includes(x) && x !== before.pos[before.turn]);
  // [ID] Kirim.
  r = await submitScore(redis, body({ id: 'game-tamper1', moves: tampered }), '10.0.0.2');
  // [ID] Harus ditolak: illegal-move.
  check('server: tampered move log rejected', r.status === 400 && r.body.error === 'illegal-move', JSON.stringify(r.body));
  // [ID] Tambah langkah setelah game selesai.
  r = await submitScore(redis, body({ id: 'game-tamper2', moves: [...winGame, winGame[0]] }), '10.0.0.2');
  // [ID] Ditolak.
  check('server: move after the game ended rejected', r.status === 400 && r.body.error === 'illegal-move');
  // [ID] Game belum selesai (langkah terakhir dibuang).
  r = await submitScore(redis, body({ id: 'game-unfinished', moves: winGame.slice(0, -1) }), '10.0.0.2');
  // [ID] Ditolak.
  check('server: unfinished game rejected', r.status === 400 && r.body.error === 'unfinished');
  // [ID] Level tidak dikenal.
  r = await submitScore(redis, body({ id: 'game-badlevel', difficulty: 'godlike' }), '10.0.0.2');
  // [ID] Ditolak.
  check('server: unknown difficulty rejected', r.status === 400 && r.body.error === 'bad-difficulty');
  // [ID] Nama yang kosong setelah dibersihkan.
  r = await submitScore(redis, body({ id: 'game-badname', name: '<>' }), '10.0.0.2');
  // [ID] Ditolak.
  check('server: empty-after-cleaning name rejected', r.status === 400 && r.body.error === 'bad-name');
  // [ID] Langkah dengan tipe data salah.
  r = await submitScore(redis, body({ id: 'game-badmoves', moves: [{ jump: '3', trap: 1 }] }), '10.0.0.2');
  // [ID] Ditolak.
  check('server: malformed moves rejected', r.status === 400 && r.body.error === 'bad-moves');

  // [ID] Kiriman kedua dari IP yang sama dalam 10 detik.
  r = await submitScore(redis, body({ id: 'game-0002' }), '10.0.0.1');
  // [ID] 429.
  check('server: second submission within 10 s from the same IP rate-limited', r.status === 429);
  // [ID] Game yang sama dikirim lagi dari IP lain.
  r = await submitScore(redis, body(), '10.0.0.3');
  // [ID] 409.
  check('server: same game id submitted twice rejected', r.status === 409);

  // Same team in another case adds up; ties on total and wins go to the earlier team.
  // [ID] Nama sama dengan huruf berbeda dijumlahkan; total dan menang seri → yang lebih dulu di atas.
  // [ID] "tim alpha" (huruf kecil) = tim yang sama dengan "Tim Alpha".
  await submitScore(redis, body({ id: 'game-0003', name: 'tim alpha', moves: lossGame }), '10.0.0.4');
  // [ID] Tim "Tie Late" mengirim di waktu 9000.
  await submitScore(redis, body({ id: 'game-0004', name: 'Tie Late', moves: lossGame }), '10.0.0.5', 9000);
  // [ID] Tim "Tie Early" mengirim di waktu 5000 (lebih awal).
  await submitScore(redis, body({ id: 'game-0005', name: 'Tie Early', moves: lossGame }), '10.0.0.6', 5000);
  // [ID] Baca leaderboard.
  const lb = (await readLeaderboard(redis)).body.teams;
  // [ID] Skor game kalah di Hard.
  const loss = scoreGame(lossGame, { level: 'hard', humanSide: 0 }).total;
  // [ID] Data Tim Alpha.
  const alpha = lb.find((x) => x.key === 'tim alpha');
  // [ID] Total dijumlahkan, 2 game, 1 menang, nama tetap dari kiriman pertama.
  check('leaderboard: totals accumulate per team, case-insensitive', alpha?.total === expected + loss && alpha.games === 2 && alpha.wins === 1 && alpha.name === 'Tim Alpha', JSON.stringify(alpha));
  // [ID] Urut dari total terbesar.
  check('leaderboard: sorted by total', lb.every((x, i) => i === 0 || lb[i - 1].total >= x.total));
  // [ID] Seri: yang mengirim lebih awal di atas.
  check('leaderboard: tie broken by earlier first submission', lb.findIndex((x) => x.name === 'Tie Early') < lb.findIndex((x) => x.name === 'Tie Late'));
  // [ID] Peringkat 1, 2, 3, ...
  check('leaderboard: ranks are 1..n', lb.every((x, i) => x.rank === i + 1));
  // [ID] Tampilkan leaderboard tes.
  console.log('   ' + lb.map((x) => `#${x.rank} ${x.name} ${x.total} (${x.wins}/${x.games})`).join(' · '));

  // Admin point values.
  // [ID] Nilai poin dari admin.
  // [ID] Default sah.
  check('rules: defaults are valid', JSON.stringify(defaultRules()) === JSON.stringify(normalizeRules(SCORING)));
  // [ID] Nilai contoh dari admin.
  const custom = { move: 7, win: 500, multiplier: { easy: 1, medium: 1.5, hard: 2.25, expert: 5 } };
  // [ID] Diterima.
  check('rules: valid custom values accepted', !!normalizeRules(custom));
  // Values saved before the trap and speed bonuses were removed still load.
  // [ID] Nilai lama yang masih berisi bonus jebakan/cepat tetap bisa dibaca (field lama diabaikan).
  check('rules: old saved values with extra fields still load', normalizeRules({ ...custom, trapBonus: 5, speedBase: 100, speedPerMove: 5 })?.move === 7);
  // [ID] Nilai-nilai tidak sah yang harus ditolak:
  for (const [what, bad] of [
    // [ID] poin negatif,
    ['negative points', { ...custom, move: -1 }],
    // [ID] poin pecahan,
    ['fractional points', { ...custom, win: 1.5 }],
    // [ID] poin berupa teks,
    ['points as a string', { ...custom, move: '10' }],
    // [ID] field hilang,
    ['missing field', { ...custom, win: undefined }],
    // [ID] level hilang,
    ['missing level', { ...custom, multiplier: { easy: 1, medium: 2, hard: 3 } }],
    // [ID] pengali di atas 100,
    ['multiplier over the limit', { ...custom, multiplier: { ...custom.multiplier, expert: 101 } }],
    // [ID] pengali dengan 3 desimal.
    ['multiplier with 3 decimals', { ...custom, multiplier: { ...custom.multiplier, easy: 1.234 } }],
  ]) check(`rules: ${what} rejected`, normalizeRules(bad) === null);
  // [ID] Nilai level Medium dengan nilai contoh.
  const lv = levelValues(normalizeRules(custom), 'medium');
  // [ID] 7 x 1,5 = 10,5 → 11; 500 x 1,5 = 750.
  check('rules: level values round to whole points', lv.move === 11 && lv.win === 750, JSON.stringify(lv));
  // [ID] Skor game menang di Hard dengan nilai contoh.
  const cs = scoreGame(winGame, { level: 'hard', humanSide: 0, rules: custom });
  // [ID] Poin mengikuti nilai contoh.
  check('rules: custom values change the score', cs.movePoints === cs.humanMoves * Math.round(7 * 2.25) && cs.winPoints === Math.round(500 * 2.25));

  // [ID] Kunci admin untuk tes.
  const ADMIN = 'test-admin-key-123';
  // [ID] Tanpa kunci.
  r = await updateRules(redis, { rules: custom }, '', ADMIN, '10.0.2.1');
  // [ID] 401.
  check('admin: missing key -> 401', r.status === 401);
  // [ID] Kunci salah.
  r = await updateRules(redis, { rules: custom }, 'wrong', ADMIN, '10.0.2.1');
  // [ID] 401.
  check('admin: wrong key -> 401', r.status === 401);
  // [ID] ADMIN_KEY tidak diset.
  r = await updateRules(redis, { rules: custom }, ADMIN, undefined, '10.0.2.1');
  // [ID] 503.
  check('admin: no ADMIN_KEY set -> 503', r.status === 503);
  // [ID] Nilai tidak sah dengan kunci benar.
  r = await updateRules(redis, { rules: { ...custom, move: -5 } }, ADMIN, ADMIN, '10.0.2.1');
  // [ID] 400.
  check('admin: invalid values -> 400', r.status === 400 && r.body.error === 'bad-rules');
  // [ID] Nilai poin tidak berubah setelah percobaan gagal.
  check('admin: rules unchanged after rejected attempts', JSON.stringify(await getRules(redis)) === JSON.stringify(defaultRules()));
  // [ID] Kunci benar, nilai sah.
  r = await updateRules(redis, { rules: custom }, ADMIN, ADMIN, '10.0.2.1');
  // [ID] Tersimpan.
  check('admin: correct key saves', r.status === 200 && JSON.stringify(await getRules(redis)) === JSON.stringify(normalizeRules(custom)));
  // [ID] Kirim game baru setelah nilai diubah.
  r = await submitScore(redis, body({ id: 'game-custom1', name: 'Tim Custom' }), '10.0.2.2');
  // [ID] Skor yang diharapkan dengan nilai baru.
  const customExpected = scoreGame(winGame, { level: 'hard', humanSide: 0, rules: custom }).total;
  // [ID] Server memakai nilai baru.
  check('admin: new submissions use the saved values', r.status === 200 && r.body.score.total === customExpected && customExpected !== expected, `${r.body.score?.total} vs ${customExpected}`);
  // [ID] Kembalikan default.
  r = await updateRules(redis, { reset: true }, ADMIN, ADMIN, '10.0.2.1');
  // [ID] Kembali ke default.
  check('admin: reset restores the defaults', r.status === 200 && JSON.stringify(r.body.rules) === JSON.stringify(defaultRules()));
  // [ID] 10 kali kunci salah dari satu IP.
  for (let i = 0; i < 10; i++) await updateRules(redis, { check: true }, 'guess' + i, ADMIN, '10.0.2.9');
  // [ID] Lalu kunci benar dari IP yang sama.
  r = await updateRules(redis, { check: true }, ADMIN, ADMIN, '10.0.2.9');
  // [ID] Tetap terkunci (429).
  check('admin: locked out after 10 wrong keys, even with the right one', r.status === 429 && r.body.error === 'locked');

  // The real handlers, with req/res stubs shaped like Vercel's Node helpers.
  // [ID] Uji file handler asli, dengan req/res tiruan yang bentuknya seperti di Vercel.
  const call = async (handler, req) => {
    // [ID] res tiruan:
    const res = {
      // [ID] status code, header, isi jawaban,
      code: 0, headers: {}, body: null,
      // [ID] simpan header,
      setHeader(k, v) { this.headers[k] = v; },
      // [ID] simpan status code (berantai),
      status(c) { this.code = c; return this; },
      // [ID] simpan isi JSON.
      json(b) { this.body = b; return this; },
    };
    // [ID] Jalankan handler.
    await handler(req, res);
    // [ID] Kembalikan res yang sudah terisi.
    return res;
  };
  // [ID] Pasang Redis tiruan.
  setRedis(redis);
  // [ID] Muat handler /api/score.
  const { default: scoreHandler } = await import('../api/score.js');
  // [ID] Muat handler /api/leaderboard.
  const { default: lbHandler } = await import('../api/leaderboard.js');
  // [ID] GET /api/leaderboard.
  let res = await call(lbHandler, { method: 'GET', headers: {} });
  // [ID] 200 dan isinya sama dengan data.
  check('GET /api/leaderboard returns the teams', res.code === 200 && res.body.teams.length === (await readLeaderboard(redis)).body.teams.length && res.body.teams.length > 0);
  // [ID] GET ke /api/score (salah metode).
  res = await call(scoreHandler, { method: 'GET', headers: {} });
  // [ID] 405.
  check('GET /api/score -> 405', res.code === 405);
  // [ID] Buat permintaan POST dengan IP tertentu (isi berupa teks JSON).
  const post = (b, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.9.9.9` }, body: JSON.stringify(b) });
  // [ID] POST sah.
  res = await call(scoreHandler, post(body({ id: 'game-handler1', name: 'Tim Gamma' }), '10.0.1.1'));
  // [ID] 200.
  check('POST /api/score (string body) -> 200', res.code === 200 && res.body.team.total === expected, JSON.stringify(res.body));
  // [ID] POST kedua dari IP yang sama.
  res = await call(scoreHandler, post(body({ id: 'game-handler2', name: 'Tim Gamma' }), '10.0.1.1'));
  // [ID] 429 (IP diambil dari bagian pertama x-forwarded-for).
  check('POST /api/score rate-limited by the first forwarded IP', res.code === 429);
  // [ID] POST dengan JSON rusak.
  res = await call(scoreHandler, { method: 'POST', headers: {}, body: '{not json' });
  // [ID] 400.
  check('POST /api/score bad JSON -> 400', res.code === 400);
  // [ID] Muat handler /api/config.
  const { default: configHandler } = await import('../api/config.js');
  // [ID] GET /api/config.
  res = await call(configHandler, { method: 'GET', headers: {} });
  // [ID] Mengembalikan nilai poin default.
  check('GET /api/config returns the point values', res.code === 200 && JSON.stringify(res.body.rules) === JSON.stringify(defaultRules()));
  // [ID] Set ADMIN_KEY sementara.
  process.env.ADMIN_KEY = ADMIN;
  // [ID] POST tanpa kunci.
  res = await call(configHandler, { method: 'POST', headers: { 'x-forwarded-for': '10.0.3.1' }, body: JSON.stringify({ rules: custom }) });
  // [ID] 401.
  check('POST /api/config without a key -> 401', res.code === 401);
  // [ID] POST dengan kunci benar.
  res = await call(configHandler, { method: 'POST', headers: { authorization: `Bearer ${ADMIN}`, 'x-forwarded-for': '10.0.3.1' }, body: { rules: custom } });
  // [ID] 200 dan nilai tersimpan.
  check('POST /api/config with the key -> 200', res.code === 200 && res.body.rules.move === 7);
  // [ID] Hapus ADMIN_KEY sementara.
  delete process.env.ADMIN_KEY;
  // [ID] Lepas Redis (simulasi database belum diset).
  setRedis(null);
  // [ID] GET /api/leaderboard tanpa database.
  res = await call(lbHandler, { method: 'GET', headers: {} });
  // [ID] 503 not-configured.
  check('no Redis env vars -> 503 not-configured', res.code === 503 && res.body.error === 'not-configured');
}

// [ID] Ringkasan akhir: ALL PASSED atau FAILED dengan jumlahnya.
console.log(`\n${failures === 0 ? 'ALL PASSED' : 'FAILED'}: ${passes} passed, ${failures} failed\n`);
// [ID] Kode keluar 0 kalau semua lulus, 1 kalau ada yang gagal (berguna untuk CI).
process.exit(failures === 0 ? 0 : 1);
