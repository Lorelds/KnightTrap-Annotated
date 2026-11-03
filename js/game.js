// Turn flow for one match. Players are 'human' (input on this device), 'ai' (worker)
// or 'remote' (online opponent). Rules come only from rules.js.
// [ID] Alur giliran untuk satu pertandingan. Jenis pemain: 'human' (input di perangkat ini), 'ai' (worker),
// [ID] atau 'remote' (lawan online). Aturan hanya diambil dari rules.js.

// [ID] Ambil fungsi aturan yang dibutuhkan.
import {
  // [ID] Buat posisi, lompatan legal, cek kotak, lompat, jebak, ganti giliran,
  createState, legalJumps, hasOpenSquare, isOpen, applyJump, applyTrap, endTurn,
  // [ID] cek pemenang, validasi langkah, ubah state ke/dari objek biasa, status kotak kosong.
  winner, validateMove, serialize, deserialize, EMPTY,
} from './rules.js';
// [ID] Konstanta: batas AI, jumlah kotak, lama giliran (TURN_SECONDS), dan tenggang waktu host (TURN_GRACE_MS).
import { AI as AICFG, SIZE, TURN_SECONDS, TURN_GRACE_MS } from './config.js';
// [ID] think = minta AI berpikir; cancelThinking = batalkan.
import { think, cancelThinking } from './ai-client.js';
// [ID] Langkah acak sebagai cadangan kalau AI gagal.
import { randomMove } from './ai.js';
// [ID] Fungsi terjemahan teks.
import { t } from './i18n.js';
// [ID] sleep = tunggu beberapa milidetik.
import { sleep } from './board.js';

// [ID] Kelas Game: satu objek untuk satu pertandingan.
export class Game {
  /**
   * opts.board   BoardView
   * opts.ui      { update(game), thinking(on), stats(result), log(history), over(info), timer(seconds|null), timeUp() }
   * opts.mode    'ai' | 'local' | 'online'
   * opts.players [{ kind, name, sub }, { kind, name, sub }] indexed by side
   * opts.ai      { depth, prune } when mode === 'ai'
   * opts.net     OnlineSession when mode === 'online'; opts.role 'host' | 'guest'
   * opts.turnMs  time limit for one turn (defaults to TURN_SECONDS)
   */
  // [ID] Konstruktor: menerima papan, ui, mode, pemain, pengaturan AI, dan koneksi online.
  constructor(opts) {
    // [ID] Salin semua opsi menjadi properti objek ini (this.board, this.ui, this.mode, ...).
    Object.assign(this, opts);
    // [ID] Lama satu giliran dalam ms; kalau tidak diberikan, pakai TURN_SECONDS x 1000. (??= artinya "isi kalau masih kosong".)
    this.turnMs ??= TURN_SECONDS * 1000;
    // [ID] Id interval penghitung waktu (null = tidak jalan).
    this.clock = null;
    // [ID] Waktu (performance.now) saat giliran habis.
    this.deadline = null;
    // [ID] Posisi awal.
    this.state = createState();
    // [ID] Fase giliran: 'idle', 'jump', 'trap', 'ai', 'remote', 'animating', atau 'over'.
    this.phase = 'idle';
    // [ID] Riwayat langkah.
    this.history = [];
    // [ID] true setelah game ditinggalkan; semua proses yang masih berjalan akan berhenti.
    this.disposed = false;
    // [ID] Kotak pendaratan terakhir (untuk disorot).
    this.lastLand = null;
    // [ID] Kotak jebakan terakhir (untuk disorot).
    this.lastTrap = null;
    // [ID] Kotak asal lompatan pemain yang belum diakhiri jebakan (untuk tombol batal).
    this.pendingFrom = null;
    // [ID] Kotak lompatan pemain yang belum diakhiri jebakan.
    this.pendingJump = null;
    // [ID] Antrian pesan online, supaya pesan diproses satu per satu.
    this.netQueue = Promise.resolve();
    // [ID] Saat kotak papan diklik, panggil handleCell.
    this.board.onCell = (sq) => this.handleCell(sq);
    // [ID] Saat knight diklik:
    this.board.onKnight = (side) => {
      // [ID] kalau sedang fase jebakan dan knight sendiri yang diklik, batalkan lompatan.
      if (this.phase === 'trap' && side === this.state.turn) this.undoJump();
    };
  }

  // [ID] Mulai game (opsional dari state tertentu, misalnya dari host online).
  start(state) {
    // [ID] Pakai state yang diberikan, atau posisi awal.
    this.state = state ?? createState();
    // [ID] Kosongkan riwayat.
    this.history = [];
    // [ID] Tidak ada sorotan.
    this.lastLand = null;
    // [ID] Tidak ada sorotan jebakan.
    this.lastTrap = null;
    // [ID] Tampilkan riwayat kosong.
    this.ui.log(this.history);
    // [ID] Jalankan giliran pertama.
    this.nextTurn();
  }

  // [ID] Tinggalkan game: hentikan AI dan lepaskan papan.
  dispose() {
    // [ID] Tandai sudah ditinggalkan.
    this.disposed = true;
    // [ID] Hentikan penghitung waktu.
    this.stopClock();
    // [ID] Batalkan AI yang sedang berpikir.
    cancelThinking();
    // [ID] Lepas handler klik kotak.
    this.board.onCell = null;
    // [ID] Lepas handler klik knight.
    this.board.onKnight = null;
  }

  // [ID] Pemain yang sedang jalan (getter, dipakai seperti properti: this.current).
  get current() {
    // [ID] players[0] atau players[1] sesuai giliran.
    return this.players[this.state.turn];
  }

  // Side whose point of view this device shows (null in local mode).
  // [ID] Sisi pemain di perangkat ini (null di mode lokal karena dua pemain bergantian di satu perangkat).
  get mySide() {
    // [ID] Mode lokal: tidak ada "saya".
    if (this.mode === 'local') return null;
    // [ID] Sisi pemain yang jenisnya 'human'.
    return this.players.findIndex((p) => p.kind === 'human');
  }

  // [ID] Teks status di atas papan.
  statusText() {
    // [ID] Pemain yang sedang jalan.
    const p = this.current;
    // [ID] Namanya (?. aman kalau p kosong).
    const name = p?.name;
    // [ID] Pilih teks sesuai fase.
    switch (this.phase) {
      // [ID] Fase lompat:
      case 'jump':
        // [ID] mode lokal sebut nama pemain, selain itu "Giliranmu: pilih lompatan".
        return this.mode === 'local' ? t('sideJump', name) : t('yourJump');
      // [ID] Fase jebakan:
      case 'trap':
        // [ID] "Pilih kotak jebakan".
        return this.mode === 'local' ? t('sideTrap', name) : t('yourTrap');
      // [ID] Giliran AI:
      case 'ai':
        // [ID] "AI sedang berpikir…".
        return t('aiThinking');
      // [ID] Giliran lawan online:
      case 'remote':
        // [ID] "Menunggu langkah lawan…".
        return t('waitingOpponent');
      // [ID] Game selesai:
      case 'over':
        // [ID] Mode lokal: "<nama> Menang!".
        if (this.mode === 'local') return t('sideWins', this.players[this.winner].name);
        // [ID] Selain itu: "Kamu Menang!" atau "Kamu Kalah".
        return this.mySide === this.winner ? t('youWin') : t('youLose');
      // [ID] Fase lain (misalnya jeda saat langkah dimainkan): tetap pakai teks terakhir.
      default:
        // [ID] Teks terakhir atau kosong.
        return this._lastStatus ?? '';
    }
  }

  // [ID] Data yang dibutuhkan papan untuk menggambar (dikirim ke board.render).
  view() {
    // [ID] State saat ini.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Apakah giliran pemain di perangkat ini.
    const humanTurn = this.current?.kind === 'human';
    // [ID] Objek view:
    const v = {
      // [ID] state papan,
      state: s,
      // [ID] kotak pendaratan dan jebakan terakhir,
      lastLand: this.lastLand,
      // [ID] (lanjutan)
      lastTrap: this.lastTrap,
      // [ID] kotak lompatan legal yang ditandai titik,
      legal: [],
      // [ID] kotak lompatan yang memakan musuh,
      eating: [],
      // [ID] apakah sedang memilih jebakan,
      trappable: false,
      // [ID] kotak tujuan lawan (ditandai bergaris saat memilih jebakan),
      threats: [],
      // [ID] knight yang kalah (diberi tanda kalah),
      dead: this.phase === 'over' ? this.loser : null,
      // [ID] knight yang dimakan (disembunyikan): hanya kalau game selesai dan kedua knight di kotak yang sama,
      eaten: this.phase === 'over' && s.pos[0] === s.pos[1] ? this.loser : null,
      // [ID] knight yang bisa diklik untuk membatalkan lompatan.
      selectableKnight: null,
    };
    // [ID] Giliran manusia di fase lompat:
    if (humanTurn && this.phase === 'jump') {
      // [ID] tandai semua lompatan legal,
      v.legal = legalJumps(s);
      // [ID] dan tandai yang mendarat di kotak musuh sebagai "makan".
      v.eating = v.legal.filter((sq) => sq === s.pos[side ^ 1]);
    }
    // [ID] Fase jebakan pemain:
    if (humanTurn && this.phase === 'trap') {
      // [ID] semua kotak terbuka bisa dijebak,
      v.trappable = true;
      // [ID] kotak tujuan lawan disorot sebagai saran,
      v.threats = legalJumps(s, side ^ 1);
      // [ID] knight sendiri bisa diklik untuk batal.
      v.selectableKnight = side;
    }
    // [ID] Kirim view.
    return v;
  }

  // [ID] Gambar ulang papan dan status.
  refresh() {
    // [ID] Game sudah ditinggalkan: jangan gambar.
    if (this.disposed) return;
    // [ID] Gambar papan.
    this.board.render(this.view());
    // [ID] Hitung teks status.
    const text = this.statusText();
    // [ID] Simpan sebagai teks terakhir.
    this._lastStatus = text;
    // [ID] Perbarui kartu pemain dan status di layar.
    this.ui.update(this, text);
  }

  // [ID] Lanjut ke giliran berikutnya.
  nextTurn() {
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Cek pemenang.
    const w = winner(this.state);
    // [ID] Ada pemenang: akhiri game.
    if (w !== null) return this.finish(w);
    // [ID] Pemain yang jalan.
    const p = this.current;
    // [ID] Pemain manusia:
    if (p.kind === 'human') {
      // [ID] mulai fase lompat,
      this.phase = 'jump';
      // [ID] mulai penghitung waktu giliran,
      this.startClock();
      // [ID] gambar ulang.
      this.refresh();
    // [ID] AI:
    } else if (p.kind === 'ai') {
      // [ID] fase AI,
      this.phase = 'ai';
      // [ID] AI tidak memakai penghitung waktu giliran (punya batas 4 detik sendiri),
      this.stopClock();
      // [ID] gambar ulang,
      this.refresh();
      // [ID] minta AI berpikir.
      this.runAi();
    // [ID] Lawan online:
    } else {
      // [ID] tunggu pesan dari lawan,
      this.phase = 'remote';
      // [ID] penghitung waktu tetap jalan (host perlu tahu kalau tamu diam terlalu lama),
      this.startClock();
      // [ID] gambar ulang.
      this.refresh();
    }
  }

  // ---- Turn clock -------------------------------------------------------------
  // One clock per turn, for the jump and the trap together. The AI has its own limit and no clock.

  // [ID] Mulai penghitung waktu untuk satu giliran.
  startClock() {
    // [ID] Hentikan penghitung lama dulu.
    this.stopClock();
    // [ID] Hitung kapan waktu habis.
    this.deadline = performance.now() + this.turnMs;
    // [ID] Tampilkan sisa detik di layar.
    this.ui.timer(Math.ceil(this.turnMs / 1000));
    // [ID] Periksa waktu setiap 100 ms.
    this.clock = setInterval(() => this.tickClock(), 100);
  }

  // [ID] Hentikan penghitung waktu.
  stopClock() {
    // [ID] Hentikan interval.
    clearInterval(this.clock);
    // [ID] Kosongkan id interval.
    this.clock = null;
    // [ID] Kosongkan waktu habis.
    this.deadline = null;
    // [ID] Sembunyikan tampilan waktu.
    this.ui.timer(null);
  }

  // [ID] Dipanggil setiap 100 ms.
  tickClock() {
    // [ID] Sisa waktu dalam ms (bisa negatif).
    const left = this.deadline - performance.now();
    // [ID] Tampilkan sisa detik (dibulatkan ke atas, minimal 0).
    this.ui.timer(Math.max(0, Math.ceil(left / 1000)));
    // [ID] Giliran manusia di perangkat ini:
    if (this.current.kind === 'human') {
      // [ID] waktu habis: mainkan langkah acak.
      if (left <= 0) this.timeUp();
    // [ID] Giliran lawan online dan kita host: tunggu tambahan TURN_GRACE_MS dulu,
    } else if (this.role === 'host' && left <= -TURN_GRACE_MS) {
      // [ID] lalu hentikan penghitung,
      this.stopClock();
      // [ID] dan mainkan langkah acak untuk tamu (lewat antrean pesan supaya tidak bertabrakan).
      this.netQueue = this.netQueue.then(() => this.playForQuietGuest()).catch((err) => console.error(err));
    }
  }

  // Time ran out on this device's turn. Goes through handleCell like a click,
  // so the rules and the online send are not duplicated.
  // [ID] Waktu giliran habis di perangkat ini.
  timeUp() {
    // [ID] Hentikan penghitung.
    this.stopClock();
    // [ID] Tampilkan pesan "Waktu habis".
    this.ui.timeUp();
    // [ID] State.
    const s = this.state;
    // [ID] Fase lompat:
    if (this.phase === 'jump') {
      // [ID] ambil langkah acak lengkap (lompatan + jebakan),
      const { jump, trap } = randomMove(s);
      // [ID] lompat seperti klik biasa,
      this.handleCell(jump);
      // [ID] kalau masih perlu jebakan, pasang jebakan acak.
      if (this.phase === 'trap') this.handleCell(trap);
    // [ID] Fase jebakan:
    } else if (this.phase === 'trap') {
      // [ID] daftar kotak yang boleh dijebak,
      const open = [];
      // [ID] kumpulkan semua kotak terbuka,
      for (let sq = 0; sq < SIZE; sq++) if (isOpen(s, sq)) open.push(sq);
      // [ID] pilih satu secara acak seperti klik biasa.
      this.handleCell(open[Math.floor(Math.random() * open.length)]);
    }
  }

  // The guest stayed quiet past its limit and the grace period, so the host plays for it.
  // [ID] Host memainkan langkah acak untuk tamu yang diam.
  async playForQuietGuest() {
    // [ID] Hanya kalau game masih berjalan dan masih menunggu tamu.
    if (this.disposed || this.phase !== 'remote') return;
    // [ID] Mainkan langkah acak sebagai langkah tamu.
    await this.hostPlay(randomMove(this.state));
  }

  // Host only: play a guest move and tell the guest the result.
  // [ID] Host: mainkan langkah tamu, lalu kirim hasilnya ke tamu.
  async hostPlay(move) {
    // [ID] Siapa yang jalan.
    const side = this.state.turn;
    // [ID] Kotak asal.
    const from = this.state.pos[side];
    // [ID] Mainkan langkahnya di papan.
    await this.playMove(move);
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Kirim state terbaru ke tamu.
    this.broadcast(side, from, move);
    // [ID] Lanjut ke giliran berikutnya.
    this.nextTurn();
  }

  // [ID] Giliran AI.
  async runAi() {
    // [ID] Tampilkan tulisan "berpikir".
    this.ui.thinking(true);
    // [ID] Waktu mulai.
    const t0 = performance.now();
    // [ID] Hasil AI.
    let res = null;
    // [ID] Coba minta AI berpikir.
    try {
      // [ID] Tunggu hasil dari worker (kedalaman dan Alpha-Beta dari pengaturan level).
      res = await think(this.state, { depth: this.ai.depth, prune: this.ai.prune });
    // [ID] Kalau gagal:
    } catch (err) {
      // [ID] catat error di console.
      console.error('AI failed', err);
    }
    // [ID] Game ditinggalkan selama AI berpikir: berhenti.
    if (this.disposed) return;
    // [ID] Lama AI berpikir.
    const elapsed = performance.now() - t0;
    // [ID] Kalau terlalu cepat, tunggu sampai minimal 450 ms supaya tidak terasa langsung.
    if (elapsed < AICFG.minUiDelayMs) await sleep(AICFG.minUiDelayMs - elapsed);
    // [ID] Cek lagi setelah menunggu.
    if (this.disposed) return;
    // [ID] Sembunyikan tulisan "berpikir".
    this.ui.thinking(false);
    // [ID] Langkah dari AI.
    let move = res?.move;
    // [ID] Kalau tidak ada langkah atau langkahnya tidak sah:
    if (!move || !validateMove(this.state, move)) {
      // [ID] tulis peringatan,
      console.warn('AI returned no valid move; falling back to a random legal move');
      // [ID] dan pakai langkah acak yang legal supaya game tidak macet.
      move = randomMove(this.state);
    // [ID] Kalau sah:
    } else {
      // [ID] tampilkan statistik di panel "Statistik AI".
      this.ui.stats(res);
    }
    // [ID] Mainkan langkah AI.
    await this.playMove(move);
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Lanjut ke giliran berikutnya.
    this.nextTurn();
  }

  // Full move for the AI or a remote player. Input stays locked until the trap is placed.
  // [ID] Mainkan satu langkah lengkap (untuk AI atau lawan online); klik dikunci sampai jebakan terpasang.
  async playMove(move) {
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Fase 'animating' (namanya saja): klik diabaikan selama langkah dimainkan.
    this.phase = 'animating';
    // [ID] Hentikan penghitung waktu giliran.
    this.stopClock();
    // [ID] Lompat dan bakar kotak asal.
    const from = applyJump(s, move.jump);
    // [ID] Sorot kotak pendaratan.
    this.lastLand = move.jump;
    // [ID] Hapus sorotan jebakan lama.
    this.lastTrap = null;
    // [ID] Gambar ulang.
    this.refresh();
    // [ID] Jeda sebentar sebelum jebakan.
    await sleep(160);
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Kalau ada jebakan:
    if (move.trap >= 0) {
      // [ID] pasang jebakan,
      applyTrap(s, move.trap);
      // [ID] sorot kotaknya,
      this.lastTrap = move.trap;
      // [ID] gambar ulang,
      this.refresh();
    }
    // [ID] Ganti giliran.
    endTurn(s);
    // [ID] Catat di riwayat.
    this.record(side, from, move);
  }

  // [ID] Klik pada kotak sq (dari papan atau dari timeUp).
  handleCell(sq) {
    // [ID] Abaikan kalau game ditinggalkan atau bukan giliran manusia.
    if (this.disposed || this.current?.kind !== 'human') return;
    // [ID] State.
    const s = this.state;
    // [ID] Fase lompat:
    if (this.phase === 'jump') {
      // [ID] Abaikan klik ke kotak yang bukan lompatan legal.
      if (!legalJumps(s).includes(sq)) return;
      // [ID] Lompat dan bakar kotak asal.
      const from = applyJump(s, sq);
      // [ID] Simpan kotak asal (untuk tombol batal).
      this.pendingFrom = from;
      // [ID] Simpan kotak lompatan.
      this.pendingJump = sq;
      // [ID] Sorot kotak pendaratan.
      this.lastLand = sq;
      // [ID] Hapus sorotan jebakan lama.
      this.lastTrap = null;
      // [ID] Langkah makan, atau tidak ada kotak tersisa untuk dijebak: giliran selesai tanpa jebakan (-1).
      if (sq === s.pos[s.turn ^ 1] || !hasOpenSquare(s)) return this.completeHumanMove(-1);
      // [ID] Lanjut ke fase jebakan.
      this.phase = 'trap';
      // [ID] Gambar ulang (kotak yang bisa dijebak ditampilkan).
      this.refresh();
    // [ID] Fase jebakan:
    } else if (this.phase === 'trap') {
      // [ID] Abaikan klik ke kotak yang tidak boleh dijebak.
      if (!isOpen(s, sq)) return;
      // [ID] Pasang jebakan.
      applyTrap(s, sq);
      // [ID] Sorot kotak jebakan.
      this.lastTrap = sq;
      // [ID] Akhiri giliran pemain.
      this.completeHumanMove(sq);
    }
  }

  // [ID] Batalkan lompatan (tombol Batal lompat, klik knight sendiri, atau Esc).
  undoJump() {
    // [ID] Hanya boleh di fase jebakan dan kalau ada lompatan yang tertunda.
    if (this.phase !== 'trap' || this.pendingFrom == null) return;
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Kembalikan knight ke kotak asal.
    s.pos[side] = this.pendingFrom;
    // [ID] Kotak asal tidak jadi terbakar.
    s.cells[this.pendingFrom] = EMPTY;
    // [ID] Hapus sorotan pendaratan.
    this.lastLand = null;
    // [ID] Tidak ada lompatan tertunda lagi.
    this.pendingFrom = null;
    // [ID] (lanjutan)
    this.pendingJump = null;
    // [ID] Kembali ke fase lompat.
    this.phase = 'jump';
    // [ID] Gambar ulang.
    this.refresh();
  }

  // [ID] Akhiri giliran pemain manusia dengan jebakan "trap".
  completeHumanMove(trap) {
    // [ID] Hentikan penghitung waktu.
    this.stopClock();
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Langkah lengkap.
    const move = { jump: this.pendingJump, trap };
    // [ID] Kotak asal.
    const from = this.pendingFrom;
    // [ID] Hapus data tertunda.
    this.pendingFrom = null;
    // [ID] (lanjutan)
    this.pendingJump = null;
    // [ID] Ganti giliran.
    endTurn(s);
    // [ID] Catat di riwayat.
    this.record(side, from, move);
    // [ID] Mode online:
    if (this.mode === 'online') {
      // [ID] tamu mengirim langkahnya ke host untuk divalidasi,
      if (this.role === 'guest') this.net.send({ t: 'move', jump: move.jump, trap: move.trap, n: s.moves });
      // [ID] host mengirim state terbaru ke tamu.
      else this.broadcast(side, from, move);
    }
    // [ID] Lanjut ke giliran berikutnya.
    this.nextTurn();
  }

  // [ID] Simpan langkah di riwayat dan tampilkan.
  record(side, from, move) {
    // [ID] Simpan langkah; ate = true kalau lompatannya mendarat di kotak musuh (makan).
    this.history.push({ side, from, jump: move.jump, trap: move.trap, ate: move.jump === this.state.pos[side ^ 1] });
    // [ID] Perbarui panel riwayat.
    this.ui.log(this.history);
  }

  // [ID] Akhiri game dengan pemenang w.
  finish(w) {
    // [ID] Hentikan penghitung waktu.
    this.stopClock();
    // [ID] Fase selesai.
    this.phase = 'over';
    // [ID] Simpan pemenang.
    this.winner = w;
    // [ID] Yang kalah = pemain lain.
    this.loser = w ^ 1;
    // [ID] Gambar ulang.
    this.refresh();
    // [ID] Apakah game selesai karena makan (dua knight di satu kotak)?
    const eaten = this.state.pos[0] === this.state.pos[1];
    // [ID] Setelah 0,9 detik, tampilkan layar game over.
    setTimeout(() => {
      // [ID] Kalau game belum ditinggalkan, tampilkan layar game over (termasuk info dimakan atau terkurung).
      if (!this.disposed) this.ui.over({ winner: w, loser: w ^ 1, moves: this.state.moves, game: this, eaten });
    }, 900);
  }

  // ---- Online ---------------------------------------------------------------
  // [ID] ---- Bagian mode online ----

  // [ID] Host mengirim state terbaru dan langkah terakhir ke tamu.
  broadcast(side, from, move) {
    // [ID] Kirim pesan 'state' berisi state lengkap dan langkah terakhir.
    this.net.send({ t: 'state', state: serialize(this.state), last: { side, from, jump: move.jump, trap: move.trap } });
  }

  // [ID] Pesan masuk dari lawan.
  onNetMessage(msg) {
    // Handle messages one at a time so a move in progress never overlaps the next update.
    // [ID] Proses pesan satu per satu (berantai), supaya langkah yang sedang dimainkan tidak bertumpuk dengan pesan berikutnya.
    this.netQueue = this.netQueue.then(() => this.handleNet(msg)).catch((err) => console.error(err));
  }

  // [ID] Proses satu pesan online.
  async handleNet(msg) {
    // [ID] Game ditinggalkan: abaikan.
    if (this.disposed) return;
    // [ID] Host menerima langkah dari tamu:
    if (this.role === 'host' && msg.t === 'move') {
      // [ID] Susun langkahnya.
      const move = { jump: msg.jump, trap: msg.trap };
      // [ID] Tolak kalau bukan giliran tamu atau langkahnya tidak sah.
      if (this.phase !== 'remote' || !validateMove(this.state, move)) {
        // [ID] Kirim 'reject' beserta state yang benar.
        this.net.send({ t: 'reject', state: serialize(this.state) });
        // [ID] (berhenti)
        return;
      }
      // [ID] Mainkan langkah tamu dan kirim hasilnya.
      await this.hostPlay(move);
      // [ID] (selesai)
      return;
    }
    // [ID] Tamu menerima state atau penolakan dari host:
    if (this.role === 'guest' && (msg.t === 'state' || msg.t === 'reject')) {
      // [ID] State dari host.
      let incoming;
      // [ID] Coba ubah dan periksa datanya.
      try {
        // [ID] Ubah ke state.
        incoming = deserialize(msg.state);
      // [ID] Data rusak:
      } catch {
        // [ID] abaikan pesan.
        return;
      }
      // [ID] Langkah terakhir yang dikirim host.
      const last = msg.last;
      // [ID] Apakah ini langkah lawan yang baru (tepat satu giliran setelah state kita, dan kita sedang menunggu)?
      const isOpponentMove =
        // [ID] (syarat 1-3: pesan state, ada langkah terakhir, jumlah giliran pas)
        msg.t === 'state' && last && incoming.moves === this.state.moves + 1 &&
        // [ID] (syarat 4-5: yang melangkah adalah lawan dan kita sedang menunggu)
        this.players[last.side]?.kind === 'remote' && this.phase === 'remote';
      // [ID] Kalau ya dan langkahnya sah, mainkan.
      if (isOpponentMove && validateMove(this.state, last)) {
        // [ID] Mainkan langkah lawan.
        await this.playMove(last);
        // [ID] Game ditinggalkan: berhenti.
        if (this.disposed) return;
      }
      // [ID] Kalau ini hanya pantulan langkah kita sendiri:
      if (incoming.moves === this.state.moves && msg.t === 'state' && !isOpponentMove) {
        // Echo of our own move; adopt the host copy silently.
        // [ID] langsung pakai salinan host,
        this.state = incoming;
        // [ID] gambar ulang kalau tidak sedang memilih langkah,
        if (this.phase !== 'jump' && this.phase !== 'trap') this.refresh();
        // [ID] selesai.
        return;
      }
      // [ID] Selain itu, state host adalah kebenaran: pakai.
      this.state = incoming;
      // [ID] Kalau ditolak atau tidak sinkron:
      if (msg.t === 'reject' || !isOpponentMove) {
        // [ID] hapus sorotan,
        this.lastLand = null;
        // [ID] (lanjutan)
        this.lastTrap = null;
        // [ID] hapus lompatan tertunda.
        this.pendingFrom = null;
        // [ID] (lanjutan)
        this.pendingJump = null;
      }
      // [ID] Lanjut ke giliran berikutnya.
      this.nextTurn();
    }
  }
}
