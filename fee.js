/* ================================
   STATUS MESSAGE
================================ */
function setStatus(msg){
    document.getElementById("statusText").textContent = msg;
}

/* ================================
   DATE FORMAT HELPERS
================================ */
function ordinal(n){
    let s=["th","st","nd","rd"], v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}
function formatFancy(iso){
    if(!iso) return "";
    let [y,m,d] = iso.split("-");
    let dt = new Date(y, m-1, d);
    let months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return ordinal(dt.getDate())+" "+months[dt.getMonth()]+", "+dt.getFullYear();
}

/* ================================
   STUDENT DB (READ ONLY)
================================ */
const STUD_DB = "schoolDB_v1";
let studDb = null;

function openStudentDb(){
    return new Promise((resolve)=>{
        if(studDb) return resolve(studDb);
        let req = indexedDB.open(STUD_DB,1);
        req.onupgradeneeded = e=>{
            let db = e.target.result;
            if(!db.objectStoreNames.contains("students")){
                db.createObjectStore("students",{keyPath:"studentId"});
            }
        };
        req.onsuccess = e=>{
            studDb = e.target.result;
            resolve(studDb);
        };
    });
}
async function getStudent(id){
    if(!id) return null;
    let db = await openStudentDb();
    return new Promise(res=>{
        let tx = db.transaction("students","readonly");
        let req = tx.objectStore("students").get(id);
        req.onsuccess = ()=> res(req.result||null);
    });
}

/* ================================
   AUTO STUDENT LOADER
================================ */
document.getElementById("studentId").addEventListener("change", async ()=>{
    let id = studentId.value.trim();
    if(!id) return;

    let s = await getStudent(id);
    if(s){
        studentName.value = s.studentName || "";
        className.value   = s.className || "";
        section.value     = s.section || "";
        roll.value        = s.roll || "";
        setStatus("Student loaded");
    } else {
        studentName.value = "";
        className.value   = "";
        section.value     = "";
        roll.value        = "";
        setStatus("Student not found");
    }
});

/* ================================
   SET TODAY DATE (DEFAULT)
================================ */
function setTodayPaymentDate(){
    let t = new Date();
    let y = t.getFullYear();
    let m = ("0"+(t.getMonth()+1)).slice(-2);
    let d = ("0"+t.getDate()).slice(-2);
    let iso = `${y}-${m}-${d}`;
    payDate.value = iso;
    payDateFancy.textContent = formatFancy(iso);
}
payDate.addEventListener("change",()=>{
    payDateFancy.textContent = formatFancy(payDate.value);
});

/* ================================
   KIT DATA (LOCAL STORAGE)
================================ */
function kitKey(id,year){
    return "kitGiven_"+id+"_"+year;
}
function getKitRecord(id,year){
    let raw = localStorage.getItem(kitKey(id,year));
    if(!raw) return {items:[]};
    try{return JSON.parse(raw);}catch{return {items:[]}};
}
function saveKitRecord(id,year,data){
    localStorage.setItem(kitKey(id,year), JSON.stringify(data));
}

function applyKitLocks(){
    let sid = studentId.value.trim();
    let pd  = payDate.value;
    if(!sid || !pd) return;

    let year = pd.split("-")[0];
    let rec = getKitRecord(sid,year);

    document.querySelectorAll(".kit-given").forEach(ch=>{
        if(rec.items.includes(ch.value)){
            ch.checked = true;
            ch.disabled = true;
        } else ch.disabled = false;
    });
}
studentId.addEventListener("change", applyKitLocks);
payDate.addEventListener("change", applyKitLocks);

/* ================================
   FEE DB (MAIN)
================================ */
const FEE_DB = "feeDB_v1";
let feeDb = null;

function openFeeDb(){
    return new Promise((resolve)=>{
        if(feeDb) return resolve(feeDb);
        let req = indexedDB.open(FEE_DB,1);
        req.onupgradeneeded = e=>{
            let db = e.target.result;
            if(!db.objectStoreNames.contains("fees")){
                db.createObjectStore("fees",{keyPath:"billNo"});
            }
        };
        req.onsuccess = e=>{
            feeDb = e.target.result;
            resolve(feeDb);
        };
    });
}
async function saveFee(rec){
    let db = await openFeeDb();
    return new Promise(res=>{
        let tx = db.transaction("fees","readwrite");
        tx.objectStore("fees").put(rec);
        tx.oncomplete = res;
    });
}
async function getFee(bill){
    let db = await openFeeDb();
    return new Promise(res=>{
        let tx = db.transaction("fees","readonly");
        let req = tx.objectStore("fees").get(bill);
        req.onsuccess = ()=>res(req.result||null);
    });
}
async function deleteFee(bill){
    let db = await openFeeDb();
    return new Promise(res=>{
        let tx = db.transaction("fees","readwrite");
        tx.objectStore("fees").delete(bill);
        tx.oncomplete = res;
    });
}
async function getAllFees(){
    let db = await openFeeDb();
    return new Promise(res=>{
        let tx = db.transaction("fees","readonly");
        let req = tx.objectStore("fees").getAll();
        req.onsuccess = ()=>res(req.result||[]);
    });
}

/* ================================
   BILL NUMBER GENERATOR (GitHub Safe)
================================ */
async function generateNextBillNo(){
    let all = await getAllFees();
    if(!all.length) return "BL0001";

    let nums = all
        .map(r=>r.billNo)
        .filter(b=>/^BL\d{4}$/.test(b))
        .map(b=>parseInt(b.substring(2),10));

    if(!nums.length) return "BL0001";

    let max = Math.max(...nums);
    return "BL"+String(max+1).padStart(4,"0");
}

/* ================================
   TOTAL CALCULATOR
================================ */
function calculateTotal(){
    function n(id){ return Number(document.getElementById(id).value||0); }

    let total =
        n("admissionAmount") +
        n("developmentAmount") +
        n("uniformSets") +
        n("tiffin") +
        n("misc") +
        n("picnic") +
        n("fieldtrip") +
        n("sports");

    totalAmount.value = total;
}
["admissionAmount","developmentAmount","uniformSets","tiffin","misc","picnic","fieldtrip","sports"]
.forEach(id=> document.getElementById(id).addEventListener("input", calculateTotal));

/* ================================
   GET FORM DATA
================================ */
function getFormData(){
    let kitSel=[], kitDue=[];
    document.querySelectorAll(".kit-given").forEach(ch=>{ if(ch.checked) kitSel.push(ch.value); });
    document.querySelectorAll(".kit-due").forEach(ch=>{ if(ch.checked) kitDue.push(ch.value); });

    let pd = payDate.value;
    let y = pd.split("-")[0];
    let m = pd.split("-")[1];

    return {
        billNo: billNo.value.trim(),
        studentId: studentId.value.trim(),
        studentName: studentName.value.trim(),
        className: className.value.trim(),
        section: section.value.trim(),
        roll: roll.value.trim(),
        payDate: pd,
        payYear: y,
        payMonth: m,
        admissionType: admissionType.value,
        admissionAmount: Number(admissionAmount.value||0),
        developmentType: developmentType.value,
        developmentAmount: Number(developmentAmount.value||0),
        uniformType: uniformType.value,
        uniformSets: Number(uniformSets.value||0),
        kitSelected: kitSel,
        kitDue: kitDue,
        tiffin: Number(tiffin.value||0),
        misc: Number(misc.value||0),
        picnic: Number(picnic.value||0),
        fieldtrip: Number(fieldtrip.value||0),
        sports: Number(sports.value||0),
        paymentMode: paymentMode.value,
        totalAmount: Number(totalAmount.value||0)
    };
}

/* ================================
   FILL FORM
================================ */
function fillForm(d){
    billNo.value = d.billNo;
    studentId.value = d.studentId;
    studentName.value = d.studentName;
    className.value = d.className;
    section.value = d.section;
    roll.value = d.roll;

    payDate.value = d.payDate;
    payDateFancy.textContent = formatFancy(d.payDate);

    admissionType.value = d.admissionType;
    admissionAmount.value = d.admissionAmount;
    developmentType.value = d.developmentType;
    developmentAmount.value = d.developmentAmount;
    uniformType.value = d.uniformType;
    uniformSets.value = d.uniformSets;

    tiffin.value = d.tiffin;
    misc.value = d.misc;
    picnic.value = d.picnic;
    fieldtrip.value = d.fieldtrip;
    sports.value = d.sports;

    paymentMode.value = d.paymentMode;
    totalAmount.value = d.totalAmount;

    calculateTotal();
    applyKitLocks();
}

/* ================================
   CLEAR FORM
================================ */
async function clearForm(){
    feeForm.reset();
    billNo.value = await generateNextBillNo();
    setTodayPaymentDate();
    calculateTotal();
    applyKitLocks();
}

/* ================================
   SAVE BUTTON
================================ */
saveBtn.onclick = async ()=>{
    let rec = getFormData();
    if(!rec.billNo){
        rec.billNo = await generateNextBillNo();
        billNo.value = rec.billNo;
    }
    await saveFee(rec);

    alert("Saved Bill " + rec.billNo);
    await clearForm();
    setStatus("Saved: "+rec.billNo);
};

/* ================================
   EDIT BUTTON
================================ */
editBtn.onclick = async ()=>{
    let b = prompt("Enter Bill Number:");
    if(!b) return;

    let rec = await getFee(b);
    if(!rec){ alert("Not found"); return; }

    fillForm(rec);
    setStatus("Loaded "+b);
};

/* ================================
   DELETE BUTTON
================================ */
deleteBtn.onclick = async ()=>{
    let b = billNo.value.trim();
    if(!b) return alert("No bill selected");
    if(!confirm("Delete "+b+" ?")) return;

    await deleteFee(b);
    alert("Deleted "+b);
    await clearForm();
};

/* ================================
   SEARCH BUTTON
================================ */
searchBtn.onclick = async ()=>{
    let b = searchBill.value.trim();
    if(!b) return;
    let rec = await getFee(b);
    if(!rec){ alert("Not found"); return; }
    fillForm(rec);
};

/* ================================
   CSV EXPORT
================================ */
csvBtn.onclick = async ()=>{
    let all = await getAllFees();
    if(!all.length){
        alert("No records!");
        return;
    }

    let header = Object.keys(all[0]).join(",")+"\n";
    let rows = all.map(r=> Object.values(r).map(v=> `"${v}"`).join(",") ).join("\n");

    let csv = header+rows;

    let blob = new Blob([csv],{type:"text/csv"});
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "fee_records.csv";
    a.click();

    URL.revokeObjectURL(url);
};

/* ================================
   PRINT BUTTON
================================ */
printBtn.onclick = ()=>{
    window.location.href = "print_fee.html?bill="+billNo.value;
};

/* ================================
   INIT (GITHUB-PROOF)
================================ */
(async function initFee(){
    await openFeeDb();

    billNo.value = await generateNextBillNo();
    setTodayPaymentDate();
    calculateTotal();

    setStatus("Ready");
})();
