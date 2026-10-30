// Single Player points. No DOM access: the browser shows the live score with this
// module and /api/score replays the submitted move log through it, so the server
// never trusts a score sent by the client.
// [ID] Perhitungan poin mode Single Player. Tidak menyentuh DOM, jadi dipakai di browser (skor langsung)
// [ID] dan di server (/api/score memutar ulang langkah), sehingga server tidak pernah percaya skor dari browser.

// [ID] Ambil daftar level, poin default, batas nilai, dan aturan nama dari config.js.
import { DIFFICULTY, SCORING, SCORING_LIMITS, LEADERBOARD } from './config.js';
// [ID] Ambil fungsi aturan untuk memutar ulang game.
import { createState, validateMove, applyJump, applyTrap, endTurn, winner } from './rules.js';

// [ID] Nama nilai poin yang bisa diatur admin: poin per langkah dan bonus menang.
export const POINT_FIELDS = ['move', 'win'];
// [ID] Daftar level: ['easy', 'medium', 'hard', 'expert'].
export const LEVELS = Object.keys(DIFFICULTY);

// [ID] Apakah mode ini memberi poin? Hanya mode 'ai' (Single Player).
export function pointsEnabled(mode) {
  // [ID] Local dan Online tidak memberi poin.
  return mode === 'ai';
}

/**
 * Checks a rules object from the admin page or storage. Points are whole numbers
 * 0..pointsMax, multipliers 0..multiplierMax with up to two decimals.
 * Returns a clean copy, or null if anything is missing or out of range.
 */
// [ID] Periksa nilai poin dari admin atau dari database. Kembalikan salinan bersih, atau null kalau ada yang salah.
export function normalizeRules(raw) {
  // [ID] Kalau datanya berupa teks JSON:
  if (typeof raw === 'string') {
    // [ID] coba ubah menjadi objek.
    try {
      // [ID] Parse JSON.
      raw = JSON.parse(raw);
    // [ID] JSON rusak:
    } catch {
      // [ID] tidak valid.
      return null;
    }
  }
  // [ID] Harus objek dan punya objek "multiplier".
  if (!raw || typeof raw !== 'object' || !raw.multiplier || typeof raw.multiplier !== 'object') return null;
  // [ID] Salinan bersih yang akan dikembalikan.
  const out = { multiplier: {} };
  // [ID] Periksa setiap nilai poin (move, win).
  for (const f of POINT_FIELDS) {
    // [ID] Ambil nilainya.
    const v = raw[f];
    // [ID] Harus bilangan bulat 0..100000.
    if (!Number.isInteger(v) || v < 0 || v > SCORING_LIMITS.pointsMax) return null;
    // [ID] Simpan.
    out[f] = v;
  }
  // [ID] Periksa pengali setiap level.
  for (const lvl of LEVELS) {
    // [ID] Ambil pengalinya.
    const v = raw.multiplier[lvl];
    // [ID] Harus angka nyata 0..100.
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > SCORING_LIMITS.multiplierMax) return null;
    // [ID] Maksimal 2 angka di belakang koma (1.5 boleh, 1.234 tidak).
    if (Math.round(v * 100) !== v * 100) return null;
    // [ID] Simpan.
    out.multiplier[lvl] = v;
  }
  // [ID] Nilai poin yang sudah bersih.
  return out;
}

// [ID] Nilai poin default (dari config.js), dalam bentuk yang sudah diperiksa.
export const defaultRules = () => normalizeRules(SCORING);

// What one level is worth, rounded to whole points: per move and for a win.
// [ID] Berapa nilai satu level: poin per langkah dan bonus menang, dibulatkan ke bilangan bulat.
export function levelValues(rules, level) {
  // [ID] Pengali level ini (0 kalau tidak ada).
  const m = rules.multiplier[level] ?? 0;
  // [ID] Fungsi bantu: nilai x pengali, dibulatkan.
  const pts = (v) => Math.round(v * m);
  // [ID] Hasil:
  return {
    // [ID] pengali,
    mult: m,
    // [ID] poin per langkah,
    move: pts(rules.move),
    // [ID] bonus menang.
    win: pts(rules.win),
  };
}

/**
 * Replays moves [{ jump, trap }, ...] from the start position.
 * opts.level 'easy' | 'medium' | 'hard' | 'expert', opts.humanSide 0 | 1,
 * opts.rules (defaults to SCORING).
 * Returns the breakdown; valid is false (and badMove set) if a move is illegal.
 * steps[i] is what move i earned (0 for AI moves), win bonus excluded.
 */
// [ID] Hitung poin satu game dengan memutar ulang semua langkah dari posisi awal.
// [ID] Kalau ada langkah ilegal, valid = false. steps[i] = poin dari langkah ke-i (0 untuk langkah AI).
export function scoreGame(moves, { mode = 'ai', level, humanSide, rules = SCORING }) {
  // [ID] Pengali level ini.
  const mult = rules.multiplier?.[level] ?? 0;
  // [ID] Rincian hasil, mulai dari nol.
  const out = {
    // [ID] valid: semua langkah sah; badMove: indeks langkah ilegal; finished: game selesai; won: pemain menang; steps: poin per langkah.
    valid: true, badMove: -1, finished: false, won: false, mult, steps: [],
    // [ID] Jumlah langkah pemain, total poin langkah, bonus menang, total.
    humanMoves: 0, movePoints: 0, winPoints: 0, total: 0,
  };
  // [ID] Mode bukan Single Player, level tidak dikenal, atau data bukan array: kembalikan nol.
  if (!pointsEnabled(mode) || !Object.hasOwn(DIFFICULTY, level) || !Array.isArray(moves)) return out;

  // [ID] Nilai poin untuk level ini.
  const per = levelValues(rules, level);
  // [ID] Mulai dari posisi awal.
  const s = createState();
  // [ID] Putar ulang setiap langkah.
  for (let i = 0; i < moves.length; i++) {
    // [ID] Langkah ke-i.
    const m = moves[i];
    // [ID] Kalau tidak sah:
    if (!validateMove(s, m)) {
      // [ID] tandai tidak valid,
      out.valid = false;
      // [ID] catat langkah ke berapa,
      out.badMove = i;
      // [ID] dan berhenti.
      return out;
    }
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Lompat.
    applyJump(s, m.jump);
    // [ID] Jebak.
    applyTrap(s, m.trap);
    // [ID] Hitung langkah pemain.
    if (side === humanSide) out.humanMoves++;
    // [ID] Poin langkah ini: poin per langkah untuk pemain, 0 untuk AI.
    out.steps.push(side === humanSide ? per.move : 0);
    // [ID] Ganti giliran.
    endTurn(s);
  }

  // [ID] Siapa pemenangnya (null kalau belum selesai).
  const w = winner(s);
  // [ID] Game selesai kalau ada pemenang.
  out.finished = w !== null;
  // [ID] Pemain menang kalau pemenangnya adalah sisi pemain.
  out.won = w === humanSide;
  // [ID] Poin langkah = jumlah langkah x poin per langkah.
  out.movePoints = out.humanMoves * per.move;
  // [ID] Bonus menang hanya kalau menang.
  if (out.won) out.winPoints = per.win;
  // [ID] Total = poin langkah + bonus menang.
  out.total = out.movePoints + out.winPoints;
  // [ID] Rincian lengkap.
  return out;
}

// Team names: strip markup characters and control codes, collapse spaces.
// [ID] Bersihkan nama tim: buang karakter HTML dan karakter kontrol, rapikan spasi.
export function cleanName(raw) {
  // [ID] Bukan teks: nama kosong.
  if (typeof raw !== 'string') return '';
  // [ID] Proses teks:
  return raw
    // [ID] Samakan bentuk huruf Unicode (misalnya huruf lebar menjadi huruf biasa).
    .normalize('NFKC')
    // [ID] Hapus karakter kontrol dan karakter berbahaya untuk HTML: < > & " ' ` \
    .replace(/[\u0000-\u001f\u007f<>&"'`\\]/g, '')
    // [ID] Ubah spasi berturut-turut menjadi satu spasi.
    .replace(/\s+/g, ' ')
    // [ID] Buang spasi di awal dan akhir.
    .trim();
}

// [ID] Apakah panjang nama sah (2..20 karakter)?
export function validName(name) {
  // [ID] Bandingkan dengan batas di config.js.
  return name.length >= LEADERBOARD.nameMin && name.length <= LEADERBOARD.nameMax;
}

// Names that differ only in case belong to the same team.
// [ID] Kunci tim = nama huruf kecil, jadi "Tim A" dan "tim a" dianggap tim yang sama.
export const nameKey = (name) => name.toLowerCase();
