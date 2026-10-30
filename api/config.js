// GET /api/config: current point values (public).
// POST /api/config with "Authorization: Bearer <ADMIN_KEY>": change them (admin page).
// [ID] Endpoint /api/config. GET: nilai poin saat ini (publik).
// [ID] POST dengan header "Authorization: Bearer <ADMIN_KEY>": ubah nilai poin (dari halaman admin).

// [ID] Klien Redis.
import { getRedis } from './_lib/redis.js';
// [ID] Logika baca/ubah nilai poin dan pengambil IP.
import { readRules, updateRules, clientIp } from './_lib/leaderboard.js';

// [ID] Fungsi yang dijalankan Vercel untuk setiap permintaan.
export default async function handler(req, res) {
  // [ID] Hanya GET dan POST:
  if (req.method !== 'GET' && req.method !== 'POST') {
    // [ID] beri tahu metode yang diizinkan,
    res.setHeader('Allow', 'GET, POST');
    // [ID] 405.
    return res.status(405).json({ ok: false, error: 'method' });
  }
  // [ID] Jangan di-cache (nilai poin bisa berubah kapan saja).
  res.setHeader('Cache-Control', 'no-store');
  // [ID] Isi permintaan.
  let body = req.body;
  // [ID] POST dengan isi berupa teks:
  if (req.method === 'POST' && typeof body === 'string') {
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
    // [ID] GET:
    if (req.method === 'GET') {
      // [ID] baca nilai poin,
      const out = await readRules(redis);
      // [ID] kirim.
      return res.status(out.status).json(out.body);
    }
    // [ID] POST: ambil header Authorization.
    const auth = String(req.headers?.authorization ?? '');
    // [ID] Ambil kunci setelah "Bearer ".
    const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    // [ID] Ubah nilai poin; ADMIN_KEY diambil dari environment variable Vercel.
    const out = await updateRules(redis, body, key, process.env.ADMIN_KEY, clientIp(req));
    // [ID] Kirim jawaban.
    return res.status(out.status).json(out.body);
  // [ID] Error tak terduga:
  } catch (err) {
    // [ID] catat,
    console.error('config failed', err);
    // [ID] 500.
    return res.status(500).json({ ok: false, error: 'server' });
  }
}
