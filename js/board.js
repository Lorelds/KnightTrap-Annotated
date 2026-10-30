// Board view: DOM cells, knight sprites, jump animation and particle effects.
// Holds no game state; game.js tells it what to draw.
// [ID] Tampilan papan: kotak-kotak di halaman, gambar knight, animasi lompatan, dan efek partikel.
// [ID] Tidak menyimpan state game; game.js yang memberi tahu apa yang harus digambar.

// [ID] N = 7, SIZE = 49.
import { N, SIZE } from './config.js';
// [ID] Status kotak dan fungsi nama kotak (untuk label aksesibilitas).
import { BURNED, TRAP, squareName } from './rules.js';
// [ID] Mesin partikel dan cek "kurangi animasi".
import { Particles, reducedMotion } from './fx.js';

// [ID] HTML untuk gambar knight (memakai simbol SVG yang didefinisikan di index.html); p0 biru, p1 oranye.
const knightSvg = (side) => `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#knight-glyph" class="kglyph p${side}"/></svg>`;
// [ID] Tunggu ms milidetik (dipakai dengan await).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// [ID] Ubah indeks kotak menjadi { r: baris, c: kolom }.
const rc = (sq) => ({ r: Math.floor(sq / N), c: sq % N });
// [ID] Buat teks CSS transform untuk memindahkan knight ke kolom c, baris r (memperhitungkan celah antar kotak),
const tf = (c, r, gap, lift = 0, scale = 1) =>
  // [ID] plus angkat ke atas (lift, dalam %) dan perbesar (scale) untuk efek lompat.
  `translate(calc(${c} * (100% + ${gap}px)), calc(${r} * (100% + ${gap}px))) translateY(${lift}%) scale(${scale})`;

// [ID] Kelas tampilan papan.
export class BoardView {
  // [ID] boardEl = elemen papan, shellEl = bingkai papan.
  constructor(boardEl, shellEl) {
    // [ID] Simpan elemen papan.
    this.el = boardEl;
    // [ID] Simpan bingkai.
    this.shell = shellEl;
    // [ID] Fungsi yang dipanggil saat kotak diklik (diisi oleh game.js).
    this.onCell = null;
    // [ID] Fungsi yang dipanggil saat knight diklik.
    this.onKnight = null;
    // [ID] Daftar 49 tombol kotak.
    this.cells = [];

    // [ID] Fragment = wadah sementara supaya 49 kotak dimasukkan ke halaman sekaligus (lebih cepat).
    const frag = document.createDocumentFragment();
    // [ID] Buat 49 kotak.
    for (let sq = 0; sq < SIZE; sq++) {
      // [ID] Baris dan kolom kotak ini.
      const { r, c } = rc(sq);
      // [ID] Kotak dibuat sebagai tombol (bisa diklik dan diakses keyboard).
      const b = document.createElement('button');
      // [ID] type="button" supaya tidak mengirim form.
      b.type = 'button';
      // [ID] Class dasar.
      b.className = 'cell';
      // [ID] Simpan indeks kotak di atribut data-sq.
      b.dataset.sq = sq;
      // [ID] Pola papan catur: kotak gelap kalau baris + kolom ganjil.
      if ((r + c) % 2 === 1) b.classList.add('dark');
      // [ID] Baris paling bawah: tulis huruf kolom (a-g).
      if (r === N - 1) b.insertAdjacentHTML('beforeend', `<span class="coord f">${'abcdefg'[c]}</span>`);
      // [ID] Kolom paling kiri: tulis angka baris (1-7).
      if (c === 0) b.insertAdjacentHTML('beforeend', `<span class="coord r">${N - r}</span>`);
      // [ID] Masukkan ke wadah.
      frag.appendChild(b);
      // [ID] Simpan di daftar.
      this.cells.push(b);
    }
    // [ID] Masukkan semua kotak ke papan sekaligus.
    this.el.appendChild(frag);

    // [ID] Buat dua knight (side 0 dan 1).
    this.knights = [0, 1].map((side) => {
      // [ID] Elemen knight.
      const k = document.createElement('div');
      // [ID] Class knight.
      k.className = 'knight';
      // [ID] Simpan sisinya.
      k.dataset.side = side;
      // [ID] Isi dengan gambar SVG.
      k.innerHTML = knightSvg(side);
      // [ID] Saat diklik, beri tahu game (untuk batal lompat).
      k.addEventListener('click', () => this.onKnight?.(side));
      // [ID] Masukkan ke papan.
      this.el.appendChild(k);
      // [ID] Simpan.
      return k;
    });

    // [ID] Kanvas untuk efek partikel, di atas papan.
    const canvas = document.createElement('canvas');
    // [ID] Class fx.
    canvas.className = 'fx';
    // [ID] Masukkan ke papan.
    this.el.appendChild(canvas);
    // [ID] Simpan kanvasnya.
    this.fxCanvas = canvas;
    // [ID] Mesin partikel yang menggambar di kanvas itu.
    this.particles = new Particles(canvas);

    // [ID] Satu listener klik untuk seluruh papan (event delegation).
    this.el.addEventListener('click', (e) => {
      // [ID] Cari kotak yang diklik (closest naik ke elemen induk terdekat dengan class cell).
      const b = e.target.closest('.cell');
      // [ID] Kalau ketemu, kirim indeksnya ke game.
      if (b) this.onCell?.(Number(b.dataset.sq));
    });
  }

  // [ID] Letakkan knight "side" di kotak sq (lewat variabel CSS --r dan --c).
  placeKnight(side, sq) {
    // [ID] Baris dan kolom.
    const { r, c } = rc(sq);
    // [ID] Elemen knight.
    const k = this.knights[side];
    // [ID] Set baris.
    k.style.setProperty('--r', r);
    // [ID] Set kolom.
    k.style.setProperty('--c', c);
  }

  /**
   * view: { state, legal: [], trappable: bool, threats: [], turnSide, lastLand, lastTrap, dead, selectableKnight }
   */
  // [ID] Gambar papan sesuai data view dari game.js.
  render(view) {
    // [ID] State papan.
    const { state } = view;
    // [ID] Kotak lompatan legal (Set supaya cepat dicek).
    const legal = new Set(view.legal || []);
    // [ID] Kotak tujuan lawan.
    const threats = new Set(view.threats || []);
    // [ID] Untuk setiap kotak:
    for (let sq = 0; sq < SIZE; sq++) {
      // [ID] Elemen kotak.
      const b = this.cells[sq];
      // [ID] Status kotak (0/1/2).
      const v = state.cells[sq];
      // [ID] Apakah ditempati knight.
      const occupied = sq === state.pos[0] || sq === state.pos[1];
      // [ID] Class burned kalau terbakar.
      b.classList.toggle('burned', v === BURNED);
      // [ID] Class trap kalau jebakan.
      b.classList.toggle('trap', v === TRAP);
      // [ID] Apakah lompatan legal.
      const isLegal = legal.has(sq);
      // [ID] Apakah bisa dijebak (fase jebakan, kosong, tidak ditempati).
      const isTrappable = view.trappable && v === 0 && !occupied;
      // [ID] Class legal (tampil sebagai titik).
      b.classList.toggle('legal', isLegal);
      // [ID] Class trappable.
      b.classList.toggle('trappable', isTrappable);
      // [ID] Class threat: bisa dijebak dan merupakan tujuan lawan (bergaris).
      b.classList.toggle('threat', isTrappable && threats.has(sq));
      // [ID] Sorot kotak pendaratan terakhir.
      b.classList.toggle('last-land', sq === view.lastLand);
      // [ID] Sorot jebakan terakhir.
      b.classList.toggle('last-trap', sq === view.lastTrap && v === TRAP);
      // [ID] Apakah kotak bisa diklik.
      const actionable = isLegal || isTrappable;
      // [ID] Hanya kotak yang bisa diklik yang bisa dicapai dengan tombol Tab.
      b.tabIndex = actionable ? 0 : -1;
      // [ID] Beri tahu pembaca layar apakah kotak aktif.
      b.setAttribute('aria-disabled', actionable ? 'false' : 'true');
      // [ID] Deskripsi status kotak.
      const what = v === BURNED ? 'burned' : v === TRAP ? 'trap' : occupied ? 'knight' : 'open';
      // [ID] Label untuk pembaca layar, misalnya "d4 open, jump here".
      b.setAttribute('aria-label', `${squareName(sq)} ${what}${isLegal ? ', jump here' : ''}${isTrappable ? ', place trap' : ''}`);
    }
    // [ID] Simpan giliran di atribut papan (dipakai CSS untuk warna).
    this.el.dataset.side = view.turnSide ?? '';
    // [ID] (lanjutan, di bingkai)
    this.shell.dataset.turn = view.turnSide ?? '';
    // [ID] Kursor bidik saat fase jebakan.
    this.shell.classList.toggle('trap-mode', !!view.trappable);
    // [ID] Untuk kedua knight:
    for (const side of [0, 1]) {
      // [ID] Elemen knight.
      const k = this.knights[side];
      // [ID] Letakkan di posisinya.
      this.placeKnight(side, state.pos[side]);
      // [ID] Sorot knight yang sedang jalan.
      k.classList.toggle('is-turn', view.turnSide === side && view.dead == null);
      // [ID] Efek knight kalah.
      k.classList.toggle('is-dead', view.dead === side);
      // [ID] Knight yang bisa diklik untuk batal.
      k.classList.toggle('selectable', view.selectableKnight === side);
    }
  }

  // [ID] Animasi knight melompat dari kotak "from" ke "to".
  async animateJump(side, from, to) {
    // [ID] Elemen knight.
    const k = this.knights[side];
    // [ID] Posisi akhir langsung diset.
    this.placeKnight(side, to);
    // [ID] Kalau pengguna minta kurangi animasi, selesai di sini.
    if (reducedMotion()) return;
    // [ID] Baris/kolom asal.
    const a = rc(from);
    // [ID] Baris/kolom tujuan.
    const b = rc(to);
    // [ID] Kolom titik tengah.
    const mc = (a.c + b.c) / 2;
    // [ID] Baris titik tengah.
    const mr = (a.r + b.r) / 2;
    // Keyframes need a concrete gap; it changes with the breakpoint (--gap in CSS).
    // [ID] Ambil lebar celah antar kotak saat ini (berbeda di layar kecil).
    const gap = parseFloat(getComputedStyle(this.el).columnGap) || 0;
    // [ID] Jalankan animasi Web Animations API:
    const anim = k.animate(
      // [ID] Keyframe:
      [
        // [ID] mulai di kotak asal,
        { transform: tf(a.c, a.r, gap, 0, 1), offset: 0 },
        // [ID] di tengah jalan naik 42% dan membesar 1,28x (puncak lompatan),
        { transform: tf(mc, mr, gap, -42, 1.28), offset: 0.5 },
        // [ID] mendarat sedikit tertekan (0,94x),
        { transform: tf(b.c, b.r, gap, 4, 0.94), offset: 0.88 },
        // [ID] lalu kembali normal.
        { transform: tf(b.c, b.r, gap, 0, 1), offset: 1 },
      ],
      // [ID] Lama 480 ms dengan kurva percepatan.
      { duration: 480, easing: 'cubic-bezier(.45,.05,.35,1)' },
    );
    // [ID] Knight yang melompat digambar di atas yang lain.
    k.style.zIndex = 5;
    // [ID] Tunggu animasi selesai.
    try {
      // [ID] (menunggu)
      await anim.finished;
    // [ID] Animasi dibatalkan: tidak apa-apa.
    } catch {
      /* cancelled */
    }
    // [ID] Kembalikan urutan gambar normal.
    k.style.zIndex = '';
    // [ID] Efek debu saat mendarat.
    this.fx(to, 'land');
  }

  // [ID] Titik tengah kotak sq, dalam koordinat kanvas efek.
  center(sq) {
    // [ID] Posisi dan ukuran kotak di layar.
    const cr = this.cells[sq].getBoundingClientRect();
    // [ID] Posisi kanvas di layar.
    const fr = this.fxCanvas.getBoundingClientRect();
    // [ID] Titik tengah relatif terhadap kanvas, dan skala efek sesuai ukuran kotak.
    return { x: cr.left + cr.width / 2 - fr.left, y: cr.top + cr.height / 2 - fr.top, scale: cr.width / 70 };
  }

  // [ID] Jalankan efek partikel jenis "kind" di kotak sq.
  fx(sq, kind) {
    // [ID] Titik tengah kotak.
    const { x, y, scale } = this.center(sq);
    // [ID] Ledakkan partikel; skala dibatasi 0,6..1,3.
    this.particles.burst(x, y, kind, Math.max(0.6, Math.min(1.3, scale)));
  }

  // [ID] Tampilkan label poin (misalnya "+20") yang naik dari kotak sq.
  popText(sq, label) {
    // [ID] Titik tengah kotak.
    const { x, y, scale } = this.center(sq);
    // [ID] Label muncul sedikit di atas tengah kotak; skala dibatasi 0,7..1,2.
    this.particles.text(x, y - 12 * scale, label, Math.max(0.7, Math.min(1.2, scale)));
  }

  // [ID] Putar ulang animasi CSS "cls" di kotak sq.
  pulse(sq, cls) {
    // [ID] Elemen kotak.
    const b = this.cells[sq];
    // [ID] Hapus class dulu.
    b.classList.remove(cls);
    // [ID] Paksa browser menghitung ulang tata letak, supaya animasi bisa diputar ulang.
    void b.offsetWidth;
    // [ID] Pasang class lagi: animasi mulai.
    b.classList.add(cls);
    // [ID] Hapus class setelah 800 ms.
    setTimeout(() => b.classList.remove(cls), 800);
  }

  // [ID] Efek kotak terbakar.
  burn(sq) {
    // [ID] Animasi menyala.
    this.pulse(sq, 'ignite');
    // [ID] Partikel bara api.
    this.fx(sq, 'ember');
  }

  // [ID] Efek kotak dijebak (runtuh).
  async trap(sq) {
    // [ID] Animasi jatuh.
    this.pulse(sq, 'drop');
    // [ID] Partikel puing.
    this.fx(sq, 'debris');
    // [ID] Kalau animasi diizinkan:
    if (!reducedMotion()) {
      // [ID] hapus class guncangan,
      this.shell.classList.remove('shake');
      // [ID] paksa hitung ulang,
      void this.shell.offsetWidth;
      // [ID] guncang papan,
      this.shell.classList.add('shake');
      // [ID] hapus class setelah 350 ms.
      setTimeout(() => this.shell.classList.remove('shake'), 350);
    }
    // [ID] Tunggu 260 ms supaya efek terlihat (0 kalau animasi dikurangi).
    await sleep(reducedMotion() ? 0 : 260);
  }

  // [ID] Efek kemenangan: kembang api di knight pemenang.
  victory(side, sq) {
    // [ID] Partikel kemenangan.
    this.fx(sq, 'victory');
  }
}

// [ID] Ekspor fungsi bantu untuk dipakai file lain (main.js, game.js).
export { knightSvg, sleep };
