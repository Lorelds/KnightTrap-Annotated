// Promise wrapper around the AI worker. Falls back to the main thread if
// module workers are unavailable (e.g. very old browsers).
// [ID] Penghubung antara game dan AI worker. Mengubah "kirim pesan ke worker" menjadi Promise yang bisa di-await.
// [ID] Kalau browser tidak mendukung module worker, AI dijalankan di thread utama.
// [ID] serialize mengubah state menjadi objek biasa yang bisa dikirim ke worker.
import { serialize } from './rules.js';

// [ID] Objek worker (null kalau belum dibuat).
let worker = null;
// [ID] true kalau worker gagal; setelah itu AI selalu dijalankan di thread utama.
let workerBroken = false;
// [ID] Nomor urut permintaan, untuk mencocokkan jawaban worker dengan permintaannya.
let seq = 0;
// [ID] Permintaan yang sedang menunggu jawaban: id → { resolve, reject, args }.
const pending = new Map();

// [ID] Ambil worker; buat kalau belum ada.
function getWorker() {
  // [ID] Sudah ada, atau sudah pernah gagal: kembalikan apa adanya.
  if (worker || workerBroken) return worker;
  // [ID] Coba buat worker.
  try {
    // [ID] Buat module worker dari ai.worker.js (alamatnya relatif terhadap file ini).
    worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    // [ID] Saat worker mengirim jawaban:
    worker.onmessage = (e) => {
      // [ID] Ambil nomor permintaan, hasil, atau error.
      const { id, result, error } = e.data;
      // [ID] Cari permintaan yang cocok.
      const p = pending.get(id);
      // [ID] Tidak ada (mungkin sudah dibatalkan): abaikan.
      if (!p) return;
      // [ID] Hapus dari daftar tunggu.
      pending.delete(id);
      // [ID] Kalau error, tolak Promise-nya.
      if (error) p.reject(new Error(error));
      // [ID] Kalau berhasil, selesaikan Promise dengan hasilnya.
      else p.resolve(result);
    };
    // [ID] Kalau worker rusak (misalnya gagal dimuat):
    worker.onerror = (e) => {
      // [ID] Tulis peringatan di console.
      console.warn('AI worker failed, using main thread', e.message);
      // [ID] Tandai worker rusak.
      workerBroken = true;
      // [ID] Buang worker.
      worker = null;
      // [ID] Semua permintaan yang menunggu dijalankan ulang di thread utama.
      for (const [id, p] of pending) {
        // [ID] Hapus dari daftar tunggu.
        pending.delete(id);
        // [ID] Jalankan di thread utama, teruskan hasil/error ke Promise aslinya.
        runInline(p.args).then(p.resolve, p.reject);
      }
    };
  // [ID] Browser tidak mendukung module worker sama sekali:
  } catch (err) {
    // [ID] Tulis peringatan.
    console.warn('Module workers unsupported, using main thread', err);
    // [ID] Tandai rusak.
    workerBroken = true;
    // [ID] Tidak ada worker.
    worker = null;
  }
  // [ID] Worker (atau null).
  return worker;
}

// [ID] Jalankan AI langsung di thread utama (cadangan kalau worker tidak bisa dipakai).
async function runInline({ state, depth, prune }) {
  // [ID] Muat ai.js dan rules.js secara dinamis (hanya kalau dibutuhkan).
  const [{ search }, { deserialize }] = await Promise.all([import('./ai.js'), import('./rules.js')]);
  // [ID] Ubah kembali ke state lalu jalankan pencarian.
  return search(deserialize(state), { depth, prune });
}

// [ID] Fungsi yang dipanggil game.js: minta AI berpikir. Mengembalikan Promise berisi hasil search().
export function think(state, { depth, prune }) {
  // [ID] Siapkan data yang dikirim: state (dalam bentuk objek biasa), kedalaman, Alpha-Beta ON/OFF.
  const args = { state: serialize(state), depth, prune };
  // [ID] Ambil worker.
  const w = getWorker();
  // [ID] Tidak ada worker: jalankan di thread utama.
  if (!w) return runInline(args);
  // [ID] Buat Promise yang akan diselesaikan saat worker menjawab.
  return new Promise((resolve, reject) => {
    // [ID] Nomor permintaan baru.
    const id = ++seq;
    // [ID] Simpan di daftar tunggu.
    pending.set(id, { resolve, reject, args });
    // [ID] Kirim permintaan ke worker.
    w.postMessage({ id, ...args });
  });
}

// Drop any search in flight (leaving a game while the AI thinks).
// [ID] Batalkan pencarian yang sedang berjalan (misalnya pemain keluar saat AI masih berpikir).
export function cancelThinking() {
  // [ID] Kalau worker sedang mengerjakan sesuatu:
  if (worker && pending.size) {
    // [ID] Hentikan worker secara paksa (pencarian langsung berhenti).
    worker.terminate();
    // [ID] Worker baru akan dibuat saat dibutuhkan lagi.
    worker = null;
  }
  // [ID] Kosongkan daftar tunggu.
  pending.clear();
}
