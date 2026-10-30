// Knight Trap AI: Minimax with optional Alpha-Beta Pruning.
// Evaluation uses only BFS (territory) and DFS (flood fill split check),
// as the course limits the AI to these four algorithms.
// [ID] Otak AI: Minimax dengan Alpha-Beta Pruning (bisa dimatikan). Evaluasi hanya memakai BFS dan DFS,
// [ID] karena tugas membatasi AI ke empat algoritma ini.

// [ID] SIZE = 49 kotak; CFG = pengaturan AI (batas waktu, kandidat jebakan, pengurutan).
import { SIZE, AI as CFG } from './config.js';
// [ID] Ambil fungsi dan konstanta aturan dari rules.js.
import { NEIGHBORS, EMPTY, BURNED, TRAP, cloneState, legalJumps, isOpen, hasOpenSquare, applyJump } from './rules.js';

// [ID] Skor untuk menang: 1 juta, jauh lebih besar dari skor evaluasi biasa.
export const WIN = 1_000_000;
// A split board is close to decided, so its score must outrank any territory score (max ~53).
// [ID] Bobot papan terbelah: 100. Harus lebih besar dari skor wilayah maksimum (sekitar 53).
export const SPLIT_WEIGHT = 100;

// [ID] Penanda unik untuk menghentikan pencarian saat waktu habis (dilempar sebagai exception).
const ABORT = Symbol('abort');
// [ID] Fungsi jam: performance.now() kalau ada (lebih presisi), kalau tidak Date.now().
const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Scratch buffers reused by every evaluation (the search is single-threaded and not re-entrant).
// [ID] Array kerja yang dibuat sekali lalu dipakai ulang di setiap evaluasi (lebih cepat daripada membuat array baru).
// [ID] Jarak BFS dari knight P1 ke setiap kotak.
const distA = new Int8Array(SIZE);
// [ID] Jarak BFS dari knight P2 ke setiap kotak.
const distB = new Int8Array(SIZE);
// [ID] Antrian untuk BFS.
const queue = new Int8Array(SIZE);
// [ID] Tanda DFS untuk area P1.
const markA = new Uint8Array(SIZE);
// [ID] Tanda DFS untuk area P2.
const markB = new Uint8Array(SIZE);
// [ID] Tumpukan (stack) untuk DFS.
const stack = new Int8Array(SIZE * 8);
// [ID] Cap "sudah dimasukkan" untuk kandidat jebakan.
const stamp = new Int32Array(SIZE);
// [ID] Nomor cap yang sedang dipakai; dinaikkan setiap kali, jadi stamp tidak perlu dikosongkan.
let stampId = 0;

// [ID] Versi cepat isOpen yang langsung menerima cells dan pos.
function open(cells, pos, sq) {
  // [ID] Terbuka = kosong dan tidak ditempati knight mana pun.
  return cells[sq] === EMPTY && sq !== pos[0] && sq !== pos[1];
}

// [ID] Mobilitas = jumlah lompatan legal pemain "side".
function mobility(cells, pos, side) {
  // [ID] Penghitung.
  let n = 0;
  // [ID] Hitung tetangga L yang terbuka.
  for (const j of NEIGHBORS[pos[side]]) if (open(cells, pos, j)) n++;
  // [ID] Jumlah lompatan legal.
  return n;
}

// BFS: fewest knight jumps from `start` to every square. -1 = unreachable.
// [ID] BFS: hitung jumlah lompatan minimum dari knight "side" ke setiap kotak. Hasil ditulis ke "dist"; -1 = tidak terjangkau.
export function bfs(cells, pos, side, dist) {
  // [ID] Awalnya semua kotak belum terjangkau.
  dist.fill(-1);
  // [ID] Kotak awal = posisi knight.
  const start = pos[side];
  // [ID] Jarak ke diri sendiri = 0.
  dist[start] = 0;
  // [ID] head = posisi yang akan diambil dari antrian.
  let head = 0;
  // [ID] tail = posisi untuk memasukkan ke antrian.
  let tail = 0;
  // [ID] Masukkan kotak awal ke antrian.
  queue[tail++] = start;
  // [ID] Ulangi selama antrian belum kosong.
  while (head < tail) {
    // [ID] Ambil kotak terdepan (FIFO).
    const cur = queue[head++];
    // [ID] Tetangganya berjarak satu lebih jauh.
    const d = dist[cur] + 1;
    // [ID] Periksa semua tetangga L.
    for (const n of NEIGHBORS[cur]) {
      // [ID] Hanya kotak yang belum dikunjungi dan masih terbuka.
      if (dist[n] < 0 && open(cells, pos, n)) {
        // [ID] Catat jaraknya (pasti terpendek karena BFS menyebar per lapisan).
        dist[n] = d;
        // [ID] Masukkan ke antrian supaya tetangganya juga diperiksa.
        queue[tail++] = n;
      }
    }
  }
}

// DFS flood fill: marks every square reachable from the knight (1), start square = 2.
// Returns the region size, start excluded.
// [ID] DFS flood fill: tandai semua kotak yang bisa dicapai knight (tanda 1), kotak awal diberi tanda 2.
// [ID] Mengembalikan luas area (kotak awal tidak dihitung).
export function dfs(cells, pos, side, mark) {
  // [ID] Hapus semua tanda.
  mark.fill(0);
  // [ID] Kotak awal = posisi knight.
  const start = pos[side];
  // [ID] Tanda khusus 2 untuk kotak awal.
  mark[start] = 2;
  // [ID] top = jumlah isi tumpukan.
  let top = 0;
  // [ID] Luas area yang ditemukan.
  let size = 0;
  // [ID] Push kotak awal ke tumpukan.
  stack[top++] = start;
  // [ID] Ulangi selama tumpukan belum kosong.
  while (top > 0) {
    // [ID] Pop: ambil kotak teratas (LIFO, ciri DFS).
    const cur = stack[--top];
    // [ID] Periksa semua tetangga L.
    for (const n of NEIGHBORS[cur]) {
      // [ID] Kalau belum ditandai dan masih terbuka:
      if (mark[n] === 0 && open(cells, pos, n)) {
        // [ID] Tandai sebagai bagian area.
        mark[n] = 1;
        // [ID] Tambah luas area.
        size++;
        // [ID] Push supaya tetangganya ikut ditelusuri.
        stack[top++] = n;
      }
    }
  }
  // [ID] Luas area knight ini.
  return size;
}

// Static evaluation from `me`'s point of view. Positive = good for `me`.
// [ID] Fungsi evaluasi: nilai posisi dari sudut pandang "me". Positif = menguntungkan "me".
export function evaluate(s, me) {
  // [ID] Ambil kotak, posisi knight, dan giliran dari state.
  const { cells, pos, turn } = s;
  // [ID] DFS dari knight P1: luas area P1, tanda di markA.
  const areaA = dfs(cells, pos, 0, markA);
  // [ID] DFS dari knight P2: luas area P2, tanda di markB.
  const areaB = dfs(cells, pos, 1, markB);
  // [ID] Anggap papan terbelah sampai terbukti sebaliknya.
  let split = true;
  // [ID] Periksa semua kotak.
  for (let i = 0; i < SIZE; i++) {
    // [ID] Kalau ada kotak yang bisa dicapai kedua knight:
    if (markA[i] === 1 && markB[i] === 1) {
      // [ID] berarti area mereka masih tersambung, papan belum terbelah.
      split = false;
      // [ID] Cukup satu kotak bersama; berhenti.
      break;
    }
  }
  // [ID] Skor dari sudut pandang P1.
  let score;
  // [ID] Kasus 1: papan sudah terbelah.
  if (split) {
    // [ID] Skor = selisih luas area x 100. Yang areanya lebih luas bisa melompat lebih lama.
    score = (areaA - areaB) * SPLIT_WEIGHT;
  // [ID] Kasus 2: papan belum terbelah, pakai wilayah BFS.
  } else {
    // [ID] Jarak dari knight P1 ke semua kotak.
    bfs(cells, pos, 0, distA);
    // [ID] Jarak dari knight P2 ke semua kotak.
    bfs(cells, pos, 1, distB);
    // [ID] Selisih wilayah (+ untuk P1, - untuk P2).
    let terr = 0;
    // [ID] Periksa setiap kotak.
    for (let i = 0; i < SIZE; i++) {
      // [ID] Lewati kotak yang tidak terbuka.
      if (!open(cells, pos, i)) continue;
      // [ID] Jarak P1 ke kotak ini.
      const a = distA[i];
      // [ID] Jarak P2 ke kotak ini.
      const b = distB[i];
      // [ID] Tidak terjangkau siapa pun: abaikan.
      if (a < 0 && b < 0) continue;
      // [ID] Hanya P1 yang menjangkau, atau P1 lebih dekat: wilayah P1.
      if (b < 0 || (a >= 0 && a < b)) terr++;
      // [ID] Hanya P2 yang menjangkau, atau P2 lebih dekat: wilayah P2.
      else if (a < 0 || b < a) terr--;
      // [ID] Jarak sama (seri): milik pemain yang jalan berikutnya.
      else terr += turn === 0 ? 1 : -1; // tie goes to the side to move
    }
    // [ID] Skor = selisih wilayah + 0,5 x selisih mobilitas (pemecah seri).
    score = terr + 0.5 * (mobility(cells, pos, 0) - mobility(cells, pos, 1));
  }
  // [ID] Skor dihitung untuk P1; kalau "me" adalah P2, balik tandanya.
  return me === 0 ? score : -score;
}

// Trap candidates after the mover has jumped: the opponent's jump targets first,
// then squares two jumps away, capped at maxTrapCandidates.
// [ID] Kandidat kotak jebakan setelah pemain melompat: kotak tujuan lompatan lawan dulu,
// [ID] lalu kotak dua lompatan dari lawan, maksimal 12 kotak. Hasil ditulis ke "out".
function trapCandidates(s, opp, out) {
  // [ID] Ambil kotak dan posisi knight.
  const { cells, pos } = s;
  // [ID] Batas jumlah kandidat (12).
  const max = CFG.maxTrapCandidates;
  // [ID] Kosongkan daftar hasil.
  out.length = 0;
  // [ID] Cap baru, supaya tanda dari panggilan sebelumnya otomatis tidak berlaku.
  stampId++;
  // [ID] Ring 1: kotak tujuan lompatan lawan.
  const ring1 = NEIGHBORS[pos[opp]];
  // [ID] Masukkan semua kotak ring 1 yang terbuka.
  for (const n of ring1) {
    // [ID] Hanya yang terbuka.
    if (open(cells, pos, n)) {
      // [ID] Tandai sudah dimasukkan.
      stamp[n] = stampId;
      // [ID] Masukkan ke kandidat.
      out.push(n);
    }
  }
  // [ID] Ring 2: tetangga dari kotak ring 1 (dua lompatan dari lawan).
  for (const n of ring1) {
    // [ID] Berhenti kalau sudah 12.
    if (out.length >= max) break;
    // [ID] Hanya lewat kotak ring 1 yang terbuka.
    if (!open(cells, pos, n)) continue;
    // [ID] Periksa tetangga L dari kotak itu.
    for (const m of NEIGHBORS[n]) {
      // [ID] Berhenti kalau sudah 12.
      if (out.length >= max) break;
      // [ID] Belum dimasukkan dan masih terbuka:
      if (stamp[m] !== stampId && open(cells, pos, m)) {
        // [ID] Tandai sudah dimasukkan.
        stamp[m] = stampId;
        // [ID] Masukkan ke kandidat.
        out.push(m);
      }
    }
  }
  // The opponent is boxed in already: any open square is a legal trap.
  // [ID] Kalau lawan sudah terkurung (tidak ada kandidat di sekitarnya), pakai kotak terbuka mana saja.
  if (out.length === 0) {
    // [ID] Ambil kotak terbuka dari indeks 0 ke atas, sampai 12.
    for (let i = 0; i < SIZE && out.length < max; i++) if (open(cells, pos, i)) out.push(i);
  }
  // [ID] Daftar kandidat jebakan.
  return out;
}

// A move is packed as jump | (trap + 1) << 6, so trap -1 (no square left) packs to 0.
// [ID] Satu langkah dikemas jadi satu angka: 6 bit bawah = kotak lompatan, bit di atasnya = kotak jebakan + 1.
// [ID] Kemas {jump, trap} menjadi satu angka (trap -1 menjadi 0).
export const pack = (jump, trap) => jump | ((trap + 1) << 6);
// [ID] Buka kembali: "& 63" ambil 6 bit bawah, ">> 6" geser untuk ambil jebakan lalu dikurangi 1.
export const unpack = (m) => ({ jump: m & 63, trap: (m >> 6) - 1 });

// [ID] Array kerja untuk kandidat jebakan, dipakai ulang.
const trapBuf = [];
// [ID] Buat semua langkah (lompatan x kandidat jebakan) untuk pemain "side".
export function generateMoves(s, side, out = []) {
  // [ID] Ambil kotak dan posisi knight.
  const { cells, pos } = s;
  // [ID] Kotak asal knight.
  const from = pos[side];
  // [ID] Lawan (0 jadi 1, 1 jadi 0).
  const opp = side ^ 1;
  // [ID] Untuk setiap tetangga L dari kotak asal:
  for (const j of NEIGHBORS[from]) {
    // [ID] Lewati kalau tidak terbuka.
    if (!open(cells, pos, j)) continue;
    // [ID] Sementara: bakar kotak asal (seperti setelah melompat).
    cells[from] = BURNED;
    // [ID] Sementara: pindahkan knight ke j.
    pos[side] = j;
    // [ID] Hitung kandidat jebakan dari posisi setelah lompat.
    trapCandidates(s, opp, trapBuf);
    // [ID] Tidak ada kotak tersisa: langkah tanpa jebakan (trap -1).
    if (trapBuf.length === 0) out.push(pack(j, -1));
    // [ID] Selain itu: satu langkah untuk setiap kandidat jebakan.
    else for (const t of trapBuf) out.push(pack(j, t));
    // [ID] Kembalikan knight ke kotak asal.
    pos[side] = from;
    // [ID] Kembalikan kotak asal menjadi kosong.
    cells[from] = EMPTY;
  }
  // [ID] Semua langkah dalam bentuk angka terkemas.
  return out;
}

// [ID] Terapkan langkah terkemas m langsung ke state (tanpa menyalin). Mengembalikan kotak asal.
function make(s, m) {
  // [ID] Siapa yang jalan.
  const side = s.turn;
  // [ID] Kotak asal.
  const from = s.pos[side];
  // [ID] Buka kotak jebakan dari angka terkemas.
  const t = (m >> 6) - 1;
  // [ID] Bakar kotak asal.
  s.cells[from] = BURNED;
  // [ID] Pindahkan knight ke kotak lompatan (6 bit bawah).
  s.pos[side] = m & 63;
  // [ID] Pasang jebakan kalau ada.
  if (t >= 0) s.cells[t] = TRAP;
  // [ID] Ganti giliran.
  s.turn ^= 1;
  // [ID] Kotak asal dibutuhkan untuk membatalkan langkah.
  return from;
}

// [ID] Batalkan langkah m (kebalikan make, dengan urutan terbalik).
function unmake(s, m, from) {
  // [ID] Kembalikan giliran.
  s.turn ^= 1;
  // [ID] Kotak jebakan.
  const t = (m >> 6) - 1;
  // [ID] Hapus jebakan.
  if (t >= 0) s.cells[t] = EMPTY;
  // [ID] Kembalikan knight ke kotak asal.
  s.pos[s.turn] = from;
  // [ID] Kotak asal tidak jadi terbakar.
  s.cells[from] = EMPTY;
}

// [ID] Apakah pemain "side" punya lompatan legal? (versi cepat untuk pencarian)
function hasJump(s, side) {
  // [ID] Ya kalau ada tetangga L yang terbuka.
  for (const n of NEIGHBORS[s.pos[side]]) if (open(s.cells, s.pos, n)) return true;
  // [ID] Tidak ada.
  return false;
}

// Best static score first, from the point of view of the side choosing.
// [ID] Pengurutan langkah: langkah dengan nilai evaluasi statis terbaik diperiksa lebih dulu, supaya Alpha-Beta memangkas lebih banyak.
function orderMoves(s, moves, aiSide, maximizing) {
  // [ID] Beri nilai pada setiap langkah.
  const scored = moves.map((m) => {
    // [ID] Coba langkahnya.
    const from = make(s, m);
    // [ID] Nilai posisi hasilnya dari sudut pandang AI.
    const v = evaluate(s, aiSide);
    // [ID] Batalkan langkahnya.
    unmake(s, m, from);
    // [ID] Simpan langkah beserta nilainya.
    return { m, v };
  });
  // [ID] MAX: urutkan dari nilai terbesar. MIN: dari nilai terkecil.
  scored.sort(maximizing ? (a, b) => b.v - a.v : (a, b) => a.v - b.v);
  // [ID] Tulis kembali urutan baru ke array moves.
  for (let i = 0; i < moves.length; i++) moves[i] = scored[i].m;
}

/**
 * Pick a move for the side to move in `state` (that side is MAX).
 * opts: depth, prune (Alpha-Beta on/off), timeLimitMs, now.
 * Returns null when the side to move has no legal jump.
 */
// [ID] Fungsi utama AI: cari langkah terbaik untuk pemain yang sedang jalan (dia menjadi MAX).
// [ID] opts: depth (kedalaman), prune (Alpha-Beta ON/OFF), timeLimitMs (batas waktu), now (fungsi jam).
export function search(state, opts = {}) {
  // [ID] Kedalaman minimal 1, default 2.
  const depth = Math.max(1, opts.depth ?? 2);
  // [ID] Alpha-Beta aktif kecuali dimatikan.
  const prune = opts.prune ?? true;
  // [ID] Batas waktu, default 4000 ms.
  const timeLimitMs = opts.timeLimitMs ?? CFG.timeLimitMs;
  // [ID] Fungsi jam.
  const now = opts.now ?? defaultNow;
  // [ID] Salin state supaya posisi asli (di layar) tidak berubah selama AI mencoba langkah.
  const s = cloneState(state);
  // [ID] AI = pemain yang sedang jalan.
  const aiSide = s.turn;
  // [ID] Waktu mulai.
  const t0 = now();
  // [ID] Waktu harus berhenti.
  const deadline = t0 + timeLimitMs;
  // [ID] Jumlah posisi yang diperiksa (mulai dari akar = 1).
  let nodes = 1;
  // [ID] Jumlah pemangkasan (cutoff).
  let cutoffs = 0;

  // [ID] Fungsi rekursif Minimax/Alpha-Beta. d = sisa kedalaman, alpha/beta = batas, ply = jarak dari akar.
  function ab(d, alpha, beta, ply) {
    // [ID] Hitung posisi ini.
    nodes++;
    // [ID] Setiap 256 posisi, cek jam; kalau lewat batas waktu, hentikan dengan ABORT.
    if ((nodes & 255) === 0 && now() > deadline) throw ABORT;
    // [ID] Siapa yang jalan di posisi ini.
    const side = s.turn;
    // [ID] Posisi akhir: yang jalan tidak bisa melompat. Kalau itu AI: kalah (-WIN), kalau lawan: menang (+WIN).
    // [ID] Dikurangi ply supaya menang lebih cepat bernilai lebih tinggi.
    if (!hasJump(s, side)) return side === aiSide ? -(WIN - ply) : WIN - ply;
    // [ID] Kedalaman habis: nilai posisi dengan fungsi evaluasi (BFS + DFS).
    if (d === 0) return evaluate(s, aiSide);
    // [ID] Buat semua langkah yang mungkin.
    const moves = generateMoves(s, side);
    // [ID] Simpul MAX kalau giliran AI, MIN kalau giliran lawan.
    const isMax = side === aiSide;
    // [ID] Urutkan langkah kalau sisa kedalaman >= 2.
    if (d >= CFG.orderMinDepth) orderMoves(s, moves, aiSide, isMax);
    // [ID] Simpul MAX (giliran AI):
    if (isMax) {
      // [ID] Nilai terbaik, mulai dari minus tak hingga.
      let best = -Infinity;
      // [ID] Coba setiap langkah.
      for (const m of moves) {
        // [ID] Terapkan langkah.
        const from = make(s, m);
        // [ID] Nilai posisi hasilnya (rekursi, kedalaman berkurang 1).
        const v = ab(d - 1, alpha, beta, ply + 1);
        // [ID] Batalkan langkah.
        unmake(s, m, from);
        // [ID] Simpan nilai terbesar.
        if (v > best) best = v;
        // [ID] Perbarui alpha (nilai terbaik yang dijamin untuk MAX).
        if (best > alpha) alpha = best;
        // [ID] Cutoff: kalau beta <= alpha, sisa langkah tidak bisa mengubah keputusan.
        if (prune && beta <= alpha) {
          // [ID] Hitung pemangkasan.
          cutoffs++;
          // [ID] Lewati sisa langkah.
          break;
        }
      }
      // [ID] Nilai simpul MAX.
      return best;
    }
    // [ID] Simpul MIN (giliran lawan): nilai terbaik mulai dari plus tak hingga.
    let best = Infinity;
    // [ID] Coba setiap langkah.
    for (const m of moves) {
      // [ID] Terapkan langkah.
      const from = make(s, m);
      // [ID] Nilai posisi hasilnya.
      const v = ab(d - 1, alpha, beta, ply + 1);
      // [ID] Batalkan langkah.
      unmake(s, m, from);
      // [ID] Simpan nilai terkecil (lawan memilih yang terburuk untuk AI).
      if (v < best) best = v;
      // [ID] Perbarui beta (nilai terbaik yang dijamin untuk MIN).
      if (best < beta) beta = best;
      // [ID] Cutoff kalau beta <= alpha.
      if (prune && beta <= alpha) {
        // [ID] Hitung pemangkasan.
        cutoffs++;
        // [ID] Lewati sisa langkah.
        break;
      }
    }
    // [ID] Nilai simpul MIN.
    return best;
  }

  // [ID] AI tidak bisa melompat sama sekali: tidak ada langkah.
  if (!hasJump(s, aiSide)) return null;
  // [ID] Semua langkah di akar.
  const moves = generateMoves(s, aiSide);
  // [ID] Urutkan langkah akar kalau kedalaman >= 2.
  if (depth >= CFG.orderMinDepth) orderMoves(s, moves, aiSide, true);

  // [ID] Nilai terbaik di akar.
  let best = -Infinity;
  // [ID] Langkah terbaik, default langkah pertama (dipakai kalau waktu habis sangat cepat).
  let bestMove = moves[0];
  // [ID] Alpha di akar.
  let alpha = -Infinity;
  // [ID] Jumlah langkah akar yang selesai dihitung.
  let completed = 0;
  // [ID] Apakah waktu habis.
  let timedOut = false;
  // [ID] try/catch untuk menangkap ABORT kalau waktu habis.
  try {
    // [ID] Coba setiap langkah akar.
    for (const m of moves) {
      // [ID] Terapkan langkah.
      const from = make(s, m);
      // [ID] Nilainya, dengan alpha saat ini dan beta tak hingga (tidak ada MIN di atas akar).
      const v = ab(depth - 1, alpha, Infinity, 1);
      // [ID] Batalkan langkah.
      unmake(s, m, from);
      // [ID] Satu langkah akar selesai.
      completed++;
      // [ID] Kalau lebih baik dari yang terbaik sejauh ini:
      if (v > best) {
        // [ID] simpan nilainya
        best = v;
        // [ID] dan langkahnya.
        bestMove = m;
      }
      // [ID] Naikkan alpha (hanya kalau Alpha-Beta aktif).
      if (prune && best > alpha) alpha = best;
    }
  // [ID] Tangkap exception.
  } catch (e) {
    // [ID] Kalau bukan ABORT, itu error sungguhan: lempar lagi.
    if (e !== ABORT) throw e;
    // [ID] Waktu habis: pakai langkah terbaik yang sudah selesai.
    timedOut = true;
  }

  // [ID] Hasil pencarian (sesuai "Expected Output" proposal).
  return {
    // [ID] Langkah terpilih {jump, trap}.
    move: unpack(bestMove),
    // [ID] Skor langkah itu (null kalau belum ada satu pun langkah yang selesai).
    score: completed > 0 ? best : null,
    // [ID] Kedalaman.
    depth,
    // [ID] Alpha-Beta aktif atau tidak.
    prune,
    // [ID] Jumlah posisi diperiksa.
    nodes,
    // [ID] Jumlah pemangkasan.
    cutoffs,
    // [ID] Lama berpikir (ms).
    timeMs: now() - t0,
    // [ID] Apakah berhenti karena batas waktu.
    timedOut,
    // [ID] Jumlah langkah di akar.
    rootMoves: moves.length,
    // [ID] Jumlah langkah akar yang selesai dihitung.
    completedRootMoves: completed,
  };
}

// ---- Baseline players used by the tests -------------------------------------
// [ID] ---- Pemain pembanding (baseline) untuk pengujian ----

// [ID] Daftar semua kotak terbuka.
function openSquares(s) {
  // [ID] Tempat hasil.
  const out = [];
  // [ID] Periksa 49 kotak, simpan yang terbuka.
  for (let i = 0; i < SIZE; i++) if (isOpen(s, i)) out.push(i);
  // [ID] Daftar kotak terbuka.
  return out;
}

// [ID] Ambil satu elemen acak dari array memakai generator angka acak rng.
function pickRandom(arr, rng) {
  // [ID] rng() memberi angka 0..1; dikali panjang array lalu dibulatkan ke bawah = indeks acak.
  return arr[Math.floor(rng() * arr.length)];
}

// [ID] Pemain acak: lompatan acak, jebakan acak.
export function randomMove(state, rng = Math.random) {
  // [ID] Semua lompatan legal.
  const jumps = legalJumps(state);
  // [ID] Tidak ada lompatan: tidak ada langkah.
  if (jumps.length === 0) return null;
  // [ID] Pilih lompatan acak.
  const jump = pickRandom(jumps, rng);
  // [ID] Salin state.
  const t = cloneState(state);
  // [ID] Terapkan lompatan di salinan.
  applyJump(t, jump);
  // [ID] Kotak terbuka setelah lompat.
  const opens = openSquares(t);
  // [ID] Jebakan acak, atau -1 kalau tidak ada kotak tersisa.
  return { jump, trap: opens.length ? pickRandom(opens, rng) : -1 };
}

// Greedy: jump to the square with the most follow-up jumps; trap the opponent's
// best follow-up square the same way (random open square if the opponent has none).
// [ID] Pemain greedy: lompat ke kotak dengan lompatan lanjutan terbanyak; jebak kotak tujuan lawan yang paling berharga.
export function greedyMove(state, rng = Math.random) {
  // [ID] Siapa yang jalan.
  const side = state.turn;
  // [ID] Lompatan legal.
  const jumps = legalJumps(state);
  // [ID] Tidak ada lompatan: tidak ada langkah.
  if (jumps.length === 0) return null;
  // [ID] Fungsi bantu: pilih elemen dengan skor tertinggi; kalau seri, pilih acak di antaranya.
  const bestBy = (list, scoreFn) => {
    // [ID] Skor terbaik sejauh ini.
    let best = -1;
    // [ID] Elemen-elemen dengan skor terbaik.
    let picks = [];
    // [ID] Periksa setiap elemen.
    for (const x of list) {
      // [ID] Hitung skornya.
      const v = scoreFn(x);
      // [ID] Lebih baik: mulai daftar baru.
      if (v > best) {
        // [ID] Skor terbaik baru.
        best = v;
        // [ID] Daftar hanya berisi elemen ini.
        picks = [x];
      // [ID] Sama baiknya: tambahkan ke daftar.
      } else if (v === best) picks.push(x);
    }
    // [ID] Pilih acak dari yang terbaik.
    return pickRandom(picks, rng);
  };
  // [ID] Pilih lompatan dengan lompatan lanjutan terbanyak.
  const jump = bestBy(jumps, (j) => {
    // [ID] Salin state.
    const t = cloneState(state);
    // [ID] Coba lompatan j.
    applyJump(t, j);
    // [ID] Skor = jumlah lompatan legal dari kotak baru.
    return legalJumps(t, side).length;
  });
  // [ID] Salin state lagi untuk lompatan terpilih.
  const t = cloneState(state);
  // [ID] Terapkan lompatan terpilih.
  applyJump(t, jump);
  // [ID] Tidak ada kotak tersisa: tanpa jebakan.
  if (!hasOpenSquare(t)) return { jump, trap: -1 };
  // [ID] Kotak tujuan lompatan lawan.
  const oppJumps = legalJumps(t, side ^ 1);
  // [ID] Kotak jebakan yang akan dipilih.
  let trap;
  // [ID] Kalau lawan masih punya lompatan:
  if (oppJumps.length) {
    // [ID] jebak kotak tujuan lawan yang punya lompatan lanjutan terbanyak (paling berharga bagi lawan).
    trap = bestBy(oppJumps, (sq) => {
      // [ID] Penghitung.
      let n = 0;
      // [ID] Hitung tetangga terbuka dari kotak itu.
      for (const k of NEIGHBORS[sq]) if (isOpen(t, k) && k !== sq) n++;
      // [ID] Skor kotak.
      return n;
    });
  // [ID] Lawan sudah tidak punya lompatan:
  } else {
    // [ID] jebak kotak terbuka acak.
    trap = pickRandom(openSquares(t), rng);
  }
  // [ID] Langkah greedy.
  return { jump, trap };
}
