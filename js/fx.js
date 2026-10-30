// Canvas particle effects: board bursts and the ambient ember background.
// [ID] Efek partikel di <canvas>: ledakan di papan (api, puing, debu, kembang api, label poin) dan bara api di latar belakang.

// [ID] true kalau pengguna mengaktifkan "kurangi animasi" di sistem operasinya.
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// [ID] Angka acak antara a dan b.
const rand = (a, b) => a + Math.random() * (b - a);

// [ID] Sesuaikan resolusi kanvas dengan ukuran tampilnya (supaya tajam di layar retina). Mengembalikan rasio piksel.
function fitCanvas(canvas) {
  // [ID] Rasio piksel layar (maks. 2 supaya tidak berat).
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // [ID] Ukuran kanvas di layar.
  const r = canvas.getBoundingClientRect();
  // [ID] Lebar dalam piksel asli (minimal 1).
  const w = Math.max(1, Math.round(r.width * dpr));
  // [ID] Tinggi dalam piksel asli.
  const h = Math.max(1, Math.round(r.height * dpr));
  // [ID] Ubah ukuran hanya kalau berbeda (mengubah ukuran menghapus isi kanvas).
  if (canvas.width !== w || canvas.height !== h) {
    // [ID] Set lebar.
    canvas.width = w;
    // [ID] Set tinggi.
    canvas.height = h;
  }
  // [ID] Rasio piksel.
  return dpr;
}

// [ID] Mesin partikel untuk satu kanvas.
export class Particles {
  // [ID] Siapkan kanvas.
  constructor(canvas) {
    // [ID] Simpan kanvas.
    this.canvas = canvas;
    // [ID] Konteks gambar 2D.
    this.ctx = canvas.getContext('2d');
    // [ID] Daftar partikel titik.
    this.ps = [];
    // [ID] Daftar gelombang cincin.
    this.rings = [];
    // [ID] Daftar label teks ("+20").
    this.labels = [];
    // [ID] Apakah loop animasi sedang berjalan.
    this.running = false;
    // [ID] Waktu frame terakhir.
    this.last = 0;
  }

  // x, y in CSS pixels relative to the canvas.
  // [ID] Buat ledakan partikel jenis "kind" di titik (x, y).
  burst(x, y, kind, scale = 1) {
    // [ID] Animasi dikurangi: tidak ada efek.
    if (reducedMotion()) return;
    // [ID] Bara api (kotak terbakar):
    if (kind === 'ember') {
      // [ID] 34 partikel.
      for (let i = 0; i < 34; i++) {
        // [ID] Arah acak ke atas (sudut -180°..0°).
        const a = rand(-Math.PI, 0);
        // [ID] Kecepatan acak.
        const sp = rand(30, 150) * scale;
        // [ID] Tambah partikel:
        this.ps.push({
          // [ID] posisi awal sedikit acak di sekitar titik,
          x: x + rand(-10, 10) * scale, y: y + rand(-6, 10) * scale,
          // [ID] kecepatan x dan y (ke atas),
          vx: Math.cos(a) * sp * 0.7, vy: Math.sin(a) * sp - 30,
          // [ID] gravitasi negatif (melayang naik), hambatan udara, umur, usia,
          g: -60, drag: 1.6, life: rand(0.6, 1.3), age: 0,
          // [ID] ukuran, warna (oranye-kuning), bercahaya.
          size: rand(1.2, 3.4) * scale, hue: rand(14, 42), glow: true,
        });
      }
      // [ID] Gelombang cincin oranye.
      this.rings.push({ x, y, r: 4, max: 34 * scale, age: 0, life: 0.45, color: '255,140,60' });
    // [ID] Puing (kotak dijebak):
    } else if (kind === 'debris') {
      // [ID] 26 pecahan.
      for (let i = 0; i < 26; i++) {
        // [ID] Arah acak ke segala arah.
        const a = rand(0, Math.PI * 2);
        // [ID] Kecepatan acak.
        const sp = rand(40, 190) * scale;
        // [ID] Tambah partikel:
        this.ps.push({
          // [ID] posisi dan kecepatan,
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          // [ID] gravitasi kuat (jatuh), hambatan, umur pendek,
          g: 420, drag: 2.2, life: rand(0.35, 0.7), age: 0,
          // [ID] ukuran, warna abu-abu, tidak bercahaya, berbentuk kotak.
          size: rand(1.5, 4) * scale, shade: rand(30, 80), glow: false, square: true,
        });
      }
      // [ID] 10 percikan merah.
      for (let i = 0; i < 10; i++) {
        // [ID] Arah acak.
        const a = rand(0, Math.PI * 2);
        // [ID] Tambah percikan:
        this.ps.push({
          // [ID] posisi dan kecepatan acak,
          x, y, vx: Math.cos(a) * rand(20, 80), vy: Math.sin(a) * rand(20, 80),
          // [ID] tanpa gravitasi, umur pendek, kecil, merah, bercahaya.
          g: 0, drag: 3, life: rand(0.25, 0.5), age: 0, size: rand(1, 2.2) * scale, hue: 4, glow: true,
        });
      }
      // [ID] Gelombang cincin merah.
      this.rings.push({ x, y, r: 6, max: 46 * scale, age: 0, life: 0.4, color: '255,90,79' });
    // [ID] Debu mendarat:
    } else if (kind === 'land') {
      // [ID] 14 kepulan debu.
      for (let i = 0; i < 14; i++) {
        // [ID] Arah menyamping.
        const a = rand(Math.PI * 0.9, Math.PI * 2.1);
        // [ID] Kecepatan pelan.
        const sp = rand(20, 70) * scale;
        // [ID] Tambah partikel:
        this.ps.push({
          // [ID] dari kaki knight, menyebar ke samping,
          x: x + rand(-12, 12) * scale, y: y + 14 * scale, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4,
          // [ID] gravitasi kecil, umur pendek, ukuran, abu-abu terang, lembut.
          g: 30, drag: 3, life: rand(0.3, 0.6), age: 0, size: rand(2, 4) * scale, shade: 150, glow: false, soft: true,
        });
      }
    // [ID] Kembang api kemenangan:
    } else if (kind === 'victory') {
      // [ID] 90 partikel.
      for (let i = 0; i < 90; i++) {
        // [ID] Arah acak.
        const a = rand(0, Math.PI * 2);
        // [ID] Kecepatan tinggi.
        const sp = rand(60, 320) * scale;
        // [ID] Tambah partikel:
        this.ps.push({
          // [ID] posisi dan kecepatan,
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          // [ID] gravitasi, umur panjang, ukuran, warna emas, bercahaya.
          g: 140, drag: 1.2, life: rand(0.9, 1.8), age: 0, size: rand(1.5, 3.5) * scale, hue: rand(30, 52), glow: true,
        });
      }
    }
    // [ID] Mulai loop animasi.
    this.start();
  }

  // Floating score label such as "+40", rising from (x, y).
  // [ID] Label poin (misalnya "+20") yang naik dari (x, y).
  text(x, y, label, scale = 1) {
    // [ID] Animasi dikurangi: tidak ada label (skor tetap muncul di HUD).
    if (reducedMotion()) return;
    // [ID] Tambah label dengan umur 1,15 detik dan ukuran huruf 24px x skala.
    this.labels.push({ x, y, label, age: 0, life: 1.15, size: 24 * scale });
    // [ID] Mulai loop animasi.
    this.start();
  }

  // [ID] Mulai loop animasi kalau belum berjalan.
  start() {
    // [ID] Sudah berjalan: selesai.
    if (this.running) return;
    // [ID] Tandai berjalan.
    this.running = true;
    // [ID] Catat waktu sekarang.
    this.last = performance.now();
    // [ID] Minta browser memanggil frame() sebelum layar digambar berikutnya.
    requestAnimationFrame((t) => this.frame(t));
  }

  // [ID] Satu frame animasi (sekitar 60 kali per detik).
  frame(t) {
    // [ID] Selisih waktu dari frame sebelumnya dalam detik (maks. 0,05 supaya tidak melompat jauh).
    const dt = Math.min(0.05, (t - this.last) / 1000);
    // [ID] Simpan waktu frame ini.
    this.last = t;
    // [ID] Sesuaikan ukuran kanvas.
    const dpr = fitCanvas(this.canvas);
    // [ID] Konteks gambar.
    const ctx = this.ctx;
    // [ID] Skala gambar sesuai rasio piksel.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // [ID] Hapus gambar frame sebelumnya.
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // [ID] Gambar setiap cincin:
    for (const r of this.rings) {
      // [ID] tambah usia,
      r.age += dt;
      // [ID] k = progres 0..1,
      const k = r.age / r.life;
      // [ID] jari-jari membesar cepat lalu melambat,
      const rad = r.r + (r.max - r.r) * (1 - (1 - k) ** 3);
      // [ID] mode cahaya (warna dijumlahkan, terlihat bersinar),
      ctx.globalCompositeOperation = 'lighter';
      // [ID] warna memudar,
      ctx.strokeStyle = `rgba(${r.color},${Math.max(0, 0.7 * (1 - k))})`;
      // [ID] garis menipis,
      ctx.lineWidth = 2.5 * (1 - k) + 0.5;
      // [ID] mulai garis,
      ctx.beginPath();
      // [ID] lingkaran,
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      // [ID] gambar.
      ctx.stroke();
    }
    // [ID] Buang cincin yang habis umurnya.
    this.rings = this.rings.filter((r) => r.age < r.life);

    // [ID] Perbarui dan gambar setiap partikel:
    for (const p of this.ps) {
      // [ID] tambah usia,
      p.age += dt;
      // [ID] hambatan udara mengurangi kecepatan x,
      p.vx -= p.vx * p.drag * dt;
      // [ID] dan kecepatan y,
      p.vy -= p.vy * p.drag * dt;
      // [ID] gravitasi menambah kecepatan y,
      p.vy += p.g * dt;
      // [ID] pindahkan x,
      p.x += p.vx * dt;
      // [ID] pindahkan y,
      p.y += p.vy * dt;
      // [ID] k = sisa umur 1..0,
      const k = 1 - p.age / p.life;
      // [ID] sudah mati: lewati.
      if (k <= 0) continue;
      // [ID] Partikel bercahaya:
      if (p.glow) {
        // [ID] mode cahaya,
        ctx.globalCompositeOperation = 'lighter';
        // [ID] ukuran mengecil seiring umur,
        const s = p.size * (0.6 + 0.4 * k);
        // [ID] warna HSL memudar,
        ctx.fillStyle = `hsla(${p.hue}, 100%, ${55 + 25 * k}%, ${k})`;
        // [ID] warna pendaran,
        ctx.shadowColor = `hsla(${p.hue}, 100%, 55%, ${k})`;
        // [ID] besar pendaran,
        ctx.shadowBlur = 8;
        // [ID] mulai bentuk,
        ctx.beginPath();
        // [ID] lingkaran,
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        // [ID] isi warna,
        ctx.fill();
        // [ID] matikan pendaran.
        ctx.shadowBlur = 0;
      // [ID] Partikel biasa (puing/debu):
      } else {
        // [ID] mode gambar normal,
        ctx.globalCompositeOperation = 'source-over';
        // [ID] warna abu-abu (debu lebih transparan),
        ctx.fillStyle = p.soft ? `rgba(${p.shade},${p.shade - 10},${p.shade - 20},${0.35 * k})` : `rgba(${p.shade},${p.shade - 6},${p.shade - 10},${k})`;
        // [ID] puing digambar kotak,
        if (p.square) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        // [ID] debu digambar lingkaran yang membesar:
        else {
          // [ID] mulai bentuk,
          ctx.beginPath();
          // [ID] lingkaran,
          ctx.arc(p.x, p.y, p.size * (1.5 - k * 0.5), 0, Math.PI * 2);
          // [ID] isi warna.
          ctx.fill();
        }
      }
    }
    // [ID] Buang partikel yang habis umurnya.
    this.ps = this.ps.filter((p) => p.age < p.life);
    // [ID] Kembalikan mode gambar normal.
    ctx.globalCompositeOperation = 'source-over';

    // [ID] Gambar setiap label poin:
    for (const l of this.labels) {
      // [ID] tambah usia,
      l.age += dt;
      // [ID] progres 0..1,
      const k = l.age / l.life;
      // [ID] tinggi naik (cepat lalu melambat, maks. 46px),
      const rise = 46 * (1 - (1 - k) ** 2);
      // [ID] efek "pop": membesar ke 1,1x lalu kembali 1x,
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : k < 0.3 ? 1.1 - ((k - 0.15) / 0.15) * 0.1 : 1;
      // [ID] mulai memudar setelah 60% umur,
      ctx.globalAlpha = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
      // [ID] huruf tebal Cinzel,
      ctx.font = `900 ${Math.round(l.size * pop)}px Cinzel, Georgia, serif`;
      // [ID] rata tengah horizontal,
      ctx.textAlign = 'center';
      // [ID] rata tengah vertikal,
      ctx.textBaseline = 'middle';
      // [ID] tebal garis tepi,
      ctx.lineWidth = 4;
      // [ID] warna garis tepi gelap,
      ctx.strokeStyle = 'rgba(20, 8, 0, 0.85)';
      // [ID] gambar garis tepi teks,
      ctx.strokeText(l.label, l.x, l.y - rise);
      // [ID] warna isi emas,
      ctx.fillStyle = '#ffd36b';
      // [ID] warna pendaran,
      ctx.shadowColor = 'rgba(255, 160, 60, 0.8)';
      // [ID] besar pendaran,
      ctx.shadowBlur = 12;
      // [ID] gambar isi teks,
      ctx.fillText(l.label, l.x, l.y - rise);
      // [ID] matikan pendaran,
      ctx.shadowBlur = 0;
      // [ID] kembalikan transparansi.
      ctx.globalAlpha = 1;
    }
    // [ID] Buang label yang habis umurnya.
    this.labels = this.labels.filter((l) => l.age < l.life);

    // [ID] Masih ada yang hidup: minta frame berikutnya.
    if (this.ps.length || this.rings.length || this.labels.length) requestAnimationFrame((tt) => this.frame(tt));
    // [ID] Semua sudah habis:
    else {
      // [ID] bersihkan kanvas,
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // [ID] hentikan loop.
      this.running = false;
    }
  }
}

// Slow embers drifting up behind every screen.
// [ID] Bara api pelan yang melayang naik di latar belakang semua layar.
export function startBackgroundEmbers(canvas) {
  // [ID] Animasi dikurangi: tidak ada bara.
  if (reducedMotion()) return;
  // [ID] Konteks gambar.
  const ctx = canvas.getContext('2d');
  // [ID] Daftar bara.
  let embers = [];
  // [ID] Lebar layar (CSS piksel).
  let w = 0;
  // [ID] Tinggi layar.
  let h = 0;
  // [ID] Waktu frame terakhir.
  let last = performance.now();
  // [ID] ID permintaan frame (untuk dibatalkan).
  let raf = 0;

  // [ID] Buat satu bara baru (initial = di posisi acak; selain itu dari bawah layar).
  const spawn = (initial) => ({
    // [ID] posisi x acak,
    x: rand(0, w),
    // [ID] posisi y,
    y: initial ? rand(0, h) : h + 10,
    // [ID] kecepatan naik,
    vy: rand(10, 34),
    // [ID] kecepatan goyang,
    sway: rand(0.4, 1.4),
    // [ID] fase goyang awal,
    phase: rand(0, Math.PI * 2),
    // [ID] ukuran,
    size: rand(0.6, 2.1),
    // [ID] warna,
    hue: rand(16, 38),
    // [ID] transparansi.
    a: rand(0.25, 0.8),
  });

  // [ID] Sesuaikan ukuran kanvas dan jumlah bara dengan layar.
  function resize() {
    // [ID] Sesuaikan resolusi.
    const dpr = fitCanvas(canvas);
    // [ID] Lebar dalam CSS piksel.
    w = canvas.width / dpr;
    // [ID] Tinggi dalam CSS piksel.
    h = canvas.height / dpr;
    // [ID] Skala gambar.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // [ID] Jumlah bara sesuai luas layar (maks. 70).
    const target = Math.round(Math.min(70, (w * h) / 22000));
    // [ID] Tambah kalau kurang.
    while (embers.length < target) embers.push(spawn(true));
    // [ID] Potong kalau lebih.
    embers.length = target;
  }

  // [ID] Satu frame latar belakang.
  function frame(t) {
    // [ID] Selisih waktu (detik).
    const dt = Math.min(0.05, (t - last) / 1000);
    // [ID] Simpan waktu.
    last = t;
    // [ID] Hapus frame sebelumnya.
    ctx.clearRect(0, 0, w, h);
    // [ID] Mode cahaya.
    ctx.globalCompositeOperation = 'lighter';
    // [ID] Untuk setiap bara:
    for (const e of embers) {
      // [ID] naik,
      e.y -= e.vy * dt;
      // [ID] maju fase goyang,
      e.phase += dt * e.sway;
      // [ID] posisi x bergoyang kiri-kanan,
      const x = e.x + Math.sin(e.phase) * 14;
      // [ID] memudar saat mendekati atas,
      const fade = Math.min(1, e.y / (h * 0.9));
      // [ID] keluar dari atas layar: ganti dengan bara baru dari bawah,
      if (e.y < -10) Object.assign(e, spawn(false));
      // [ID] warna,
      ctx.fillStyle = `hsla(${e.hue}, 100%, 62%, ${e.a * fade})`;
      // [ID] mulai bentuk,
      ctx.beginPath();
      // [ID] lingkaran,
      ctx.arc(x, e.y, e.size, 0, Math.PI * 2);
      // [ID] isi.
      ctx.fill();
    }
    // [ID] Minta frame berikutnya.
    raf = requestAnimationFrame(frame);
  }

  // [ID] Atur ukuran awal.
  resize();
  // [ID] Atur ulang saat jendela diubah ukurannya.
  window.addEventListener('resize', resize);
  // [ID] Saat tab disembunyikan/ditampilkan:
  document.addEventListener('visibilitychange', () => {
    // [ID] tab tersembunyi: hentikan animasi (hemat baterai),
    if (document.hidden) cancelAnimationFrame(raf);
    // [ID] tab terlihat lagi:
    else {
      // [ID] reset waktu supaya tidak melompat,
      last = performance.now();
      // [ID] lanjutkan animasi.
      raf = requestAnimationFrame(frame);
    }
  });
  // [ID] Mulai animasi.
  raf = requestAnimationFrame(frame);
}
