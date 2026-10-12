**Sistem Akuntansi Modal, Prive, dan Laporan Perubahan Ekuitas**
___________________________________________________________________

Sistem Akuntansi Modal, Prive, dan Laporan Perubahan Ekuitas merupakan aplikasi yang dirancang untuk mempermudah pencatatan transaksi terkait ekuitas pemilik pada perusahaan percetakan. Aplikasi ini menyediakan fitur pengelolaan transaksi dan penyusunan laporan perubahan ekuitas berdasarkan periode tertentu.
Sistem ini dikembangkan menggunakan HTML, CSS, dan JavaScript pada sisi frontend, serta Node.js, Express.js, dan PostgreSQL melalui Supabase pada sisi backend dan basis data.

**Demo web** = https://ivanacarmellaic-bot.github.io/sistem-akuntansi-modal/ 

**Tujuan:**
Mempermudah pencatatan transaksi modal dan prive.
Membantu pengelolaan data laba dan rugi perusahaan.
Menghitung perubahan ekuitas selama periode tertentu.
Menyajikan Laporan Perubahan Ekuitas secara sistematis.
Mengurangi risiko kesalahan dalam perhitungan dan pencatatan manual.

**Fitur Utama:**
Dashboard: Menampilkan ringkasan informasi transaksi dan ekuitas.
Pengelolaan Transaksi: Menambah, melihat, mengubah, dan menghapus transaksi.
Pencatatan Ekuitas: Mendukung modal awal, tambahan modal, prive, laba bersih, dan rugi bersih.
Laporan Perubahan Ekuitas: Menampilkan perhitungan perubahan ekuitas berdasarkan periode laporan.
Cetak Laporan: Memudahkan pengguna mencetak laporan yang dihasilkan.
Integrasi Database: Menyimpan data transaksi menggunakan PostgreSQL melalui Supabase.

**Struktur Folder**
sistem akuntansi modal/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
    ├── app.js
    └── sql.sql
    
**Alur Penggunaan**
1. Pengguna membuka aplikasi melalui browser.
2. Pengguna melihat ringkasan transaksi pada dashboard.
3. Pengguna memasukkan transaksi modal, prive, laba, atau rugi.
4. Sistem menyimpan transaksi ke database.
5. Pengguna memilih periode laporan yang diinginkan.
6. Sistem menghitung dan menampilkan Laporan Perubahan Ekuitas.
7. Pengguna dapat mencetak laporan sesuai kebutuhan.
