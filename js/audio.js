// Small synthesized sound effects (WebAudio, no audio files).
// [ID] Efek suara yang dibuat langsung oleh kode (Web Audio API), tanpa file audio.

// [ID] Konteks audio (dibuat saat pertama dibutuhkan).
let ctx = null;
// [ID] Pengatur volume utama.
let master = null;
// [ID] Suara aktif atau tidak.
let enabled = true;

// [ID] Pastikan konteks audio ada dan aktif. Mengembalikan konteks, atau null kalau suara mati/tidak didukung.
function ensure() {
  // [ID] Suara dimatikan: tidak ada konteks.
  if (!enabled) return null;
  // [ID] Belum ada konteks: buat.
  if (!ctx) {
    // [ID] Ambil kelas AudioContext (webkit untuk Safari lama).
    const AC = window.AudioContext || window.webkitAudioContext;
    // [ID] Browser tidak mendukung audio.
    if (!AC) return null;
    // [ID] Buat konteks.
    ctx = new AC();
    // [ID] Buat pengatur volume.
    master = ctx.createGain();
    // [ID] Volume utama 50%.
    master.gain.value = 0.5;
    // [ID] Sambungkan ke speaker.
    master.connect(ctx.destination);
  }
  // [ID] Kalau konteks sedang ditangguhkan, aktifkan lagi.
  if (ctx.state === 'suspended') ctx.resume();
  // [ID] Konteks siap.
  return ctx;
}

// [ID] Nyalakan atau matikan suara.
export function setSoundEnabled(on) {
  // [ID] Simpan pilihan.
  enabled = on;
  // [ID] Kalau dimatikan, tangguhkan konteks audio.
  if (!on && ctx) ctx.suspend();
}

// [ID] Apakah suara aktif.
export function isSoundEnabled() {
  // [ID] Nilai saat ini.
  return enabled;
}

// Browsers only allow audio after a user gesture; call this from the first click.
// [ID] Browser hanya mengizinkan suara setelah pengguna berinteraksi; dipanggil dari klik pertama.
export function unlockAudio() {
  // [ID] Buat/aktifkan konteks audio.
  ensure();
}

// [ID] Mainkan satu nada: jenis gelombang, frekuensi awal → akhir, durasi, volume, jeda.
function tone({ type = 'sine', from, to, dur, gain = 0.3, delay = 0 }) {
  // [ID] Konteks audio.
  const c = ensure();
  // [ID] Tidak ada: diam.
  if (!c) return;
  // [ID] Waktu mulai (sekarang + jeda).
  const t0 = c.currentTime + delay;
  // [ID] Pembangkit gelombang (osilator).
  const o = c.createOscillator();
  // [ID] Pengatur volume nada ini.
  const g = c.createGain();
  // [ID] Jenis gelombang: sine, triangle, square, dll.
  o.type = type;
  // [ID] Frekuensi awal.
  o.frequency.setValueAtTime(from, t0);
  // [ID] Kalau ada frekuensi akhir, geser frekuensi perlahan (efek naik/turun).
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  // [ID] Volume mulai hampir 0.
  g.gain.setValueAtTime(0.0001, t0);
  // [ID] Naik cepat ke volume penuh (12 ms) supaya tidak ada bunyi "klik".
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  // [ID] Turun pelan sampai hampir 0 di akhir durasi.
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  // [ID] Sambungkan: osilator → volume nada → volume utama.
  o.connect(g).connect(master);
  // [ID] Mulai bunyi.
  o.start(t0);
  // [ID] Berhenti sedikit setelah durasi.
  o.stop(t0 + dur + 0.02);
}

// [ID] Buffer derau (noise) yang dibuat sekali.
let noiseBuf = null;
// [ID] Mainkan derau yang disaring: untuk suara api, runtuh, dll.
function noise({ dur, gain = 0.3, freq = 1200, q = 0.8, type = 'bandpass', delay = 0, sweepTo }) {
  // [ID] Konteks audio.
  const c = ensure();
  // [ID] Tidak ada: diam.
  if (!c) return;
  // [ID] Belum ada buffer derau: buat.
  if (!noiseBuf) {
    // [ID] Buffer 1 kanal, panjang 1 detik.
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    // [ID] Ambil data sampelnya.
    const d = noiseBuf.getChannelData(0);
    // [ID] Isi dengan angka acak -1..1 (derau putih).
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // [ID] Waktu mulai.
  const t0 = c.currentTime + delay;
  // [ID] Sumber suara dari buffer.
  const src = c.createBufferSource();
  // [ID] Pakai buffer derau.
  src.buffer = noiseBuf;
  // [ID] Filter untuk membentuk warna suara.
  const f = c.createBiquadFilter();
  // [ID] Jenis filter: bandpass, lowpass, highpass.
  f.type = type;
  // [ID] Frekuensi filter awal.
  f.frequency.setValueAtTime(freq, t0);
  // [ID] Kalau ada, geser frekuensi filter (efek "wuss").
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  // [ID] Ketajaman filter.
  f.Q.value = q;
  // [ID] Pengatur volume.
  const g = c.createGain();
  // [ID] Mulai hampir 0.
  g.gain.setValueAtTime(0.0001, t0);
  // [ID] Naik cepat.
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  // [ID] Turun pelan.
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  // [ID] Sambungkan: sumber → filter → volume → volume utama.
  src.connect(f).connect(g).connect(master);
  // [ID] Mulai.
  src.start(t0);
  // [ID] Berhenti.
  src.stop(t0 + dur + 0.05);
}

// [ID] Kumpulan efek suara yang dipakai game.
export const sfx = {
  // [ID] Pilih: nada pendek naik.
  select() { tone({ type: 'triangle', from: 660, to: 880, dur: 0.07, gain: 0.12 }); },
  // [ID] Lompat:
  jump() {
    // [ID] nada naik (melompat),
    tone({ type: 'triangle', from: 260, to: 620, dur: 0.22, gain: 0.22 });
    // [ID] lalu nada rendah turun (mendarat) setelah 0,3 detik.
    tone({ type: 'sine', from: 140, to: 90, dur: 0.12, gain: 0.25, delay: 0.3 });
  },
  // [ID] Terbakar:
  burn() {
    // [ID] derau yang naik (suara api menyala),
    noise({ dur: 0.55, gain: 0.22, freq: 900, sweepTo: 2600, q: 0.6 });
    // [ID] plus desis tinggi.
    noise({ dur: 0.3, gain: 0.1, freq: 3500, type: 'highpass', delay: 0.05 });
  },
  // [ID] Jebakan:
  trap() {
    // [ID] dentuman rendah,
    tone({ type: 'sine', from: 120, to: 42, dur: 0.38, gain: 0.5 });
    // [ID] gemuruh runtuh,
    noise({ dur: 0.35, gain: 0.3, freq: 420, sweepTo: 120, q: 1.2, type: 'lowpass' });
    // [ID] dan pecahan tinggi.
    noise({ dur: 0.12, gain: 0.18, freq: 2400, type: 'highpass', delay: 0.02 });
  },
  // [ID] Klik salah: dengung pendek.
  invalid() { tone({ type: 'square', from: 180, to: 140, dur: 0.12, gain: 0.08 }); },
  // [ID] Ganti giliran (mode lokal): ting.
  turn() { tone({ type: 'sine', from: 880, dur: 0.09, gain: 0.08 }); },
  // [ID] Menang:
  win() {
    // [ID] empat nada naik C-E-G-C berurutan,
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, dur: 0.35, gain: 0.2, delay: i * 0.11 }));
    // [ID] plus nada tinggi penutup.
    tone({ type: 'sine', from: 1568, dur: 0.6, gain: 0.08, delay: 0.45 });
  },
  // [ID] Kalah:
  lose() {
    // [ID] empat nada turun G-E-C-G yang sedikit menurun (sedih).
    [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, to: f * 0.97, dur: 0.38, gain: 0.18, delay: i * 0.14 }));
  },
};
