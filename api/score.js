// POST /api/score: replay a finished Single Player game and add its points to the team.
// [ID] Endpoint POST /api/score: putar ulang game Single Player yang sudah selesai dan tambahkan poinnya ke tim.

// [ID] Klien Redis.
import { getRedis } from './_lib/redis.js';
// [ID] Logika kiriman skor dan pengambil IP.
import { submitScore, clientIp } from './_lib/leaderboard.js';

// [ID] Fungsi yang dijalankan Vercel untuk setiap permintaan. req = permintaan, res = jawaban.
export default async function handler(req, res) {
  // [ID] Jawaban tidak boleh di-cache.
  res.setHeader('Cache-Control', 'no-store');
  // [ID] Hanya menerima POST:
  if (req.method !== 'POST') {
    // [ID] beri tahu metode yang diizinkan,
    res.setHeader('Allow', 'POST');
    // [ID] 405 Method Not Allowed.
    return res.status(405).json({ ok: false, error: 'method' });
  }
  // [ID] Isi permintaan (Vercel biasanya sudah mengubah JSON menjadi objek).
  let body = req.body;
  // [ID] Kalau masih berupa teks:
  if (typeof body === 'string') {
    // [ID] coba ubah ke objek,
    try {
      // [ID] (parse JSON)
      body = JSON.parse(body);
    // [ID] JSON rusak:
    } catch {
      // [ID] 400.
      return res.status(400).json({ ok: false, error: 'bad-json' });
    }
  }
  // [ID] Coba proses.
  try {
    // [ID] Ambil Redis.
    const redis = await getRedis();
    // [ID] Database belum diset: 503.
    if (!redis) return res.status(503).json({ ok: false, error: 'not-configured' });
    // [ID] Proses kiriman skor dengan IP pengirim.
    const out = await submitScore(redis, body, clientIp(req));
    // [ID] Kirim jawaban.
    return res.status(out.status).json(out.body);
  // [ID] Error tak terduga:
  } catch (err) {
    // [ID] catat di log Vercel,
    console.error('score failed', err);
    // [ID] 500.
    return res.status(500).json({ ok: false, error: 'server' });
  }
}
