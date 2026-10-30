// Upstash Redis client, created on first use from environment variables.
// The Vercel Marketplace integration sets either UPSTASH_REDIS_REST_* or KV_REST_API_*.
// Files under api/_lib are not deployed as endpoints.
// [ID] Klien database Upstash Redis, dibuat saat pertama dibutuhkan dari environment variable.
// [ID] Integrasi Vercel Marketplace mengisi UPSTASH_REDIS_REST_* atau KV_REST_API_*.
// [ID] File di folder api/_lib tidak menjadi endpoint (awalan _ diabaikan Vercel).

// [ID] Klien yang sudah dibuat (dipakai ulang).
let client = null;

// [ID] Ambil klien Redis. Mengembalikan null kalau environment variable belum diset.
export async function getRedis() {
  // [ID] Sudah ada: pakai.
  if (client) return client;
  // [ID] Alamat database (salah satu dari dua nama variable).
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  // [ID] Token akses (rahasia, tidak pernah ditulis di kode).
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  // [ID] Belum diset: tidak ada database.
  if (!url || !token) return null;
  // Imported lazily so the tests can run with a mock and no installed packages.
  // [ID] Library dimuat saat dibutuhkan saja, supaya tes bisa jalan dengan Redis tiruan tanpa npm install.
  const { Redis } = await import('@upstash/redis');
  // [ID] Buat klien.
  client = new Redis({ url, token });
  // [ID] Kembalikan.
  return client;
}

// Tests only.
// [ID] Khusus tes: pasang Redis tiruan (atau null untuk mensimulasikan database belum diset).
export function setRedis(mock) {
  // [ID] Ganti klien.
  client = mock;
}
