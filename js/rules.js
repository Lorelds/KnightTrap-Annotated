// Knight Trap rules. Single source of truth for the UI, the AI and the online host.
// No DOM access here so the module also runs in a Web Worker and in Node.
// [ID] File aturan game. Satu-satunya tempat aturan ditulis; dipakai tampilan, AI, mode online, dan server.
// [ID] Tidak menyentuh DOM (halaman), jadi bisa jalan di Web Worker dan di Node.js (untuk tes).

// [ID] Ambil ukuran papan (N = 7), jumlah kotak (SIZE = 49), dan posisi awal dari config.js.
import { N, SIZE, START } from './config.js';

// [ID] Status kotak 0 = kosong (masih bisa dipakai).
export const EMPTY = 0;
// [ID] Status kotak 1 = terbakar (kotak yang baru ditinggalkan knight).
export const BURNED = 1;
// [ID] Status kotak 2 = jebakan (kotak yang dihancurkan pemain).
export const TRAP = 2;

// [ID] Delapan arah gerak knight (huruf L) sebagai pasangan [perubahan baris, perubahan kolom].
const JUMPS = [
  // [ID] Dua ke atas lalu satu ke kiri/kanan, dan satu ke atas lalu dua ke kiri/kanan.
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  // [ID] Satu ke bawah lalu dua ke kiri/kanan, dan dua ke bawah lalu satu ke kiri/kanan.
  [1, -2], [1, 2], [2, -1], [2, 1],
];

// Knight neighbor lists, computed once.
// [ID] Untuk setiap kotak (0..48), buat daftar kotak yang bisa dicapai knight dengan satu lompatan. Dihitung sekali saat file dimuat.
export const NEIGHBORS = Array.from({ length: SIZE }, (_, i) => {
  // [ID] Ubah indeks menjadi nomor baris (0 = baris paling atas).
  const r = Math.floor(i / N);
  // [ID] Ubah indeks menjadi nomor kolom (0 = kolom a).
  const c = i % N;
  // [ID] Tempat menampung kotak tetangga.
  const out = [];
  // [ID] Coba kedelapan arah L.
  for (const [dr, dc] of JUMPS) {
    // [ID] Baris tujuan.
    const rr = r + dr;
    // [ID] Kolom tujuan.
    const cc = c + dc;
    // [ID] Simpan hanya kalau tujuan masih di dalam papan; ubah kembali ke indeks (baris * 7 + kolom).
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
  }
  // [ID] Daftar tetangga untuk kotak i.
  return out;
});

// [ID] Membuat posisi awal game.
export function createState(start = START) {
  // [ID] State game adalah objek dengan 4 bagian.
  return {
    // [ID] 49 kotak, semuanya 0 (EMPTY). Int8Array = array angka kecil yang cepat.
    cells: new Int8Array(SIZE),
    // [ID] Posisi knight: pos[0] milik P1, pos[1] milik P2.
    pos: [start.p1, start.p2],
    // [ID] Giliran siapa (0 = P1, 1 = P2). ?? 0 artinya pakai 0 kalau tidak diisi.
    turn: start.first ?? 0,
    // [ID] Jumlah giliran yang sudah dimainkan.
    moves: 0,
  };
}

// [ID] Membuat salinan state supaya bisa dicoba-coba tanpa mengubah aslinya.
export function cloneState(s) {
  // [ID] Salin array kotak dan posisi; turn dan moves berupa angka jadi langsung disalin.
  return { cells: new Int8Array(s.cells), pos: [s.pos[0], s.pos[1]], turn: s.turn, moves: s.moves };
}

// Plain-object form for postMessage / PeerJS.
// [ID] Ubah state ke objek biasa (Int8Array jadi array biasa) supaya bisa dikirim ke worker atau lewat jaringan.
export function serialize(s) {
  // [ID] Array.from mengubah Int8Array menjadi array JavaScript biasa.
  return { cells: Array.from(s.cells), pos: [s.pos[0], s.pos[1]], turn: s.turn, moves: s.moves };
}

// [ID] Kebalikan serialize: ubah objek biasa kembali menjadi state, sambil memeriksa datanya.
export function deserialize(o) {
  // [ID] Tolak data rusak: harus ada, cells harus array berisi 49, pos harus array.
  if (!o || !Array.isArray(o.cells) || o.cells.length !== SIZE || !Array.isArray(o.pos)) {
    // [ID] Lempar error supaya pemanggil tahu datanya tidak valid.
    throw new Error('bad state');
  }
  // [ID] Bangun state. "| 0" memaksa angka bulat, "& 1" memaksa turn hanya 0 atau 1.
  return { cells: Int8Array.from(o.cells), pos: [o.pos[0] | 0, o.pos[1] | 0], turn: o.turn & 1, moves: o.moves | 0 };
}

// [ID] Apakah kotak sq terbuka? Terbuka = kosong DAN tidak ditempati knight mana pun.
export function isOpen(s, sq) {
  // [ID] Aturan (d): tidak boleh mendarat di kotak terbakar, jebakan, atau kotak knight.
  return s.cells[sq] === EMPTY && sq !== s.pos[0] && sq !== s.pos[1];
}

// [ID] Daftar lompatan legal untuk pemain "side" (default: yang sedang jalan).
export function legalJumps(s, side = s.turn) {
  // [ID] Tempat menampung hasil.
  const out = [];
  // [ID] Untuk setiap tetangga L dari posisi knight, simpan yang terbuka.
  for (const n of NEIGHBORS[s.pos[side]]) if (isOpen(s, n)) out.push(n);
  // [ID] Kembalikan daftar indeks kotak tujuan.
  return out;
}

// [ID] Apakah pemain "side" punya minimal satu lompatan legal? (lebih cepat dari legalJumps karena berhenti di yang pertama)
export function canMove(s, side = s.turn) {
  // [ID] Begitu ketemu satu tetangga terbuka, langsung jawab "ya".
  for (const n of NEIGHBORS[s.pos[side]]) if (isOpen(s, n)) return true;
  // [ID] Tidak ada satu pun: tidak bisa bergerak.
  return false;
}

// [ID] Apakah masih ada kotak terbuka di seluruh papan? (untuk tahu apakah jebakan masih bisa dipasang)
export function hasOpenSquare(s) {
  // [ID] Periksa ke-49 kotak; berhenti di kotak terbuka pertama.
  for (let i = 0; i < SIZE; i++) if (isOpen(s, i)) return true;
  // [ID] Semua kotak tertutup.
  return false;
}

// Step 1 of a turn: jump and burn the square left behind. Returns the origin square.
// [ID] Langkah 1 giliran: lompat ke "to" dan bakar kotak asal. Mengembalikan kotak asal.
export function applyJump(s, to) {
  // [ID] Siapa yang sedang jalan.
  const side = s.turn;
  // [ID] Kotak asal knight.
  const from = s.pos[side];
  // [ID] Aturan (b): kotak yang ditinggalkan terbakar.
  s.cells[from] = BURNED;
  // [ID] Pindahkan knight ke kotak tujuan.
  s.pos[side] = to;
  // [ID] Kembalikan kotak asal (dipakai untuk animasi dan untuk membatalkan lompatan).
  return from;
}

// Step 2 of a turn: destroy one open square.
// [ID] Langkah 2 giliran: aturan (c), hancurkan satu kotak sebagai jebakan.
export function applyTrap(s, sq) {
  // [ID] sq = -1 berarti tidak ada kotak tersisa untuk dijebak, jadi dilewati.
  if (sq >= 0) s.cells[sq] = TRAP;
}

// [ID] Akhiri giliran.
export function endTurn(s) {
  // [ID] Ganti giliran: XOR dengan 1 mengubah 0 jadi 1 dan 1 jadi 0.
  s.turn ^= 1;
  // [ID] Tambah penghitung giliran.
  s.moves++;
}

// Validate a full move {jump, trap} for the side to move without changing s.
// [ID] Periksa apakah langkah lengkap {jump, trap} sah, tanpa mengubah state asli.
export function validateMove(s, move) {
  // [ID] Tolak kalau langkah kosong atau jump/trap bukan bilangan bulat (data aneh dari jaringan).
  if (!move || !Number.isInteger(move.jump) || !Number.isInteger(move.trap)) return false;
  // [ID] Tolak kalau game sudah selesai.
  if (winner(s) !== null) return false;
  // [ID] Tolak kalau lompatan bukan lompatan legal.
  if (!legalJumps(s).includes(move.jump)) return false;
  // [ID] Buat salinan supaya state asli tidak berubah.
  const t = cloneState(s);
  // [ID] Terapkan lompatan di salinan (kotak asal ikut terbakar).
  applyJump(t, move.jump);
  // [ID] Kalau tidak ada kotak terbuka tersisa, jebakan wajib -1 (dilewati).
  if (!hasOpenSquare(t)) return move.trap === -1;
  // [ID] Selain itu, jebakan harus di dalam papan (0..48) dan di kotak yang terbuka.
  return move.trap >= 0 && move.trap < SIZE && isOpen(t, move.trap);
}

// [ID] Jalankan satu langkah lengkap: lompat, jebak, ganti giliran.
export function applyMove(s, move) {
  // [ID] Lompat dan bakar kotak asal; simpan kotak asal.
  const from = applyJump(s, move.jump);
  // [ID] Pasang jebakan.
  applyTrap(s, move.trap);
  // [ID] Ganti giliran.
  endTurn(s);
  // [ID] Kembalikan kotak asal.
  return from;
}

// The side to move loses if it has no legal jump. Returns the winning side, or null.
// [ID] Aturan (e): yang sedang jalan kalah kalau tidak punya lompatan legal. Mengembalikan pemenang (0/1) atau null kalau belum selesai.
export function winner(s) {
  // [ID] Kalau masih bisa bergerak: null (belum ada pemenang). Kalau tidak: pemenangnya pemain lain (turn ^ 1).
  return canMove(s, s.turn) ? null : s.turn ^ 1;
}

// [ID] Ubah indeks kotak menjadi nama catur, misalnya 42 → "a1".
export function squareName(sq) {
  // [ID] Huruf kolom dari sisa bagi 7; angka baris = 7 dikurangi nomor baris dari atas.
  return 'abcdefg'[sq % N] + (N - Math.floor(sq / N));
}
