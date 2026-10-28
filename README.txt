DASHBOARD MONITORING HARGA EMAS + PROXY LOKAL GALERI 24
Repo: https://github.com/elyasareva/pg_main

ISI REPO
- dashboard_sinkronisasi_galeri24.html : dashboard simulasi + kalkulator cicilan
- server.js : proxy lokal (scraper halaman harga resmi) sekaligus penyaji dashboard
- package.json / package-lock.json : dependensi Node.js

PENTING TENTANG SUMBER DATA
Proxy mengambil halaman publik https://galeri24.co.id/harga-emas dan membaca harga jual 1 gram dari tabel halaman tersebut. Ini bukan API resmi Galeri 24; ini proxy/scraper atas halaman resmi. Jika Galeri 24 mengubah struktur halaman atau memblokir akses otomatis, parsing dapat gagal. Dashboard akan menampilkan status gagal dan mempertahankan harga sebelumnya, bukan mengarang harga baru.

CARA MENJALANKAN DI KOMPUTER SENDIRI (Windows / macOS)

Satu-satunya prasyarat: Node.js versi 18 atau lebih baru (https://nodejs.org/).
Cek dengan: node -v

Langkah 1 - ambil kode (pilih salah satu):
  a. Tanpa Git: buka https://github.com/elyasareva/pg_main
     > tombol hijau "Code" > "Download ZIP" > ekstrak ke folder yang mudah ditemukan.
  b. Dengan Git: git clone https://github.com/arbilaksmana/dashboard-pegadaian.git
     (folder node_modules TIDAK ikut di repo, jadi wajib jalankan langkah 2)

Langkah 2 - masuk ke folder proyek di Terminal:
  macOS   : buka Terminal, ketik: cd lalu seret foldernya ke jendela Terminal, tekan Enter
  Windows : buka folder, klik address bar, ketik cmd lalu Enter
  (atau: cd path/ke/dashboard-pegadaian)

Langkah 3 - instal dependensi (sekali saja):
  npm install

Langkah 4 - jalankan:
  npm start
  Terminal akan menampilkan: Proxy harga Galeri 24 aktif di: http://0.0.0.0:8787
  Biarkan terminal tetap terbuka selama dashboard dipakai.

Langkah 5 - buka di browser:
  http://127.0.0.1:8787/
  (Dashboard disajikan oleh server, jadi JANGAN buka file .html langsung via double-click.
   Kalau dibuka sebagai file, harga tidak akan tersambung.)

Untuk menghentikan: tekan Ctrl + C di terminal.
Dashboard memeriksa harga setiap 5 menit; tombol "Perbarui sekarang" memaksa pemeriksaan manual.

KALAU GAGAL (paling sering)
- "npm: command not found" / "npm tidak dikenali": Node.js belum terpasang atau
  terminal perlu ditutup lalu dibuka ulang setelah instalasi.
- "EADDRINUSE: port 8787": ada proses lain di port itu. Jalankan dengan port lain,
  misal macOS/Linux: PORT=8788 npm start  |  Windows CMD: set PORT=8788 && npm start
  lalu buka http://127.0.0.1:8788/
- macOS: kalau `npm install` gagal karena izin, jangan pakai sudo. Pastikan Node
  dipasang lewat installer resmi atau Homebrew (brew install node).
- Dashboard menampilkan "Gagal mengambil harga terbaru": biasanya koneksi internet
  bermasalah atau halaman sumber sedang tidak bisa diakses. Harga terakhir tetap
  dipertahankan. Cek manual: buka http://127.0.0.1:8787/api/gold-prices di browser.


TES PROXY
Buka http://127.0.0.1:8787/health untuk mengecek apakah proxy berjalan.
Buka http://127.0.0.1:8787/api/gold-prices untuk melihat hasil data harga.
Buka http://127.0.0.1:8787/api/gold-prices?refresh=true untuk memaksa mengambil ulang sumber.

CATATAN
- Harga di halaman resmi dapat berubah sewaktu-waktu; interval 5 menit hanya interval pemeriksaan dashboard, bukan jaminan harga sumber berubah setiap 5 menit.
- Halaman resmi menyebut harga yang berlaku adalah harga pada sistem Galeri 24. Verifikasi ulang sebelum dipakai sebagai penawaran resmi.
- Harga Antam/UBS/Lotus hanya akan terisi bila merek dan tabelnya ditemukan pada halaman resmi; jika tidak, dashboard mempertahankan nilai terakhir untuk merek tersebut.
- Proxy menyimpan harga terakhir selama 5 menit; jika pengambilan ulang gagal, proxy tetap mengirim harga terakhir dengan penanda `stale: true` alih-alih mengarang harga baru.
- Perhitungan cicilan pada dashboard tetap simulasi dan bukan penawaran pembiayaan resmi.
