# Builds the learning-guide PDFs: python build.py
# Content lives in parts/*.html. Markers inside the HTML:
#   {{fn:path:name}}        the whole function/method `name` from the original repo
#   {{lines:path:a:b}}      lines a..b (1-based, inclusive) from the original repo
#   {{bfs:sq}}              board with BFS distances from square sq (e.g. a1)
#   {{territory}}           BFS territory of the start position
#   {{split}}               the DFS split example board
#   {{include:name}}        parts/name.html
# Code is read from the clean repo (../../KnightTrap) so snippets never drift.

import html, os, re, subprocess, sys, datetime
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'KnightTrap'))
OUT = HERE
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

MEMBERS = [
    ('louis', 'Louis Yuriel Saputra', '0706012410050',
     'Minimax, Alpha-Beta Pruning, tingkat kesulitan, panel statistik, uji kebenaran Alpha-Beta'),
    ('clarrence', 'Clarrence Adriano Hemeldan', '0706012410066',
     'Antarmuka (UI), BFS & wilayah (territory), uji win rate dan waktu respons'),
    ('shatrya', 'Shatrya Christiano Chandra', '0706012410064',
     'Representasi papan, logika aturan, DFS (flood fill), penyatuan evaluasi, playtest'),
]

# ---- code snippets ------------------------------------------------------------

def read_lines(path):
    with open(os.path.join(SRC, path), encoding='utf-8') as f:
        return f.read().split('\n')

def code_block(path, start, lines):
    body = '\n'.join(
        f'<span class="ln">{start + i:>3}</span>  {html.escape(l)}' for i, l in enumerate(lines))
    cls = 'code long' if len(lines) > 38 else 'code'
    return f'<figure class="{cls}"><figcaption>{html.escape(path)} : baris {start}–{start + len(lines) - 1}</figcaption><pre>{body}</pre></figure>'

def fn_snippet(path, name):
    lines = read_lines(path)
    pat = re.compile(rf'^(\s*)(export\s+)?(async\s+)?(function\s+{re.escape(name)}\b|const\s+{re.escape(name)}\b|{re.escape(name)}\s*\(|get\s+{re.escape(name)}\b)')
    for i, l in enumerate(lines):
        m = pat.match(l)
        if not m:
            continue
        indent = m.group(1)
        if l.rstrip().endswith(';'):  # one-line const
            return code_block(path, i + 1, [l])
        for j in range(i + 1, len(lines)):
            if re.match(rf'^{indent}\}}[;,]?\s*$', lines[j]):
                return code_block(path, i + 1, lines[i:j + 1])
    sys.exit(f'snippet not found: {path} {name}')

def lines_snippet(path, a, b):
    return code_block(path, a, read_lines(path)[a - 1:b])

# ---- boards -------------------------------------------------------------------

N = 7
def sq(name): return (N - int(name[1])) * N + 'abcdefg'.index(name[0])
def name(i): return 'abcdefg'[i % N] + str(N - i // N)
JUMPS = [(-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)]
def neighbors(i):
    r, c = divmod(i, N)
    return [(r + dr) * N + c + dc for dr, dc in JUMPS if 0 <= r + dr < N and 0 <= c + dc < N]

def bfs(start, blocked):
    dist = {start: 0}
    q = deque([start])
    while q:
        cur = q.popleft()
        for n in neighbors(cur):
            if n not in dist and n not in blocked:
                dist[n] = dist[cur] + 1
                q.append(n)
    return dist

def board(cell_fn, caption):
    rows = []
    for r in range(N):
        tds = [f'<th>{N - r}</th>']
        for c in range(N):
            cls, txt = cell_fn(r * N + c)
            tds.append(f'<td class="{cls} {"d" if (r + c) % 2 else ""}">{txt}</td>')
        rows.append('<tr>' + ''.join(tds) + '</tr>')
    rows.append('<tr><th></th>' + ''.join(f'<th>{ch}</th>' for ch in 'abcdefg') + '</tr>')
    return f'<figure class="board"><table>{"".join(rows)}</table><figcaption>{caption}</figcaption></figure>'

def bfs_board(start_name):
    s = sq(start_name)
    dist = bfs(s, set())
    def cell(i):
        if i == s: return 'k0', '♞'
        return '', str(dist.get(i, '–'))
    return board(cell, f'BFS dari knight di {start_name}: angka = jumlah lompatan minimum ke kotak itu (papan kosong).')

def territory_board():
    a, b = sq('a1'), sq('g7')
    da, db = bfs(a, {b}), bfs(b, {a})
    count = {'A': 0, 'B': 0}
    def cell(i):
        if i == a: return 'k0', '♞'
        if i == b: return 'k1', '♞'
        x, y = da.get(i), db.get(i)
        if x is not None and (y is None or x < y): count['A'] += 1; return 'ta', f'{x}|{y}'
        if y is not None and (x is None or y < x): count['B'] += 1; return 'tb', f'{x}|{y}'
        count['A'] += 1; return 'ta tie', f'{x}|{y}'  # tie goes to the side to move (P1)
    html_ = board(cell, 'Wilayah di posisi awal. Isi kotak = jarak Biru | jarak Oranye. Biru = wilayah P1 (a1), oranye = wilayah P2 (g7), garis putus = seri (dihitung untuk yang jalan berikutnya, P1).')
    return html_ + f'<p class="note">Hasil: P1 {count["A"]} kotak, P2 {count["B"]} kotak (termasuk kotak seri untuk P1). Selisih wilayah = {count["A"] - count["B"]}.</p>'

def split_board():
    keep = {sq(x) for x in ['a1', 'g7', 'b3', 'c2', 'f5', 'e6', 'g3', 'g5']}
    a, b = sq('a1'), sq('g7')
    ra = set(bfs(a, {b} | (set(range(49)) - keep))) - {a}
    rb = set(bfs(b, {a} | (set(range(49)) - keep))) - {b}
    def cell(i):
        if i == a: return 'k0', '♞'
        if i == b: return 'k1', '♞'
        if i not in keep: return 'burn', ''
        if i in ra: return 'ta', 'A'
        if i in rb: return 'tb', 'B'
        return '', ''
    return board(cell, f'Contoh papan terbelah (dipakai di tests/run.mjs). Area P1 = {len(ra)} kotak, area P2 = {len(rb)} kotak, tidak ada kotak yang sama → split. Skor P2 = ({len(rb)} − {len(ra)}) × 100 = {(len(rb) - len(ra)) * 100}.')

# ---- assembly -----------------------------------------------------------------

def render(text, member):
    def sub(m):
        kind, *args = m.group(1).split(':')
        if kind == 'fn': return fn_snippet(args[0], args[1])
        if kind == 'lines': return lines_snippet(args[0], int(args[1]), int(args[2]))
        if kind == 'bfs': return bfs_board(args[0])
        if kind == 'territory': return territory_board()
        if kind == 'split': return split_board()
        if kind == 'include': return render(open(os.path.join(HERE, 'parts', args[0] + '.html'), encoding='utf-8').read(), member)
        sys.exit('unknown marker ' + m.group(0))
    return re.sub(r'\{\{([^}]+)\}\}', sub, text)

def toc(body):
    items = []
    n = 0
    def number(m):
        nonlocal n
        n += 1
        items.append(f'<li><span>{n}.</span> {m.group(2)}</li>')
        return f'<h2 id="s{n}"{m.group(1)}><span class="num">{n}</span>{m.group(2)}</h2>'
    body = re.sub(r'<h2([^>]*)>(.*?)</h2>', number, body)
    return body, '<ol class="toc">' + ''.join(items) + '</ol>'

BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus',
         'September', 'Oktober', 'November', 'Desember']

def tanggal():
    d = datetime.date.today()
    return f'{d.day} {BULAN[d.month - 1]} {d.year}'

def build(key, full, nim, role):
    member = {'key': key, 'name': full}
    body = render(open(os.path.join(HERE, 'parts', key + '.html'), encoding='utf-8').read(), member)
    body, toc_html = toc(body)
    css = open(os.path.join(HERE, 'guide.css'), encoding='utf-8').read()
    page = f'''<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Learning Guide Knight Trap - {html.escape(full)}</title><style>{css}</style></head><body>
<section class="cover">
  <p class="kicker">Learning Guide · Mini Project AI</p>
  <h1>Knight Trap</h1>
  <p class="sub">Implementasi AI pada Game Knight Trap Menggunakan Algoritma Minimax dengan Alpha-Beta Pruning</p>
  <div class="who"><b>{html.escape(full)}</b><span>{nim}</span></div>
  <p class="role"><b>Bagianmu:</b> {html.escape(role)}</p>
  <p class="meta">Artificial Intelligence · Information Management &amp; Technology · Universitas Ciputra 2026/2027<br>
  Disusun dari proposal (v1.1) dan kode di repo KnightTrap · {tanggal()}</p>
</section>
<section class="tocpage"><h3>Daftar Isi</h3>{toc_html}</section>
{body}
</body></html>'''
    html_path = os.path.join(OUT, f'build-{key}.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(page)
    pdf_path = os.path.join(OUT, f'Learning Guide - {full}.pdf')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={pdf_path}', 'file:///' + html_path.replace('\\', '/')],
                   check=True, capture_output=True)
    print('wrote', pdf_path)

if __name__ == '__main__':
    only = sys.argv[1:]
    for m in MEMBERS:
        if not only or m[0] in only:
            build(*m)
