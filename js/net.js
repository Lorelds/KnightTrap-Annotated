// Online play over PeerJS (WebRTC data channel, public PeerJS broker for signaling only).
// This module only moves messages. The host's Game checks every move with rules.js.
// [ID] Main online lewat PeerJS (WebRTC). Server PeerJS publik hanya dipakai untuk menghubungkan dua pemain;
// [ID] setelah itu pesan langsung antar browser. File ini hanya mengirim pesan; validasi langkah dilakukan Game milik host.

// [ID] Pengaturan online (awalan ID, panjang kode, heartbeat, timeout).
import { NET } from './config.js';

// [ID] Alamat library PeerJS versi 1.5.4.
const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
// [ID] Promise pemuatan library (supaya hanya dimuat sekali).
let peerLib = null;

// [ID] Muat library PeerJS saat dibutuhkan saja.
function loadPeerJs() {
  // [ID] Sudah dimuat: langsung pakai.
  if (window.Peer) return Promise.resolve(window.Peer);
  // [ID] Sedang dimuat: tunggu yang sama.
  if (peerLib) return peerLib;
  // [ID] Mulai memuat.
  peerLib = new Promise((resolve, reject) => {
    // [ID] Buat tag <script>.
    const s = document.createElement('script');
    // [ID] Alamat library.
    s.src = PEERJS_URL;
    // [ID] Muat tanpa memblokir halaman.
    s.async = true;
    // [ID] Gagal kalau lebih dari 12 detik.
    const timer = setTimeout(() => reject(new Error('load-fail')), 12000);
    // [ID] Saat selesai dimuat:
    s.onload = () => {
      // [ID] batalkan timer,
      clearTimeout(timer);
      // [ID] berhasil kalau window.Peer ada.
      window.Peer ? resolve(window.Peer) : reject(new Error('load-fail'));
    };
    // [ID] Saat gagal dimuat:
    s.onerror = () => {
      // [ID] batalkan timer,
      clearTimeout(timer);
      // [ID] izinkan coba lagi nanti,
      peerLib = null;
      // [ID] hapus tag script,
      s.remove();
      // [ID] laporkan gagal.
      reject(new Error('load-fail'));
    };
    // [ID] Pasang tag di <head> supaya mulai dimuat.
    document.head.appendChild(s);
  });
  // [ID] Promise pemuatan.
  return peerLib;
}

// [ID] Buat kode ruang acak (5 karakter).
export function makeCode() {
  // [ID] Kode yang dibangun.
  let c = '';
  // [ID] Huruf yang boleh dipakai.
  const a = NET.codeAlphabet;
  // [ID] Angka acak yang aman (kriptografis), satu per karakter.
  const rnd = crypto.getRandomValues(new Uint32Array(NET.codeLength));
  // [ID] Ubah setiap angka menjadi huruf.
  for (const r of rnd) c += a[r % a.length];
  // [ID] Kode ruang.
  return c;
}

// [ID] Rapikan kode yang diketik: huruf besar, hanya huruf dan angka.
export function normalizeCode(raw) {
  // [ID] Ubah ke teks, kapital, buang karakter selain A-Z dan 0-9.
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// [ID] Satu sesi online (sebagai host atau tamu).
export class OnlineSession {
  // [ID] Nilai awal.
  constructor() {
    // [ID] Objek Peer milik kita.
    this.peer = null;
    // [ID] Koneksi ke lawan.
    this.conn = null;
    // [ID] 'host' atau 'guest'.
    this.role = null;
    // [ID] Kode ruang.
    this.code = null;
    // [ID] Fungsi yang dipanggil untuk setiap event.
    this.handlers = {};
    // [ID] Kapan terakhir menerima pesan dari lawan.
    this.lastSeen = 0;
    // [ID] Timer heartbeat.
    this.hb = null;
    // [ID] Sesi sudah ditutup.
    this.closed = false;
    // [ID] Koneksi sedang tidak stabil.
    this.unstable = false;
  }

  // [ID] Daftarkan fungsi untuk event "ev". Mengembalikan this supaya bisa dirangkai.
  on(ev, fn) {
    // [ID] Simpan fungsinya.
    this.handlers[ev] = fn;
    // [ID] Untuk chaining: session.on(...).on(...).
    return this;
  }

  // [ID] Panggil fungsi untuk event "ev" (kalau ada).
  emit(ev, ...args) {
    // [ID] ?.() = panggil hanya kalau fungsinya ada.
    this.handlers[ev]?.(...args);
  }

  // [ID] Buat ruang sebagai host. Mengembalikan kode ruang.
  async host() {
    // [ID] Peran host.
    this.role = 'host';
    // [ID] Muat PeerJS.
    const Peer = await loadPeerJs();
    // [ID] Coba sampai 5 kali (kalau kode kebetulan sudah dipakai orang lain).
    for (let attempt = 0; attempt < 5; attempt++) {
      // [ID] Kode baru.
      const code = makeCode();
      // [ID] Coba daftarkan ID dengan kode itu.
      try {
        // [ID] Buka koneksi ke server PeerJS dengan ID "knighttrap-v1-KODE".
        await this.openPeer(Peer, NET.peerPrefix + code);
        // [ID] Berhasil: simpan kode.
        this.code = code;
        // [ID] Saat ada tamu yang menyambung, terima koneksinya.
        this.peer.on('connection', (c) => this.acceptConnection(c));
        // [ID] Kembalikan kode untuk ditampilkan.
        return code;
      // [ID] Gagal:
      } catch (err) {
        // [ID] kalau bukan karena ID sudah dipakai, lempar error; kalau karena ID dipakai, coba kode lain.
        if (err.type !== 'unavailable-id') throw err;
      }
    }
    // [ID] 5 kali gagal: menyerah.
    throw Object.assign(new Error('no-id'), { type: 'unavailable-id' });
  }

  // [ID] Gabung ke ruang dengan kode tertentu sebagai tamu.
  async join(code) {
    // [ID] Peran tamu.
    this.role = 'guest';
    // [ID] Simpan kode.
    this.code = code;
    // [ID] Muat PeerJS.
    const Peer = await loadPeerJs();
    // [ID] Buka koneksi ke server PeerJS dengan ID acak.
    await this.openPeer(Peer);
    // [ID] Tunggu sampai tersambung ke host.
    return new Promise((resolve, reject) => {
      // [ID] Sambungkan ke host; pesan dikirim andal dalam bentuk JSON.
      const conn = this.peer.connect(NET.peerPrefix + code, { reliable: true, serialization: 'json' });
      // [ID] Gagal kalau 15 detik tidak tersambung.
      const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { type: 'peer-unavailable' })), 15000);
      // [ID] Kalau server bilang ruang tidak ada:
      this.peer.on('error', (err) => {
        // [ID] (ruang tidak ditemukan)
        if (err.type === 'peer-unavailable') {
          // [ID] batalkan timer,
          clearTimeout(timer);
          // [ID] laporkan gagal.
          reject(err);
        }
      });
      // [ID] Pasang pengendali koneksi; saat terbuka:
      this.attach(conn, () => {
        // [ID] batalkan timer,
        clearTimeout(timer);
        // [ID] berhasil.
        resolve();
      });
    });
  }

  // [ID] Buka Peer (dengan ID tertentu untuk host, atau acak untuk tamu).
  openPeer(Peer, id) {
    // [ID] Promise yang selesai saat Peer siap.
    return new Promise((resolve, reject) => {
      // [ID] Buat Peer.
      const peer = id ? new Peer(id, { debug: 1 }) : new Peer({ debug: 1 });
      // [ID] Sudah terbuka atau belum.
      let opened = false;
      // [ID] Saat tersambung ke server PeerJS:
      peer.on('open', () => {
        // [ID] tandai terbuka,
        opened = true;
        // [ID] simpan Peer,
        this.peer = peer;
        // [ID] selesai.
        resolve();
      });
      // [ID] Saat ada error:
      peer.on('error', (err) => {
        // [ID] Error sebelum terbuka:
        if (!opened) {
          // [ID] buang Peer,
          peer.destroy();
          // [ID] laporkan gagal.
          reject(err);
        // [ID] Error setelah terbuka (selain ruang tidak ada):
        } else if (err.type !== 'peer-unavailable') {
          // [ID] catat di console,
          console.warn('peer error', err.type, err);
          // [ID] kalau masalah jaringan, tampilkan status "tidak stabil".
          if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) this.emit('status', 'unstable');
        }
      });
      // Losing the broker does not drop an open data channel; try to get it back quietly.
      // [ID] Putus dari server PeerJS tidak memutus koneksi ke lawan; coba sambung ulang diam-diam setelah 1 detik.
      peer.on('disconnected', () => {
        // [ID] Hanya kalau sesi belum ditutup.
        if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1000);
      });
    });
  }

  // [ID] Host menerima koneksi tamu.
  acceptConnection(conn) {
    // [ID] Sudah ada lawan yang tersambung:
    if (this.conn && this.conn.open) {
      // [ID] saat koneksi baru terbuka,
      conn.on('open', () => {
        // [ID] beri tahu "ruang penuh",
        conn.send({ t: 'full' });
        // [ID] lalu tutup setelah 300 ms.
        setTimeout(() => conn.close(), 300);
      });
      // [ID] (tolak)
      return;
    }
    // [ID] Belum ada lawan: pakai koneksi ini.
    this.attach(conn);
  }

  // [ID] Pasang pengendali untuk koneksi; onOpen dipanggil saat koneksi terbuka.
  attach(conn, onOpen) {
    // [ID] Simpan koneksi.
    this.conn = conn;
    // [ID] Saat koneksi terbuka:
    conn.on('open', () => {
      // [ID] catat waktu,
      this.lastSeen = Date.now();
      // [ID] mulai heartbeat,
      this.startHeartbeat();
      // [ID] status "terhubung",
      this.emit('status', 'connected');
      // [ID] panggil onOpen kalau ada,
      onOpen?.();
      // [ID] event "connected" (host lalu memulai game).
      this.emit('connected');
    });
    // [ID] Saat menerima pesan:
    conn.on('data', (msg) => {
      // [ID] catat waktu,
      this.lastSeen = Date.now();
      // [ID] kalau tadinya tidak stabil:
      if (this.unstable) {
        // [ID] tandai stabil lagi,
        this.unstable = false;
        // [ID] tampilkan "terhubung".
        this.emit('status', 'connected');
      }
      // [ID] Abaikan pesan yang bentuknya tidak benar.
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
      // [ID] Ping hanya untuk heartbeat: abaikan.
      if (msg.t === 'ping') return;
      // [ID] Lawan pamit:
      if (msg.t === 'bye') {
        // [ID] tangani lawan keluar,
        this.handleLeft();
        // [ID] (selesai)
        return;
      }
      // [ID] Pesan lain diteruskan ke game.
      this.emit('message', msg);
    });
    // [ID] Koneksi ditutup: lawan keluar.
    conn.on('close', () => this.handleLeft());
    // [ID] Error koneksi: catat saja.
    conn.on('error', (err) => console.warn('conn error', err));
  }

  // [ID] Heartbeat: kirim ping berkala dan cek apakah lawan masih ada.
  startHeartbeat() {
    // [ID] Hentikan timer lama.
    clearInterval(this.hb);
    // [ID] Setiap 3 detik:
    this.hb = setInterval(() => {
      // [ID] koneksi tidak terbuka: lewati,
      if (!this.conn?.open) return;
      // [ID] kirim ping,
      this.send({ t: 'ping' });
      // [ID] berapa lama lawan diam,
      const quiet = Date.now() - this.lastSeen;
      // [ID] lebih dari 12 detik: anggap keluar,
      if (quiet > NET.timeoutMs) this.handleLeft();
      // [ID] lebih dari ±6,6 detik: tandai tidak stabil.
      else if (quiet > NET.heartbeatMs * 2.2 && !this.unstable) {
        // [ID] (tidak stabil)
        this.unstable = true;
        // [ID] tampilkan statusnya.
        this.emit('status', 'unstable');
      }
    }, NET.heartbeatMs);
  }

  // [ID] Lawan keluar.
  handleLeft() {
    // [ID] Sesi sudah ditutup: abaikan.
    if (this.closed) return;
    // [ID] Hentikan heartbeat.
    clearInterval(this.hb);
    // [ID] Host: biarkan ruang tetap terbuka.
    if (this.role === 'host' && this.peer && !this.peer.destroyed) {
      // Keep the room open so a fresh opponent could join later; the game itself ends.
      // [ID] Lepas koneksi lama supaya lawan baru bisa masuk; gamenya sendiri berakhir.
      this.conn = null;
    }
    // [ID] Beri tahu layar bahwa lawan keluar.
    this.emit('left');
  }

  // [ID] Kirim pesan ke lawan.
  send(msg) {
    // [ID] Hanya kalau koneksi terbuka.
    if (this.conn?.open) {
      // [ID] Coba kirim.
      try {
        // [ID] Kirim.
        this.conn.send(msg);
      // [ID] Gagal:
      } catch (err) {
        // [ID] catat saja.
        console.warn('send failed', err);
      }
    }
  }

  // [ID] Tutup sesi.
  close() {
    // [ID] Sudah ditutup: abaikan.
    if (this.closed) return;
    // [ID] Pamit ke lawan.
    this.send({ t: 'bye' });
    // [ID] Tandai ditutup.
    this.closed = true;
    // [ID] Hentikan heartbeat.
    clearInterval(this.hb);
    // [ID] Setelah 120 ms (memberi waktu pesan "bye" terkirim):
    setTimeout(() => {
      // [ID] tutup koneksi (abaikan error),
      try {
        // [ID] (tutup koneksi)
        this.conn?.close();
      } catch {}
      // [ID] hancurkan Peer (abaikan error).
      try {
        // [ID] (hancurkan Peer)
        this.peer?.destroy();
      } catch {}
    }, 120);
  }
}
