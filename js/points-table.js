// "What each level is worth" table, shared by the Single Player screen and the admin page.
// [ID] Membuat tabel "poin per level" dalam bentuk HTML. Dipakai layar Single Player dan halaman admin.

// [ID] levelValues menghitung poin per langkah dan bonus menang untuk satu level; LEVELS = daftar level.
import { levelValues, LEVELS } from './scoring.js';

// [ID] rules = nilai poin, t = fungsi terjemahan, selected = level yang disorot.
export function pointsTable(rules, t, selected = null) {
  // [ID] Baris judul: Level, Langkah, Menang (diterjemahkan).
  const head = ['ptLevel', 'ptColMove', 'ptColWin'].map((k) => `<th>${t(k)}</th>`).join('');
  // [ID] Satu baris untuk setiap level.
  const rows = LEVELS.map((lvl) => {
    // [ID] Nilai poin level ini.
    const v = levelValues(rules, lvl);
    // [ID] Buka baris; tambah class is-selected kalau ini level yang dipilih.
    return `<tr${lvl === selected ? ' class="is-selected"' : ''}>` +
      // [ID] Nama level dan pengalinya.
      `<th>${t(lvl)} <small>×${v.mult}</small></th>` +
      // [ID] Poin per langkah dan bonus menang (toLocaleString memberi pemisah ribuan).
      `<td>+${v.move.toLocaleString()}</td><td>+${v.win.toLocaleString()}</td></tr>`;
  // [ID] Gabungkan semua baris.
  }).join('');
  // [ID] Rangkai menjadi tabel lengkap.
  return `<table class="pts-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}
