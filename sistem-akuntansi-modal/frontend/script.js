
"use strict";

const SUPABASE_URL = "https://bwftphgkqzubybklfvjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OuXCIxvblozQ0qBOOJLWkg_FWgXJY8M";
const supabaseClient = window.supabase?.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
const $ = (selector) => document.querySelector(selector);

const rupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const tanggalID = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
};

const labelJenis = {
    modal_awal: "Modal Awal",
    tambahan_modal: "Tambahan Modal",
    prive: "Prive",
    laba_bersih: "Laba Bersih",
    rugi_bersih: "Rugi Bersih"
};

let transactions = [];

function showNotice(message, error = false) {
    const notice = $("#notice");
    notice.textContent = message;
    notice.classList.toggle("error", error);
    notice.hidden = false;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearNotice() {
    $("#notice").hidden = true;
    $("#notice").textContent = "";
}

function setPage(section) {
    const validSections = ["dashboard", "transaksi", "laporan"];

    if (!validSections.includes(section)) return;

    document.querySelectorAll(".page-section").forEach((element) => {
        element.hidden = element.id !== section;
    });

    document.querySelectorAll(".nav-item").forEach((element) => {
        element.classList.toggle(
            "active",
            element.dataset.section === section
        );
    });

    const titles = {
        dashboard: "Dashboard",
        transaksi: "Transaksi Ekuitas",
        laporan: "Laporan Perubahan Ekuitas"
    };

    $("#page-title").textContent = titles[section];
    clearNotice();

    if (section === "laporan") {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

        if (!$("#report-start").value) {
            $("#report-start").value = formatDateInput(firstDay);
        }

        if (!$("#report-end").value) {
            $("#report-end").value = formatDateInput(today);
        }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function makeCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
}

function makeBadge(type) {
    const badge = document.createElement("span");
    badge.className = "transaction-type";

    if (["modal_awal", "tambahan_modal", "laba_bersih"].includes(type)) {
        badge.classList.add("positive");
    } else {
        badge.classList.add("negative");
    }

    badge.textContent = labelJenis[type] || type;
    return badge;
}

function createTransactionRow(item, showActions = false) {
    const row = document.createElement("tr");

    row.appendChild(makeCell(tanggalID(item.tanggal)));

    const typeCell = document.createElement("td");
    typeCell.appendChild(makeBadge(item.jenis_transaksi));
    row.appendChild(typeCell);

    row.appendChild(makeCell(item.keterangan));

    row.appendChild(makeCell(rupiah(item.jumlah), "text-right amount"));

    if (showActions) {
        const actions = document.createElement("td");
        const group = document.createElement("div");
        group.className = "action-group";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTransaction(item));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-btn delete";
        deleteButton.textContent = "Hapus";
        deleteButton.addEventListener("click", () => deleteTransaction(item));

        group.append(editButton, deleteButton);
        actions.appendChild(group);
        row.appendChild(actions);
    }

    return row;
}

function showEmpty(tbody, columns, message) {
    const row = document.createElement("tr");
    const cell = makeCell(message, "empty");
    cell.colSpan = columns;
    row.appendChild(cell);
    tbody.replaceChildren(row);
}

function renderDashboard() {
    let modal = 0;
    let laba = 0;
    let rugi = 0;
    let prive = 0;

    for (const item of transactions) {
        const amount = Number(item.jumlah);

        switch (item.jenis_transaksi) {
            case "modal_awal":
            case "tambahan_modal":
                modal += amount;
                break;
            case "laba_bersih":
                laba += amount;
                break;
            case "rugi_bersih":
                rugi += amount;
                break;
            case "prive":
                prive += amount;
                break;
        }
    }

    $("#total-modal").textContent = rupiah(modal);
    $("#total-laba").textContent = rupiah(laba - rugi);
    $("#total-prive").textContent = rupiah(prive);
    $("#total-ekuitas").textContent = rupiah(modal + laba - rugi - prive);

    const tbody = $("#recent-table");
    const latest = transactions.slice(0, 5);

    if (!latest.length) {
        showEmpty(tbody, 4, "Belum ada transaksi. Silakan tambahkan transaksi.");
        return;
    }

    tbody.replaceChildren(
        ...latest.map((item) => createTransactionRow(item))
    );
}

function renderTransactions() {
    const tbody = $("#transaction-table");
    const search = $("#search-transaction").value.trim().toLowerCase();
    const type = $("#filter-jenis").value;

    const filtered = transactions.filter((item) => {
        const matchSearch = item.keterangan.toLowerCase().includes(search);
        const matchType = !type || item.jenis_transaksi === type;
        return matchSearch && matchType;
    });

    if (!filtered.length) {
        showEmpty(tbody, 5, "Tidak ada transaksi yang sesuai.");
    } else {
        tbody.replaceChildren(
            ...filtered.map((item) => createTransactionRow(item, true))
        );
    }

    $("#transaction-count").textContent =
        `Menampilkan ${filtered.length} dari ${transactions.length} transaksi`;
}

async function loadTransactions() {
    try {
        const { data, error } = await supabaseClient
            .from("transaksi_ekuitas")
            .select("id, tanggal, jenis_transaksi, keterangan, jumlah, created_at, updated_at")
            .order("tanggal", { ascending: false })
            .order("id", { ascending: false });

        if (error) throw error;

        transactions = data;
        renderDashboard();
        renderTransactions();
    } catch (error) {
        showNotice(error.message, true);
        showEmpty($("#recent-table"), 4, "Data tidak dapat dimuat.");
        showEmpty($("#transaction-table"), 5, "Data tidak dapat dimuat.");
    }
}

function resetForm() {
    $("#transaction-form").reset();
    $("#transaction-id").value = "";
    $("#form-title").textContent = "Tambah Transaksi";
    $("#save-button").textContent = "Simpan Transaksi";
    $("#cancel-edit").hidden = true;
}

function editTransaction(item) {
    setPage("transaksi");

    $("#transaction-id").value = item.id;
    $("#tanggal").value = String(item.tanggal).slice(0, 10);
    $("#jenis").value = item.jenis_transaksi;
    $("#keterangan").value = item.keterangan;
    $("#jumlah").value = item.jumlah;

    $("#form-title").textContent = "Edit Transaksi";
    $("#save-button").textContent = "Simpan Perubahan";
    $("#cancel-edit").hidden = false;

    $("#transaction-form").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function deleteTransaction(item) {
    const confirmed = window.confirm(
        `Hapus transaksi "${item.keterangan}" senilai ${rupiah(item.jumlah)}?`
    );

    if (!confirmed) return;

    try {
        const { data, error } = await supabaseClient
            .rpc("hapus_transaksi_ekuitas", { p_id: item.id });

        if (error) throw error;
        if (!data) throw new Error("Transaksi tidak ditemukan.");

        if ($("#transaction-id").value === String(item.id)) {
            resetForm();
        }

        await loadTransactions();
        showNotice("Transaksi berhasil dihapus.");
    } catch (error) {
        showNotice(error.message, true);
    }
}

$("#transaction-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = $("#transaction-id").value;

    const payload = {
        tanggal: $("#tanggal").value,
        jenis_transaksi: $("#jenis").value,
        keterangan: $("#keterangan").value.trim(),
        jumlah: $("#jumlah").value
    };

    if (!payload.tanggal || !payload.jenis_transaksi ||
        !payload.keterangan || !payload.jumlah) {
        showNotice("Semua kolom wajib diisi.", true);
        return;
    }

    const button = $("#save-button");
    button.disabled = true;

    try {
        const { error } = await supabaseClient.rpc(
            "simpan_transaksi_ekuitas",
            {
                p_id: id || null,
                p_tanggal: payload.tanggal,
                p_jenis_transaksi: payload.jenis_transaksi,
                p_keterangan: payload.keterangan,
                p_jumlah: payload.jumlah
            }
        );

        if (error) throw error;

        resetForm();
        await loadTransactions();

        setPage("transaksi");
        showNotice(
            id
                ? "Transaksi berhasil diperbarui."
                : "Transaksi berhasil disimpan."
        );
    } catch (error) {
        showNotice(error.message, true);
    } finally {
        button.disabled = false;
    }
});

function reportRow(label, amount, options = {}) {
    const row = document.createElement("tr");
    const description = makeCell(label);
    const value = makeCell(rupiah(amount), "text-right");

    if (options.indent) {
        description.style.paddingLeft = "30px";
    }

    if (options.total) {
        row.className = "report-total";
    }

    if (options.negative) {
        value.textContent = `(${rupiah(amount)})`;
    }

    row.append(description, value);
    return row;
}

async function generateReport() {
    const start = $("#report-start").value;
    const end = $("#report-end").value;

    if (!start || !end || start > end) {
        showNotice("Periksa kembali tanggal awal dan akhir laporan.", true);
        return;
    }

    try {
        const { data: report, error } = await supabaseClient
            .rpc("laporan_perubahan_ekuitas", {
                p_tanggal_awal: start,
                p_tanggal_akhir: end
            })
            .single();

        if (error) throw error;

        const n = (value) => Number(value) || 0;
        const tbody = $("#report-table");

        const rows = [
            reportRow("Modal awal periode", n(report.modal_awal_periode)),
            reportRow("Tambahan modal", n(report.tambahan_modal), { indent: true }),
            reportRow("Laba bersih periode berjalan", n(report.laba_bersih), { indent: true }),
            reportRow("Rugi bersih periode berjalan", n(report.rugi_bersih), {
                indent: true,
                negative: true
            }),
            reportRow("Prive", n(report.total_prive), {
                indent: true,
                negative: true
            }),
            reportRow(
                "Kenaikan / (Penurunan) Ekuitas",
                n(report.kenaikan_penurunan_ekuitas),
                { total: true }
            ),
            reportRow("MODAL AKHIR PERIODE", n(report.modal_akhir), { total: true })
        ];

        tbody.replaceChildren(...rows);

        $("#report-period").textContent =
            `${tanggalID(start)} – ${tanggalID(end)}`;

        clearNotice();
    } catch (error) {
        showNotice(error.message, true);
    }
}

document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.section));
});

document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => setPage(button.dataset.go));
});

$("#quick-add").addEventListener("click", () => {
    resetForm();
    setPage("transaksi");
});

$("#cancel-edit").addEventListener("click", resetForm);
$("#refresh-data").addEventListener("click", loadTransactions);
$("#search-transaction").addEventListener("input", renderTransactions);
$("#filter-jenis").addEventListener("change", renderTransactions);
$("#generate-report").addEventListener("click", generateReport);

$("#print-report").addEventListener("click", () => {
    window.print();
});

async function initializeApp() {
    if (!supabaseClient) {
        showNotice(
            "Library Supabase tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.",
            true
        );
        return;
    }

    await loadTransactions();
}

initializeApp();