// [ID] Semua teks tampilan dalam dua bahasa. Bahasa Indonesia default, bahasa Inggris alternatif.
// UI strings. Bahasa Indonesia is the default; English is the alternative.

// [ID] Tabel teks: STRINGS.id untuk Indonesia, STRINGS.en untuk Inggris. Kunci yang sama dipakai di kedua bahasa.
const STRINGS = {
  // [ID] Blok bahasa Indonesia.
  id: {
    // [ID] Tombol/judul mode Single Player.
    singlePlayer: 'Single Player',
    // [ID] Tombol/judul mode Multiplayer.
    multiplayer: 'Multiplayer',
    // [ID] Tombol/judul layar Cara Bermain.
    howToPlay: 'Cara Bermain',
    // [ID] Tombol/judul layar Pengaturan.
    settings: 'Pengaturan',
    // [ID] Label "Tingkat kesulitan" di layar Single Player.
    difficulty: 'Tingkat kesulitan',
    // [ID] Nama keempat level (satu baris berisi empat kunci: easy, medium, hard, expert).
    easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
    // [ID] Keterangan kedalaman di kartu level (depth1..depth4 dalam satu baris).
    depth1: 'Kedalaman 1', depth2: 'Kedalaman 2', depth3: 'Kedalaman 3', depth4: 'Kedalaman 4',
    // [ID] Label pilihan siapa yang jalan duluan.
    whoFirst: 'Siapa jalan duluan?',
    // [ID] Kata "Kamu" (nama pemain dan pilihan jalan duluan).
    you: 'Kamu',
    // [ID] Pilihan "Acak" untuk siapa jalan duluan.
    random: 'Acak',
    // [ID] Penjelasan saklar Alpha-Beta di layar Single Player.
    abHint: 'Matikan untuk melihat Minimax biasa memeriksa lebih banyak posisi.',
    // [ID] Tombol Mulai.
    startGame: 'Mulai',
    // [ID] Judul kartu mode Lokal.
    local: 'Lokal',
    // [ID] Penjelasan mode Lokal.
    localSub: 'Dua pemain di satu perangkat, bergantian.',
    // [ID] Penjelasan mode Online.
    onlineSub: 'Main lewat internet dengan kode ruang.',
    // [ID] Tombol Buat ruang.
    createRoom: 'Buat ruang',
    // [ID] Tombol Gabung.
    join: 'Gabung',
    // [ID] Label "Kode ruang" di lobi.
    roomCode: 'Kode ruang',
    // [ID] Tombol Salin kode.
    copy: 'Salin kode',
    // [ID] Toast setelah kode disalin.
    copied: 'Kode disalin',
    // [ID] Petunjuk di lobi untuk host.
    lobbyHint: 'Bagikan kode ini ke temanmu. Game mulai otomatis saat dia bergabung.',
    // [ID] Petunjuk di lobi saat tamu menyambung.
    joiningHint: 'Menghubungkan ke ruang…',
    // [ID] Tombol Main sekarang di layar Cara Bermain.
    playNow: 'Main sekarang',
    // [ID] Aturan Mulai di layar Cara Bermain: posisi awal, Biru jalan duluan, warna di Single Player dan Online.
    startRule: '<strong>Mulai:</strong> Biru mulai di a1 (kiri bawah), Oranye di g7 (kanan atas). Biru selalu jalan duluan. Di Single Player, pilihan "Siapa jalan duluan?" menentukan kamu jadi Biru atau Oranye. Di Online, warna bertukar setiap main lagi.',
    // [ID] Aturan Makan di layar Cara Bermain (HTML <strong>, dipasang lewat data-i18n-html).
    eatRule: '<strong>Makan:</strong> lompat ke kotak knight musuh untuk memakannya dan langsung menang.',
    // [ID] Aturan Batal lompat di layar Cara Bermain (dipasang oleh buildHowTo di main.js).
    undoRule: '<strong>Batal lompat:</strong> sebelum memasang jebakan, lompatan masih bisa dibatalkan dengan tombol Batal lompat, klik knight-mu, atau tombol Esc.',
    // [ID] Aturan Petunjuk: kotak tujuanmu selalu tampil, kotak tujuan musuh muncul dengan tombol P.
    hintRule: '<strong>Petunjuk:</strong> kotak yang bisa kamu tuju selalu terlihat. Kotak yang bisa dituju musuh tersembunyi; tekan tombol P untuk menampilkan atau menyembunyikannya.',
    // [ID] Aturan Waktu; fungsi yang menerima n = TURN_SECONDS dari config.js.
    timeRule: (n) => `<strong>Waktu:</strong> satu giliran (lompat dan jebak) maksimal ${n} detik. Kalau waktu habis sebelum lompat, permainan memilih lompatan dan jebakan acak. Kalau sudah lompat, hanya jebakannya yang dipilih acak.`,
    // [ID] Aturan kalah di layar Cara Bermain (berisi HTML <strong>, dipasang lewat data-i18n-html).
    loseRule: '<strong>Kalah:</strong> jika pada giliranmu knight tidak punya lompatan legal, kamu kalah. Kurung lawan sebelum dia mengurungmu!',
    // [ID] Label pilihan Bahasa.
    language: 'Bahasa',
    // [ID] Satuan "lompatan" di kartu pemain.
    jumps: 'lompatan',
    // [ID] Tombol Batal lompat.
    undoJump: 'Batal lompat',
    // [ID] Judul panel Statistik AI.
    aiBrain: 'Statistik AI',
    // [ID] Teks "berpikir" saat AI sedang mencari langkah.
    thinking: 'berpikir',
    // [ID] Label statistik Kedalaman.
    statDepth: 'Kedalaman',
    // [ID] Label statistik Posisi diperiksa (jumlah node).
    statNodes: 'Posisi diperiksa',
    // [ID] Label statistik Cabang dipangkas (cutoff Alpha-Beta).
    statCutoffs: 'Cabang dipangkas',
    // [ID] Label statistik Waktu berpikir.
    statTime: 'Waktu',
    // [ID] Label statistik Skor langkah (nilai evaluasi).
    statScore: 'Skor langkah',
    // [ID] Judul panel Riwayat langkah.
    moveLog: 'Riwayat langkah',
    // [ID] Teks saat riwayat masih kosong.
    logEmpty: 'Belum ada langkah.',
    // [ID] Satuan jumlah langkah di layar game over.
    movesPlayed: 'langkah dimainkan',
    // [ID] Tombol Main lagi.
    rematch: 'Main lagi',
    // [ID] Tombol Menu utama.
    mainMenu: 'Menu utama',
    // Steps
    // [ID] Judul langkah 1 Cara Bermain (Lompat).
    step1Title: 'Lompat',
    // [ID] Penjelasan langkah 1.
    step1Text: 'Gerakkan knight seperti kuda catur: bentuk huruf L ke kotak yang belum terbakar dan bukan jebakan.',
    // [ID] Judul langkah 2 (Bakar).
    step2Title: 'Bakar',
    // [ID] Penjelasan langkah 2.
    step2Text: 'Kotak yang kamu tinggalkan langsung terbakar dan tidak bisa dipakai lagi.',
    // [ID] Judul langkah 3 (Jebak).
    step3Title: 'Jebak',
    // [ID] Penjelasan langkah 3.
    step3Text: 'Setelah lompat, hancurkan satu kotak kosong di mana pun. Kotak yang ditempati knight tidak bisa dijebak. Tutup jalan kabur lawan!',
    // Game text
    // [ID] Judul mode di atas layar game; fungsi yang menerima nama level.
    modeAi: (lvl) => `Single Player · ${lvl}`,
    // [ID] Judul mode Lokal di atas layar game.
    modeLocal: 'Multiplayer · Lokal',
    // [ID] Judul mode Online di atas layar game.
    modeOnline: 'Multiplayer · Online',
    // [ID] Nama warna sisi 0.
    blue: 'Biru',
    // [ID] Nama warna sisi 1.
    orange: 'Oranye',
    // [ID] Nama "Pemain n"; fungsi yang menerima nomor pemain.
    player: (n) => `Pemain ${n}`,
    // [ID] Kata "AI".
    ai: 'AI',
    // [ID] Nama lawan online.
    opponent: 'Lawan',
    // [ID] Akhiran "(kamu)" (cadangan, tidak dipakai saat ini).
    youSuffix: '(kamu)',
    // [ID] Status: giliranmu memilih lompatan.
    yourJump: 'Giliranmu: pilih lompatan',
    // [ID] Status: pilih kotak jebakan.
    yourTrap: 'Pilih kotak jebakan',
    // [ID] Status mode lokal: giliran pemain bernama tertentu memilih lompatan.
    sideJump: (name) => `Giliran ${name}: pilih lompatan`,
    // [ID] Status mode lokal: pemain bernama tertentu memilih jebakan.
    sideTrap: (name) => `${name}: pilih kotak jebakan`,
    // [ID] Status saat AI berpikir.
    aiThinking: 'AI sedang berpikir…',
    // [ID] Status saat menunggu lawan online.
    waitingOpponent: 'Menunggu langkah lawan…',
    // [ID] Teks giliran pemain (cadangan untuk mode lokal).
    passDevice: (name) => `Giliran ${name}`,
    // [ID] Judul game over saat menang.
    youWin: 'Kamu Menang!',
    // [ID] Judul game over saat kalah.
    youLose: 'Kamu Kalah',
    // [ID] Judul game over mode lokal: "<nama> Menang!".
    sideWins: (name) => `${name} Menang!`,
    // [ID] Keterangan: pemain tertentu tidak punya lompatan legal.
    trappedSub: (name) => `${name} tidak punya lompatan legal.`,
    // [ID] Keterangan saat AI menang.
    aiWinSub: 'AI berhasil mengurung knight-mu.',
    // [ID] Keterangan saat pemain mengalahkan AI.
    youWinSub: 'Knight AI terkurung. Strategi yang bagus!',
    // [ID] Keterangan di layar akhir saat knight seseorang dimakan (mode Multiplayer).
    eatenSub: (name) => `${name} dimakan.`,
    // [ID] Keterangan saat pemain memakan knight AI.
    youAteSub: 'Kamu memakan knight AI.',
    // [ID] Keterangan saat AI memakan knight pemain.
    aiAteSub: 'AI memakan knight-mu.',
    // [ID] Tanda "makan" di riwayat langkah.
    ateMark: 'makan',
    // [ID] Skor langkah di panel AI saat AI melihat kemenangan pasti dalam n giliran.
    scoreWin: (n) => `Menang dalam ${n} giliran`,
    // [ID] Skor langkah di panel AI saat AI melihat kekalahan pasti dalam n giliran.
    scoreLoss: (n) => `Kalah dalam ${n} giliran`,
    // [ID] Label saat AI berhenti karena batas 4 detik.
    timedOut: 'batas 4 dtk',
    // [ID] Sisa waktu giliran, misalnya "12 dtk".
    timerLeft: (n) => `${n} dtk`,
    // [ID] Pesan saat waktu habis dan langkah dipilih acak.
    timeUp: 'Waktu habis, permainan memilih langkah untukmu.',
    // Network
    // [ID] Status online: membuat ruang.
    netCreating: 'Membuat ruang…',
    // [ID] Status online: menunggu lawan.
    netWaiting: 'Menunggu lawan bergabung…',
    // [ID] Status online: menghubungkan.
    netConnecting: 'Menghubungkan…',
    // [ID] Status online: terhubung.
    netConnected: 'Terhubung',
    // [ID] Status online: koneksi tidak stabil.
    netUnstable: 'Koneksi tidak stabil',
    // [ID] Status online: lawan keluar.
    netLeft: 'Lawan keluar dari game',
    // [ID] Status online: terputus (cadangan).
    netClosed: 'Terputus',
    // [ID] Error: ruang tidak ditemukan.
    netRoomNotFound: 'Ruang tidak ditemukan. Cek kodenya.',
    // [ID] Error: ruang sudah penuh.
    netRoomFull: 'Ruang sudah penuh.',
    // [ID] Error: library online gagal dimuat.
    netLoadFail: 'Tidak bisa memuat modul online. Cek koneksi internet.',
    // [ID] Error koneksi umum.
    netError: 'Koneksi gagal. Coba lagi.',
    // [ID] Error: kode ruang harus 4–6 karakter.
    netBadCode: 'Masukkan kode 4–6 karakter.',
    // [ID] Pesan menunggu lawan setuju main lagi.
    waitRematch: 'Menunggu lawan setuju main lagi…',
    // [ID] Pesan lawan ingin main lagi.
    oppWantsRematch: 'Lawan ingin main lagi!',
    // [ID] Pertanyaan konfirmasi keluar dari game.
    leaveConfirm: 'Keluar dari game?',
  },
  // [ID] Blok bahasa Inggris (kunci sama, isinya terjemahan).
  en: {
    // [ID] Inggris: Tombol/judul mode Single Player.
    singlePlayer: 'Single Player',
    // [ID] Inggris: Tombol/judul mode Multiplayer.
    multiplayer: 'Multiplayer',
    // [ID] Inggris: Tombol/judul layar Cara Bermain.
    howToPlay: 'How to Play',
    // [ID] Inggris: Tombol/judul layar Pengaturan.
    settings: 'Settings',
    // [ID] Inggris: Label "Tingkat kesulitan" di layar Single Player.
    difficulty: 'Difficulty',
    // [ID] Inggris: Nama keempat level (satu baris berisi empat kunci: easy, medium, hard, expert).
    easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
    // [ID] Inggris: Keterangan kedalaman di kartu level (depth1..depth4 dalam satu baris).
    depth1: 'Depth 1', depth2: 'Depth 2', depth3: 'Depth 3', depth4: 'Depth 4',
    // [ID] Inggris: Label pilihan siapa yang jalan duluan.
    whoFirst: 'Who moves first?',
    // [ID] Inggris: Kata "Kamu" (nama pemain dan pilihan jalan duluan).
    you: 'You',
    // [ID] Inggris: Pilihan "Acak" untuk siapa jalan duluan.
    random: 'Random',
    // [ID] Inggris: Penjelasan saklar Alpha-Beta di layar Single Player.
    abHint: 'Turn it off to watch plain Minimax examine far more positions.',
    // [ID] Inggris: Tombol Mulai.
    startGame: 'Start',
    // [ID] Inggris: Judul kartu mode Lokal.
    local: 'Local',
    // [ID] Inggris: Penjelasan mode Lokal.
    localSub: 'Two players on one device, taking turns.',
    // [ID] Inggris: Penjelasan mode Online.
    onlineSub: 'Play over the internet with a room code.',
    // [ID] Inggris: Tombol Buat ruang.
    createRoom: 'Create room',
    // [ID] Inggris: Tombol Gabung.
    join: 'Join',
    // [ID] Inggris: Label "Kode ruang" di lobi.
    roomCode: 'Room code',
    // [ID] Inggris: Tombol Salin kode.
    copy: 'Copy code',
    // [ID] Inggris: Toast setelah kode disalin.
    copied: 'Code copied',
    // [ID] Inggris: Petunjuk di lobi untuk host.
    lobbyHint: 'Share this code with a friend. The game starts as soon as they join.',
    // [ID] Inggris: Petunjuk di lobi saat tamu menyambung.
    joiningHint: 'Connecting to the room…',
    // [ID] Inggris: Tombol Main sekarang di layar Cara Bermain.
    playNow: 'Play now',
    // [ID] Inggris: Aturan Mulai di layar Cara Bermain: posisi awal, Biru jalan duluan, warna di Single Player dan Online.
    startRule: '<strong>Start:</strong> Blue starts on a1 (bottom left), Orange on g7 (top right). Blue always moves first. In Single Player, the "Who moves first?" choice decides whether you play Blue or Orange. Online, colours swap on every rematch.',
    // [ID] Inggris: Aturan Batal lompat di layar Cara Bermain (dipasang oleh buildHowTo di main.js).
    undoRule: '<strong>Undo jump:</strong> before you place the trap, you can still take the jump back with the Undo jump button, by clicking your knight, or with the Esc key.',
    // [ID] Inggris: Aturan Makan di layar Cara Bermain (HTML <strong>, dipasang lewat data-i18n-html).
    eatRule: '<strong>Eating:</strong> jump onto the enemy knight’s square to eat it and win at once.',
    // [ID] Inggris: Aturan Petunjuk: kotak tujuanmu selalu tampil, kotak tujuan musuh muncul dengan tombol P.
    hintRule: '<strong>Hints:</strong> the squares you can jump to are always shown. The squares your enemy can jump to are hidden; press the P key to show or hide them.',
    // [ID] Inggris: Aturan Waktu; fungsi yang menerima n = TURN_SECONDS dari config.js.
    timeRule: (n) => `<strong>Time:</strong> one turn (jump and trap) lasts at most ${n} seconds. If time runs out before you jump, the game picks a random jump and trap. If you already jumped, only the trap is picked at random.`,
    // [ID] Inggris: Aturan kalah di layar Cara Bermain (berisi HTML <strong>, dipasang lewat data-i18n-html).
    loseRule: '<strong>Losing:</strong> if your knight has no legal jump on your turn, you lose. Box your opponent in before they box you in!',
    // [ID] Inggris: Label pilihan Bahasa.
    language: 'Language',
    // [ID] Inggris: Satuan "lompatan" di kartu pemain.
    jumps: 'jumps',
    // [ID] Inggris: Tombol Batal lompat.
    undoJump: 'Undo jump',
    // [ID] Inggris: Judul panel Statistik AI.
    aiBrain: 'AI stats',
    // [ID] Inggris: Teks "berpikir" saat AI sedang mencari langkah.
    thinking: 'thinking',
    // [ID] Inggris: Label statistik Kedalaman.
    statDepth: 'Depth',
    // [ID] Inggris: Label statistik Posisi diperiksa (jumlah node).
    statNodes: 'Positions examined',
    // [ID] Inggris: Label statistik Cabang dipangkas (cutoff Alpha-Beta).
    statCutoffs: 'Branches pruned',
    // [ID] Inggris: Label statistik Waktu berpikir.
    statTime: 'Time',
    // [ID] Inggris: Label statistik Skor langkah (nilai evaluasi).
    statScore: 'Move score',
    // [ID] Inggris: Judul panel Riwayat langkah.
    moveLog: 'Move history',
    // [ID] Inggris: Teks saat riwayat masih kosong.
    logEmpty: 'No moves yet.',
    // [ID] Inggris: Satuan jumlah langkah di layar game over.
    movesPlayed: 'moves played',
    // [ID] Inggris: Tombol Main lagi.
    rematch: 'Play again',
    // [ID] Inggris: Tombol Menu utama.
    mainMenu: 'Main menu',
    // [ID] Inggris: Judul langkah 1 Cara Bermain (Lompat).
    step1Title: 'Jump',
    // [ID] Inggris: Penjelasan langkah 1.
    step1Text: 'Move your knight like a chess knight: an L-shape onto any square that is not burned or trapped.',
    // [ID] Inggris: Judul langkah 2 (Bakar).
    step2Title: 'Burn',
    // [ID] Inggris: Penjelasan langkah 2.
    step2Text: 'The square you leave burns at once and can never be used again.',
    // [ID] Inggris: Judul langkah 3 (Jebak).
    step3Title: 'Trap',
    // [ID] Inggris: Penjelasan langkah 3.
    step3Text: 'After the jump, destroy any one empty square on the board. A square with a knight on it cannot be trapped. Cut off your opponent’s escape!',
    // [ID] Inggris: Judul mode di atas layar game; fungsi yang menerima nama level.
    modeAi: (lvl) => `Single Player · ${lvl}`,
    // [ID] Inggris: Judul mode Lokal di atas layar game.
    modeLocal: 'Multiplayer · Local',
    // [ID] Inggris: Judul mode Online di atas layar game.
    modeOnline: 'Multiplayer · Online',
    // [ID] Inggris: Nama warna sisi 0.
    blue: 'Blue',
    // [ID] Inggris: Nama warna sisi 1.
    orange: 'Orange',
    // [ID] Inggris: Nama "Pemain n"; fungsi yang menerima nomor pemain.
    player: (n) => `Player ${n}`,
    // [ID] Inggris: Kata "AI".
    ai: 'AI',
    // [ID] Inggris: Nama lawan online.
    opponent: 'Opponent',
    // [ID] Inggris: Akhiran "(kamu)" (cadangan, tidak dipakai saat ini).
    youSuffix: '(you)',
    // [ID] Inggris: Status: giliranmu memilih lompatan.
    yourJump: 'Your turn: pick a jump',
    // [ID] Inggris: Status: pilih kotak jebakan.
    yourTrap: 'Place a trap',
    // [ID] Inggris: Status mode lokal: giliran pemain bernama tertentu memilih lompatan.
    sideJump: (name) => `${name}’s turn: pick a jump`,
    // [ID] Inggris: Status mode lokal: pemain bernama tertentu memilih jebakan.
    sideTrap: (name) => `${name}: place a trap`,
    // [ID] Inggris: Status saat AI berpikir.
    aiThinking: 'AI is thinking…',
    // [ID] Inggris: Status saat menunggu lawan online.
    waitingOpponent: 'Waiting for your opponent…',
    // [ID] Inggris: Teks giliran pemain (cadangan untuk mode lokal).
    passDevice: (name) => `${name}’s turn`,
    // [ID] Inggris: Judul game over saat menang.
    youWin: 'You Win!',
    // [ID] Inggris: Judul game over saat kalah.
    youLose: 'You Lose',
    // [ID] Inggris: Judul game over mode lokal: "<nama> Menang!".
    sideWins: (name) => `${name} Wins!`,
    // [ID] Inggris: Keterangan: pemain tertentu tidak punya lompatan legal.
    trappedSub: (name) => `${name} has no legal jump.`,
    // [ID] Inggris: Keterangan saat AI menang.
    aiWinSub: 'The AI boxed your knight in.',
    // [ID] Inggris: Keterangan saat pemain mengalahkan AI.
    youWinSub: 'The AI knight is trapped. Nicely played!',
    // [ID] Inggris: Keterangan di layar akhir saat knight seseorang dimakan (mode Multiplayer).
    eatenSub: (name) => `${name} was eaten.`,
    // [ID] Inggris: Keterangan saat pemain memakan knight AI.
    youAteSub: 'You ate the AI knight.',
    // [ID] Inggris: Keterangan saat AI memakan knight pemain.
    aiAteSub: 'The AI ate your knight.',
    // [ID] Inggris: Tanda "makan" di riwayat langkah.
    ateMark: 'eats',
    // [ID] Inggris: Skor langkah di panel AI saat AI melihat kemenangan pasti dalam n giliran.
    scoreWin: (n) => `Win in ${n} turns`,
    // [ID] Inggris: Skor langkah di panel AI saat AI melihat kekalahan pasti dalam n giliran.
    scoreLoss: (n) => `Loss in ${n} turns`,
    // [ID] Inggris: Label saat AI berhenti karena batas 4 detik.
    timedOut: '4 s limit',
    // [ID] Inggris: Sisa waktu giliran, misalnya "12 dtk".
    timerLeft: (n) => `${n} s`,
    // [ID] Inggris: Pesan saat waktu habis dan langkah dipilih acak.
    timeUp: 'Time is up, so the game moved for you.',
    // [ID] Inggris: Status online: membuat ruang.
    netCreating: 'Creating room…',
    // [ID] Inggris: Status online: menunggu lawan.
    netWaiting: 'Waiting for an opponent to join…',
    // [ID] Inggris: Status online: menghubungkan.
    netConnecting: 'Connecting…',
    // [ID] Inggris: Status online: terhubung.
    netConnected: 'Connected',
    // [ID] Inggris: Status online: koneksi tidak stabil.
    netUnstable: 'Connection unstable',
    // [ID] Inggris: Status online: lawan keluar.
    netLeft: 'Your opponent left the game',
    // [ID] Inggris: Status online: terputus (cadangan).
    netClosed: 'Disconnected',
    // [ID] Inggris: Error: ruang tidak ditemukan.
    netRoomNotFound: 'Room not found. Check the code.',
    // [ID] Inggris: Error: ruang sudah penuh.
    netRoomFull: 'That room is full.',
    // [ID] Inggris: Error: library online gagal dimuat.
    netLoadFail: 'Could not load the online module. Check your internet connection.',
    // [ID] Inggris: Error koneksi umum.
    netError: 'Connection failed. Try again.',
    // [ID] Inggris: Error: kode ruang harus 4–6 karakter.
    netBadCode: 'Enter a 4–6 character code.',
    // [ID] Inggris: Pesan menunggu lawan setuju main lagi.
    waitRematch: 'Waiting for your opponent to accept…',
    // [ID] Inggris: Pesan lawan ingin main lagi.
    oppWantsRematch: 'Your opponent wants a rematch!',
    // [ID] Inggris: Pertanyaan konfirmasi keluar dari game.
    leaveConfirm: 'Leave the game?',
  },
};

// [ID] Bahasa yang sedang dipakai.
let lang = 'id';

// [ID] Ganti bahasa dan perbarui semua teks di halaman.
export function setLang(l) {
  // [ID] Pakai bahasa l kalau ada; kalau tidak dikenal, pakai Indonesia.
  lang = STRINGS[l] ? l : 'id';
  // [ID] Set atribut lang di <html> (untuk pembaca layar dan mesin pencari).
  document.documentElement.lang = lang;
  // [ID] Untuk setiap elemen yang punya atribut data-i18n:
  for (const el of document.querySelectorAll('[data-i18n]')) {
    // [ID] ambil teks sesuai kuncinya,
    const v = STRINGS[lang][el.dataset.i18n];
    // [ID] isi sebagai teks biasa (aman dari HTML).
    if (typeof v === 'string') el.textContent = v;
  }
  // [ID] Untuk elemen dengan data-i18n-html (teks yang berisi HTML seperti <strong>):
  for (const el of document.querySelectorAll('[data-i18n-html]')) {
    // [ID] ambil teks sesuai kuncinya,
    const v = STRINGS[lang][el.dataset.i18nHtml];
    // [ID] isi sebagai HTML (teksnya dari kode sendiri, bukan dari pengguna).
    if (typeof v === 'string') el.innerHTML = v;
  }
}

// [ID] Bahasa yang sedang dipakai.
export function getLang() {
  // [ID] Kembalikan kode bahasanya.
  return lang;
}

// [ID] Terjemahkan kunci. args diteruskan kalau teksnya berupa fungsi (misalnya nama atau angka).
export function t(key, ...args) {
  // [ID] Cari di bahasa aktif, kalau tidak ada di Indonesia, kalau tidak ada pakai kuncinya sendiri.
  const v = STRINGS[lang][key] ?? STRINGS.id[key] ?? key;
  // [ID] Teks berupa fungsi: panggil dengan args; selain itu kembalikan apa adanya.
  return typeof v === 'function' ? v(...args) : v;
}
