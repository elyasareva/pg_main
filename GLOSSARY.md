# Simulasi Pembiayaan Emas Galeri 24

Kamus istilah domain untuk pemantauan harga jual emas batangan dan simulasi cicilan pembiayaan emas di PT Pegadaian Kanwil X Bandung.

## Language

**Vendor**:
Salah satu dari empat penerbit emas batangan resmi yang ditampilkan pada sistem, yaitu Galeri 24, Antam, UBS, dan Lotus Archi.
_Avoid_: Brand, merek, seri

**Gramasi**:
Pecahan berat keping emas batangan dalam satuan gram yang tersedia untuk sebuah Vendor pada halaman resmi Galeri 24. Setiap Vendor memiliki daftar Gramasi tersendiri.
_Avoid_: Bobot, ukuran tetap

**Harga Jual Web**:
Harga jual resmi untuk satu keping Gramasi tertentu yang tercantum pada halaman harga emas Galeri 24.
_Avoid_: Harga estimasi

**Harga Dasar**:
Nilai harga pokok satu keping Gramasi pada tabel simulasi yang diambil langsung dari Harga Jual Web untuk pecahan tersebut, bukan hasil perkalian berat dengan harga satu gram.
_Avoid_: Harga kali berat

**Harga Patokan Kartu**:
Harga yang ditampilkan pada kartu seleksi Vendor, yaitu Harga Jual Web pecahan 1 gram atau pecahan terkecil yang tersedia bila pecahan 1 gram tidak ada.
_Avoid_: Harga rata-rata

**DP Murni**:
Nilai uang muka sebelum ditambah biaya administrasi, dihitung dari persentase uang muka terhadap Harga Dasar.
_Avoid_: DP total

**Biaya Administrasi**:
Biaya tetap sebesar Rp50.000 yang ditambahkan ke uang muka pada setiap baris simulasi.
_Avoid_: Biaya tambahan

**DP Total**:
Jumlah uang muka yang ditampilkan pada kolom uang muka tabel simulasi, yaitu DP Murni ditambah Biaya Administrasi.
_Avoid_: DP saja

**Pinjaman**:
Pokok pembiayaan yang dicicil nasabah, yaitu Harga Dasar dikurangi DP Murni.
_Avoid_: Plafon kotor

**Tenor**:
Jangka waktu cicilan dalam satuan bulan (12, 18, 24, 30, atau 36 bulan).
_Avoid_: Durasi, termin

**Margin Standar**:
Margin bulanan dasar sebesar 0,92% yang berlaku ketika Mode Pembelian Minimal 100 Gram tidak aktif.
_Avoid_: Suku bunga, bunga normal

**Margin Khusus**:
Margin bulanan lebih rendah (0,53%, 0,39%, atau 0,34%) yang hanya dapat dipilih ketika Mode Pembelian Minimal 100 Gram aktif.
_Avoid_: Suku bunga khusus, bunga promo

**Mode Pembelian Minimal 100 Gram**:
Pengaturan simulasi yang menandai bahwa transaksi memenuhi pembelian minimal 100 gram sehingga Margin Khusus berlaku untuk seluruh baris tabel Vendor aktif.
_Avoid_: Diskon 100g

**Data Kedaluwarsa**:
Status ketika pembaruan harga untuk suatu Vendor gagal diambil dari sumber sehingga sistem mempertahankan data terakhir yang tersimpan sementara waktu.
_Avoid_: Data perkiraan, data palsu
