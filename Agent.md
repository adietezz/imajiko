# AGENT.md — Imajiko Micro-SaaS Rebuild

> File ini adalah sumber kebenaran tunggal untuk AI agent yang mengerjakan repo ini.
> Baca seluruh file ini sebelum menyentuh satu baris kode pun.
> Jangan berasumsi — jika tidak ada di sini, tanya owner dulu.

---

## 1. Konteks Proyek

**Nama produk:** Imajiko  
**Owner:** adietezz  
**Repo:** https://github.com/adietezz/imajiko  
**Live URL:** https://project-psfe6.vercel.app  
**Hosting:** Vercel (free tier)  
**Stack yang boleh digunakan:** Vanilla JS, HTML, CSS murni — TIDAK boleh ada React, Vue, Next.js, atau framework JS apapun kecuali diminta eksplisit oleh owner.

### Apa itu Imajiko?
Imajiko adalah micro-SaaS penjual **website ucapan digital interaktif** (ulang tahun, wisuda, anniversary, dll). Pembeli membayar di Lynk.id, mengisi form data (nama, pesan, foto, musik), lalu mendapat link website ucapan personal yang bisa dibagikan ke siapapun.

### Model bisnis
- Produk dijual di `lynk.id/nekopou` (alias traffic lama) dengan branding **Imajiko**
- Tiap produk = satu template spesifik, contoh: `[Birthday-Smooch]`, `[Wisuda-Retro]`
- Nama kategori ada di bracket pertama, nama varian ada di kata kedua
- Harga: tergantung tier template (basic/premium)
- Storage website ucapan: selamanya, dengan pembersihan rutin Januari–Februari tiap tahun
- Revisi: dilakukan manual oleh owner — intentional sebagai touchpoint testimoni

---

## 2. State Repo Saat Ini (SEBELUM REBUILD)

### File yang ada dan statusnya

| File/Folder | Status | Keterangan |
|---|---|---|
| `index.html` | ✅ Pertahankan | Landing page utama, sudah bagus |
| `catabento.html` | ✅ Pertahankan | Katalog manga-bento style, sudah oke |
| `collect.html` | ✅ Pertahankan | Halaman koleksi/galeri |
| `addproduct.html` | ⚠️ Refactor | CRUD katalog, masih export manual ke products.js |
| `generator.html` | 🔴 Rebuild | Harus dibangun ulang total |
| `generator.js` | 🔴 Rebuild | Harus dibangun ulang total |
| `card/` (folder) | 🔴 Upgrade | Semua template masih statis, belum ada Supabase reader |
| `cassete/` (folder) | 🔴 Upgrade | Sama seperti card/, masih statis |
| `vending.html` | ⚠️ Hold | Konsep menarik, tunda dulu sampai core selesai |
| `scrap.html`, `scrap2.html` | 🗑️ Hapus | File playground, tidak diperlukan |
| `imajiko2.zip` | 🗑️ Hapus | File zip tidak perlu ada di repo |
| `js/`, `css/`, `images/` | ✅ Pertahankan | Asset folder, jangan ubah strukturnya |

---

## 3. Arsitektur Target (SISTEM BARU)

### Prinsip utama
1. **Zero backend** — semua logic jalan di browser (Vanilla JS) + Supabase sebagai BaaS
2. **Security by design** — token 1x pakai, RLS di database, tidak ada data yang bisa di-list tanpa ID
3. **Gratis semua** — Supabase free tier, Vercel free tier, EmailJS free tier, ImgBB free tier
4. **Maintainable** — satu file config untuk semua template, tidak ada duplikasi logic

### Stack teknologi baru

| Kebutuhan | Solusi | Alasan |
|---|---|---|
| Database | **Supabase** (PostgreSQL) | RLS proper, SDK JS tanpa backend, gratis 500MB |
| Auth/Security | **Token sistem** (custom) | Tidak perlu user account, sederhana |
| File upload | **ImgBB API** | Gratis, simple, link permanen |
| Email delivery | **EmailJS** | Kirim email dari browser tanpa backend, gratis 200/bulan |
| Hosting | **Vercel** | Sudah dipakai, gratis |
| Payment | **Lynk.id** | Sudah dipakai, tidak perlu diganti |

### Alur sistem lengkap (happy path)

```
1. Pembeli buka lynk.id/nekopou
2. Pilih produk [Birthday-Smooch] → bayar QRIS/ewallet
3. Lynk.id redirect ke: /generator.html?token=ABC123&template=birthday-smooch
   + Lynk.id kirim konfirmasi email ke pembeli (fitur bawaan Lynk)
4. generator.html validasi token ke Supabase Edge Function:
   - Token ada di tabel tokens? ✓
   - Token belum expired (< 24 jam)? ✓
   - Token belum dipakai (used = false)? ✓
   → Jika semua pass: tampilkan form
   → Jika gagal: tampilkan halaman error + link WA owner
5. Pembeli isi form (field dinamis sesuai template):
   - Nama pengirim
   - Nama penerima
   - Pesan ucapan
   - Foto (upload → ImgBB API → dapat URL)
   - Musik (URL YouTube embed, opsional)
6. Submit → generator.js:
   a. Upload foto ke ImgBB, dapat foto_url
   b. Insert ke tabel orders via Edge Function
   c. Mark token.used = true
   d. Generate link: /card/birthday-smooch.html?id={order_id}
   e. Tampilkan link di layar (kotak besar, tombol copy)
   f. Kirim email otomatis via EmailJS ke pembeli
7. Pembeli buka /card/birthday-smooch.html?id=XYZ:
   a. Fetch data dari Supabase by order_id
   b. Render nama, pesan, foto, musik ke template
   c. Semua animasi/interaksi berjalan normal
8. Owner pantau via admin.html (password protected)
```

---

## 4. Database Schema (Supabase)

### Tabel: `tokens`
```sql
create table tokens (
  token        text primary key,
  template_id  text not null,
  email        text not null,
  used         boolean default false,
  created_at   timestamptz default now(),
  expires_at   timestamptz not null
);

alter table tokens enable row level security;
create policy "no public access" on tokens for all using (false);
```

### Tabel: `orders`
```sql
create table orders (
  id             uuid primary key default gen_random_uuid(),
  token          text references tokens(token),
  template_id    text not null,
  nama_pengirim  text,
  nama_penerima  text not null,
  pesan          text not null,
  foto_url       text,
  musik_url      text,
  email          text not null,
  status         text default 'done',
  created_at     timestamptz default now()
);

alter table orders enable row level security;
-- Public hanya bisa SELECT by id, tidak bisa insert/update/delete langsung
create policy "public read only" on orders for select using (true);
create policy "no public insert" on orders for insert with check (false);
create policy "no public update" on orders for update using (false);
create policy "no public delete" on orders for delete using (false);
-- Insert hanya via Edge Function yang pakai service_role key
```

### Supabase Edge Function: `validate-token`
```
POST /functions/v1/validate-token
Body: { token: "ABC123" }
Response sukses: { valid: true, template_id: "birthday-smooch", email: "x@x.com" }
Response gagal: { valid: false, reason: "expired" | "used" | "not_found" }
```

### Supabase Edge Function: `create-order`
```
POST /functions/v1/create-order
Body: { token, template_id, nama_pengirim, nama_penerima, pesan, foto_url, musik_url, email }
Response: { order_id: "uuid" }

Logic:
1. Validasi token sekali lagi (double-check server side)
2. Insert ke orders table pakai service_role key
3. Update tokens.used = true
4. Return order_id
```

### Supabase Edge Function: `admin-generate-token` (untuk admin panel)
```
POST /functions/v1/admin-generate-token
Headers: { "x-admin-key": "hashed-password" }
Body: { template_id, email }
Response: { token: "ABC123", expires_at: "..." }
```

---

## 5. Konfigurasi Template

Semua konfigurasi template ada di SATU file: `/js/templates.config.js`

```javascript
// /js/templates.config.js
// SATU-SATUNYA tempat untuk daftarkan template baru.
// Jangan hardcode template ID di file lain manapun.

window.TEMPLATES = {
  "birthday-smooch": {
    name: "Birthday Smooch",
    category: "Birthday",
    cardFile: "/card/birthday-smooch.html",
    fields: [
      { id: "nama_pengirim", label: "Nama Pengirim", type: "text", required: false },
      { id: "nama_penerima", label: "Nama Penerima", type: "text", required: true },
      { id: "pesan", label: "Pesan Ucapan", type: "textarea", required: true },
      { id: "foto_url", label: "Foto", type: "image", required: false },
      { id: "musik_url", label: "Link Musik (YouTube)", type: "url", required: false }
    ]
  },
  "wisuda-retro": {
    name: "Wisuda Retro",
    category: "Wisuda",
    cardFile: "/card/wisuda-retro.html",
    fields: [
      { id: "nama_penerima", label: "Nama Wisudawan/ti", type: "text", required: true },
      { id: "jurusan", label: "Jurusan", type: "text", required: true },
      { id: "pesan", label: "Pesan Ucapan", type: "textarea", required: true },
      { id: "foto_url", label: "Foto", type: "image", required: true }
    ]
  }
  // Untuk tambah template baru: cukup tambah entry di sini saja
};
```

---

## 6. Struktur Folder Target

```
imajiko/
├── AGENT.md                    ← file ini (jangan hapus/ubah)
├── index.html                  ← landing page (jangan diubah)
├── catabento.html              ← katalog (jangan diubah)
├── collect.html                ← koleksi (jangan diubah)
├── generator.html              ← REBUILD total
├── admin.html                  ← BARU
├── 404.html                    ← BARU
│
├── card/
│   ├── _base.js                ← BARU: shared Supabase fetch logic
│   ├── birthday-smooch.html    ← UPGRADE: tambah Supabase reader
│   └── [template lain...]
│
├── cassete/                    ← upgrade menyusul setelah card/ selesai
│
├── js/
│   ├── templates.config.js     ← BARU: config semua template
│   ├── supabase.js             ← BARU: Supabase client singleton
│   ├── generator.js            ← REBUILD total
│   └── admin.js                ← BARU
│
├── css/                        ← jangan diubah
└── images/                     ← jangan diubah
```

---

## 7. Prioritas Pengerjaan (Urutan Wajib)

### Fase 1 — Fondasi (kerjakan berurutan)
1. Setup Supabase project, buat dua tabel, deploy dua Edge Function
2. Buat `/js/supabase.js` — Supabase client singleton
3. Buat `/js/templates.config.js` — config semua template
4. Buat `/card/_base.js` — shared fetch logic untuk semua template card

### Fase 2 — Core flow
5. Rebuild `/generator.html` + `/js/generator.js`
6. Upgrade `/card/birthday-smooch.html` sebagai pilot template
7. Buat `/404.html`

### Fase 3 — Admin & polish
8. Buat `/admin.html` + `/js/admin.js`
9. Upgrade semua template lain di `/card/` dan `/cassete/`
10. Hapus `scrap.html`, `scrap2.html`, `imajiko2.zip`

---

## 8. Environment Variables

Diset di Vercel Dashboard → Settings → Environment Variables.
Di-inject sebagai inline script di `<head>` setiap HTML, SEBELUM script lain:

```html
<script>
  window.SUPABASE_URL = "https://xxxxx.supabase.co";
  window.SUPABASE_ANON_KEY = "eyJ...";   // anon/public key — AMAN di frontend
  window.IMGBB_API_KEY = "xxxxx";
  window.EMAILJS_PUBLIC_KEY = "xxxxx";
  window.EMAILJS_SERVICE_ID = "xxxxx";
  window.EMAILJS_TEMPLATE_ID = "xxxxx";
</script>
```

**TIDAK PERNAH** taruh `service_role` Supabase key di file frontend.

---

## 9. Konvensi Kode

- `async/await` bukan `.then().catch()`
- `const` untuk semua deklarasi, `let` hanya jika nilai berubah
- Tidak ada `var`, tidak ada `eval()`, tidak ada `document.write()`
- Tidak ada jQuery atau library eksternal kecuali Supabase JS SDK (via CDN)
- Semua elemen HTML yang diisi JS harus punya `id` yang identik dengan nama field di `templates.config.js`
- Template ID format: `{category}-{variant}` dalam kebab-case, contoh: `birthday-smooch`
- Fungsi JS: camelCase. Konstanta global: SCREAMING_SNAKE_CASE

---

## 10. Security Checklist (cek sebelum setiap commit)

- [ ] Tidak ada `service_role` key di file manapun yang accessible publik
- [ ] Semua form submit melalui Edge Function, tidak langsung ke Supabase dari browser
- [ ] RLS enabled di semua tabel Supabase
- [ ] Token validation dilakukan di server (Edge Function), bukan di client
- [ ] Tidak ada endpoint yang bisa list semua orders tanpa autentikasi
- [ ] Tidak ada `console.log` yang print data sensitif

---

## 11. Larangan (Jangan Dilakukan Agent)

- ❌ Jangan install npm/node_modules — pure vanilla, tidak ada build step
- ❌ Jangan ubah `index.html`, `catabento.html`, `collect.html` tanpa instruksi eksplisit
- ❌ Jangan gunakan `localStorage` untuk data sensitif (token, order data)
- ❌ Jangan commit environment variables ke repo
- ❌ Jangan hardcode URL Supabase atau API key di JS file
- ❌ Jangan buat file di luar struktur folder yang didefinisikan di section 6
- ❌ Jangan ubah branding dari Imajiko

---

## 12. Cara Test Tanpa Lynk.id (Development)

1. Buka Supabase dashboard → Table Editor → tabel `tokens`
2. Insert row manual:
   ```json
   {
     "token": "devtoken1234567890123456789012345",
     "template_id": "birthday-smooch",
     "email": "test@test.com",
     "used": false,
     "expires_at": "2099-01-01T00:00:00Z"
   }
   ```
3. Buka: `/generator.html?token=devtoken1234567890123456789012345&template=birthday-smooch`
4. Flow berjalan normal seperti setelah bayar

---

## 13. Roadmap & Status

| Fase | Deskripsi | Status |
|---|---|---|
| Fase 0 | Setup Supabase + tabel + RLS + Edge Functions | ✅ Selesai |
| Fase 1 | supabase.js + templates.config.js + _base.js | ✅ Selesai |
| Fase 2 | generator.html + generator.js rebuild | ✅ Selesai |
| Fase 3 | Pilot template: birthday-smooch.html | ✅ Selesai |
| Fase 4 | 404.html + error handling | ✅ Selesai |
| Fase 5 | admin.html + admin.js | ✅ Selesai |
| Fase 6 | Semua template card/ dan cassete/ | ✅ Selesai |
| Fase 7 | Integrasi Make.com auto-generate token saat payment | ⬜ Future |

---

*File ini diperbarui: Juni 2026*  
*Jika ada konflik antara file ini dengan instruksi verbal owner, minta klarifikasi owner.*
