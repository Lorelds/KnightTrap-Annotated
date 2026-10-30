// Admin page: sign in with ADMIN_KEY, edit the point values, preview, save to /api/config.
// [ID] Halaman admin: masuk dengan ADMIN_KEY, ubah nilai poin, lihat pratinjau, simpan ke /api/config.

// [ID] Fungsi periksa poin, nama nilai poin, daftar level.
import { normalizeRules, POINT_FIELDS, LEVELS } from './scoring.js';
// [ID] Tabel poin per level (untuk pratinjau).
import { pointsTable } from './points-table.js';
// [ID] Bahasa dan terjemahan.
import { setLang, t } from './i18n.js';
// [ID] Bara latar belakang.
import { startBackgroundEmbers } from './fx.js';

// [ID] Singkatan cari elemen.
const $ = (sel, root = document) => root.querySelector(sel);
// [ID] Kunci penyimpanan kunci admin di sessionStorage (hilang saat tab ditutup).
const KEY_STORE = 'knighttrap.adminKey';

// [ID] Kunci admin yang sedang dipakai.
let key = '';
// [ID] Coba ambil kunci yang tersimpan di tab ini.
try {
  // [ID] (ambil)
  key = sessionStorage.getItem(KEY_STORE) || '';
// [ID] Gagal: kosong.
} catch {}
// [ID] Pakai bahasa yang sama dengan pengaturan game.
try {
  // [ID] Baca pengaturan game, ambil bahasanya (default Indonesia).
  setLang(JSON.parse(localStorage.getItem('knighttrap.settings') || '{}').lang || 'id');
// [ID] Gagal:
} catch {
  // [ID] pakai Indonesia.
  setLang('id');
}

// [ID] Kode error dari server → kunci teks pesan.
const ERRORS = {
  // [ID] Kunci salah.
  unauthorized: 'adminUnauthorized',
  // [ID] Terkunci karena terlalu banyak salah.
  locked: 'adminLocked',
  // [ID] ADMIN_KEY belum diset.
  'admin-disabled': 'adminDisabled',
  // [ID] Nilai tidak sah.
  'bad-rules': 'adminInvalid',
};

// [ID] Tulis status; kind 'ok' = hijau, 'bad' = merah.
function status(text, kind = '') {
  // [ID] Elemen status.
  const el = $('#admin-status');
  // [ID] Teks.
  el.textContent = text;
  // [ID] Class warna.
  el.className = `admin-status ${kind}`;
}

// [ID] Kirim permintaan ke /api/config dengan kunci admin.
async function call(body) {
  // [ID] Coba kirim.
  try {
    // [ID] POST:
    const res = await fetch('/api/config', {
      // [ID] metode POST,
      method: 'POST',
      // [ID] JSON dan kunci admin di header Authorization (format "Bearer <kunci>"),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      // [ID] isi permintaan.
      body: JSON.stringify(body),
    });
    // [ID] Baca JSON (null kalau gagal).
    const data = await res.json().catch(() => null);
    // [ID] Berhasil: kembalikan nilai poin.
    if (res.ok && data?.ok) return { ok: true, rules: data.rules };
    // [ID] Gagal: kembalikan kode error.
    return { ok: false, error: data?.error ?? 'offline' };
  // [ID] Jaringan gagal:
  } catch {
    // [ID] offline.
    return { ok: false, error: 'offline' };
  }
}

// [ID] Tangani kegagalan.
function fail(error) {
  // [ID] Tampilkan pesan merah sesuai kode error.
  status(t(ERRORS[error] ?? 'adminOffline'), 'bad');
  // [ID] Kunci salah:
  if (error === 'unauthorized') {
    // [ID] lupakan kunci,
    key = '';
    // [ID] hapus dari penyimpanan,
    try {
      // [ID] (hapus)
      sessionStorage.removeItem(KEY_STORE);
    } catch {}
    // [ID] sembunyikan editor,
    $('#editor').hidden = true;
    // [ID] tampilkan form masuk.
    $('#login').hidden = false;
  }
}

// [ID] Form editor nilai poin.
const form = $('#editor');

// [ID] Isi form dengan nilai poin.
function fill(rules) {
  // [ID] Poin per langkah dan bonus menang.
  for (const f of POINT_FIELDS) form.elements[f].value = rules[f];
  // [ID] Pengali setiap level (kolom bernama mult-easy, mult-medium, ...).
  for (const lvl of LEVELS) form.elements[`mult-${lvl}`].value = rules.multiplier[lvl];
  // [ID] Perbarui pratinjau.
  preview();
}

// [ID] Baca nilai dari form dan periksa. Mengembalikan nilai bersih atau null.
function read() {
  // [ID] Ubah isi kolom menjadi angka (kosong = NaN supaya ditolak).
  const num = (name) => (form.elements[name].value === '' ? NaN : Number(form.elements[name].value));
  // [ID] Objek nilai mentah.
  const raw = { multiplier: {} };
  // [ID] Poin.
  for (const f of POINT_FIELDS) raw[f] = num(f);
  // [ID] Pengali.
  for (const lvl of LEVELS) raw.multiplier[lvl] = num(`mult-${lvl}`);
  // [ID] Periksa dengan aturan yang sama seperti server.
  return normalizeRules(raw);
}

// [ID] Perbarui tabel pratinjau setiap kali form berubah.
function preview() {
  // [ID] Nilai dari form.
  const rules = read();
  // [ID] Tombol Simpan hanya aktif kalau nilai sah.
  $('#admin-save').disabled = !rules;
  // [ID] Nilai sah:
  if (rules) {
    // [ID] tampilkan tabel,
    $('#admin-preview').innerHTML = pointsTable(rules, t);
    // [ID] hapus pesan error lama.
    if ($('#admin-status').classList.contains('bad')) status('');
  // [ID] Tidak sah:
  } else {
    // [ID] pesan "Ada nilai yang tidak valid".
    status(t('adminInvalid'), 'bad');
  }
}

// [ID] Masuk: cek kunci ke server.
async function signIn() {
  // [ID] Tanda sedang memeriksa.
  status('…');
  // [ID] Minta server mengecek kunci (check: true hanya membaca nilai).
  const r = await call({ check: true });
  // [ID] Gagal: tangani.
  if (!r.ok) return fail(r.error);
  // [ID] Berhasil: simpan kunci di tab ini.
  try {
    // [ID] (simpan)
    sessionStorage.setItem(KEY_STORE, key);
  } catch {}
  // [ID] Sembunyikan form masuk.
  $('#login').hidden = true;
  // [ID] Tampilkan editor.
  form.hidden = false;
  // [ID] Isi dengan nilai dari server.
  fill(r.rules);
  // [ID] Kosongkan status.
  status('');
}

// [ID] Form masuk dikirim:
$('#login').addEventListener('submit', (e) => {
  // [ID] jangan muat ulang halaman,
  e.preventDefault();
  // [ID] ambil kunci (tanpa spasi di awal/akhir),
  key = $('#admin-key').value.trim();
  // [ID] kalau diisi, masuk.
  if (key) signIn();
});

// [ID] Setiap perubahan di form: perbarui pratinjau.
form.addEventListener('input', preview);

// [ID] Tombol Simpan poin:
form.addEventListener('submit', async (e) => {
  // [ID] jangan muat ulang halaman,
  e.preventDefault();
  // [ID] baca nilai,
  const rules = read();
  // [ID] tidak sah: tampilkan error,
  if (!rules) return preview();
  // [ID] matikan tombol selama menyimpan,
  $('#admin-save').disabled = true;
  // [ID] kirim ke server,
  const r = await call({ rules });
  // [ID] aktifkan tombol lagi,
  $('#admin-save').disabled = false;
  // [ID] gagal: tangani,
  if (!r.ok) return fail(r.error);
  // [ID] isi form dengan nilai yang benar-benar tersimpan,
  fill(r.rules);
  // [ID] "Poin disimpan.".
  status(t('adminSaved'), 'ok');
});

// [ID] Tombol Kembalikan default:
$('#admin-reset').addEventListener('click', async () => {
  // [ID] minta konfirmasi; batal kalau tidak,
  if (!window.confirm(t('adminResetConfirm'))) return;
  // [ID] minta server menghapus nilai simpanan,
  const r = await call({ reset: true });
  // [ID] gagal: tangani,
  if (!r.ok) return fail(r.error);
  // [ID] isi form dengan nilai default,
  fill(r.rules);
  // [ID] "Poin kembali ke default.".
  status(t('adminResetDone'), 'ok');
});

// [ID] Bara latar belakang.
startBackgroundEmbers($('#bg-embers'));
// [ID] Sudah punya kunci di tab ini: langsung masuk,
if (key) signIn();
// [ID] belum: fokus ke kolom kunci.
else $('#admin-key').focus();
