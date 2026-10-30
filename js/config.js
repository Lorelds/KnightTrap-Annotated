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

// Default Single Player points. Every value is multiplied by the level's multiplier.
// An admin can replace these at /admin.html; the server then scores with the saved copy.
// Local and Online games give no points.
// [ID] Poin default untuk mode Single Player. Admin bisa menggantinya lewat /admin.html.
export const SCORING = Object.freeze({
  // [ID] Poin untuk setiap langkah pemain (sebelum dikali pengali level).
  move: 10, // each human move
  // [ID] Bonus kalau pemain mengalahkan AI (sebelum dikali pengali level).
  win: 200, // beating the AI
  // [ID] Pengali poin per level: Easy x1, Medium x1.5, Hard x2, Expert x2.5.
  multiplier: Object.freeze({ easy: 1, medium: 1.5, hard: 2, expert: 2.5 }),
});

// Bounds the admin page and the server accept for SCORING values.
// [ID] Batas nilai yang boleh diisi admin: poin maks. 100000, pengali maks. 100.
export const SCORING_LIMITS = Object.freeze({ pointsMax: 100000, multiplierMax: 100 });

// [ID] Pengaturan leaderboard.
export const LEADERBOARD = Object.freeze({
  // [ID] Tampilkan 20 tim teratas.
  top: 20,
  // [ID] Leaderboard diperbarui otomatis setiap 15 detik selama layarnya terbuka.
  pollMs: 15000,
  // [ID] Satu IP hanya boleh mengirim skor sekali per 10 detik.
  rateLimitSec: 10,
  // [ID] Nama tim minimal 2 karakter.
  nameMin: 2,
  // [ID] Nama tim maksimal 20 karakter.
  nameMax: 20,
  // [ID] Setelah 10 kali salah kunci admin dari satu IP, IP itu dikunci.
  adminMaxFails: 10, // wrong admin keys per IP before a lockout
  // [ID] Lama kunci: 600 detik = 10 menit.
  adminLockSec: 600,
});
