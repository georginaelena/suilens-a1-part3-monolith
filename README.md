# Suilens - Sistem Rental Lensa Studio Komet Biru

**Bagian 3: Penugasan Mandiri - Studio Komet Biru (Monolithic Architecture)**

## 👤 Author

**Georgina Elena Shinta Dewi Achti**  
NPM: 2206810995

---

## 📋 Daftar Isi

- [Overview](#overview)
- [Arsitektur](#arsitektur)
- [Struktur Project](#struktur-project)
- [Quick Start](#quick-start)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Asumsi Implementasi](#asumsi-implementasi)
- [Disclosure Penggunaan AI](#disclosure-penggunaan-ai)
- [Analisis Perbandingan Monolithic vs Microservices: Perbandingan Arsitektur](#analisis-perbandingan-monolithic-vs-microservices)

---

## 🎯 Overview

Suilens adalah sistem rental lensa untuk Studio Komet Biru yang mengimplementasikan arsitektur **monolithic** dengan transaction-based saga pattern. Sistem ini mendukung:

- **Multi-branch inventory management** (3 cabang di Jakarta)
- **Atomic stock reservation** menggunakan database transactions
- **Synchronous compensating actions** untuk order cancellation
- **ACID compliance** dengan PostgreSQL transactions
- **RESTful API** dengan type-safe validation

**Mengapa Monolithic?**
- Implementasi lebih sederhana untuk scope project assignment
- Strong consistency guarantees via database transactions
- Easier debugging dengan single codebase
- Lower infrastructure overhead (no message broker required)

*Git Repository*: https://github.com/georginaelena/suilens-a1-part3-monolith

---

## 🏗️ Arsitektur

### Diagram Arsitektur Monolith

![](https://i.imgur.com/NhC4Rbs.png)

### Flow Patterns

#### 1. **Order Creation (Atomic Reservation)**
```
User → Order Service → [BEGIN TRANSACTION]
                    ↓
              Inventory Service (reserve stock)
                    ↓ (if success)
              Notification Service (record)
                    ↓
              [COMMIT TRANSACTION]
```
- **Synchronous**: All operations dalam single transaction
- **Atomic**: Rollback otomatis jika ada error
- **Strong Consistency**: ACID guarantees

#### 2. **Order Cancellation (Atomic Compensate)**
```
User → Order Service → [BEGIN TRANSACTION]
                    ↓
              Update order status → "cancelled"
                    ↓
              Inventory Service (release stock)
                    ↓
              Notification Service (record cancellation)
                    ↓
              [COMMIT TRANSACTION]
```
- **Synchronous**: Immediate stock restoration
- **Atomic**: All-or-nothing guarantee
- **No eventual consistency**: Stock instantly available

### Keuntungan Arsitektur Monolith

| Aspek | Benefit |
|-------|---------|
| **Consistency** | ACID transactions, no eventual consistency issues |
| **Simplicity** | Single codebase, easier debugging |
| **Performance** | No network latency between services |
| **Deployment** | Single container, lower operational overhead |
| **Testing** | Straightforward integration testing |

---

## 📁 Struktur Project

```
suilens-monolith/
├── docker-compose.yml              # Orchestration (app + database)
├── Dockerfile                      # Application container
├── start.sh                        # Entrypoint (migration + seed + run)
├── README.md                       # This file (D1)
├── API-TESTING-GUIDE.md            # Complete testing documentation
├── package.json                    # Bun dependencies
├── tsconfig.json                   # TypeScript configuration
├── drizzle.config.ts               # Drizzle ORM config
│
└── src/
    ├── index.ts                    # Main application entry
    │
    ├── db/
    │   ├── index.ts                # Database connection
    │   ├── schema.ts               # Table definitions (lenses, orders, inventory, etc.)
    │   └── seed.ts                 # Seed data (3 branches, 4 lenses, 12 inventory records)
    │
    ├── services/
    │   ├── catalog.service.ts      # Lens CRUD operations
    │   ├── order.service.ts        # Order creation & cancellation
    │   └── inventory.service.ts    # Stock reserve/release (with transactions)
    │
    └── routes/
        ├── catalog.routes.ts       # GET /api/lenses
        ├── order.routes.ts         # POST /api/orders, PATCH /api/orders/:id/cancel
        └── inventory.routes.ts     # GET /api/inventory/*, POST /api/inventory/reserve
```

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Port availability: 3000 (app), 5433 (PostgreSQL)

### Instalasi & Menjalankan Aplikasi

#### Fresh Installation (Clean Start)

**⚠️ IMPORTANT: Untuk demo assignment atau jika ada old testing data, gunakan metode ini!**

```bash
# 1. Clone repository
git clone https://github.com/georginaelena/suilens-monolith
cd suilens-monolith

# 2. Clean start (delete old data + fresh seed)
docker compose down -v
docker compose up -d --build

# 3. Wait for migration & seed (~10 seconds)
sleep 10
docker compose logs app | tail -40

# 4. Test API
curl http://localhost:3000/api/lenses | jq
curl http://localhost:3000/api/inventory/branches | jq
```

**Expected Fresh State:**
```
✅ Lenses: 4 items (Leica, Sigma, Canon, Nikon)
✅ Branches: 3 cabang (KB-JKT-S, KB-JKT-E, KB-JKT-N)
✅ Inventory: 12 records (4 lenses × 3 branches)
✅ Orders: 0 (empty - correct!)
```

#### Quick Restart (Keep Data)

```bash
# Stop services (preserve data)
docker compose down

# Start again
docker compose up -d
```

### Verification

```bash
# Check all services running
docker compose ps

# Expected output:
# NAME                STATUS
# app                 Up (healthy)
# db                  Up (healthy)

# Test API endpoints
curl http://localhost:3000/api/lenses | jq
curl http://localhost:3000/api/inventory/branches | jq
curl http://localhost:3000/api/orders | jq
```

---

## 🧪 Testing

### Manual Testing Flow

#### Test 1: Create Order (Stock Reservation)

```bash
# 1. Check available stock
curl http://localhost:3000/api/inventory/lenses/73a812b6-e522-4c20-ac33-67a53679b1eb | jq

# Expected: KB-JKT-S has 5 units available

# 2. Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Elena",
    "customerEmail": "elena@example.com",
    "lensId": "73a812b6-e522-4c20-ac33-67a53679b1eb",
    "branchCode": "KB-JKT-S",
    "startDate": "2026-03-10",
    "endDate": "2026-03-15"
  }' | jq

# Expected: 201 Created, status "confirmed"

# 3. Verify stock decreased
curl http://localhost:3000/api/inventory/lenses/73a812b6-e522-4c20-ac33-67a53679b1eb | jq

# Expected: KB-JKT-S now has 4 units available
```

#### Test 2: Cancel Order (Stock Release)

```bash
# 1. Get order ID from previous test
ORDER_ID="<orderId-from-test-1>"

# 2. Cancel order
curl -X PATCH http://localhost:3000/api/orders/$ORDER_ID/cancel | jq

# Expected: Order status changed to "cancelled"

# 3. Verify stock restored (no delay!)
curl http://localhost:3000/api/inventory/lenses/73a812b6-e522-4c20-ac33-67a53679b1eb | jq

# Expected: KB-JKT-S back to 5 units available
```

#### Test 3: Out-of-Stock Rejection

```bash
# Try to order from branch with insufficient stock
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test OOS",
    "customerEmail": "test@oos.com",
    "lensId": "73a812b6-e522-4c20-ac33-67a53679b1eb",
    "branchCode": "KB-JKT-N",
    "startDate": "2026-03-20",
    "endDate": "2026-03-25"
  }' | jq

# Expected: 409 Conflict with "Insufficient stock" error
```

### Automated Testing Script

```bash
#!/bin/bash
# Copy from API-TESTING-GUIDE.md and run:
bash complete-test-flow.sh
```

---

## 📡 API Documentation

### Catalog Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lenses` | Get all lenses |
| GET | `/api/lenses/:id` | Get lens by ID |

**Response Example:**
```json
{
  "id": "73a812b6-e522-4c20-ac33-67a53679b1eb",
  "modelName": "Leica APO-Summicron-M 50mm f/2 ASPH",
  "manufacturerName": "Leica",
  "minFocalLength": 50,
  "maxFocalLength": 50,
  "maxAperture": "2.0",
  "mountType": "Leica M",
  "dayPrice": "150000.00",
  "weekendPrice": "400000.00",
  "description": "Premium rangefinder lens..."
}
```

### Order Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| GET | `/api/orders/:id` | Get order by ID |
| POST | `/api/orders` | Create order (reserves stock) |
| PATCH | `/api/orders/:id/cancel` | Cancel order (releases stock) |

**Order Creation Request:**
```json
{
  "customerName": "Georgina Elena",
  "customerEmail": "georgina@example.com",
  "lensId": "73a812b6-e522-4c20-ac33-67a53679b1eb",
  "branchCode": "KB-JKT-S",
  "startDate": "2026-03-10",
  "endDate": "2026-03-15"
}
```

**Success Response (201):**
```json
{
  "id": "uuid-here",
  "customerName": "Georgina Elena",
  "lensId": "73a812b6-e522-4c20-ac33-67a53679b1eb",
  "branchCode": "KB-JKT-S",
  "totalPrice": "750000.00",
  "status": "confirmed",
  "createdAt": "2026-03-08T..."
}
```

### Inventory Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/branches` | Get all branches |
| GET | `/api/inventory/lenses/:lensId` | Get stock across all branches for a lens |
| POST | `/api/inventory/reserve` | Reserve stock (internal API) |
| POST | `/api/inventory/release` | Release stock (internal API) |

**Branch List Response:**
```json
[
  {
    "code": "KB-JKT-S",
    "name": "Komet Biru Jakarta Selatan",
    "location": "Jakarta Selatan",
    "address": "Jl. Fatmawati No. 15, Jakarta Selatan"
  },
  ...
]
```

**Stock by Lens Response:**
```json
[
  {
    "branchCode": "KB-JKT-S",
    "branchName": "Komet Biru Jakarta Selatan",
    "lensId": "73a812b6-e522-4c20-ac33-67a53679b1eb",
    "totalQuantity": 5,
    "availableQuantity": 4
  },
  ...
]
```

---

## 📝 Asumsi Implementasi

- Mengacu pada update instruksi, implementasi dilakukan dengan **asumsi yang eksplisit** karena masih ada edge-case yang belum didefinisikan detail.
- Dokumentasi asumsi di bawah ini digunakan sebagai dasar implementasi dan pengujian.
- Penilaian mengikuti prinsip **favourable interpretation**, dan klarifikasi lanjutan dapat diberikan jika diminta asisten penilai.
- Deadline pengumpulan mengacu pada update terbaru: **8 Maret 2026**.

### Business Logic Assumptions

1. **Stock Reservation**
   - Stock direserve secara **synchronous** saat order creation untuk immediate feedback
   - Jika stock tidak tersedia, order langsung ditolak (fail-fast)
   - Reservation bersifat **idempotent** menggunakan `orderId` sebagai unique key

2. **Order Cancellation**
   - Cancellation menggunakan **asynchronous compensating action** via RabbitMQ
   - Stock dirilis melalui event `order.cancelled` yang dikonsumsi oleh Inventory Service
   - Idempotency dijamin melalui tabel `reservations` untuk mencegah double-release

3. **Branch Selection**
   - Customer memilih branch saat membuat order (tidak ada auto-routing)
   - Setiap branch memiliki inventory independent
   - Stock tidak dapat dipindahkan antar branch secara otomatis

4. **Rental Period**
   - Sistem mencatat `startDate` dan `endDate` tetapi tidak melakukan automatic return
   - Stock tidak otomatis dirilis setelah `endDate` (butuh manual intervention atau scheduled job)
   - Untuk demo purposes, cancellation dapat dilakukan kapan saja

### Technical Assumptions

1. **Database**
   - Setiap service memiliki database terpisah (Database per Service pattern)
   - Data consistency dijaga melalui eventual consistency via events
   - Tidak ada distributed transactions (no 2PC/XA)

2. **Event Ordering**
   - Events diproses secara FIFO per queue
   - Tidak ada event ordering guarantee across multiple queues
   - Retry mechanism handled by RabbitMQ (default: requeue on consumer failure)

3. **Seed Data**
   - Seed scripts bersifat **idempotent** (check count before insert)
   - Fresh start (`docker compose down -v`) akan menghapus semua data
   - Normal restart (`docker compose down && up`) akan preserve data

4. **Frontend Polling**
   - Stock updates menggunakan polling setiap 3 detik
   - Tidak menggunakan WebSocket/SSE untuk real-time updates
   - Tradeoff: simplicity vs real-time responsiveness

---

## 🤖 Disclosure Penggunaan AI

Dalam pengerjaan project ini, setup awal, struktur utama, dan implementasi inti dikerjakan oleh saya.
Saya menggunakan AI secara terbatas sebagai **alat konsultasi teknis**, terutama ketika menemukan kendala atau error tertentu.

### Bentuk Penggunaan AI

1. **Konsultasi saat ada kendala**
   - Digunakan untuk brainstorming pendekatan saat muncul error/bug.
   - Dipakai untuk second opinion terkait root cause dan opsi perbaikan.

2. **Troubleshooting terarah**
   - Contoh: validasi ide perbaikan untuk issue TypeScript, seed idempotent, dan flow restart Docker.
   - Fokus pada debugging kasus spesifik, bukan men-generate seluruh fitur end-to-end.

3. **Review hasil diskusi AI**
   - Semua saran AI tetap saya evaluasi ulang sebelum dipakai.
   - Kode yang diadopsi tetap disesuaikan dengan konteks project dan requirement tugas.

### Verifikasi Manual 

- Setiap perubahan tetap saya **cross-check** lewat pembacaan kode, log service, dan pengujian endpoint.
- Keputusan final implementasi (arsitektur, trade-off, dan asumsi) ditentukan oleh saya.
- AI tidak digunakan sebagai "black box"; semua output AI diperlakukan sebagai bahan referensi, bukan jawaban final.

---

## 📊 Analisis Perbandingan Monolithic vs Microservices

### (a) Skenario di mana Microservices lebih tangguh daripada Monolith

Pada sistem rental lensa dalam latihan ini, proses pembuatan order terdiri dari dua langkah utama:

- Pencatatan order
- Pembuatan notifikasi konfirmasi kepada pelanggan

Pencatatan order merupakan **fungsi utama sistem (critical path)**, sedangkan notifikasi hanya merupakan **fitur tambahan**.

Pada arsitektur **monolith**, pembuatan order dan notifikasi dilakukan dalam **satu transaksi database**. Jika proses notifikasi gagal, maka seluruh transaksi akan dibatalkan sehingga **order tidak tersimpan**. Hal ini membuat fungsi utama sistem bergantung langsung pada proses notifikasi.

Sebaliknya pada arsitektur **microservices**, proses notifikasi dipisahkan menjadi service tersendiri.  
Alur prosesnya adalah sebagai berikut:

1. Order Service membuat order dan menyimpannya terlebih dahulu.
2. Order Service mem-publish event ke **RabbitMQ**.
3. Notification Service memproses event tersebut secara **asynchronous**.

Dengan pendekatan ini, kegagalan Notification Service **tidak mempengaruhi pembuatan order**. Event notifikasi akan tetap tersimpan di message broker hingga service kembali aktif.

Untuk mendemonstrasikan perbedaan ketahanan tersebut, dilakukan percobaan dengan **mematikan Notification Service** kemudian mencoba membuat order.

### Hasil Perbandingan

| Kondisi Sistem | Monolith | Microservices |
|---|---|---|
| Notification Service dimatikan | Tidak dapat dipisahkan karena notifikasi berada dalam aplikasi yang sama | Notification Service dimatikan sementara |
| Pembuatan order | Order gagal dibuat karena proses notifikasi gagal dalam transaksi yang sama | Order tetap berhasil dibuat |
| Status transaksi | Seluruh transaksi dibatalkan (rollback) | Order berhasil tersimpan |
| Message Queue | Tidak ada mekanisme queue | Event notifikasi disimpan di RabbitMQ |
| Dampak sistem | Fungsi utama sistem ikut gagal | Fungsi utama tetap berjalan |
| Bukti Demonstrasi | ![](https://i.imgur.com/qPoPq49.png) | ![](https://i.imgur.com/N88BYyq.png) |

### (b) Skenario di mana Monolith lebih sederhana atau lebih benar

Walaupun microservices lebih tangguh terhadap kegagalan service tertentu, arsitektur **monolith lebih sederhana** untuk kasus yang membutuhkan **konsistensi transaksi yang kuat**.

Pada implementasi **monolith Suilens**, semua tabel berada dalam **satu database PostgreSQL**, sehingga integritas data dapat dijaga melalui:

- Foreign key
- Transaksi database
- Atomic commit / rollback

Sebagai contoh, pembuatan order dan notifikasi dapat dilakukan dalam **satu transaksi database**. Jika salah satu operasi gagal, maka database akan melakukan **rollback otomatis**, sehingga tidak terjadi kondisi data yang tidak konsisten.

Selain itu, query yang melibatkan beberapa tabel dapat dilakukan dengan mudah menggunakan **JOIN dalam satu query**.

Sebaliknya pada arsitektur **microservices**:

- Setiap service memiliki **database sendiri**
- Integritas data lintas service **tidak dapat dijaga dengan foreign key**
- Beberapa data perlu **diduplikasi**, misalnya snapshot informasi lensa pada Order Service


### (c) Apa yang terjadi jika Inventory Service down saat pelanggan membuat pesanan?

Pada arsitektur microservices dalam latihan ini, **reservasi stok dilakukan secara sinkron** dari Order Service ke Inventory Service.

Artinya **Inventory Service berada dalam critical path** proses pembuatan order.

Langkah pengujian yang dilakukan:

1. Inventory Service dimatikan terlebih dahulu
2. Pelanggan mencoba membuat order baru

### Hasil Percobaan

Sistem mengembalikan **error** karena Order Service tidak dapat melakukan reservasi stok ke Inventory Service.

Akibatnya:

- Proses pembuatan order **gagal**
- Order tidak dapat dibuat

Kesimpulan dari percobaan tersebut:

Jika **Inventory Service down**, maka **order tidak dapat dibuat** karena reservasi stok merupakan bagian dari proses utama sistem.


---

## #(d) Trade-off yang dibuat dan pendekatan alternatif

Dalam desain sistem pada latihan ini terdapat beberapa **trade-off**.

### Keuntungan pendekatan yang digunakan

Reservasi stok dilakukan secara **sinkron** agar sistem dapat memastikan:

- Stok benar-benar tersedia
- Risiko **overbooking** dapat dihindari

### Konsekuensi dari pendekatan tersebut

Pendekatan ini juga menimbulkan beberapa keterbatasan:

- Proses order bergantung pada **ketersediaan Inventory Service**
- Jika Inventory Service tidak tersedia, maka **Order Service tidak dapat melanjutkan proses**
- Penggunaan **database terpisah** pada setiap service menyebabkan:
  - Duplikasi data
  - Hilangnya integritas referensial lintas service (tidak ada foreign key antar service)

### Pendekatan alternatif

Beberapa pendekatan lain yang dapat digunakan untuk meningkatkan ketahanan sistem antara lain:

- **Asynchronous reservation**
- **Event-driven architecture**
- **Circuit breaker pattern**

Pendekatan tersebut dapat membantu sistem tetap berjalan meskipun salah satu service mengalami kegagalan sementara.