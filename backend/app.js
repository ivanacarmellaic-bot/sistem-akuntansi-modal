
const http = require("http");
const fs = require("fs");
const path = require("path");

(function startApp() {
const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    const frontendPath = path.resolve(__dirname, "../frontend");
    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8"
    };

    http.createServer((req, res) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { Allow: "GET, HEAD" });
            res.end();
            return;
        }

        const pathname = new URL(req.url, "http://localhost").pathname;
        if (pathname === "/api" || pathname.startsWith("/api/")) {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                message: "API PostgreSQL tidak dikonfigurasi. Frontend menggunakan Supabase."
            }));
            return;
        }

        let decodedPath;
        try {
            decodedPath = decodeURIComponent(pathname);
        } catch (error) {
            res.writeHead(400);
            res.end();
            return;
        }

        const relativePath = decodedPath === "/"
            ? "index.html"
            : decodedPath.replace(/^[/\\]+/, "");
        const filePath = path.resolve(frontendPath, relativePath);

        if (!filePath.startsWith(`${frontendPath}${path.sep}`)) {
            res.writeHead(403);
            res.end();
            return;
        }

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(404);
                res.end("File tidak ditemukan.");
                return;
            }

            res.writeHead(200, {
                "Content-Type": contentTypes[path.extname(filePath)] ||
                    "application/octet-stream"
            });
            res.end(req.method === "HEAD" ? undefined : content);
        });
    }).listen(PORT, () => {
        console.log(`Sistem Akuntansi Modal berjalan di port ${PORT}`);
    });
    return;
}

const express = require("express");
const { Pool } = require("pg");
const app = express();
const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.use("/api", (req, res, next) => {
    if (!pool) {
        return res.status(503).json({
            message: "API PostgreSQL tidak dikonfigurasi. Frontend menggunakan Supabase."
        });
    }

    next();
});

const JENIS = [
    "modal_awal",
    "tambahan_modal",
    "prive",
    "laba_bersih",
    "rugi_bersih"
];

function validasiTransaksi(data) {
    const { tanggal, jenis_transaksi, keterangan, jumlah } = data;

    if (
        typeof tanggal !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) ||
        Number.isNaN(Date.parse(tanggal))
    ) {
        return "Tanggal harus valid dengan format YYYY-MM-DD.";
    }

    if (!JENIS.includes(jenis_transaksi)) {
        return "Jenis transaksi tidak valid.";
    }

    if (
        typeof keterangan !== "string" ||
        !keterangan.trim() ||
        keterangan.trim().length > 500
    ) {
        return "Keterangan wajib diisi (maksimal 500 karakter).";
    }

    if (
        jumlah === "" ||
        jumlah === null ||
        jumlah === undefined ||
        !Number.isFinite(Number(jumlah)) ||
        Number(jumlah) <= 0 ||
        Number(jumlah) > 9999999999999999
    ) {
        return "Jumlah harus berupa angka positif yang valid.";
    }

    return null;
}

// Memastikan database dapat diakses.
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            status: "error",
            message: "Database tidak dapat diakses."
        });
    }
});

// Mengambil seluruh transaksi.
app.get("/api/transaksi", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, tanggal, jenis_transaksi, keterangan,
                   jumlah, created_at, updated_at
            FROM public.transaksi_ekuitas
            ORDER BY tanggal DESC, id DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Gagal mengambil data transaksi."
        });
    }
});

// Menambahkan transaksi.
app.post("/api/transaksi", async (req, res) => {
    const errorValidasi = validasiTransaksi(req.body);

    if (errorValidasi) {
        return res.status(400).json({ message: errorValidasi });
    }

    const { tanggal, jenis_transaksi, keterangan, jumlah } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO public.transaksi_ekuitas
                (tanggal, jenis_transaksi, keterangan, jumlah)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                tanggal,
                jenis_transaksi,
                keterangan.trim(),
                jumlah
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Gagal menyimpan transaksi."
        });
    }
});

// Mengedit transaksi.
app.put("/api/transaksi/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID tidak valid." });
    }

    const errorValidasi = validasiTransaksi(req.body);

    if (errorValidasi) {
        return res.status(400).json({ message: errorValidasi });
    }

    const { tanggal, jenis_transaksi, keterangan, jumlah } = req.body;

    try {
        const result = await pool.query(
            `UPDATE public.transaksi_ekuitas
             SET tanggal = $1, jenis_transaksi = $2,
                 keterangan = $3, jumlah = $4
             WHERE id = $5
             RETURNING *`,
            [
                tanggal,
                jenis_transaksi,
                keterangan.trim(),
                jumlah,
                id
            ]
        );

        if (!result.rowCount) {
            return res.status(404).json({
                message: "Transaksi tidak ditemukan."
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Gagal memperbarui transaksi."
        });
    }
});

// Menghapus transaksi.
app.delete("/api/transaksi/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID tidak valid." });
    }

    try {
        const result = await pool.query(
            `DELETE FROM public.transaksi_ekuitas
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        if (!result.rowCount) {
            return res.status(404).json({
                message: "Transaksi tidak ditemukan."
            });
        }

        res.json({ message: "Transaksi berhasil dihapus." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Gagal menghapus transaksi."
        });
    }
});

// Laporan perubahan ekuitas berdasarkan periode.
app.get("/api/laporan", async (req, res) => {
    const { awal, akhir } = req.query;

    const validDate = (date) =>
        typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(Date.parse(date));

    if (!validDate(awal) || !validDate(akhir) || awal > akhir) {
        return res.status(400).json({
            message: "Tanggal awal dan akhir tidak valid."
        });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM public.laporan_perubahan_ekuitas($1, $2)`,
            [awal, akhir]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Gagal membuat laporan perubahan ekuitas."
        });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).json({ message: "Terjadi kesalahan server." });
});

app.listen(PORT, () => {
    console.log(`Sistem Akuntansi Modal berjalan di port ${PORT}`);
});
})();