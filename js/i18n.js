// [ID] Semua teks tampilan dalam dua bahasa. Bahasa Indonesia default, bahasa Inggris alternatif.
// UI strings. Bahasa Indonesia is the default; English is the alternative.

// [ID] Tabel teks: STRINGS.id untuk Indonesia, STRINGS.en untuk Inggris. Kunci yang sama dipakai di kedua bahasa.
const STRINGS = {
  // [ID] Blok bahasa Indonesia.
  id: {
    // [ID] Slogan di bawah judul menu.
    tagline: 'Lompat. Bakar. Jebak.',
    // [ID] Tombol/judul mode Single Player.
    singlePlayer: 'Single Player',
    // [ID] Keterangan kecil di tombol Single Player.
    vsAi: 'Lawan AI Minimax',
    // [ID] Tombol/judul mode Multiplayer.
    multiplayer: 'Multiplayer',
    // [ID] Keterangan kecil di tombol Multiplayer.
    mpSub: 'Lokal atau online',
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
    // [ID] Aturan kalah di layar Cara Bermain (berisi HTML <strong>, dipasang lewat data-i18n-html).
    loseRule: '<strong>Kalah:</strong> jika pada giliranmu knight tidak punya lompatan legal, kamu kalah. Kurung lawan sebelum dia mengurungmu!',
    // [ID] Label saklar Suara.
    sound: 'Suara',
    // [ID] Penjelasan saklar Suara.
    soundSub: 'Efek lompat, bakar, dan jebakan.',
    // [ID] Label pilihan Bahasa.
    language: 'Bahasa',
    // [ID] Satuan "lompatan" di kartu pemain.
    jumps: 'lompatan',
    // [ID] Tombol Batal lompat.
    undoJump: 'Batal lompat',
    // [ID] Judul panel "Otak AI".
    aiBrain: 'Otak AI',
    // [ID] Teks animasi "berpikir".
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
    step1Text: 'Gerakkan knight seperti kuda catur: bentuk huruf L ke kotak yang masih terbuka.',
    // [ID] Judul langkah 2 (Bakar).
    step2Title: 'Bakar',
    // [ID] Penjelasan langkah 2.
    step2Text: 'Kotak yang kamu tinggalkan langsung terbakar dan tidak bisa dipakai lagi.',
    // [ID] Judul langkah 3 (Jebak).
    step3Title: 'Jebak',
    // [ID] Penjelasan langkah 3.
    step3Text: 'Lalu hancurkan satu kotak terbuka di mana pun. Tutup jalan kabur lawan!',
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
    // [ID] Skor langkah di panel AI saat AI melihat kemenangan pasti dalam n giliran.
    scoreWin: (n) => `Menang dalam ${n} giliran`,
    // [ID] Skor langkah di panel AI saat AI melihat kekalahan pasti dalam n giliran.
    scoreLoss: (n) => `Kalah dalam ${n} giliran`,
    // [ID] Label saat AI berhenti karena batas 4 detik.
    timedOut: 'batas 4 dtk',
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
    // Points and leaderboard
    // [ID] Tombol/judul layar Leaderboard.
    leaderboard: 'Leaderboard',
    // [ID] Keterangan kecil di tombol Leaderboard.
    lbMenuSub: 'Peringkat Human vs AI',
    // [ID] Judul kolom Tim.
    lbTeam: 'Tim',
    // [ID] Judul kolom Poin.
    lbPoints: 'Poin',
    // [ID] Judul kolom jumlah Menang.
    lbWins: 'Menang',
    // [ID] Judul kolom jumlah game dimainkan.
    lbGames: 'Main',
    // [ID] Status leaderboard: memuat.
    lbLoading: 'Memuat…',
    // [ID] Status leaderboard: diperbarui pada jam tertentu.
    lbUpdated: (time) => `Diperbarui ${time}`,
    // [ID] Status leaderboard: server tidak bisa dihubungi.
    lbOffline: 'Leaderboard offline',
    // [ID] Teks saat leaderboard masih kosong.
    lbEmpty: 'Belum ada skor. Jadilah yang pertama!',
    // [ID] Info jumlah skor yang tersimpan di perangkat dan belum terkirim.
    lbPending: (n) => `${n} skor tersimpan di perangkat ini dan akan dikirim saat leaderboard online.`,
    // [ID] Judul dialog dan label Nama tim.
    teamName: 'Nama tim',
    // [ID] Petunjuk di dialog nama tim.
    teamPrompt: 'Masukkan nama tim atau pemain untuk leaderboard.',
    // [ID] Error: panjang nama tidak sah (menerima batas min dan maks).
    teamInvalid: (min, max) => `Nama harus ${min}–${max} karakter.`,
    // [ID] Tombol Simpan.
    save: 'Simpan',
    // [ID] Tombol Batal.
    cancel: 'Batal',
    // [ID] Tombol Ganti nama tim.
    change: 'Ganti',
    // [ID] Kata "Poin" (kotak skor dan judul rincian).
    points: 'Poin',
    // [ID] Baris rincian: jumlah langkah x poin per langkah.
    ptMoves: (n, each) => `Langkah (${n} × ${each})`,
    // [ID] Baris rincian: bonus menang.
    ptWin: 'Bonus menang',
    // [ID] Baris rincian: total.
    ptTotal: 'Total',
    // [ID] Tombol Kirim skor.
    submitScore: 'Kirim skor',
    // [ID] Status: sedang mengirim.
    submitting: 'Mengirim…',
    // [ID] Status berhasil: poin game, peringkat, dan total tim.
    submitted: (pts, rank, total) => `Terkirim! +${pts} poin · peringkat #${rank} · total tim ${total}`,
    // [ID] Status: terlalu cepat (batas 1 kiriman per 10 detik).
    submitRate: 'Terlalu cepat. Coba lagi beberapa detik lagi.',
    // [ID] Status: game ini sudah pernah dikirim.
    submitDup: 'Game ini sudah dikirim.',
    // [ID] Status: server menolak skor.
    submitRejected: 'Skor ditolak server.',
    // [ID] Status: server offline, skor disimpan untuk dikirim nanti.
    submitOffline: 'Leaderboard offline. Skor disimpan di perangkat ini dan dikirim nanti.',
    // [ID] Toast: skor tertunda berhasil dikirim.
    pendingSent: 'Skor tersimpan berhasil dikirim.',
    // [ID] Judul tabel "Cara dapat poin".
    pointsHow: 'Cara dapat poin',
    // [ID] Penjelasan di bawah tabel poin.
    pointsNote: 'Setiap langkahmu dapat poin, dan menang dapat bonus. Makin sulit, makin besar poinnya.',
    // [ID] Label poin per langkah di kartu level.
    ptsPerMove: (n) => `+${n} poin/langkah`,
    // [ID] Judul kolom Level di tabel poin.
    ptLevel: 'Level',
    // [ID] Judul kolom poin per Langkah.
    ptColMove: 'Langkah',
    // [ID] Judul kolom bonus Menang.
    ptColWin: 'Menang',
    // Admin
    // [ID] Judul halaman admin.
    adminTitle: 'Admin Poin',
    // [ID] Label kolom kunci admin.
    adminKey: 'Kunci admin',
    // [ID] Petunjuk kolom kunci admin.
    adminKeyHint: 'Nilai ADMIN_KEY dari Vercel. Hanya disimpan di tab ini.',
    // [ID] Tombol Masuk di halaman admin.
    adminLoad: 'Masuk',
    // [ID] Judul bagian poin dasar.
    adminPoints: 'Poin dasar',
    // [ID] Judul bagian pengali per level.
    adminMultipliers: 'Pengali per tingkat',
    // [ID] Label kolom poin per langkah.
    adminMove: 'Per langkah',
    // [ID] Label kolom bonus menang.
    adminWin: 'Bonus menang',
    // [ID] Judul pratinjau tabel poin.
    adminPreview: 'Pratinjau',
    // [ID] Tombol Simpan poin.
    adminSave: 'Simpan poin',
    // [ID] Tombol Kembalikan default.
    adminReset: 'Kembalikan default',
    // [ID] Catatan: perubahan hanya berlaku untuk game berikutnya.
    adminNote: 'Perubahan berlaku untuk game yang dikirim setelah disimpan. Total tim yang sudah ada tidak berubah.',
    // [ID] Status: poin tersimpan.
    adminSaved: 'Poin disimpan.',
    // [ID] Status: poin kembali ke default.
    adminResetDone: 'Poin kembali ke default.',
    // [ID] Error: ada nilai yang tidak sah.
    adminInvalid: 'Ada nilai yang tidak valid. Poin: bilangan bulat 0–100000. Pengali: 0–100, maks 2 desimal.',
    // [ID] Error: kunci admin salah.
    adminUnauthorized: 'Kunci admin salah.',
    // [ID] Error: terkunci 10 menit setelah terlalu banyak percobaan salah.
    adminLocked: 'Terlalu banyak percobaan salah. Coba lagi dalam 10 menit.',
    // [ID] Error: ADMIN_KEY belum diset di Vercel.
    adminDisabled: 'Admin belum aktif: set ADMIN_KEY di Vercel lalu redeploy.',
    // [ID] Error: server tidak bisa dihubungi.
    adminOffline: 'Server tidak bisa dihubungi.',
    // [ID] Pertanyaan konfirmasi kembalikan default.
    adminResetConfirm: 'Kembalikan semua poin ke nilai default?',
    // [ID] Tombol kembali ke game (cadangan).
    adminBack: 'Ke game',
  },
  // [ID] Blok bahasa Inggris (kunci sama, isinya terjemahan).
  en: {
    // [ID] Inggris: Slogan di bawah judul menu.
    tagline: 'Jump. Burn. Trap.',
    // [ID] Inggris: Tombol/judul mode Single Player.
    singlePlayer: 'Single Player',
    // [ID] Inggris: Keterangan kecil di tombol Single Player.
    vsAi: 'Versus the Minimax AI',
    // [ID] Inggris: Tombol/judul mode Multiplayer.
    multiplayer: 'Multiplayer',
    // [ID] Inggris: Keterangan kecil di tombol Multiplayer.
    mpSub: 'Local or online',
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
    // [ID] Inggris: Aturan kalah di layar Cara Bermain (berisi HTML <strong>, dipasang lewat data-i18n-html).
    loseRule: '<strong>Losing:</strong> if your knight has no legal jump on your turn, you lose. Box your opponent in before they box you in!',
    // [ID] Inggris: Label saklar Suara.
    sound: 'Sound',
    // [ID] Inggris: Penjelasan saklar Suara.
    soundSub: 'Jump, burn and trap effects.',
    // [ID] Inggris: Label pilihan Bahasa.
    language: 'Language',
    // [ID] Inggris: Satuan "lompatan" di kartu pemain.
    jumps: 'jumps',
    // [ID] Inggris: Tombol Batal lompat.
    undoJump: 'Undo jump',
    // [ID] Inggris: Judul panel "Otak AI".
    aiBrain: 'AI Brain',
    // [ID] Inggris: Teks animasi "berpikir".
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
    step1Text: 'Move your knight like a chess knight: an L-shape onto any open square.',
    // [ID] Inggris: Judul langkah 2 (Bakar).
    step2Title: 'Burn',
    // [ID] Inggris: Penjelasan langkah 2.
    step2Text: 'The square you leave burns at once and can never be used again.',
    // [ID] Inggris: Judul langkah 3 (Jebak).
    step3Title: 'Trap',
    // [ID] Inggris: Penjelasan langkah 3.
    step3Text: 'Then destroy any one open square on the board. Cut off your opponent’s escape!',
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
    // [ID] Inggris: Skor langkah di panel AI saat AI melihat kemenangan pasti dalam n giliran.
    scoreWin: (n) => `Win in ${n} turns`,
    // [ID] Inggris: Skor langkah di panel AI saat AI melihat kekalahan pasti dalam n giliran.
    scoreLoss: (n) => `Loss in ${n} turns`,
    // [ID] Inggris: Label saat AI berhenti karena batas 4 detik.
    timedOut: '4 s limit',
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
    // [ID] Inggris: Tombol/judul layar Leaderboard.
    leaderboard: 'Leaderboard',
    // [ID] Inggris: Keterangan kecil di tombol Leaderboard.
    lbMenuSub: 'Human vs AI rankings',
    // [ID] Inggris: Judul kolom Tim.
    lbTeam: 'Team',
    // [ID] Inggris: Judul kolom Poin.
    lbPoints: 'Points',
    // [ID] Inggris: Judul kolom jumlah Menang.
    lbWins: 'Wins',
    // [ID] Inggris: Judul kolom jumlah game dimainkan.
    lbGames: 'Games',
    // [ID] Inggris: Status leaderboard: memuat.
    lbLoading: 'Loading…',
    // [ID] Inggris: Status leaderboard: diperbarui pada jam tertentu.
    lbUpdated: (time) => `Updated ${time}`,
    // [ID] Inggris: Status leaderboard: server tidak bisa dihubungi.
    lbOffline: 'Leaderboard offline',
    // [ID] Inggris: Teks saat leaderboard masih kosong.
    lbEmpty: 'No scores yet. Be the first!',
    // [ID] Inggris: Info jumlah skor yang tersimpan di perangkat dan belum terkirim.
    lbPending: (n) => `${n} score(s) saved on this device, sent when the leaderboard is back online.`,
    // [ID] Inggris: Judul dialog dan label Nama tim.
    teamName: 'Team name',
    // [ID] Inggris: Petunjuk di dialog nama tim.
    teamPrompt: 'Enter a team or player name for the leaderboard.',
    // [ID] Inggris: Error: panjang nama tidak sah (menerima batas min dan maks).
    teamInvalid: (min, max) => `The name must be ${min}–${max} characters.`,
    // [ID] Inggris: Tombol Simpan.
    save: 'Save',
    // [ID] Inggris: Tombol Batal.
    cancel: 'Cancel',
    // [ID] Inggris: Tombol Ganti nama tim.
    change: 'Change',
    // [ID] Inggris: Kata "Poin" (kotak skor dan judul rincian).
    points: 'Points',
    // [ID] Inggris: Baris rincian: jumlah langkah x poin per langkah.
    ptMoves: (n, each) => `Moves (${n} × ${each})`,
    // [ID] Inggris: Baris rincian: bonus menang.
    ptWin: 'Win bonus',
    // [ID] Inggris: Baris rincian: total.
    ptTotal: 'Total',
    // [ID] Inggris: Tombol Kirim skor.
    submitScore: 'Submit score',
    // [ID] Inggris: Status: sedang mengirim.
    submitting: 'Sending…',
    // [ID] Inggris: Status berhasil: poin game, peringkat, dan total tim.
    submitted: (pts, rank, total) => `Submitted! +${pts} points · rank #${rank} · team total ${total}`,
    // [ID] Inggris: Status: terlalu cepat (batas 1 kiriman per 10 detik).
    submitRate: 'Too fast. Try again in a few seconds.',
    // [ID] Inggris: Status: game ini sudah pernah dikirim.
    submitDup: 'This game was already submitted.',
    // [ID] Inggris: Status: server menolak skor.
    submitRejected: 'The server rejected this score.',
    // [ID] Inggris: Status: server offline, skor disimpan untuk dikirim nanti.
    submitOffline: 'Leaderboard offline. Score saved on this device and sent later.',
    // [ID] Inggris: Toast: skor tertunda berhasil dikirim.
    pendingSent: 'Saved score sent.',
    // [ID] Inggris: Judul tabel "Cara dapat poin".
    pointsHow: 'How to score',
    // [ID] Inggris: Penjelasan di bawah tabel poin.
    pointsNote: 'Every move you make earns points, and winning earns a bonus. Harder levels pay more.',
    // [ID] Inggris: Label poin per langkah di kartu level.
    ptsPerMove: (n) => `+${n} pts/move`,
    // [ID] Inggris: Judul kolom Level di tabel poin.
    ptLevel: 'Level',
    // [ID] Inggris: Judul kolom poin per Langkah.
    ptColMove: 'Move',
    // [ID] Inggris: Judul kolom bonus Menang.
    ptColWin: 'Win',
    // [ID] Inggris: Judul halaman admin.
    adminTitle: 'Points Admin',
    // [ID] Inggris: Label kolom kunci admin.
    adminKey: 'Admin key',
    // [ID] Inggris: Petunjuk kolom kunci admin.
    adminKeyHint: 'The ADMIN_KEY value from Vercel. Kept only in this tab.',
    // [ID] Inggris: Tombol Masuk di halaman admin.
    adminLoad: 'Sign in',
    // [ID] Inggris: Judul bagian poin dasar.
    adminPoints: 'Base points',
    // [ID] Inggris: Judul bagian pengali per level.
    adminMultipliers: 'Multiplier per level',
    // [ID] Inggris: Label kolom poin per langkah.
    adminMove: 'Per move',
    // [ID] Inggris: Label kolom bonus menang.
    adminWin: 'Win bonus',
    // [ID] Inggris: Judul pratinjau tabel poin.
    adminPreview: 'Preview',
    // [ID] Inggris: Tombol Simpan poin.
    adminSave: 'Save points',
    // [ID] Inggris: Tombol Kembalikan default.
    adminReset: 'Restore defaults',
    // [ID] Inggris: Catatan: perubahan hanya berlaku untuk game berikutnya.
    adminNote: 'Changes apply to games submitted after saving. Existing team totals stay as they are.',
    // [ID] Inggris: Status: poin tersimpan.
    adminSaved: 'Points saved.',
    // [ID] Inggris: Status: poin kembali ke default.
    adminResetDone: 'Points restored to the defaults.',
    // [ID] Inggris: Error: ada nilai yang tidak sah.
    adminInvalid: 'Some values are invalid. Points: whole numbers 0–100000. Multipliers: 0–100, at most 2 decimals.',
    // [ID] Inggris: Error: kunci admin salah.
    adminUnauthorized: 'Wrong admin key.',
    // [ID] Inggris: Error: terkunci 10 menit setelah terlalu banyak percobaan salah.
    adminLocked: 'Too many wrong attempts. Try again in 10 minutes.',
    // [ID] Inggris: Error: ADMIN_KEY belum diset di Vercel.
    adminDisabled: 'Admin is off: set ADMIN_KEY in Vercel and redeploy.',
    // [ID] Inggris: Error: server tidak bisa dihubungi.
    adminOffline: 'Cannot reach the server.',
    // [ID] Inggris: Pertanyaan konfirmasi kembalikan default.
    adminResetConfirm: 'Restore every point value to the default?',
    // [ID] Inggris: Tombol kembali ke game (cadangan).
    adminBack: 'Back to game',
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
