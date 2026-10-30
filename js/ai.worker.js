// Runs the search off the main thread so the board keeps animating while the AI thinks.
// [ID] Kode yang berjalan di Web Worker (thread terpisah), supaya papan tetap bisa beranimasi saat AI berpikir.
// [ID] deserialize mengubah objek biasa kembali menjadi state.
import { deserialize } from './rules.js';
// [ID] search = fungsi Minimax + Alpha-Beta.
import { search } from './ai.js';

// [ID] Saat menerima pesan dari ai-client.js:
self.onmessage = (e) => {
  // [ID] Ambil nomor permintaan, state, kedalaman, dan pilihan Alpha-Beta.
  const { id, state, depth, prune } = e.data;
  // [ID] Coba jalankan pencarian.
  try {
    // [ID] Cari langkah terbaik.
    const result = search(deserialize(state), { depth, prune });
    // [ID] Kirim hasilnya kembali, dengan nomor permintaan yang sama.
    self.postMessage({ id, result });
  // [ID] Kalau gagal:
  } catch (err) {
    // [ID] Kirim pesan error sebagai teks.
    self.postMessage({ id, error: String(err && err.message ? err.message : err) });
  }
};
