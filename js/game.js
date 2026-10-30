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
// [ID] Pengaturan AI (untuk waktu tunggu minimal).
import { AI as AICFG } from './config.js';
// [ID] think = minta AI berpikir; cancelThinking = batalkan.
import { think, cancelThinking } from './ai-client.js';
// [ID] Langkah acak sebagai cadangan kalau AI gagal.
import { randomMove } from './ai.js';
// [ID] Efek suara.
import { sfx } from './audio.js';
// [ID] Fungsi terjemahan teks.
import { t } from './i18n.js';
// [ID] sleep = tunggu beberapa milidetik.
import { sleep } from './board.js';

// [ID] Kelas Game: satu objek untuk satu pertandingan.
export class Game {
  /**
   * opts.board   BoardView
   * opts.ui      { update(game), thinking(on), stats(result), log(history), over(info) }
   * opts.mode    'ai' | 'local' | 'online'
   * opts.players [{ kind, name, sub }, { kind, name, sub }] indexed by side
   * opts.ai      { depth, prune } when mode === 'ai'
   * opts.net     OnlineSession when mode === 'online'; opts.role 'host' | 'guest'
   */
  // [ID] Konstruktor: menerima papan, ui, mode, pemain, pengaturan AI, dan koneksi online.
  constructor(opts) {
    // [ID] Salin semua opsi menjadi properti objek ini (this.board, this.ui, this.mode, ...).
    Object.assign(this, opts);
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
      // [ID] Fase lain (misalnya animasi): tetap pakai teks terakhir.
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
      // [ID] siapa yang jalan (null kalau game selesai),
      turnSide: this.phase === 'over' ? null : side,
      // [ID] kotak pendaratan dan jebakan terakhir,
      lastLand: this.lastLand,
      // [ID] (lanjutan)
      lastTrap: this.lastTrap,
      // [ID] kotak lompatan legal yang ditandai titik,
      legal: [],
      // [ID] apakah sedang memilih jebakan,
      trappable: false,
      // [ID] kotak tujuan lawan (ditandai bergaris saat memilih jebakan),
      threats: [],
      // [ID] knight yang kalah (diberi efek mati),
      dead: this.phase === 'over' ? this.loser : null,
      // [ID] knight yang bisa diklik untuk membatalkan lompatan.
      selectableKnight: null,
    };
    // [ID] Fase lompat pemain: tampilkan lompatan legal.
    if (humanTurn && this.phase === 'jump') v.legal = legalJumps(s);
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
      // [ID] mode lokal: bunyi pergantian giliran,
      if (this.mode === 'local' && this.history.length) sfx.turn();
      // [ID] gambar ulang.
      this.refresh();
    // [ID] AI:
    } else if (p.kind === 'ai') {
      // [ID] fase AI,
      this.phase = 'ai';
      // [ID] gambar ulang,
      this.refresh();
      // [ID] minta AI berpikir.
      this.runAi();
    // [ID] Lawan online:
    } else {
      // [ID] tunggu pesan dari lawan,
      this.phase = 'remote';
      // [ID] gambar ulang.
      this.refresh();
    }
  }

  // [ID] Giliran AI.
  async runAi() {
    // [ID] Tampilkan animasi "berpikir".
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
    // [ID] Matikan animasi "berpikir".
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
      // [ID] tampilkan statistik di panel "Otak AI".
      this.ui.stats(res);
    }
    // [ID] Mainkan langkah AI dengan animasi.
    await this.playMove(move);
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Lanjut ke giliran berikutnya.
    this.nextTurn();
  }

  // Animated full move for the AI or a remote player.
  // [ID] Mainkan satu langkah lengkap dengan animasi (untuk AI atau lawan online).
  async playMove(move) {
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Fase animasi: klik diabaikan.
    this.phase = 'animating';
    // [ID] Lompat dan bakar kotak asal.
    const from = applyJump(s, move.jump);
    // [ID] Sorot kotak pendaratan.
    this.lastLand = move.jump;
    // [ID] Hapus sorotan jebakan lama.
    this.lastTrap = null;
    // [ID] Bunyi lompat.
    sfx.jump();
    // [ID] Mulai animasi lompatan.
    const anim = this.board.animateJump(side, from, move.jump);
    // [ID] Gambar ulang.
    this.refresh();
    // [ID] Efek api di kotak asal.
    this.board.burn(from);
    // [ID] Bunyi terbakar.
    sfx.burn();
    // [ID] Tunggu animasi selesai.
    await anim;
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
    // [ID] Jeda sebentar sebelum jebakan.
    await sleep(160);
    // [ID] Kalau ada jebakan:
    if (move.trap >= 0) {
      // [ID] pasang jebakan,
      applyTrap(s, move.trap);
      // [ID] sorot kotaknya,
      this.lastTrap = move.trap;
      // [ID] gambar ulang,
      this.refresh();
      // [ID] bunyi jebakan,
      sfx.trap();
      // [ID] efek runtuh dan tunggu selesai.
      await this.board.trap(move.trap);
    }
    // [ID] Ganti giliran.
    endTurn(s);
    // [ID] Catat di riwayat.
    this.record(side, from, move);
  }

  // [ID] Pemain mengklik kotak sq.
  async handleCell(sq) {
    // [ID] Abaikan kalau game ditinggalkan atau bukan giliran manusia.
    if (this.disposed || this.current?.kind !== 'human') return;
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Fase lompat:
    if (this.phase === 'jump') {
      // [ID] Kalau kotak itu bukan lompatan legal:
      if (!legalJumps(s).includes(sq)) {
        // [ID] bunyi "salah" (kecuali yang diklik knight sendiri), lalu berhenti.
        if (sq !== s.pos[side]) sfx.invalid();
        // [ID] (berhenti)
        return;
      }
      // [ID] Fase animasi: klik lain diabaikan.
      this.phase = 'animating';
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
      // [ID] Bunyi lompat.
      sfx.jump();
      // [ID] Mulai animasi.
      const anim = this.board.animateJump(side, from, sq);
      // [ID] Gambar ulang.
      this.refresh();
      // [ID] Efek api di kotak asal.
      this.board.burn(from);
      // [ID] Bunyi terbakar.
      sfx.burn();
      // [ID] Tunggu animasi.
      await anim;
      // [ID] Game ditinggalkan: berhenti.
      if (this.disposed) return;
      // [ID] Tidak ada kotak untuk dijebak: langsung akhiri giliran tanpa jebakan.
      if (!hasOpenSquare(s)) return this.completeHumanMove(-1);
      // [ID] Lanjut ke fase jebakan.
      this.phase = 'trap';
      // [ID] Gambar ulang (kotak yang bisa dijebak ditampilkan).
      this.refresh();
    // [ID] Fase jebakan:
    } else if (this.phase === 'trap') {
      // [ID] Kotak harus terbuka.
      if (!isOpen(s, sq)) {
        // [ID] Kalau tidak: bunyi "salah".
        sfx.invalid();
        // [ID] (berhenti)
        return;
      }
      // [ID] Fase animasi.
      this.phase = 'animating';
      // [ID] Pasang jebakan.
      applyTrap(s, sq);
      // [ID] Sorot kotak jebakan.
      this.lastTrap = sq;
      // [ID] Gambar ulang.
      this.refresh();
      // [ID] Bunyi jebakan.
      sfx.trap();
      // [ID] Efek runtuh.
      await this.board.trap(sq);
      // [ID] Game ditinggalkan: berhenti.
      if (this.disposed) return;
      // [ID] Akhiri giliran pemain.
      this.completeHumanMove(sq);
    }
  }

  // [ID] Batalkan lompatan (hanya selama fase jebakan).
  async undoJump() {
    // [ID] Hanya boleh di fase jebakan dan kalau ada lompatan yang tertunda.
    if (this.phase !== 'trap' || this.pendingFrom == null) return;
    // [ID] State.
    const s = this.state;
    // [ID] Siapa yang jalan.
    const side = s.turn;
    // [ID] Posisi knight sekarang.
    const at = s.pos[side];
    // [ID] Fase animasi.
    this.phase = 'animating';
    // [ID] Kembalikan knight ke kotak asal.
    s.pos[side] = this.pendingFrom;
    // [ID] Kotak asal tidak jadi terbakar.
    s.cells[this.pendingFrom] = EMPTY;
    // [ID] Hapus sorotan pendaratan.
    this.lastLand = null;
    // [ID] Animasi knight kembali.
    const anim = this.board.animateJump(side, at, this.pendingFrom);
    // [ID] Gambar ulang.
    this.refresh();
    // [ID] Bunyi pilih.
    sfx.select();
    // [ID] Tunggu animasi.
    await anim;
    // [ID] Game ditinggalkan: berhenti.
    if (this.disposed) return;
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
    // [ID] Tambah ke riwayat.
    this.history.push({ side, from, jump: move.jump, trap: move.trap });
    // [ID] Perbarui panel riwayat (dan skor).
    this.ui.log(this.history);
  }

  // [ID] Akhiri game dengan pemenang w.
  finish(w) {
    // [ID] Fase selesai.
    this.phase = 'over';
    // [ID] Simpan pemenang.
    this.winner = w;
    // [ID] Yang kalah = pemain lain.
    this.loser = w ^ 1;
    // [ID] Gambar ulang.
    this.refresh();
    // [ID] Efek kembang api di knight pemenang.
    this.board.victory(w, this.state.pos[w]);
    // [ID] Sisi pemain di perangkat ini.
    const me = this.mySide;
    // [ID] Bunyi menang (mode lokal atau kalau saya menang),
    if (me == null || me === w) sfx.win();
    // [ID] bunyi kalah kalau saya kalah.
    else sfx.lose();
    // [ID] Setelah 0,9 detik, tampilkan layar game over.
    setTimeout(() => {
      // [ID] Kalau game belum ditinggalkan.
      if (!this.disposed) this.ui.over({ winner: w, loser: w ^ 1, moves: this.state.moves, game: this });
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
    // Handle messages one at a time so an animation never overlaps the next update.
    // [ID] Proses pesan satu per satu (berantai), supaya animasi tidak bertumpuk.
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
      // [ID] Siapa yang jalan.
      const side = this.state.turn;
      // [ID] Kotak asal.
      const from = this.state.pos[side];
      // [ID] Mainkan langkah tamu dengan animasi.
      await this.playMove(move);
      // [ID] Game ditinggalkan: berhenti.
      if (this.disposed) return;
      // [ID] Kirim state terbaru ke tamu.
      this.broadcast(side, from, move);
      // [ID] Lanjut ke giliran berikutnya.
      this.nextTurn();
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
      // [ID] Kalau ya dan langkahnya sah, mainkan dengan animasi.
      if (isOpponentMove && validateMove(this.state, last)) {
        // [ID] Animasi langkah lawan.
        await this.playMove(last);
        // [ID] Game ditinggalkan: berhenti.
        if (this.disposed) return;
      }
      // [ID] Kalau ini hanya pantulan langkah kita sendiri:
      if (incoming.moves === this.state.moves && msg.t === 'state' && !isOpponentMove) {
        // Echo of our own move; adopt the host copy silently.
        // [ID] pakai salinan host tanpa animasi,
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
