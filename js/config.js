// Game constants shared by the UI, the AI worker, the online host and the tests.
// [ID] File ini berisi semua angka tetap (konstanta) game. Dipakai bersama oleh tampilan, AI, mode online, dan tes.

// [ID] N = ukuran sisi papan: 7 kotak.
export const N = 7;
// [ID] SIZE = jumlah kotak di papan: 7 x 7 = 49.
export const SIZE = N * N;

// The proposal does not fix start squares. P1 starts at a1 (bottom-left),
// P2 at g7 (top-right). Index = row * 7 + col, row 0 is the top rank (7).
// [ID] Posisi awal: P1 di indeks 42 (a1, kiri bawah), P2 di indeks 6 (g7, kanan atas), P1 (side 0) jalan duluan.
// [ID] Object.freeze membuat objek tidak bisa diubah, supaya konstanta tidak tertimpa tanpa sengaja.
export const START = Object.freeze({ p1: 42, p2: 6, first: 0 });

// [ID] Tingkat kesulitan = kedalaman pencarian Minimax (berapa giliran ke depan yang dilihat AI).
export const DIFFICULTY = Object.freeze({
  // [ID] Easy: AI hanya melihat 1 langkah (langkahnya sendiri).
  easy: 1,
  // [ID] Medium: 2 langkah (AI lalu balasan manusia).
  medium: 2,
  // [ID] Hard: 3 langkah.
  hard: 3,
  // [ID] Expert: 4 langkah.
  expert: 4,
});

// Longest a player may take for one turn, the jump and the trap together. Change the length here.
// [ID] Batas waktu satu giliran manusia: 15 detik untuk lompat DAN pasang jebakan. Ubah angkanya di sini. (Bukan bagian proposal; AI tetap pakai batas 4 detiknya sendiri.)
export const TURN_SECONDS = 15;
// How long past the limit the online host waits for the guest's own move before playing one for it.
// [ID] Mode online: host menunggu 1500 ms (1,5 detik) lewat batas waktu sebelum memainkan langkah acak untuk tamu yang diam.
export const TURN_GRACE_MS = 1500;

// [ID] Pengaturan AI.
export const AI = Object.freeze({
  // [ID] Batas waktu berpikir AI: 4000 ms = 4 detik per langkah (sesuai proposal).
  timeLimitMs: 4000,
  // [ID] Maksimal 12 kandidat kotak jebakan yang dicoba AI per lompatan.
  maxTrapCandidates: 12,
  // [ID] Pengurutan langkah hanya dilakukan kalau sisa kedalaman minimal 2.
  orderMinDepth: 2,
  // Shortest visible "thinking" time so instant replies at Easy do not feel jarring.
  // UI only; not counted in the reported think time.
  // [ID] Tampilan menunggu minimal 450 ms walau AI sudah selesai, supaya tidak terasa "langsung".
  minUiDelayMs: 450,
});

// [ID] Pengaturan mode online (PeerJS).
export const NET = Object.freeze({
  // [ID] Awalan ID peer di server PeerJS, supaya tidak bentrok dengan aplikasi lain.
  peerPrefix: 'knighttrap-v1-',
  // [ID] Panjang kode ruang: 5 karakter.
  codeLength: 5,
  // [ID] Huruf yang boleh dipakai di kode ruang (tanpa I, O, 0, 1 supaya tidak tertukar saat dibaca).
  codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  // [ID] Kirim sinyal "masih hidup" setiap 3 detik.
  heartbeatMs: 3000,
  // [ID] Kalau 12 detik tidak ada kabar dari lawan, koneksi dianggap putus.
  timeoutMs: 12000,
});
