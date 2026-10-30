# AI PHOTO STUDIO

Web app React + Express untuk restorasi gambar dengan Gemini API, pemrosesan Sharp, riwayat lokal browser, penyimpanan file lokal, dan dukungan cloud S3-compatible.

## Persyaratan
- Node.js 20+
- API key Google AI Studio: https://aistudio.google.com/apikey

## Menjalankan
```bash
npm install
cp .env.example .env
```
Isi `GEMINI_API_KEY` di `.env`, lalu:
```bash
npm run dev
```
Buka http://localhost:5173

## Build produksi
```bash
npm run build
NODE_ENV=production npm start
```
Aplikasi berjalan di port 3001. Simpan direktori `data/` secara persisten.

## Penyimpanan
- Lokal: file sumber dan hasil disimpan pada `DATA_DIR` (default `./data`).
- Riwayat browser: metadata disimpan di localStorage pada perangkat/browser tersebut.
- Cloud: isi variabel S3 untuk mengaktifkan upload hasil ke bucket S3-compatible. Atur bucket privat dan kebijakan akses sendiri.

## Batasan penting
1. Gemini melakukan analisis dan pengeditan/generasi ulang gambar sesuai dukungan model. Model generatif dapat mengubah detail halus; selalu tinjau wajah dan elemen penting.
2. Faktor 2x/4x/8x saat ini memakai resize Lanczos dari Sharp. Ini menghasilkan ukuran piksel lebih besar, tetapi bukan super-resolution AI khusus. Untuk upscaling AI sejati, integrasikan Real-ESRGAN pada worker GPU.
3. Face Restoration khusus dengan GFPGAN/CodeFormer belum disertakan sebagai engine terpisah; mode wajah mengirim instruksi face-preserving ke Gemini.
4. Foto tidak otomatis disinkronkan ke cloud kecuali S3 dikonfigurasi. Bucket cloud perlu akses dan biaya penyimpanan tersendiri.
5. Untuk produksi: tambahkan autentikasi, rate limiting, antivirus/validasi konten, batas biaya API, kebijakan retensi dan penghapusan data, serta URL bertanda tangan untuk file privat.

## Catatan API
Server memakai SDK resmi `@google/genai` dan Interactions API untuk mengirim foto + instruksi, lalu menyimpan `output_image` bila tersedia. Nama model dapat diganti melalui `GEMINI_IMAGE_MODEL` sesuai model yang tersedia pada project Google AI Anda.
