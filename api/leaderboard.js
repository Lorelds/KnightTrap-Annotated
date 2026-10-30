// GET /api/leaderboard: top teams as JSON.
// [ID] Endpoint GET /api/leaderboard: daftar tim teratas dalam bentuk JSON.

// [ID] Klien Redis.
import { getRedis } from './_lib/redis.js';
// [ID] Logika membaca leaderboard.
import { readLeaderboard } from './_lib/leaderboard.js';

// [ID] Fungsi yang dijalankan Vercel untuk setiap permintaan.
export default async function handler(req, res) {
  // [ID] Hanya menerima GET:
  if (req.method !== 'GET') {
    // [ID] beri tahu metode yang diizinkan,
    res.setHeader('Allow', 'GET');
    // [ID] 405.
    return res.status(405).json({ ok: false, error: 'method' });
  }
  // [ID] Coba proses.
  try {
    // [ID] Ambil Redis.
    const redis = await getRedis();
    // [ID] Database belum diset: 503.
    if (!redis) return res.status(503).json({ ok: false, error: 'not-configured' });
    // [ID] Baca leaderboard.
    const out = await readLeaderboard(redis);
    // A short edge cache keeps many open screens polling every 15 s cheap.
    // [ID] Cache 3 detik di server Vercel, supaya banyak layar yang memperbarui setiap 15 detik tidak membebani database.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3, stale-while-revalidate=10');
    // [ID] Kirim jawaban.
    return res.status(out.status).json(out.body);
  // [ID] Error tak terduga:
  } catch (err) {
    // [ID] catat,
    console.error('leaderboard failed', err);
    // [ID] jangan cache jawaban error,
    res.setHeader('Cache-Control', 'no-store');
    // [ID] 500.
    return res.status(500).json({ ok: false, error: 'server' });
  }
}
