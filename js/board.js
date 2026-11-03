// Board view: DOM cells and knight sprites.
// Holds no game state; game.js tells it what to draw.
// [ID] Tampilan papan: kotak-kotak di halaman dan gambar knight. Tidak ada animasi atau efek.
// [ID] Tidak menyimpan state game; game.js yang memberi tahu apa yang harus digambar.

// [ID] N = 7, SIZE = 49.
import { N, SIZE } from './config.js';
// [ID] Status kotak dan fungsi nama kotak (untuk label aksesibilitas).
import { BURNED, TRAP, squareName } from './rules.js';

// [ID] HTML untuk gambar knight (memakai simbol SVG yang didefinisikan di index.html); p0 biru, p1 oranye.
const knightSvg = (side) => `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#knight-glyph" class="kglyph p${side}"/></svg>`;
// [ID] Tunggu ms milidetik (dipakai dengan await).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// [ID] Ubah indeks kotak menjadi { r: baris, c: kolom }.
const rc = (sq) => ({ r: Math.floor(sq / N), c: sq % N });

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
   * view: { state, legal: [], eating: [], trappable: bool, threats: [], lastLand, lastTrap, dead, eaten, selectableKnight }
   */
  // [ID] Gambar papan sesuai data view dari game.js.
  render(view) {
    // [ID] State papan.
    const { state } = view;
    // [ID] Kotak lompatan legal (Set supaya cepat dicek).
    const legal = new Set(view.legal || []);
    // [ID] Kotak tempat knight musuh bisa dimakan (Set).
    const eating = new Set(view.eating || []);
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
      // [ID] Class eat: tanda bahwa lompatan ke kotak ini memakan musuh.
      b.classList.toggle('eat', eating.has(sq));
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
      // [ID] Label untuk pembaca layar, misalnya "d4 open, jump here" atau "..., eat".
      b.setAttribute('aria-label', `${squareName(sq)} ${what}${isLegal ? ', jump here' : ''}${eating.has(sq) ? ', eat' : ''}${isTrappable ? ', place trap' : ''}`);
    }
    // [ID] Kursor bidik saat fase jebakan.
    this.shell.classList.toggle('trap-mode', !!view.trappable);
    // [ID] Untuk kedua knight:
    for (const side of [0, 1]) {
      // [ID] Elemen knight.
      const k = this.knights[side];
      // [ID] Letakkan di posisinya.
      this.placeKnight(side, state.pos[side]);
      // [ID] Efek knight kalah.
      k.classList.toggle('is-dead', view.dead === side);
      // [ID] Knight yang sudah dimakan disembunyikan.
      k.hidden = view.eaten === side;
      // [ID] Knight yang bisa diklik untuk batal.
      k.classList.toggle('selectable', view.selectableKnight === side);
    }
  }
}

// [ID] Ekspor fungsi bantu untuk dipakai file lain (main.js, game.js).
export { knightSvg, sleep };
