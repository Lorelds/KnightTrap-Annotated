// Leaderboard storage and score submission. Each function returns { status, body }
// so the handlers stay thin and the tests can call this with a mock Redis.
//
// Keys:  kt:total  sorted set   team key -> cumulative points
//        kt:wins / kt:games / kt:name / kt:first   hashes keyed by team key
//        kt:rl:<ip>  rate limit,  kt:game:<id>  one submission per game
//        kt:rules  point values set by the admin (JSON),  kt:adm:<ip>  failed admin logins
// [ID] Logika server untuk leaderboard, pengiriman skor, dan nilai poin. Setiap fungsi mengembalikan { status, body }
// [ID] supaya file handler tetap tipis dan tes bisa memakai Redis tiruan.
// [ID] Data di Redis: kt:total (sorted set total poin per tim), kt:wins/games/name/first (hash per tim),
// [ID] kt:rl:<ip> (batas kirim), kt:game:<id> (cegah game dikirim dua kali), kt:rules (poin dari admin), kt:adm:<ip> (salah kunci).

// [ID] Fungsi kriptografi Node.js: hash dan perbandingan waktu-konstan.
import { createHash, timingSafeEqual } from 'node:crypto';
// [ID] Level, pengaturan leaderboard, jumlah kotak (49).
import { DIFFICULTY, LEADERBOARD, SIZE } from '../../js/config.js';
// [ID] Fungsi poin dan nama yang sama persis dengan yang dipakai browser.
import { scoreGame, cleanName, validName, nameKey, normalizeRules, defaultRules } from '../../js/scoring.js';

// [ID] Nama-nama kunci Redis.
const K = {
  // [ID] Sorted set: tim → total poin.
  total: 'kt:total',
  // [ID] Hash: tim → jumlah menang.
  wins: 'kt:wins',
  // [ID] Hash: tim → jumlah game.
  games: 'kt:games',
  // [ID] Hash: tim → nama tampilan.
  name: 'kt:name',
  // [ID] Hash: tim → waktu kiriman pertama.
  first: 'kt:first',
  // [ID] Batas kirim per IP.
  rate: (ip) => `kt:rl:${ip}`,
  // [ID] Penanda game sudah dikirim.
  game: (id) => `kt:game:${id}`,
  // [ID] Nilai poin dari admin.
  rules: 'kt:rules',
  // [ID] Jumlah salah kunci admin per IP.
  admin: (ip) => `kt:adm:${ip}`,
};
// [ID] Format ID game yang sah: 8–64 huruf, angka, atau tanda minus.
const GAME_ID = /^[A-Za-z0-9-]{8,64}$/;
// [ID] Penanda game disimpan 7 hari.
const DUPLICATE_TTL_SEC = 7 * 24 * 3600;

// [ID] Bentuk jawaban gagal.
const fail = (status, error) => ({ status, body: { ok: false, error } });

// [ID] Periksa daftar langkah dari browser. Mengembalikan salinan bersih atau null.
function parseMoves(raw) {
  // [ID] Harus array berisi 1..49 langkah.
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > SIZE) return null;
  // [ID] Salinan bersih.
  const moves = [];
  // [ID] Setiap langkah:
  for (const m of raw) {
    // [ID] harus objek dengan jump dan trap berupa bilangan bulat,
    if (!m || typeof m !== 'object' || !Number.isInteger(m.jump) || !Number.isInteger(m.trap)) return null;
    // [ID] salin hanya jump dan trap (abaikan data lain).
    moves.push({ jump: m.jump, trap: m.trap });
  }
  // [ID] Daftar langkah bersih.
  return moves;
}

// body: { name, difficulty, side, id, moves: [{ jump, trap }] }. Any score field is ignored.
// [ID] Terima kiriman skor. Isi: nama, level, sisi pemain, ID game, daftar langkah. Skor dari browser DIABAIKAN.
export async function submitScore(redis, body, ip, now = Date.now()) {
  // [ID] Isi harus objek.
  if (!body || typeof body !== 'object') return fail(400, 'bad-request');
  // [ID] Bersihkan nama.
  const name = cleanName(body.name);
  // [ID] Panjang nama harus sah.
  if (!validName(name)) return fail(400, 'bad-name');
  // [ID] Level.
  const level = body.difficulty;
  // [ID] Harus salah satu level yang dikenal.
  if (typeof level !== 'string' || !Object.hasOwn(DIFFICULTY, level)) return fail(400, 'bad-difficulty');
  // [ID] Sisi pemain.
  const side = body.side;
  // [ID] Harus 0 atau 1.
  if (side !== 0 && side !== 1) return fail(400, 'bad-side');
  // [ID] ID game harus sesuai format.
  if (typeof body.id !== 'string' || !GAME_ID.test(body.id)) return fail(400, 'bad-id');
  // [ID] Periksa daftar langkah.
  const moves = parseMoves(body.moves);
  // [ID] Tidak sah: tolak.
  if (!moves) return fail(400, 'bad-moves');

  // [ID] Nilai poin yang berlaku sekarang.
  const rules = await getRules(redis);
  // [ID] Putar ulang seluruh game dengan rules.js dan hitung poinnya di server.
  const score = scoreGame(moves, { mode: 'ai', level, humanSide: side, rules });
  // [ID] Ada langkah ilegal: tolak (mencegah game palsu).
  if (!score.valid) return fail(400, 'illegal-move');
  // [ID] Game belum selesai: tolak.
  if (!score.finished) return fail(400, 'unfinished');

  // [ID] Batas kirim: set kunci hanya kalau belum ada (nx), kedaluwarsa 10 detik (ex).
  const allowed = await redis.set(K.rate(ip), 1, { nx: true, ex: LEADERBOARD.rateLimitSec });
  // [ID] Kunci sudah ada = IP ini baru saja mengirim: 429.
  if (!allowed) return fail(429, 'rate-limited');
  // [ID] Tandai game ini sudah dikirim (gagal kalau sudah pernah).
  const fresh = await redis.set(K.game(body.id), 1, { nx: true, ex: DUPLICATE_TTL_SEC });
  // [ID] Sudah pernah: 409.
  if (!fresh) return fail(409, 'duplicate');

  // [ID] Kunci tim (huruf kecil).
  const key = nameKey(name);
  // [ID] Perbarui data tim sekaligus dalam satu transaksi (multi), ambil total baru:
  const [total] = await redis
    // [ID] mulai transaksi,
    .multi()
    // [ID] tambah total poin,
    .zincrby(K.total, score.total, key)
    // [ID] tambah 1 menang kalau menang,
    .hincrby(K.wins, key, score.won ? 1 : 0)
    // [ID] tambah 1 game,
    .hincrby(K.games, key, 1)
    // [ID] simpan nama tampilan kalau belum ada,
    .hsetnx(K.name, key, name)
    // [ID] simpan waktu kiriman pertama kalau belum ada,
    .hsetnx(K.first, key, now)
    // [ID] jalankan.
    .exec();
  // [ID] Hitung tim dengan total lebih tinggi ("(" artinya lebih besar, bukan sama dengan).
  const higher = await redis.zcount(K.total, `(${Number(total)}`, '+inf');
  // [ID] Jawaban berhasil:
  return {
    // [ID] status 200,
    status: 200,
    // [ID] rincian skor dari server, nama dan total tim, peringkat.
    body: { ok: true, score, team: { name, total: Number(total) }, rank: Number(higher) + 1 },
  };
}

// Top teams by total, then wins, then earliest first submission.
// [ID] Tim teratas: urut total poin, lalu jumlah menang, lalu yang lebih dulu mengirim.
export async function readLeaderboard(redis) {
  // Fetch a margin past the cut so ties on total are ordered by the full rule.
  // [ID] Ambil lebih dari 20 (50) supaya tim dengan total sama di batas bisa diurutkan dengan aturan lengkap.
  const flat = await redis.zrange(K.total, 0, LEADERBOARD.top * 2 + 9, { rev: true, withScores: true });
  // [ID] Daftar kunci tim.
  const keys = [];
  // [ID] Daftar total.
  const totals = [];
  // [ID] Hasil zrange berbentuk [tim, total, tim, total, ...]; pisahkan.
  for (let i = 0; i < flat.length; i += 2) {
    // [ID] Kunci tim.
    keys.push(String(flat[i]));
    // [ID] Totalnya.
    totals.push(Number(flat[i + 1]));
  }
  // [ID] Belum ada tim: daftar kosong.
  if (!keys.length) return { status: 200, body: { ok: true, teams: [] } };
  // [ID] Ambil data lain untuk semua tim dalam satu kali kirim (pipeline):
  const [wins, games, names, first] = await redis
    // [ID] mulai pipeline,
    .pipeline()
    // [ID] jumlah menang,
    .hmget(K.wins, ...keys)
    // [ID] jumlah game,
    .hmget(K.games, ...keys)
    // [ID] nama,
    .hmget(K.name, ...keys)
    // [ID] waktu kiriman pertama,
    .hmget(K.first, ...keys)
    // [ID] jalankan.
    .exec();
  // [ID] Gabungkan menjadi daftar objek tim:
  const teams = keys.map((key, i) => ({
    // [ID] kunci,
    key,
    // Upstash auto-parses values, so a name like "123" can come back as a number.
    // [ID] nama (dipaksa teks, karena Upstash bisa mengubah "123" menjadi angka),
    name: String(names?.[key] ?? key),
    // [ID] total,
    total: totals[i],
    // [ID] menang,
    wins: Number(wins?.[key] ?? 0),
    // [ID] game,
    games: Number(games?.[key] ?? 0),
    // [ID] waktu pertama.
    first: Number(first?.[key] ?? 0),
  }));
  // [ID] Urutkan: total besar dulu, lalu menang lebih banyak, lalu kiriman lebih awal.
  teams.sort((a, b) => b.total - a.total || b.wins - a.wins || a.first - b.first);
  // [ID] Jawaban:
  return {
    // [ID] status 200,
    status: 200,
    // [ID] 20 teratas dengan nomor peringkat; waktu "first" tidak dikirim ke browser.
    body: { ok: true, teams: teams.slice(0, LEADERBOARD.top).map(({ first, ...t }, i) => ({ rank: i + 1, ...t })) },
  };
}

// [ID] Ambil alamat IP pengirim.
export function clientIp(req) {
  // [ID] Header x-forwarded-for (diisi Vercel dengan IP asli).
  const fwd = req.headers?.['x-forwarded-for'];
  // [ID] Ambil IP pertama; cadangan: x-real-ip, lalu alamat soket.
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0].trim() || req.headers?.['x-real-ip'] || req.socket?.remoteAddress;
  // [ID] Jadikan teks, maks. 64 karakter.
  return String(ip || 'unknown').slice(0, 64);
}

// ---- Point values -------------------------------------------------------------
// [ID] ---- Nilai poin ----

// The admin's saved values, or the defaults from config.js.
// [ID] Nilai poin yang disimpan admin, atau default dari config.js kalau belum ada/tidak sah.
export async function getRules(redis) {
  // [ID] Baca dari Redis lalu periksa.
  return normalizeRules(await redis.get(K.rules)) ?? defaultRules();
}

// [ID] Jawaban berisi nilai poin saat ini (untuk GET /api/config).
export async function readRules(redis) {
  // [ID] Status 200 dan nilai poin.
  return { status: 200, body: { ok: true, rules: await getRules(redis) } };
}

// [ID] Bandingkan kunci admin dengan aman.
function sameSecret(given, expected) {
  // Hash both so the comparison is constant-time whatever the lengths.
  // [ID] Hash keduanya dulu supaya panjangnya sama, lalu bandingkan dalam waktu konstan
  // [ID] (penyerang tidak bisa menebak kunci dari lama waktu perbandingan).
  // [ID] Hash kunci yang dikirim.
  const a = createHash('sha256').update(String(given)).digest();
  // [ID] Hash kunci yang benar.
  const b = createHash('sha256').update(String(expected)).digest();
  // [ID] Sama atau tidak.
  return timingSafeEqual(a, b);
}

/**
 * body: { rules } to save new values, or { reset: true } to go back to the defaults.
 * key is the Bearer token; adminKey comes from the ADMIN_KEY environment variable.
 */
// [ID] Ubah nilai poin (POST /api/config). body: { rules } untuk menyimpan, { reset: true } untuk kembali ke default,
// [ID] { check: true } hanya untuk mengecek kunci. key = kunci dari browser, adminKey = ADMIN_KEY dari Vercel.
export async function updateRules(redis, body, key, adminKey, ip) {
  // [ID] ADMIN_KEY belum diset: admin tidak aktif.
  if (!adminKey) return fail(503, 'admin-disabled');
  // [ID] Berapa kali IP ini salah kunci.
  const fails = Number((await redis.get(K.admin(ip))) ?? 0);
  // [ID] Sudah 10 kali: terkunci.
  if (fails >= LEADERBOARD.adminMaxFails) return fail(429, 'locked');
  // [ID] Kunci kosong atau salah:
  if (!key || !sameSecret(key, adminKey)) {
    // [ID] tambah hitungan salah, kedaluwarsa 10 menit,
    await redis.multi().incr(K.admin(ip)).expire(K.admin(ip), LEADERBOARD.adminLockSec).exec();
    // [ID] 401.
    return fail(401, 'unauthorized');
  }
  // [ID] Isi harus objek.
  if (!body || typeof body !== 'object') return fail(400, 'bad-request');
  // [ID] Hanya cek kunci: kembalikan nilai poin.
  if (body.check === true) return readRules(redis);
  // [ID] Kembali ke default:
  if (body.reset === true) {
    // [ID] hapus nilai simpanan,
    await redis.del(K.rules);
    // [ID] kembalikan default.
    return readRules(redis);
  }
  // [ID] Periksa nilai baru.
  const rules = normalizeRules(body.rules);
  // [ID] Tidak sah: 400.
  if (!rules) return fail(400, 'bad-rules');
  // [ID] Simpan sebagai JSON.
  await redis.set(K.rules, JSON.stringify(rules));
  // [ID] Berhasil, kembalikan nilai yang tersimpan.
  return { status: 200, body: { ok: true, rules } };
}
