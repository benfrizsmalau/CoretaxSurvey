# **Dokumen Persyaratan Produk: Aplikasi Pendataan NPWP dan Akun Coretax Pegawai Pemerintah Kabupaten Mamberamo Raya**

## **Pendahuluan dan Latar Belakang Kebijakan**

Modernisasi sistem perpajakan nasional melalui implementasi Sistem Inti Administrasi Perpajakan (Coretax) merupakan reformasi birokrasi monumental yang diprakarsai oleh Direktorat Jenderal Pajak (DJP).1 Berdasarkan amanat Surat Edaran Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (SE Menteri PANRB) Nomor 7 Tahun 2025, seluruh aparatur sipil negara (ASN) termasuk Pegawai Negeri Sipil (PNS) dan Pegawai Pemerintah dengan Perjanjian Kerja (PPPK) diwajibkan melakukan aktivasi akun Coretax secara mandiri sebelum tenggat waktu nasional pada tanggal 31 Desember 2025\.2 Memasuki fase implementasi penuh, setiap pemerintah daerah berkewajiban melakukan pengawasan intensif untuk memastikan tingkat kepatuhan wajib pajak di lingkungan internal mencapai batas optimal.4  
Bagi Pemerintah Kabupaten Mamberamo Raya, pendataan ini memiliki urgensi khusus dalam aspek administrasi kepegawaian dan kepatuhan fiskal daerah. Konsolidasi birokrasi pasca-pemulihan aktivitas pemerintahan di ibukota Kasonaweja serta kendala logistik geografis khas daerah paruh dunia mempertegas pentingnya memiliki satu platform pendataan digital yang terpusat dan berkinerja tinggi.5 Badan Kepegawaian, Pendidikan, dan Pelatihan (BKPP) serta Badan Pengelola Keuangan dan Aset Daerah (BPKAD) memerlukan instrumen pemantauan real-time untuk memvalidasi kelengkapan data perpajakan pegawai pada setiap Satuan Kerja Perangkat Daerah (SKPD).5  
Aplikasi ini dirancang untuk mendata Nomor Pokok Wajib Pajak (NPWP) format 15 dan 16 digit (NIK) serta status aktivasi akun Coretax bagi setiap pegawai Pemerintah Kabupaten Mamberamo Raya.2 Berdasarkan data dasar kepegawaian yang bersumber dari laporan administrasi keuangan daerah, aplikasi ini akan menampung variabel-variabel krusial yang meliputi nomor identitas pegawai, nama lengkap, kontak gawai, posel aktif, hingga unit kerja atau instansi penempatan.5 Dengan memanfaatkan infrastruktur modern, aplikasi ini mengeliminasi birokrasi yang lambat dan mempermudah tim operator daerah melakukan pemutakhiran data secara simultan dan terintegrasi.7

## **Arsitektur Basis Data Supabase**

Arsitektur penyimpanan data aplikasi ini memanfaatkan Supabase sebagai platform basis data PostgreSQL terkelola yang menawarkan performa tinggi, keandalan relasional, serta fitur keamanan tangguh.10 Data dasar kepegawaian yang dimuat ke dalam sistem disesuaikan secara presisi dengan struktur dokumen kepegawaian Pemerintah Kabupaten Mamberamo Raya.5 Berdasarkan visualisasi data yang diunggah, struktur data mencakup kolom nomor identitas, nama, nomor induk kependudukan, nomor pokok wajib pajak, kontak gawai, posel, dan unit organisasi kerja.5  
Penyimpanan data dalam Supabase dipisahkan secara logis ke dalam tabel relasional guna menghindari redundansi dan mempercepat proses indeksasi pencarian.13 Untuk menjamin kinerja kueri tetap optimal saat menangani ribuan baris data pegawai dari puluhan SKPD, indeks b-tree ditambahkan secara eksplisit pada kolom-kolom pencarian utama seperti Nomor Induk Pegawai (NIP), Nomor Induk Kependudukan (NIK), dan unit organisasi kerja.8

### **Skema Tabel Basis Data (PostgreSQL / Supabase)**

Berikut adalah rancangan skema tabel utama yang diimplementasikan di dalam Supabase untuk menampung data sesuai dengan spesifikasi dokumen kepegawaian Pemerintah Kabupaten Mamberamo Raya 5:

SQL  
\-- Aktivasi Ekstensi UUID Generator jika belum aktif  
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\-- 1\. Tabel Referensi SKPD (Satuan Kerja Perangkat Daerah)  
CREATE TABLE public.ref\_skpd (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    nama\_skpd VARCHAR(255) NOT NULL UNIQUE,  
    created\_at TIMESTAMPTZ DEFAULT NOW()  
);

\-- Pengisian awal data SKPD Kabupaten Mamberamo Raya berdasarkan data historis dan dokumen dinas  
INSERT INTO public.ref\_skpd (nama\_skpd) VALUES  
('BADAN PENDAPATAN PENGELOLA KEUANGAN DAN ASET DAERAH'),  
('INSPEKTORAT DAERAH'),  
('BADAN PERENCANAAN PEMBANGUNAN DAERAH'),  
('DINAS SOSIAL, KEPENDUDUKAN DAN PENCATATAN SIPIL'),  
('DINAS PEKERJAAN UMUM DAN PENATAAN RUANG'),  
('DINAS PENDIDIKAN'),  
('DINAS KESEHATAN'),  
('DINAS TENAGA KERJA, KOPERASI & UKM'),  
('DINAS PEMBERDAYAAN MASYARAKAT KAMPUNG DAN ADAT'),  
('DINAS TANAMAN PANGAN, HORTIKULTURA DAN PANGAN'),  
('BADAN KESATUAN BANGSA DAN POLITIK'),  
('BADAN PENANGGULANGAN BENCANA DAERAH')  
ON CONFLICT (nama\_skpd) DO NOTHING;

\-- 2\. Tabel Utama Pendataan Pegawai (pegawai\_coretax)  
CREATE TABLE public.pegawai\_coretax (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    nip\_pegawai VARCHAR(18) NOT NULL UNIQUE,  
    nama\_pegawai VARCHAR(255) NOT NULL,  
    nik\_pegawai VARCHAR(16) NOT NULL,  
    npwp\_pegawai VARCHAR(20),  
    no\_telp VARCHAR(20),  
    email VARCHAR(150),  
    skpd\_id UUID REFERENCES public.ref\_skpd(id) ON DELETE SET NULL,  
    skpd\_raw TEXT, \-- Kolom cadangan untuk menyimpan string SKPD asli dari hasil impor berkas  
      
    \-- Status Aktivasi Akun Coretax (Sesuai SE KemenPANRB & Alur DJP)  
    status\_aktivasi VARCHAR(50) DEFAULT 'Belum Terdaftar'   
        CONSTRAINT chk\_status CHECK (status\_aktivasi IN (  
            'Belum Terdaftar',   
            'Aktivasi Akun',   
            'Pembuatan KO DJP',   
            'Validasi Sukses'  
        )),  
      
    \-- Metadata Verifikasi dan Finalisasi  
    is\_final BOOLEAN DEFAULT FALSE NOT NULL,  
    verified\_at TIMESTAMPTZ,  
    operator\_verifikator VARCHAR(100),  
      
    \-- Jejak Audit Operasional  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ DEFAULT NOW(),  
    last\_edited\_by VARCHAR(100)  
);

\-- Pembuatan Indeks untuk Mengoptimalkan Kinerja Pencarian Data Pegawai  
CREATE INDEX idx\_pegawai\_nip ON public.pegawai\_coretax(nip\_pegawai);  
CREATE INDEX idx\_pegawai\_nik ON public.pegawai\_coretax(nik\_pegawai);  
CREATE INDEX idx\_pegawai\_skpd ON public.pegawai\_coretax(skpd\_id);  
CREATE INDEX idx\_pegawai\_is\_final ON public.pegawai\_coretax(is\_final);

Struktur data di atas menampung tipe representasi teks (VARCHAR) untuk kolom nomor identitas (nip\_pegawai dan nik\_pegawai) guna mencegah hilangnya angka nol di awal nomor akibat konversi tipe numerik otomatis.9 Selain itu, kolom npwp\_pegawai didesain fleksibel untuk mengakomodasi format 15 digit lama maupun format 16 digit baru (yang menggunakan NIK secara penuh) guna memastikan kelancaran masa transisi perpajakan.2

## **Mekanisme Keamanan Tanpa Role (State-Based Data Locking)**

Salah satu kebutuhan operasional yang sangat krusial dalam rancangan aplikasi ini adalah tiadanya pembagian peran pengguna (no user roles) untuk menyederhanakan aksesibilitas di lapangan.7 Berbagai tim operator dari instansi kepegawaian maupun perwakilan dinas dapat langsung mengisi, memperbarui, dan melengkapi data tanpa melalui proses otorisasi multi-level yang rumit.7 Namun, kemudahan ini memunculkan risiko kerentanan data berupa modifikasi yang tidak disengaja atau perubahan manipulatif pada data yang telah dinyatakan valid dan bersifat final.14  
Guna mengatasi tantangan keamanan tersebut, sistem ini menerapkan konsep keamanan berbasis kondisi data (*State-Based Data Locking*).12 Pengamanan tidak diletakkan pada kendali identitas pengguna di sisi aplikasi klien, melainkan dipaksakan secara mutlak di dalam sistem manajemen basis data PostgreSQL Supabase menggunakan fungsi pemicu (*Trigger Function*).12  
Ketika suatu baris data pegawai diubah statusnya menjadi final (is\_final \= TRUE), baris data tersebut akan langsung terkunci secara permanen.14 Setelah terkunci, tidak ada pengguna mana pun—termasuk operator tim, supervisor, bahkan administrator basis data (melalui API publik)—yang diizinkan untuk melakukan pembaruan (*UPDATE*) terhadap nilai kolom apa pun di baris tersebut, ataupun menghapusnya (*DELETE*).12 Pengecualian hanya dapat dilakukan secara manual oleh pemilik kendali penuh sistem langsung melalui konsol internal basis data yang menggunakan kunci layanan (*service\_role key*).13

### **Perbandingan Karakteristik Keamanan**

| Parameter Keamanan | Pendekatan Tradisional (Role-Based Access Control) | Pendekatan Aplikasi Ini (State-Based Data Locking) |
| :---- | :---- | :---- |
| **Kompleksitas Manajemen Pengguna** | Tinggi; membutuhkan pendaftaran akun, pengelolaan peran (operator, admin, supervisor), dan pengelolaan sesi.12 | Sangat Rendah; satu tingkat kredensial tim operasional yang dapat digunakan bersama tanpa batasan peran.12 |
| **Kerentanan Akun Admin** | Tinggi; jika akun admin utama diretas, data final yang tersimpan tetap dapat dimodifikasi atau dihapus secara luas.13 | Sangat Rendah; data final terkunci rapat di tingkat basis data, membatasi manipulasi sekalipun akses admin aplikasi bocor.12 |
| **Keamanan Data Pasca-Verifikasi** | Bergantung pada logika pemblokiran di sisi antarmuka pengguna (frontend) yang rentan dilewati via bypass API.13 | Dijamin oleh mesin PostgreSQL; upaya manipulasi kueri langsung ditolak mentah-mentah di tingkat basis data.12 |
| **Fleksibilitas Pengisian Data** | Terbatas; operator tingkat rendah sering kali harus menunggu persetujuan admin hanya untuk mengedit kesalahan input.7 | Tinggi; operator bebas berkolaborasi hingga data siap ditandai sebagai final untuk dikunci selamanya.15 |

### **Implementasi Trigger PostgreSQL untuk Penguncian Data**

Skrip SQL berikut wajib dieksekusi di dalam Supabase SQL Editor untuk mengaktifkan fungsi penguncian otomatis pada baris data pegawai 12:

SQL  
\-- Pembuatan Fungsi Pemicu Keamanan  
CREATE OR REPLACE FUNCTION public.enforce\_data\_lock\_integrity()  
RETURNS TRIGGER AS $$  
BEGIN  
    \-- 1\. Cegah perubahan apa pun jika data pada baris lama sudah berstatus terkunci (is\_final \= TRUE)  
    IF OLD.is\_final \= TRUE THEN  
        RAISE EXCEPTION 'Akses Ditolak: Data pegawai dengan NIP % telah diverifikasi dan dikunci secara permanen. Modifikasi tidak diizinkan oleh sistem.', OLD.nip\_pegawai;  
    END IF;

    \-- 2\. Jika ada upaya perpindahan status ke final (is\_final berubah dari FALSE ke TRUE)  
    \-- Catat penanda waktu penguncian secara otomatis di sisi server  
    IF NEW.is\_final \= TRUE AND (OLD.is\_final IS NULL OR OLD.is\_final \= FALSE) THEN  
        NEW.verified\_at :\= NOW();  
    END IF;

    \-- Update otomatis jejak waktu pembaruan data terakhir  
    NEW.updated\_at :\= NOW();  
      
    RETURN NEW;  
END;  
$$ LANGUAGE plpgsql SECURITY DEFINER;

\-- Penerapan Trigger ke Tabel pegawai\_coretax  
DROP TRIGGER IF EXISTS trg\_lock\_verified\_pegawai ON public.pegawai\_coretax;  
CREATE TRIGGER trg\_lock\_verified\_pegawai  
BEFORE UPDATE OR DELETE ON public.pegawai\_coretax  
FOR EACH ROW  
EXECUTE FUNCTION public.enforce\_data\_lock\_integrity();

Di samping implementasi trigger, kebijakan keamanan Row Level Security (RLS) diaktifkan secara ketat pada tabel pegawai\_coretax.12 Kebijakan ini memastikan bahwa seluruh kueri manipulasi data yang datang melalui API publik PostgREST Supabase wajib melampirkan kunci akses otentikasi tim yang valid, guna mencegah eksploitasi data pegawai dari pihak luar yang tidak bertanggung jawab.12

SQL  
\-- Mengaktifkan RLS pada tabel pegawai\_coretax  
ALTER TABLE public.pegawai\_coretax ENABLE ROW LEVEL SECURITY;

\-- Kebijakan Membaca Data Pegawai untuk Pengguna Terotentikasi  
CREATE POLICY "Izinkan baca data pegawai bagi tim operasional"   
ON public.pegawai\_coretax   
FOR SELECT   
TO authenticated   
USING (true);

\-- Kebijakan Penulisan/Perubahan Data Pegawai bagi Pengguna Terotentikasi  
CREATE POLICY "Izinkan tulis dan ubah data pegawai bagi tim operasional"   
ON public.pegawai\_coretax   
FOR ALL   
TO authenticated   
USING (true)  
WITH CHECK (true);

## **Desain Antarmuka Pengguna Modern (UI/UX Pro Max)**

Untuk menghasilkan aplikasi dengan estetika premium yang setara dengan standar "UI/UX Pro Max", desain aplikasi dirancang dengan pendekatan minimalis, kontras yang seimbang, dan tipografi modern.10 Seluruh elemen antarmuka dikembangkan menggunakan pustaka komponen dasar Shadcn UI yang berbasis Tailwind CSS dan Radix UI primitives, serta diperkaya dengan komponen siap pakai berkinerja tinggi dari registri komunitas modern 21st.dev.10  
Aplikasi mendukung transisi instan antara mode terang (Light Mode) dan mode gelap (Dark Mode) yang terintegrasi dengan variabel warna global CSS Shadcn UI.10 Penggunaan visualisasi animasi halus diterapkan secara taktis pada area dashboard, tabel data, serta dialog konfirmasi guna menghadirkan pengalaman pengguna yang dinamis namun tetap responsif dan fungsional.17

### **Integrasi Komponen Desain Modern (Shadcn UI & 21st.dev)**

Aplikasi dibangun dengan memanfaatkan komponen-komponen unggulan berikut dari ekosistem desain modern 10:

* **Shine Border & Border Beam (MagicUI via 21st.dev):** Komponen pembungkus berteknologi akselerasi GPU yang memberikan efek kilauan cahaya gradien mengalir di sekeliling bingkai kartu statistik dashboard.21 Efek visual ini memberikan kesan futuristik tingkat tinggi pada metrik-metrik penting.21  
* **Ruixen UI Table Edit (@ruixenui/table-edit via 21st.dev):** Komponen tabel data interaktif yang sangat dioptimalkan untuk input data massal.22 Komponen ini menyajikan baris tajuk (header) dan baris total kaki (footer) yang tetap berada di posisinya (fixed position), sementara baris data di bagian tengah dapat digulir secara independen.22 Fitur ini sangat ideal bagi operator untuk memantau data kepegawaian dalam jumlah besar.22 Operator dapat memilih baris menggunakan kotak centang (checkbox) serta mengubah nilai kolom npwp\_pegawai, no\_telp, dan email secara langsung pada baris sel (inline editing) tanpa perlu memicu perpindahan halaman.22  
* **Ruixen UI Table Dialog (@ruixenui/table-dialog via 21st.dev):** Ketika operator memerlukan kontrol pengeditan menyeluruh atau ingin melihat detail komprehensif wajib pajak, komponen ini menyediakan aksi dropdown baris yang akan menampilkan dialog modal yang rapi dan terisolasi.15 Seluruh input form kepegawaian disajikan secara terstruktur di dalam dialog ini tanpa merusak tata letak tabel dasar.15  
* **Prism UI Floating Action Panel (@Codehagen via 21st.dev):** Panel melayang dinamis yang muncul di bagian bawah layar segera setelah operator memilih beberapa baris data menggunakan kotak centang.19 Panel ini menyediakan tombol tindakan cepat massal, seperti "Verifikasi Massal" atau "Ekspor Excel Data Terpilih".19  
* **Combobox & Autocomplete (Shadcn UI):** Elemen input pencarian instansi kerja (SKPD) yang menggabungkan kolom input teks dengan daftar pilihan dinamis.8 Operator hanya perlu mengetikkan singkatan instansi (misalnya "BPKAD") untuk memunculkan nama lengkap instansi, meminimalkan kesalahan ketik nama SKPD secara drastis.5  
* **Apple Tahoe Liquid Glass Button (21st.dev):** Tombol eksekusi krusial yang menampilkan efek visual seperti kaca cair interaktif dengan transisi taktil yang sangat responsif saat kursor melayang atau ditekan.21 Efek visual premium ini diterapkan secara khusus pada tombol "Verifikasi & Kunci Data Permanen" untuk memberikan penegasan psikologis kepada operator mengenai signifikansi tindakan penguncian tersebut.15

### **Pembagian Struktur Halaman Utama (Layout Hierarchy)**

Visualisasi dan arsitektur halaman aplikasi disusun secara intuitif dalam tiga blok utama:

┌────────────────────────────────────────────────────────────────────────┐  
│  │  
├────────────────────────────────────────────────────────────────────────┤  
│               │  
│  ┌────────────────────┐ ┌────────────────────┐ ┌─────────────────────┐ │  
│  │ Total Pegawai: 432 │ │ Akun Aktif: 310    │ │ Belum Terdata: 122  │ │  
│  └────────────────────┘ └────────────────────┘ └─────────────────────┘ │  
├────────────────────────────────────────────────────────────────────────┤  
│                   │  
│           │  
│  ┌───────────────────────────────────────────────────────────────────┐ │  
│  │ \[ \] NIP          │ Nama       │ SKPD      │ NPWP 16    │ Aksi     │ │  
│  ├───────────────────────────────────────────────────────────────────┤ │  
│  │ \[ \] 198509072... │ ALFONS...  │ BPKAD     │ 9120010... │ \[Edit\]   │ │  
│  │ \[ \] 198510172... │ LORRY L... │ BPKAD     │ 1920031... │ \[Kunci\]  │ │  
│  └───────────────────────────────────────────────────────────────────┘ │  
│                                                                        │  
│             │  
└────────────────────────────────────────────────────────────────────────┘

Aplikasi dirancang agar dapat diakses secara optimal baik pada monitor komputer resolusi tinggi di kantor kedinasan Kasonaweja maupun perangkat komputer jinjing portabel milik tim operator lapangan saat melakukan jemput bola pendataan ke distrik-distrik terpencil.5

## **Alur Kerja Operator dan Validasi Sistem**

Untuk meminimalkan kesalahan input data oleh tim operator yang bekerja secara bersamaan, aplikasi menerapkan prosedur validasi data berlapis di sisi klien (frontend) sebelum data tersebut disimpan ke basis data.25 Alur kerja didesain efisien agar operator dapat memperbarui ratusan data pegawai dengan cepat tanpa kehilangan akurasi administratif.22

### **Alur Kerja Operasional Pengumpulan Data (SOP)**

Tim operator mengikuti siklus pengisian data terpadu yang diatur dalam langkah-langkah prosedural berikut:

1. **Pencarian Pegawai:** Operator menyaring baris pegawai berdasarkan unit kerja menggunakan filter SKPD Combobox atau langsung memasukkan NIP pegawai pada kolom pencarian cepat.5  
2. **Pemutakhiran Data Wajib Pajak:** Operator memilih sel atau mengklik tombol edit pada baris pegawai terpilih.15 Operator kemudian memasukkan data nomor telepon, posel terdaftar, nomor induk kependudukan (NIK), serta nomor pokok wajib pajak (NPWP).2  
3. **Proses Validasi Format:** Saat operator berpindah fokus sel atau menekan tombol simpan draf, sistem frontend melakukan validasi otomatis berbasis ekspresi reguler (Regex) 23:  
   * **NIP Pegawai:** Harus tepat berisi ![][image1] digit karakter angka tanpa spasi.  
   * **NIK Pegawai:** Harus tepat berisi ![][image2] digit karakter angka.9  
   * **NPWP Pegawai:** Mendukung format ![][image3] digit angka murni atau berformat titik-strip (contoh: 87.368.809.7-952.000 seperti tampak pada visualisasi lampiran).2 Format ![][image2] digit angka juga diizinkan penuh.9  
   * **Nomor Telepon:** Harus berformat angka dengan panjang antara ![][image4] hingga ![][image5] karakter.  
   * **Posel (Email):** Wajib memenuhi standar format suret (contoh: pegawai@domain.com) untuk menjamin diterimanya notifikasi aktivasi dari domain resmi DJP.2  
4. **Penyimpanan Draf Sementara:** Jika validasi format terpenuhi, data disimpan ke Supabase dengan status is\_final \= FALSE.13 Data ini masih dapat diedit kembali oleh operator lain apabila di kemudian hari ditemukan koreksi informasi perpajakan.7  
5. **Proses Finalisasi & Penguncian Permanen:** Apabila data perpajakan pegawai telah dipastikan valid dan sinkron dengan basis data DJP Online (ditandai dengan kepemilikan kode otorisasi aktif), operator menekan tombol "Verifikasi & Kunci Data".2  
6. **Konfirmasi Keamanan:** Sistem akan memunculkan dialog peringatan bermodal penuh (full modal dialog alert) yang menyatakan: *"Tindakan ini akan mengunci data secara permanen. Anda tidak akan dapat mengubah atau mengedit data ini lagi di masa mendatang."*.15 Setelah operator memberikan persetujuan, sistem mengubah nilai is\_final menjadi TRUE.13 Pemicu PostgreSQL langsung mengunci baris data tersebut secara mutlak di sisi server basis data.12

### **Manajemen Concurrency Pengisian Data Bersamaan**

Karena sistem ini akan diakses oleh berbagai operator tim secara bersamaan (multi-operator concurrency), perlindungan terhadap risiko penulisan data yang saling bertabrakan (*write collisions*) diimplementasikan menggunakan metode *Optimistic Concurrency Control* (OCC).7  
Setiap kueri pembaruan (*UPDATE*) yang dikirimkan oleh aplikasi klien ke Supabase wajib menyertakan parameter pencocokan kolom updated\_at lama.14 Jika sebelum perintah simpan dieksekusi ternyata kolom updated\_at di basis data telah berubah—menandakan ada operator lain yang telah menyimpan perubahan terlebih dahulu—Supabase akan menolak transaksi tersebut.14 Aplikasi klien kemudian akan menangkap pembatalan ini dan memunculkan notifikasi interaktif kepada operator: *"Gagal Menyimpan: Data pegawai ini telah diperbarui oleh operator lain beberapa saat yang lalu. Aplikasi telah memuat data terbaru secara otomatis."*.14

## **Kesimpulan dan Rencana Aksi Implementasi**

Aplikasi pendataan NPWP dan akun Coretax bagi pegawai di lingkungan Pemerintah Kabupaten Mamberamo Raya ini merupakan solusi strategis yang menjembatani kewajiban kepatuhan fiskal nasional dengan keterbatasan birokrasi daerah.2 Dengan menggabungkan fleksibilitas pengisian multi-operator dan ketangguhan sistem keamanan berbasis kondisi data (*State-Based Data Locking*), aplikasi ini memberikan jaminan akurasi data tertinggi yang tidak dapat diganggu gugat setelah proses verifikasi final dilakukan.7  
Pemanfaatan platform modern Supabase sebagai basis data komputasi awan yang dipadukan dengan desain estetika "UI/UX Pro Max" dari Shadcn UI dan registri 21st.dev memastikan aplikasi ini tidak hanya aman secara fungsional, tetapi juga sangat intuitif dan berkinerja tinggi saat dioperasikan di lapangan.10  
Sebagai langkah taktis berikutnya untuk merealisasikan sistem ini, rencana aksi pengembangan didefinisikan secara berurutan dalam tabel di bawah ini:

### **Matriks Rencana Aksi Pengembangan Aplikasi**

| Fase Implementasi | Aktivitas Teknis Utama | Komponen / Fitur Terkait | Output / Deliverable |
| :---- | :---- | :---- | :---- |
| **Fase 1: Inisialisasi & Setup Basis Data** | Konfigurasi proyek baru di Supabase, pembuatan tabel ref\_skpd dan pegawai\_coretax, serta migrasi data awal dari lembar kerja Excel.5 | SQL Editor Supabase, Ekstensi UUID, Indeksasi B-Tree.13 | Basis data terstruktur yang siap menerima kueri pengisian data.12 |
| **Fase 2: Implementasi Keamanan Server** | Pemasangan fungsi pemicu (*Trigger*) untuk penguncian data final serta pembuatan kebijakan RLS untuk membatasi akses publik.12 | PostgreSQL Trigger, Row Level Security, Service Role Key.12 | Sistem penguncian data yang aktif dan teruji aman di tingkat basis data.14 |
| **Fase 3: Pengembangan Frontend & UI** | Pembuatan tata letak antarmuka modern dengan dukungan mode gelap-terang serta pemasangan tabel interaktif untuk pengeditan cepat.10 | Tailwind CSS, Shadcn UI, @ruixenui/table-edit, @ruixenui/table-dialog.10 | Antarmuka pengguna responsif dengan visualisasi premium.10 |
| **Fase 4: Integrasi Alur & Validasi** | Penghubungan frontend dengan Supabase Client SDK, penerapan validasi input Regex, serta pengaktifan proteksi concurrency (OCC).14 | Supabase API, Skema Validasi Zod/Regex, Alert Dialog Shadcn.13 | Aplikasi utuh dengan alur kerja operator yang terintegrasi dan aman.15 |
| **Fase 5: Pengujian & Penyebaran** | Simulasi pengisian data simultan oleh beberapa operator, uji coba bypass keamanan, dan penyebaran aplikasi ke server produksi.7 | Vercel / Netlify Deployment, Supabase CLI Inspect, Pengujian Penetrasi RLS.13 | Aplikasi resmi yang siap digunakan oleh tim operator Kabupaten Mamberamo Raya.5 |

Melalui pelaksanaan rencana aksi yang terstruktur ini, Pemerintah Kabupaten Mamberamo Raya akan memiliki instrumen pelaporan kepatuhan pajak ASN yang kredibel, aman, dan siap menyongsong era baru integrasi Coretax nasional secara tepat waktu dan efisien.2

#### **Karya yang dikutip**

1. Menyongsong Era Baru Administrasi Perpajakan: PNS, TNI, dan Polri Siap Beralih ke Coretax DJP, diakses Juli 7, 2026, [https://pajak.go.id/id/artikel/menyongsong-era-baru-administrasi-perpajakan-pns-tni-dan-polri-siap-beralih-ke-coretax-djp](https://pajak.go.id/id/artikel/menyongsong-era-baru-administrasi-perpajakan-pns-tni-dan-polri-siap-beralih-ke-coretax-djp)  
2. Cara Aktivasi Coretax ASN, TNI, Polri sebelum Batas Akhir \- Pajakku, diakses Juli 7, 2026, [https://pajakku.com/artikel/cara-aktivasi-coretax-asn-tni-polri-sebelum-batas-akhir](https://pajakku.com/artikel/cara-aktivasi-coretax-asn-tni-polri-sebelum-batas-akhir)  
3. Anda ASN? Masih Ada 3 Hari Tersisa untuk Aktivasi Akun Coretax \- DDTC News, diakses Juli 7, 2026, [https://news.ddtc.co.id/berita/nasional/1816185/anda-asn-masih-ada-3-hari-tersisa-untuk-aktivasi-akun-coretax](https://news.ddtc.co.id/berita/nasional/1816185/anda-asn-masih-ada-3-hari-tersisa-untuk-aktivasi-akun-coretax)  
4. Gandeng BKPSDM Temanggung, Pajak Temanggung Dorong ASN Lapor SPT Manfaatkan Coretax | Direktorat Jenderal Pajak, diakses Juli 7, 2026, [https://pajak.go.id/id/berita/gandeng-bkpsdm-temanggung-pajak-temanggung-dorong-asn-lapor-spt-manfaatkan-coretax](https://pajak.go.id/id/berita/gandeng-bkpsdm-temanggung-pajak-temanggung-dorong-asn-lapor-spt-manfaatkan-coretax)  
5. Semua SKPD Mamberamo Raya Diminta Kembali Berkantor di Kasonaweja \- Koreri, diakses Juli 7, 2026, [https://koreri.com/2021/06/04/semua-skpd-mamberamo-raya-diminta-kembali-berkantor-di-kasonaweja/](https://koreri.com/2021/06/04/semua-skpd-mamberamo-raya-diminta-kembali-berkantor-di-kasonaweja/)  
6. Pandangan tentang perencanaan kolaboratif tata ruang wilayah di Kabupaten Mamberamo Raya, Papua, Indonesia, diakses Juli 7, 2026, [https://www2.cifor.org/mla/download/publication/Mamberamo\_id\_web.pdf](https://www2.cifor.org/mla/download/publication/Mamberamo_id_web.pdf)  
7. Provinsi Papua \- Kanreg IX BKN Jayapura, diakses Juli 7, 2026, [https://jayapura.bkn.go.id/papua](https://jayapura.bkn.go.id/papua)  
8. Rapat Koordinasi Gubernur Papua 2025 | PDF \- Scribd, diakses Juli 7, 2026, [https://id.scribd.com/document/885714892/RDG-Rakor-Bupati-Walikota-Sepapua](https://id.scribd.com/document/885714892/RDG-Rakor-Bupati-Walikota-Sepapua)  
9. Pemberitahuan Pelaksanaan Praimplementasi Coretax DJP | Direktorat Jenderal Pajak, diakses Juli 7, 2026, [https://pajak.go.id/id/pengumuman/pemberitahuan-pelaksanaan-praimplementasi-coretax-djp](https://pajak.go.id/id/pengumuman/pemberitahuan-pelaksanaan-praimplementasi-coretax-djp)  
10. GitHub \- serafimcloud/21st: npm for design engineers: largest marketplace of shadcn/ui-based React Tailwind components, blocks and hooks, diakses Juli 7, 2026, [https://github.com/serafimcloud/21st](https://github.com/serafimcloud/21st)  
11. 21st.dev download | SourceForge.net, diakses Juli 7, 2026, [https://sourceforge.net/projects/twenty1st.mirror/](https://sourceforge.net/projects/twenty1st.mirror/)  
12. Row Level Security | Supabase Docs, diakses Juli 7, 2026, [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)  
13. Supabase RLS Guide 2026: Policies That Actually Work \- DesignRevision, diakses Juli 7, 2026, [https://designrevision.com/blog/supabase-row-level-security](https://designrevision.com/blog/supabase-row-level-security)  
14. Deleting data and dropping objects safely | Supabase Docs, diakses Juli 7, 2026, [https://supabase.com/docs/guides/database/postgres/data-deletion](https://supabase.com/docs/guides/database/postgres/data-deletion)  
15. Table Dialog | Community Components \- 21st.dev, diakses Juli 7, 2026, [https://21st.dev/community/components/ruixen.ui/table-dialog](https://21st.dev/community/components/ruixen.ui/table-dialog)  
16. 21st.dev — Free Nextjs Template \- shadcn.io, diakses Juli 7, 2026, [https://www.shadcn.io/template/serafimcloud-21st](https://www.shadcn.io/template/serafimcloud-21st)  
17. 21st AI — Generate UI components in variants, diakses Juli 7, 2026, [https://21st.dev/ai](https://21st.dev/ai)  
18. 21st.dev the React component library for your AI projects \- Andy Cinquin, diakses Juli 7, 2026, [https://andy-cinquin.com/blog/21st-dev-library-components-shadcn-ia](https://andy-cinquin.com/blog/21st-dev-library-components-shadcn-ia)  
19. Prism UI's UI components \- 21st.dev, diakses Juli 7, 2026, [https://21st.dev/@Codehagen](https://21st.dev/@Codehagen)  
20. 21st.dev | All Shadcn, diakses Juli 7, 2026, [https://allshadcn.com/components/21stdev/](https://allshadcn.com/components/21stdev/)  
21. MagicUI Components \- 21st.dev, diakses Juli 7, 2026, [https://21st.dev/community/components/s/magicui](https://21st.dev/community/components/s/magicui)  
22. Table Edit | Community Components \- 21st.dev, diakses Juli 7, 2026, [https://21st.dev/@ruixenui/components/table-edit](https://21st.dev/@ruixenui/components/table-edit)  
23. React Editable Cells Table \- shadcn.io, diakses Juli 7, 2026, [https://www.shadcn.io/blocks/tables-editable-cells](https://www.shadcn.io/blocks/tables-editable-cells)  
24. Data Table \- Shadcn UI, diakses Juli 7, 2026, [https://ui.shadcn.com/docs/components/base/data-table](https://ui.shadcn.com/docs/components/base/data-table)  
25. Shadcn Data Table \- Base UI and Radix UI, diakses Juli 7, 2026, [https://shadcnstudio.com/docs/components/data-table](https://shadcnstudio.com/docs/components/data-table)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAABA0lEQVR4XmNgGAX0ACVAnIkuiAQagPg/EP8F4hpUKVSwHIh/MUAUg3AWqjQc7AViJyR+NRB/ROLjBLgMZQLil+iCDBD10uiC6ACXoQEMEDl0ABJTQBdEB7gM5WZABI8yVEwLyicIcBkKAusZEAafA+IvqNK4AUhDNrogErjCgDAYhHVRpbEDkMJcdEEoALksFMq+xYAwmAeuAgcAKcpHF2SAJLlAdEEg+AzE/9AF0QHI0EJ0QQaIuCK6IAMk3RKMLJCCInRBILjNAEn86GALELejC4JAPRAfZICEGSycjjFgGgIS380AyQigcFwBxK9RVJAJYoF4HxAvBmIrNLlRMApoAQA4Ez7tcbg/nQAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAA90lEQVR4Xu2TPQrCQBBGp1GvYCGCVoJgqa2NeA1bFRHFRizEI1h7AGtLQQsbvYmNWGnl/zfsmkyGTQRBqzz4SPbNZCCbDVHMPxggTS0VI+RuU1c1jzlyQZ42rWA5wBWZ2fsU8rDXSKKGHpGDWE/J9JeFcxI2NEemllW+pNZOwobuyNSYJFITtY+EDX3vN+9/FSnaNW/BR7ixrSX5QyfC5a3LCOeEmzpakj9Uw26vpYabulqSOTphQ10+ADf0tARDcj/M7qSlhpv6Wlq4Jo9U2rqKcB5jZIOcyX+dLbKWTaBBplYg8xfdkIVs+JYEskRWZL5+TMyveQHpfT7EyDi/8QAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAA5ElEQVR4Xu2RwQoBURiF/1CWWPMAnsALeAVJytICSaRkIctZK9lbeQM7CxvlAWxsrcXCSsL53cvc+2dMTWEzX301c865t6khCvkFXViToeYIKzAFE7AAD9bCYAbP8Kat2/WLZ2+asRYe+F3qwAnMi+4jfpcG4i+XbuEGruAFxqyFB3ywIUMNd3Hjfa4zX3jUlKEHWVL7gSwkPGrJEBThToak9nsZSnjUliGpnE0aWVpnYyN7C486MgRTmBPZiNQ+IvIHQ7iEJ3K/iP/uwhyBK6zq5zKpXcmtg9ODa9iHUdGFhHyDO/vUOnZOxsvdAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAyklEQVR4Xu2SsQ4BURBFJ9EKCh/in1SICNGKyg+o9eILFKIgod5CfIZCRELDnezizc1Oss2q3klO8c68N8kKkcg/GMMOx4AJvMI7bNPMsIRP+Mrs2vGXM9wE5xM8BGcXb2lN0hmjrcGR8ZYm4i9dcGS8pZ+fhvG6obSlPY7iP/a6QS/0OYr/2OsGvTDgKP5jrxv0wpAjWEn+Y20zjoxeGnEEVUlnlaDVs5bLFO7gTX6fc4Tb8BLYw0twfkiB/2gRWnAN57BJs0ikDN7fNkDj5v/CDgAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAsElEQVR4XmNgGAX0ACVAnIkuiAN8AuJgdEEYWA7Ev4D4PxRnoUpjBekMELU4DUUGxBr6hoHKhn6A0lQzNA6IE6BsqhkKihwYIMnQbHRBKHgJxIxIfJIMzUUXBAIvIM5DEyPJ0Hx0QQZEcgMlvZ9QDOL/hrLxApDCQnRBLECNgUSXFqELYgEaDBC1IegSMFAPxAeB+AsDwpvHgHgvsiIksB+IvzJA1P1hgOgdBaNgSAEAHSU2vX28qjAAAAAASUVORK5CYII=>