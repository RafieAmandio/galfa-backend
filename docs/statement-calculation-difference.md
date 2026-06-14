# Perbedaan Perhitungan Statement of Account: Website vs Spreadsheet

## Ringkasan

Ada perbedaan kecil antara perhitungan bunga di website dan di spreadsheet. Perbedaan ini muncul karena **cara menghitung bunga di bulan pertama dan bulan terakhir** setiap fund.

---

## Contoh: Fund 1 (Ingrid)

| | Spreadsheet | Website |
|---|---|---|
| Modal Bersih | Rp1.900.000 | Rp1.900.000 |
| Rate | 17% / tahun | 17% / tahun |
| Periode | 25 Jan 2023 – 24 Jan 2024 | 25 Jan 2023 – 24 Jan 2024 |
| **Total Bunga** | **Rp323.000** | **Rp321.263** |
| **Selisih** | | **Rp1.737** |

### Cara Hitung Spreadsheet

```
Bunga = Modal × Rate = 1.900.000 × 17% = 323.000
```

Langsung dikalikan rate tahunan. Tidak memperhitungkan jumlah hari di bulan pertama/terakhir.

### Cara Hitung Website

Website menghitung **per bulan** dengan proporsi hari:

| Bulan | Hari Aktif | Bunga |
|---|---|---|
| Jan 2023 (bulan pertama) | 6 dari 31 hari | Rp5.210 |
| Feb 2023 | penuh | Rp26.917 |
| Mar 2023 | penuh | Rp26.917 |
| ... | ... | ... |
| Des 2023 | penuh | Rp26.917 |
| Jan 2024 (bulan terakhir) | 23 dari 31 hari | Rp19.970 |
| **Total** | | **Rp321.263** |

Bulan pertama (6 hari) + bulan terakhir (23 hari) = **29 hari**, bukan 31 hari penuh. Jadi totalnya sedikit kurang dari 12 bulan penuh.

---

## Kenapa Bisa Beda?

| Aspek | Spreadsheet | Website |
|---|---|---|
| Bulan pertama | Dihitung penuh (1 bulan) | Proporsional (6/31 bulan) |
| Bulan terakhir | Dihitung penuh (1 bulan) | Proporsional (23/31 bulan) |
| Total efektif | 12,0 bulan | ~11,94 bulan |
| Selisih per fund per tahun | — | ~Rp1.700 (tergantung tanggal mulai) |

---

## Dampak ke Rollover

Selisih kecil ini **menumpuk** melalui rollover:

```
Fund 1:  selisih Rp1.737
         ↓ rollover
Fund 1R: modal lebih kecil Rp1.737 → bunga juga sedikit kurang
         ↓ rollover  
Fund 1RR: selisih makin besar
```

Semakin banyak rollover, semakin besar akumulasi selisihnya.

---

## Selisih Lain: Fund 3 (April)

Ada selisih tambahan ~Rp477 dari Fund 3 yang dimulai di bulan April (30 hari). Di spreadsheet, formula bulan pertama Fund 3 menggunakan pembagi 31 (seperti bulan Maret), padahal April hanya 30 hari. Ini kemungkinan formula yang ter-copy dari fund sebelumnya.

---

## Opsi Solusi

1. **Website mengikuti spreadsheet**: Untuk fund dengan tenor tepat 1 tahun, hitung bunga sebagai `modal × rate` (tanpa proporsi hari). Lebih sederhana, cocok dengan spreadsheet.

2. **Spreadsheet mengikuti website**: Update spreadsheet untuk menghitung proporsional per hari. Lebih akurat secara finansial.

3. **Biarkan seperti sekarang**: Selisih sangat kecil (~0.5% dari total bunga). Untuk Fund 1 dengan bunga Rp323.000, selisihnya hanya Rp1.737 (0.54%).
