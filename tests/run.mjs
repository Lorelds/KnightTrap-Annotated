// Knight Trap test runner. No framework: `node tests/run.mjs` (add --quick for 20 games per match-up).
// [ID] Semua pengujian Knight Trap (proposal Bab 2.2), tanpa framework. Jalankan: node tests/run.mjs (tambah --quick untuk 20 game per pasangan).
// [ID] Pengukur waktu presisi tinggi dari Node.js.
import { performance } from 'node:perf_hooks';
// [ID] Konstanta: kedalaman per level, batas AI, lama giliran, tenggang waktu host.
import { DIFFICULTY, AI as AICFG, TURN_SECONDS, TURN_GRACE_MS } from '../js/config.js';
// [ID] Fungsi aturan yang diuji.
import {
  // [ID] buat/salin state, lompatan legal, lompat, jebak, ganti giliran, langkah lengkap,
  createState, cloneState, legalJumps, applyJump, applyTrap, endTurn, applyMove,
  // [ID] validasi, pemenang, bisa bergerak, kotak terbuka, status kotak, serialisasi.
  validateMove, winner, canMove, isOpen, EMPTY, BURNED, TRAP, serialize, deserialize,
} from '../js/rules.js';
// [ID] Fungsi AI yang diuji: pencarian, pemain acak/greedy, evaluasi, pembuat langkah, pengurutan, unpack, bobot split, nilai menang.
import { search, randomMove, greedyMove, evaluate, generateMoves, orderMoves, unpack, SPLIT_WEIGHT, WIN } from '../js/ai.js';

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

  // Cannot land on burned or trap squares. The enemy's square is a legal jump: landing there eats it.
  // [ID] Tidak boleh mendarat di kotak terbakar atau jebakan. Kotak musuh boleh: mendarat di sana = makan.
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
  // [ID] Kotak musuh (e6) boleh dituju: mendarat di sana = makan.
  check('opponent square is a legal jump', j.includes(sq('e6')));
  // [ID] Tapi kotak musuh tidak boleh dijebak.
  check('opponent square is not open for a trap', !isOpen(u, sq('e6')));
  // [ID] Kotak terbuka tetap boleh.
  check('open squares still legal', j.includes(sq('f5')) && j.includes(sq('b5')));

  // Trap validation.
  // [ID] Langkah sah: lompat ke f3, jebak a1.
  check('valid move accepted', validateMove(u, { jump: sq('f3'), trap: sq('a1') }));
  // [ID] Jebakan di kotak terbakar ditolak.
  check('trap on burned rejected', !validateMove(u, { jump: sq('f3'), trap: sq('b3') }));
  // [ID] Jebakan di kotak knight musuh ditolak.
  check('trap on opponent rejected', !validateMove(u, { jump: sq('f3'), trap: sq('e6') }));
  // [ID] Jebakan di kotak tempat knight sendiri baru mendarat ditolak.
  check('trap on own new square rejected', !validateMove(u, { jump: sq('f3'), trap: sq('f3') }));
  // [ID] Jebakan di kotak asal (sudah terbakar) ditolak.
  check('trap on burned origin rejected', !validateMove(u, { jump: sq('f3'), trap: sq('d4') }));
  // [ID] Lompatan bukan huruf L ditolak.
  check('illegal jump rejected', !validateMove(u, { jump: sq('d5'), trap: sq('a1') }));
  // [ID] Tidak pasang jebakan padahal masih ada kotak terbuka: ditolak.
  check('missing trap rejected while squares are open', !validateMove(u, { jump: sq('f3'), trap: -1 }));
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

  // Eating: landing exactly on the enemy's square wins at once, with no trap.
  // [ID] Makan oleh Biru: P1 di a1, P2 di c2 (c2 bisa dicapai dari a1).
  const eatBlue = createState({ p1: sq('a1'), p2: sq('c2'), first: 0 });
  // [ID] Makan tanpa jebakan: sah.
  check('blue eats: no trap is valid', validateMove(eatBlue, { jump: sq('c2'), trap: -1 }));
  // [ID] Makan dengan jebakan: ditolak.
  check('blue eats: a real trap is rejected', !validateMove(eatBlue, { jump: sq('c2'), trap: sq('a7') }));
  // [ID] Mainkan langkah makan.
  applyMove(eatBlue, { jump: sq('c2'), trap: -1 });
  // [ID] Biru menang.
  check('blue eats: blue wins', winner(eatBlue) === 0);
  // [ID] Kedua knight sekarang di kotak yang sama.
  check('blue eats: both knights share the square', eatBlue.pos[0] === sq('c2') && eatBlue.pos[1] === sq('c2'));

  // [ID] Makan oleh Oranye: P1 di e6, P2 di g7, Oranye jalan duluan.
  const eatOrange = createState({ p1: sq('e6'), p2: sq('g7'), first: 1 });
  // [ID] Makan tanpa jebakan: sah.
  check('orange eats: no trap is valid', validateMove(eatOrange, { jump: sq('e6'), trap: -1 }));
  // [ID] Mainkan langkah makan.
  applyMove(eatOrange, { jump: sq('e6'), trap: -1 });
  // [ID] Oranye menang.
  check('orange eats: orange wins', winner(eatOrange) === 1);

  // Touching the enemy no longer eats it: a1 -> c2 lands next to c3, and the game goes on.
  // [ID] Bersebelahan dengan musuh: P1 di a1, P2 di c3.
  const near = createState({ p1: sq('a1'), p2: sq('c3'), first: 0 });
  // [ID] Lompat ke c2 (di sebelah musuh) tetap harus pasang jebakan.
  check('touching: a jump next to the enemy still needs a trap', !validateMove(near, { jump: sq('c2'), trap: -1 }));
  // [ID] Dengan jebakan: sah.
  check('touching: the trap is accepted', validateMove(near, { jump: sq('c2'), trap: sq('a7') }));
  // [ID] Mainkan.
  applyMove(near, { jump: sq('c2'), trap: sq('a7') });
  // [ID] Tidak ada pemenang, kedua knight di kotak berbeda.
  check('touching: no winner', winner(near) === null && near.pos[0] !== near.pos[1]);

  // A trap can never go on either knight, even when the enemy could eat there next turn.
  // [ID] Posisi uji: P1 di a1, P2 di d4.
  const occ = createState({ p1: sq('a1'), p2: sq('d4'), first: 0 });
  // [ID] Jebakan di kotak knight musuh ditolak.
  check('trap on the enemy knight rejected', !validateMove(occ, { jump: sq('b3'), trap: sq('d4') }));
  // [ID] Jebakan di kotak knight yang baru melompat ditolak.
  check('trap on the jumping knight rejected', !validateMove(occ, { jump: sq('b3'), trap: sq('b3') }));

  // Eating is a legal move, so a knight whose only jump eats is not stuck.
  // [ID] P1 di a1, P2 di c2.
  const only = createState({ p1: sq('a1'), p2: sq('c2'), first: 0 });
  // [ID] Bakar b3, jadi satu-satunya lompatan P1 adalah makan di c2.
  only.cells[sq('b3')] = BURNED;
  // [ID] P1 masih hidup (bisa bergerak) dan belum ada pemenang.
  check('only jump eats: the side to move is alive', canMove(only) && winner(only) === null);

  // [ID] Lompatan biasa (bukan makan) tanpa jebakan ditolak.
  check('no trap rejected when the jump does not eat', !validateMove(createState(), { jump: sq('b3'), trap: -1 }));

  // [ID] AI kedalaman 1 dengan kesempatan makan.
  const eatAi = search(createState({ p1: sq('a1'), p2: sq('c2'), first: 0 }), { depth: 1 });
  // [ID] AI harus makan di c2 tanpa jebakan, dengan skor WIN - 1.
  check('AI eats at depth 1', eatAi.move.trap === -1 && eatAi.move.jump === sq('c2') && eatAi.score === WIN - 1, JSON.stringify(eatAi.move));

  // Evaluation knows eating, with scores that match WIN - ply from the search.
  // [ID] Posisi: Biru (yang jalan) bisa makan Oranye.
  const canEat = createState({ p1: sq('a1'), p2: sq('c2'), first: 0 });
  // [ID] Dari sudut pandang Biru: WIN - 1; dari sudut pandang Oranye: -(WIN - 1).
  check('eval: side to move can eat, it wins on the next ply', evaluate(canEat, 0) === WIN - 1 && evaluate(canEat, 1) === -(WIN - 1));
  // [ID] Dengan ply = 3, skornya WIN - 4 (sama seperti hasil pencarian).
  check('eval: the score counts the ply', evaluate(canEat, 0, 3) === WIN - 4 && evaluate(canEat, 1, 3) === -(WIN - 4));
  // [ID] Posisi awal,
  const stuck = createState();
  // [ID] tutup b3,
  stuck.cells[sq('b3')] = TRAP;
  // [ID] tutup c2: Biru tidak bisa melompat.
  stuck.cells[sq('c2')] = BURNED;
  // [ID] Biru sudah kalah: -(WIN - 2) untuk Biru, WIN - 2 untuk Oranye (ply = 2).
  check('eval: side to move has no jump, it has lost', evaluate(stuck, 0, 2) === -(WIN - 2) && evaluate(stuck, 1, 2) === WIN - 2);
  // [ID] Kedua knight di c2, giliran Oranye: Oranye baru saja dimakan.
  const ate = createState({ p1: sq('c2'), p2: sq('c2'), first: 1 });
  // [ID] Oranye sudah kalah: -(WIN - 1) untuk Oranye, WIN - 1 untuk Biru.
  check('eval: side to move was eaten, it has lost', evaluate(ate, 1, 1) === -(WIN - 1) && evaluate(ate, 0, 1) === WIN - 1);

  // From a5 orange can reach b3 but not c2, so even depth 1 must take the safe jump.
  // [ID] P1 di a1, P2 di a5: Oranye bisa mencapai b3 tapi tidak c2.
  const safe = search(createState({ p1: sq('a1'), p2: sq('a5'), first: 0 }), { depth: 1 });
  // [ID] AI kedalaman 1 harus memilih c2 (aman), dan skornya bukan skor menang/kalah.
  check('AI at depth 1 avoids a square the enemy can eat', safe.move.jump === sq('c2') && Math.abs(safe.score) < WIN / 2, JSON.stringify(safe.move));
  // From d4 orange can reach both b3 and c2: depth 1 and depth 2 must both report the same forced loss.
  // [ID] P1 di a1, P2 di d4: Oranye bisa mencapai b3 dan c2.
  const doomed = createState({ p1: sq('a1'), p2: sq('d4'), first: 0 });
  // [ID] Cari dengan kedalaman 1.
  const d1 = search(doomed, { depth: 1 });
  // [ID] Cari dengan kedalaman 2.
  const d2 = search(doomed, { depth: 2 });
  // [ID] Keduanya harus melaporkan kekalahan pasti yang sama: -(WIN - 2).
  check('forced loss: depth 1 and 2 agree on the score', d1.score === -(WIN - 2) && d2.score === -(WIN - 2), `${d1.score} ${d2.score}`);

  // Move ordering puts the eating move first for both the maximizing and the minimizing side.
  // [ID] Untuk sisi yang memaksimalkan dan yang meminimalkan:
  for (const maximizing of [true, false]) {
    // [ID] posisi dengan kesempatan makan,
    const o = createState({ p1: sq('a1'), p2: sq('c2'), first: 0 });
    // [ID] buat semua langkah Biru,
    const ms = generateMoves(o, 0);
    // [ID] urutkan,
    orderMoves(o, ms, maximizing ? 0 : 1, maximizing);
    // [ID] langkah pertama harus langkah makan (c2, tanpa jebakan).
    check(`move ordering: eating first (maximizing ${maximizing})`, unpack(ms[0]).jump === sq('c2') && unpack(ms[0]).trap === -1);
  }

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
      // [ID] Langkah acak, tapi berhenti kalau game sudah selesai (misalnya karena makan).
      const m = winner(s) === null ? randomMove(s, rng) : null;
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
  // [ID] Pesan yang dikirim host.
  const sent = [];
  // [ID] Fungsi kosong.
  const noop = () => {};
  // [ID] Papan tiruan (render tidak melakukan apa-apa).
  const board = { render: noop };
  // [ID] UI tiruan: semua fungsi kosong, termasuk timer dan timeUp.
  const ui = { update: noop, thinking: noop, stats: noop, log: noop, over: noop, timer: noop, timeUp: noop };
  // [ID] Game sebagai host online:
  const g = new Game({
    // [ID] papan, ui, mode online, peran host, jaringan tiruan yang mencatat pesan,
    board, ui, mode: 'online', role: 'host', net: { send: (m) => sent.push(m) },
    // [ID] host = manusia di sisi 0, tamu = remote di sisi 1.
    players: [{ kind: 'human', name: 'host' }, { kind: 'remote', name: 'guest' }],
  });
  // [ID] Mulai.
  g.start(createState());
  // [ID] Tunggu antrian pesan selesai diproses (plus jeda tampilan).
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

  // The guest eats the host: no trap, the host accepts it, and the game ends.
  // [ID] Kosongkan catatan pesan.
  sent.length = 0;
  // [ID] Game host baru untuk uji makan:
  const e = new Game({
    // [ID] papan, ui, mode online, peran host, jaringan tiruan yang mencatat pesan,
    board, ui, mode: 'online', role: 'host', net: { send: (m) => sent.push(m) },
    // [ID] host = manusia di sisi 0, tamu = remote di sisi 1.
    players: [{ kind: 'human', name: 'host' }, { kind: 'remote', name: 'guest' }],
  });
  // [ID] Mulai dari P1 di e6, P2 di g7, giliran tamu (Oranye).
  e.start(createState({ p1: sq('e6'), p2: sq('g7'), first: 1 }));
  // [ID] Tamu memakan host di e6, tanpa jebakan.
  e.onNetMessage({ t: 'move', jump: sq('e6'), trap: -1 });
  // [ID] Tunggu pesan diproses.
  await e.netQueue;
  // [ID] Game selesai, tamu (sisi 1) menang, dan state dikirim ke tamu.
  check('guest eating move accepted, game over and state sent', e.phase === 'over' && e.winner === 1 && sent[0]?.t === 'state', JSON.stringify(sent[0]?.t));
  // [ID] Selesai.
  e.dispose();
}

// ---------------------------------------------------------------------------
// [ID] ---- Bagian 6: Penghitung waktu giliran (Game asli, waktu dibuat pendek) ----
console.log('\n6. Turn timer (real Game class, stubbed board and network, short time limit)');
{
  // [ID] Muat kelas Game.
  const { Game } = await import('../js/game.js');
  // [ID] Papan tiruan.
  const board = { render: () => {} };
  // [ID] Tunggu ms milidetik.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // [ID] Tunggu sampai cond benar, maksimal ms milidetik.
  const waitFor = async (cond, ms = 4000) => {
    // [ID] Waktu mulai.
    const t0 = performance.now();
    // [ID] Cek setiap 10 ms.
    while (!cond() && performance.now() - t0 < ms) await sleep(10);
    // [ID] Hasil akhir: benar atau tidak.
    return cond();
  };
  // [ID] Buat UI tiruan yang mencatat tampilan waktu.
  const makeUi = () => {
    // [ID] Fungsi kosong, plus daftar angka waktu yang ditampilkan dan jumlah pesan waktu habis.
    const u = { update() {}, thinking() {}, stats() {}, log() {}, over() {}, shown: [], timeUps: 0 };
    // [ID] Catat setiap angka waktu.
    u.timer = (s) => u.shown.push(s);
    // [ID] Hitung pesan waktu habis.
    u.timeUp = () => { u.timeUps++; };
    // [ID] Kembalikan UI tiruan.
    return u;
  };
  // [ID] Dua pemain manusia (mode lokal).
  const humans = [{ kind: 'human', name: 'p1' }, { kind: 'human', name: 'p2' }];
  // [ID] Buat game lokal dengan batas waktu turnMs.
  const local = (ui, turnMs) => new Game({ board, ui, mode: 'local', players: humans, turnMs });

  // The default comes from the config, and the display starts there.
  // [ID] Uji: batas default.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game lokal tanpa turnMs (pakai default).
    const g = new Game({ board, ui, mode: 'local', players: humans });
    // [ID] Mulai.
    g.start(createState());
    // [ID] Batasnya TURN_SECONDS x 1000, dan tampilan awal menunjukkan TURN_SECONDS.
    check('timer: the default limit is TURN_SECONDS', g.turnMs === TURN_SECONDS * 1000 && ui.shown.at(-1) === TURN_SECONDS, String(ui.shown.at(-1)));
    // [ID] Selesai.
    g.dispose();
  }

  // Jump phase: a whole legal move is played and the turn passes.
  // [ID] Uji: waktu habis di fase lompat.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Batas 100 ms.
    const g = local(ui, 100);
    // [ID] Mulai.
    g.start(createState());
    // [ID] Tunggu sampai ada langkah tercatat.
    await waitFor(() => g.history.length >= 1);
    // [ID] Langkah pertama.
    const h = g.history[0];
    // [ID] Giliran sekarang.
    const turn = g.state.turn;
    // [ID] Selesai.
    g.dispose();
    // [ID] Langkah acak itu harus sah.
    check('time out while jumping: a legal move is played', !!h && validateMove(createState(), { jump: h.jump, trap: h.trap }), JSON.stringify(h));
    // [ID] Giliran pindah ke P2 dan pesan waktu habis muncul sekali.
    check('time out while jumping: the turn passes', turn === 1 && ui.timeUps === 1, `${turn} ${ui.timeUps}`);
  }

  // Trap phase: the player's own jump stays and a trap goes on an open square.
  // [ID] Uji: waktu habis di fase jebakan.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Batas 100 ms.
    const g = local(ui, 100);
    // [ID] Mulai.
    g.start(createState());
    // [ID] Pemain sudah lompat ke c2.
    g.handleCell(sq('c2'));
    // [ID] Tunggu sampai langkah tercatat.
    await waitFor(() => g.history.length >= 1);
    // [ID] Langkah pertama.
    const h = g.history[0];
    // [ID] Posisi knight P1.
    const pos = g.state.pos[0];
    // [ID] Isi kotak jebakannya.
    const cell = h ? g.state.cells[h.trap] : -1;
    // [ID] Selesai.
    g.dispose();
    // [ID] Lompatan pemain (c2) tetap dipakai.
    check('time out while placing a trap: the jump is kept', !!h && h.jump === sq('c2') && pos === sq('c2'), JSON.stringify(h));
    // [ID] Jebakan acak terpasang di kotak terbuka (bukan c2, bukan g7).
    check('time out while placing a trap: a trap is placed', cell === TRAP && h.trap !== sq('c2') && h.trap !== sq('g7'), JSON.stringify(h));
  }

  // Undoing a jump keeps the time already used.
  // [ID] Uji: batal lompat tidak mengembalikan waktu.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Batas 400 ms.
    const g = local(ui, 400);
    // [ID] Waktu mulai.
    const t0 = performance.now();
    // [ID] Mulai.
    g.start(createState());
    // [ID] Simpan waktu habis.
    const deadline = g.deadline;
    // [ID] Tunggu 300 ms.
    await sleep(300);
    // [ID] Lompat ke c2,
    g.handleCell(sq('c2'));
    // [ID] lalu batalkan.
    g.undoJump();
    // [ID] Kembali ke fase lompat dan waktu habis tidak berubah.
    check('undo jump: the deadline does not move', g.phase === 'jump' && g.deadline === deadline);
    // [ID] Tunggu sampai langkah acak dimainkan.
    await waitFor(() => g.history.length >= 1);
    // [ID] Lama dari mulai sampai langkah acak.
    const took = performance.now() - t0;
    // [ID] Selesai.
    g.dispose();
    // [ID] Harus tetap sekitar 400 ms (di bawah 650 ms), bukan diulang dari nol.
    check('undo jump: time still runs out on schedule', took < 650, `${took.toFixed(0)} ms`);
  }

  // The AI has no timer, and the human's clock starts after its move.
  // [ID] Uji: AI tidak memakai penghitung waktu.
  {
    // [ID] Simpan console.warn asli.
    const warn = console.warn;
    // [ID] Sembunyikan peringatan (Node tidak punya module worker, jadi AI jalan di thread utama).
    console.warn = () => {}; // Node has no module workers, so the AI client says it uses the main thread
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game lawan AI:
    const g = new Game({
      // [ID] Mode AI, batas giliran 50 ms, AI kedalaman 1.
      board, ui, mode: 'ai', turnMs: 50, ai: { depth: 1, prune: true },
      // [ID] AI di sisi 0 (jalan duluan), manusia di sisi 1.
      players: [{ kind: 'ai', name: 'ai' }, { kind: 'human', name: 'me' }],
    });
    // [ID] Mulai.
    g.start(createState());
    // [ID] Giliran AI: tidak ada penghitung dan tampilan waktu kosong.
    check('AI turn: no clock and a blank timer', g.phase === 'ai' && g.clock === null && ui.shown.at(-1) === null);
    // [ID] Tunggu 200 ms (lebih lama dari 50 ms).
    await sleep(200);
    // [ID] Waktu habis tidak terjadi pada giliran AI.
    check('AI turn: its limit is not the turn limit', ui.timeUps === 0 && g.state.moves === 0 && g.clock === null);
    // [ID] Tunggu sampai giliran manusia.
    await waitFor(() => g.phase === 'jump');
    // [ID] AI sudah melangkah dan penghitung manusia mulai berjalan.
    check('after the AI moves, the human clock runs', g.state.moves === 1 && g.clock !== null);
    // [ID] Selesai.
    g.dispose();
    // [ID] Kembalikan console.warn.
    console.warn = warn;
  }

  // The clock stops when the game ends and when it is disposed.
  // [ID] Uji: penghitung berhenti saat game selesai dan saat game ditinggalkan.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Batas 100 ms.
    const g = local(ui, 100);
    // [ID] Posisi di mana Biru bisa makan di c2.
    g.start(createState({ p1: sq('a1'), p2: sq('c2'), first: 0 }));
    // [ID] Biru makan: game selesai.
    g.handleCell(sq('c2'));
    // [ID] Penghitung berhenti dan tampilan waktu kosong.
    check('game over: the clock stops', g.phase === 'over' && g.clock === null && ui.shown.at(-1) === null);
    // [ID] Tunggu 250 ms.
    await sleep(250);
    // [ID] Tidak ada langkah lagi dan tidak ada waktu habis.
    check('game over: nothing moves afterwards', g.state.moves === 1 && ui.timeUps === 0);
    // [ID] Selesai.
    g.dispose();

    // [ID] UI tiruan kedua.
    const ui2 = makeUi();
    // [ID] Game lokal kedua.
    const d = local(ui2, 100);
    // [ID] Mulai,
    d.start(createState());
    // [ID] langsung ditinggalkan.
    d.dispose();
    // [ID] Tunggu 250 ms.
    await sleep(250);
    // [ID] Penghitung berhenti dan tidak ada langkah.
    check('dispose: the clock stops and nothing moves', d.clock === null && d.state.moves === 0 && ui2.timeUps === 0 && ui2.shown.at(-1) === null);
  }

  // [ID] Posisi awal di mana tamu (Oranye) jalan duluan.
  const guestFirst = () => createState({ p1: sq('a1'), p2: sq('g7'), first: 1 });
  // [ID] Buat game host online dengan batas 100 ms.
  const hostGame = (ui, sent) => new Game({
    // [ID] papan, ui, mode online, peran host, batas 100 ms, jaringan tiruan yang mencatat pesan,
    board, ui, mode: 'online', role: 'host', turnMs: 100, net: { send: (m) => sent.push(m) },
    // [ID] host = manusia di sisi 0, tamu = remote di sisi 1.
    players: [{ kind: 'human', name: 'host' }, { kind: 'remote', name: 'guest' }],
  });

  // The host waits out the grace period, then plays for a quiet guest and sends the result.
  // [ID] Uji: tamu diam terlalu lama.
  {
    // [ID] Pesan yang dikirim host.
    const sent = [];
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game host.
    const g = hostGame(ui, sent);
    // [ID] Mulai, giliran tamu.
    g.start(guestFirst());
    // [ID] Tunggu hampir sampai akhir tenggang waktu.
    await sleep(100 + TURN_GRACE_MS - 300);
    // [ID] Host masih menunggu: belum ada langkah dan belum ada pesan.
    check('quiet guest: the host waits through the grace period', g.state.moves === 0 && sent.length === 0, `${g.state.moves} ${sent.length}`);
    // [ID] Tunggu sampai host mengirim pesan.
    await waitFor(() => sent.length > 0);
    // [ID] Pesan pertama.
    const m = sent[0];
    // [ID] Host memainkan langkah sah untuk tamu dan mengirim state.
    check('quiet guest: the host plays a legal move and sends the state', m?.t === 'state' && m.last.side === 1 && validateMove(guestFirst(), { jump: m.last.jump, trap: m.last.trap }), JSON.stringify(m?.last));
    // [ID] Host tidak menampilkan pesan waktu habis (itu bukan gilirannya).
    check('quiet guest: no time-out message on the host', ui.timeUps === 0);

    // A move that arrives after the host already played for the guest is refused.
    // [ID] Kosongkan catatan pesan.
    sent.length = 0;
    // [ID] Langkah tamu yang terlambat datang.
    g.onNetMessage({ t: 'move', jump: sq('e6'), trap: sq('a7') });
    // [ID] Tunggu diproses.
    await g.netQueue;
    // [ID] Ditolak, dan host mengirim state yang benar.
    check('quiet guest: a late move is rejected with the true state', sent[0]?.t === 'reject');
    // [ID] Selesai.
    g.dispose();
  }

  // A guest move inside the grace period is accepted, and the host does not play for that turn.
  // [ID] Uji: langkah tamu masuk selama tenggang waktu.
  {
    // [ID] Pesan yang dikirim host.
    const sent = [];
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game host.
    const g = hostGame(ui, sent);
    // [ID] Waktu mulai.
    const t0 = performance.now();
    // [ID] Mulai, giliran tamu.
    g.start(guestFirst());
    // [ID] Tunggu 300 ms (sudah lewat batas 100 ms, masih dalam tenggang).
    await sleep(300);
    // [ID] Tamu mengirim langkah.
    g.onNetMessage({ t: 'move', jump: sq('e6'), trap: sq('a7') });
    // [ID] Tunggu diproses.
    await g.netQueue;
    // [ID] Langkah tamu diterima dan dikirim balik.
    check('guest move in the grace period: accepted', sent[0]?.t === 'state' && sent[0].last.jump === sq('e6') && g.state.pos[1] === sq('e6'), JSON.stringify(sent[0]?.last));
    // [ID] Tunggu sampai tenggang waktu pasti lewat.
    await sleep(Math.max(0, 100 + TURN_GRACE_MS + 150 - (performance.now() - t0)));
    // [ID] Langkah pertama di riwayat.
    const first = g.history[0];
    // [ID] Jumlah langkah tamu.
    const guestMoves = g.history.filter((h) => h.side === 1).length;
    // [ID] Selesai.
    g.dispose();
    // [ID] Langkah cadangan host tidak ikut jalan: hanya ada satu langkah tamu.
    check('guest move in the grace period: the backup does not fire', first?.jump === sq('e6') && guestMoves === 1, JSON.stringify(g.history));
  }

  // The guest's own device acts when its time runs out, and sends a normal move.
  // [ID] Uji: waktu habis di perangkat tamu.
  {
    // [ID] Pesan yang dikirim host.
    const sent = [];
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game sebagai tamu online:
    const g = new Game({
      // [ID] papan, ui, mode online, peran tamu, batas 100 ms, jaringan tiruan.
      board, ui, mode: 'online', role: 'guest', turnMs: 100, net: { send: (m) => sent.push(m) },
      // [ID] host = remote di sisi 0, tamu = manusia di sisi 1.
      players: [{ kind: 'remote', name: 'host' }, { kind: 'human', name: 'guest' }],
    });
    // [ID] Mulai, giliran tamu.
    g.start(guestFirst());
    // [ID] Tunggu sampai tamu mengirim pesan.
    await waitFor(() => sent.length > 0);
    // [ID] Pesan pertama.
    const m = sent[0];
    // [ID] Fase sekarang.
    const phase = g.phase;
    // [ID] Selesai.
    g.dispose();
    // [ID] Perangkat tamu mengirim langkah sah biasa.
    check('guest time out: its device sends a legal move', m?.t === 'move' && validateMove(guestFirst(), { jump: m.jump, trap: m.trap }), JSON.stringify(m));
    // [ID] Lalu menunggu host, dan pesan waktu habis muncul sekali.
    check('guest time out: its device waits for the host next', phase === 'remote' && ui.timeUps === 1, phase);
  }

  // A guest in the middle of its turn takes the host's result when the host played for it.
  // [ID] Uji: tamu sedang di tengah giliran saat host sudah memainkan langkah untuknya.
  {
    // [ID] UI tiruan.
    const ui = makeUi();
    // [ID] Game sebagai tamu online:
    const g = new Game({
      // [ID] papan, ui, mode online, peran tamu, batas 5 detik, jaringan tiruan.
      board, ui, mode: 'online', role: 'guest', turnMs: 5000, net: { send: () => {} },
      // [ID] host = remote di sisi 0, tamu = manusia di sisi 1.
      players: [{ kind: 'remote', name: 'host' }, { kind: 'human', name: 'guest' }],
    });
    // [ID] Mulai, giliran tamu.
    g.start(guestFirst());
    // [ID] Tamu sudah lompat ke e6 (belum pasang jebakan).
    g.handleCell(sq('e6'));
    // [ID] State versi host:
    const forced = guestFirst();
    // [ID] host memainkan f5 + jebak a7 untuk tamu.
    applyMove(forced, { jump: sq('f5'), trap: sq('a7') });
    // [ID] Pesan state dari host datang.
    g.onNetMessage({ t: 'state', state: serialize(forced), last: { side: 1, from: sq('g7'), jump: sq('f5'), trap: sq('a7') } });
    // [ID] Tunggu diproses.
    await g.netQueue;
    // [ID] Tamu memakai hasil host: knight di f5, lompatan tertunda dibuang, dan menunggu host.
    check('guest mid-turn: it takes the host result', g.state.pos[1] === sq('f5') && g.pendingFrom === null && g.phase === 'remote' && g.clock !== null);
    // [ID] Selesai.
    g.dispose();
  }
}

// [ID] Ringkasan akhir: ALL PASSED atau FAILED dengan jumlahnya.
console.log(`\n${failures === 0 ? 'ALL PASSED' : 'FAILED'}: ${passes} passed, ${failures} failed\n`);
// [ID] Kode keluar 0 kalau semua lulus, 1 kalau ada yang gagal (berguna untuk CI).
process.exit(failures === 0 ? 0 : 1);
