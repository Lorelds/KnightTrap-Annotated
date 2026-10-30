# Knight Trap — Versi Beranotasi (untuk belajar)

Repo ini adalah **salinan kode Knight Trap yang sama persis**, tetapi setiap baris kode diberi penjelasan dalam bahasa Indonesia. Pakai repo ini untuk belajar dan persiapan presentasi. Untuk menjalankan dan deploy game, tetap pakai repo asli `KnightTrap`.

## Cara membaca

- Komentar penjelasan selalu diawali **`[ID]`** dan berada **di baris sendiri, tepat di atas baris kode** yang dijelaskan:
  - JavaScript: `// [ID] ...`
  - HTML: `<!-- [ID] ... -->`
  - CSS: `/* [ID] ... */`
- Komentar berbahasa Inggris tanpa `[ID]` adalah komentar asli dari repo `KnightTrap`.
- Baris yang hanya berisi penutup (`}`, `});`, `</div>`) dan baris kosong tidak diberi komentar.

## Urutan baca yang disarankan

1. `js/config.js`: semua angka tetap (ukuran papan, kedalaman level, batas AI, poin).
2. `js/rules.js`: aturan game (lompat, bakar, jebak, kalah).
3. `js/ai.js`: Minimax, Alpha-Beta, BFS, DFS, fungsi evaluasi.
4. `js/game.js`: alur giliran (pemain, AI, online).
5. `js/ai-client.js`, `js/ai.worker.js`: menjalankan AI di Web Worker.
6. `js/board.js`, `js/fx.js`, `css/style.css`, `index.html`: tampilan.
7. `js/main.js`, `js/i18n.js`, `js/audio.js`, `js/net.js`: layar, teks, suara, online.
8. `js/scoring.js`, `api/`, `js/admin.js`, `admin.html`: poin, leaderboard, admin.
9. `tests/run.mjs`: semua pengujian Bab 2.2.

## Yang tidak diberi komentar

- `package.json`, `package-lock.json`, `vercel.json`: format JSON tidak mengizinkan komentar. Isinya:
  - `package.json`: nama proyek, `"type": "module"` (semua file .js memakai `import`/`export`), dan satu dependency `@upstash/redis` (database leaderboard).
  - `vercel.json`: Vercel menyajikan folder apa adanya tanpa build; file di `/js` dikirim dengan tipe JavaScript; header keamanan `nosniff`.
  - `package-lock.json`: dibuat otomatis oleh npm untuk mengunci versi dependency.
- `README.md`: dokumentasi asli (bahasa Inggris), tidak diubah.

## Bukti kodenya sama persis

Komentar tidak mengubah satu baris kode pun. Ini sudah dicek dua cara:

1. Script pembanding membuang semua baris komentar dan baris kosong dari repo asli dan repo ini, lalu membandingkan sisanya baris per baris: **identik untuk semua file**. Script yang sama juga memastikan tidak ada komentar yang tidak sengaja masuk ke dalam template literal JavaScript (yang akan ikut tampil sebagai teks).
2. Tes dijalankan di repo ini: `node tests/run.mjs --quick` → **ALL PASSED**.

## Learning guide (PDF)

Folder `learning-guide/` berisi learning guide per anggota tim, mengikuti proposal dan pembagian tugas di Bab 2.3:

- `Learning Guide - Louis Yuriel Saputra.pdf`: Minimax, Alpha-Beta, tingkat kesulitan, panel statistik, uji Alpha-Beta.
- `Learning Guide - Clarrence Adriano Hemeldan.pdf`: antarmuka, BFS & wilayah, uji win rate dan waktu respons.
- `Learning Guide - Shatrya Christiano Chandra.pdf`: representasi papan, aturan, DFS, penyatuan evaluasi, playtest.

Setiap guide juga berisi bagian bersama (gambaran proyek, aturan → kode, alur satu giliran, konsep AI, hasil pengujian, fitur poin), latihan dengan jawaban, daftar pertanyaan presentasi, dan checklist.

Untuk membuat ulang PDF setelah kode berubah (butuh Python dan Google Chrome):

```bash
cd learning-guide
python build.py            # semua guide
python build.py louis      # satu guide saja
```

Potongan kode di PDF diambil otomatis dari repo asli `../KnightTrap`, jadi nomor barisnya selalu cocok dengan kode yang dijalankan.

## Menjalankan game dari repo ini

Sama seperti repo asli:

```bash
npx serve .
node tests/run.mjs --quick
```
