// ===================== IndexedDB Staff Loader =====================
const DB_NAME = "schoolDB_v1";
const DB_VERSION = 1;
let staffDB = null;
function openStaffDb() {
    return new Promise((resolve, reject) => {
        if (staffDB) return resolve(staffDB);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("students"))
                db.createObjectStore("students", { keyPath: "studentId" });
            if (!db.objectStoreNames.contains("staff"))
                db.createObjectStore("staff", { keyPath: "staffId" });
        };
        req.onsuccess = (e) => { staffDB = e.target.result; resolve(staffDB); };
    });
}
async function getAllStaff() {
    const db = await openStaffDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("staff", "readonly");
        const req = tx.objectStore("staff").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
async function loadStaffTable() {
    const list = await getAllStaff();
    const tbody = document.getElementById("teacherBody");
    tbody.innerHTML = "";
    list.forEach(st => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="checkbox" class="pick" data-id="${st.staffId}"></td>
            <td><img src="${st.picture || ""}" class="photo-small"></td>
            <td>${st.staffId}</td>
            <td>${st.staffName}</td>
            <td>${st.category || ""}</td>
            <td>${st.contact || ""}</td>`;
        tbody.appendChild(tr);
    });
    enableSelectionLimit();
}
function enableSelectionLimit() {
    const checkboxes = document.querySelectorAll(".pick");
    const generateBtn = document.getElementById("generateBtn");
    checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const selected = document.querySelectorAll(".pick:checked");
            if (selected.length > 6) {
                alert("You can select maximum 6 teachers.");
                cb.checked = false;
                return;
            }
            generateBtn.disabled = selected.length !== 6;
        });
    });
}
async function getStaffById(id) {
    const db = await openStaffDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("staff", "readonly");
        const req = tx.objectStore("staff").get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}
document.getElementById("generateBtn").onclick = async function () {
    const selected = [...document.querySelectorAll(".pick:checked")];
    if (selected.length !== 6) {
        alert("Please select exactly 6 teachers.");
        return;
    }
    const cardGrid = document.getElementById("cardGrid");
    cardGrid.innerHTML = "";
    for (let i = 0; i < selected.length; i++) {
        const id = selected[i].dataset.id;
        const staff = await getStaffById(id);
        const photo = staff.picture || "";
        const card = document.createElement("div");
        card.className = "id-card";
        card.innerHTML = `
            <div class="card-header">KIDZEE SCHOOL</div>
            <div class="photo-box"><img src="${photo}" class="card-photo"></div>
            <div class="info"><b>Name:</b> ${staff.staffName || ""}</div>
            <div class="info"><b>ID:</b> ${staff.staffId || ""}</div>
            <div class="info"><b>Category:</b> ${staff.category || ""}</div>
            <div class="info"><b>Mobile:</b> ${staff.contact || ""}</div>
            <div class="info"><b>Address:</b> ${staff.address || ""}</div>
            <div class="card-footer">Valid for 2025–26</div>`;
        cardGrid.appendChild(card);
    }
    window.print();
};
loadStaffTable();
