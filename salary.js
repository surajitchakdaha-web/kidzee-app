/* ======================================================
   STATUS UPDATE
====================================================== */
function setStatus(txt){
    document.getElementById("statusText").textContent = txt;
}

/* ======================================================
   HELPER FUNCTIONS
====================================================== */
function getVal(id){ return document.getElementById(id).value; }
function setVal(id,v){ document.getElementById(id).value = v; }

/* Convert number to words */
function numberToWords(num){
    num = Math.round(num);
    if(num === 0) return "Zero Only";

    const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
             "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen",
             "Eighteen","Nineteen"];
    const b=["","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

    function part(n,suffix){
        if(n===0) return "";
        if(n<20) return a[n]+" "+suffix+" ";
        if(n<100) return b[Math.floor(n/10)]+" "+a[n%10]+" "+suffix+" ";
        return a[Math.floor(n/100)]+" Hundred "+part(n%100,suffix);
    }

    let out="";
    if(num>=100000){ out+=part(Math.floor(num/100000),"Lakh"); num%=100000; }
    if(num>=1000){ out+=part(Math.floor(num/1000),"Thousand"); num%=1000; }
    if(num>0){ out+=part(num,""); }

    return out.trim()+" Only";
}

/* ======================================================
   STAFF DATABASE (Corrected)
====================================================== */
const STAFF_DB = "staffDB_finalClean";   // ✅ Corrected DB name
let staffDB = null;

function openStaffDB(){
    return new Promise(res=>{
        if(staffDB) return res(staffDB);

        const req = indexedDB.open(STAFF_DB,1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if(!db.objectStoreNames.contains("staff"))
                db.createObjectStore("staff",{keyPath:"staffId"});
        };
        req.onsuccess = e=>{
            staffDB = e.target.result;
            res(staffDB);
        };
    });
}

async function getStaffById(id){
    const db = await openStaffDB();
    return new Promise(res=>{
        const tx = db.transaction("staff","readonly");
        const req = tx.objectStore("staff").get(id);
        req.onsuccess = () => res(req.result || null);
    });
}

/* ======================================================
   SALARY DATABASE
====================================================== */
const SAL_DB = "salaryDB_v1";
let salDB = null;

function openSalaryDB(){
    return new Promise(res=>{
        if(salDB) return res(salDB);

        const req = indexedDB.open(SAL_DB,1);
        req.onupgradeneeded = e=>{
            const db = e.target.result;
            if(!db.objectStoreNames.contains("salary"))
                db.createObjectStore("salary",{keyPath:"salaryBill"});
        };
        req.onsuccess = e=>{
            salDB = e.target.result;
            res(salDB);
        };
    });
}

async function saveSalary(rec){
    const db = await openSalaryDB();
    return new Promise(res=>{
        const tx = db.transaction("salary","readwrite");
        tx.objectStore("salary").put(rec);
        tx.oncomplete = () => res();
    });
}

async function getSalary(bill){
    const db = await openSalaryDB();
    return new Promise(res=>{
        const tx = db.transaction("salary","readonly");
        const req = tx.objectStore("salary").get(bill);
        req.onsuccess = () => res(req.result || null);
    });
}

async function deleteSalary(bill){
    const db = await openSalaryDB();
    return new Promise(res=>{
        const tx = db.transaction("salary","readwrite");
        tx.objectStore("salary").delete(bill);
        tx.oncomplete = () => res();
    });
}

async function getAllSalary(){
    const db = await openSalaryDB();
    return new Promise(res=>{
        const tx = db.transaction("salary","readonly");
        const req = tx.objectStore("salary").getAll();
        req.onsuccess = () => res(req.result || []);
    });
}

async function getSortedBills(){
    const arr = await getAllSalary();
    const bills = arr.map(r=>r.salaryBill);
    bills.sort();
    return bills;
}

async function generateNextBill(){
    const bills = await getSortedBills();
    if(!bills.length) return "SL0001";

    const last = bills[bills.length-1];
    const n = parseInt(last.substring(2),10) + 1;

    return "SL" + String(n).padStart(4,"0");
}

/* ======================================================
   YEARLY CL/ML — localStorage
====================================================== */
function yearKey(staffId,year){ return "attendance_"+staffId+"_"+year; }

function getYearRecord(staffId,year){
    const raw = localStorage.getItem(yearKey(staffId,year));
    if(!raw) return {clUsed:0, mlUsed:0};
    try { return JSON.parse(raw); }
    catch(e){ return {clUsed:0, mlUsed:0}; }
}

function saveYearRecord(staffId,year,obj){
    localStorage.setItem(yearKey(staffId,year), JSON.stringify(obj));
}

function updateYearLabels(){
    const staffId = getVal("staffId").trim();
    const year = getVal("salaryYear").trim();
    const rec = getYearRecord(staffId,year);

    document.getElementById("clInfo").textContent =
        "Year CL Used: "+rec.clUsed+" | Remaining: "+(10-rec.clUsed);

    document.getElementById("mlInfo").textContent =
        "Year ML Used: "+rec.mlUsed+" | Remaining: "+(10-rec.mlUsed);
}

/* ======================================================
   GET + FILL FORM
====================================================== */
function getFormObj(){
    return {
        salaryBill:getVal("salaryBill"),
        salaryDate:getVal("salaryDate"),
        staffId:getVal("staffId"),
        staffName:getVal("staffName"),
        staffCategory:getVal("staffCategory"),

        salaryMonth:getVal("salaryMonth"),
        salaryYear:getVal("salaryYear"),

        monthly:Number(getVal("monthly")||0),
        pf:Number(getVal("pf")||0),
        esi:Number(getVal("esi")||0),
        insurance:Number(getVal("insurance")||0),
        bonus:Number(getVal("bonus")||0),

        clThisMonth:Number(getVal("clThisMonth")||0),
        mlThisMonth:Number(getVal("mlThisMonth")||0),

        absentDays:Number(getVal("absentDays")||0),
        halfDays:Number(getVal("halfDays")||0),
        incentiveHalf:Number(getVal("incentiveHalf")||0),

        totalAbsent:Number(getVal("totalAbsent")||0),
        totalSalary:Number(getVal("totalSalary")||0),
        totalInWords:getVal("totalInWords"),

        salaryStatus:getVal("salaryStatus")
    };
}

function fillForm(o){
    for(const k in o){
        if(document.getElementById(k)){
            setVal(k,o[k]);
        }
    }
    updateYearLabels();
    calculateTotal();
}

/* ======================================================
   CALCULATION ENGINE
====================================================== */
function calculateTotal(){
    const monthly = Number(getVal("monthly")||0);
    const pf      = Number(getVal("pf")||0);
    const esi     = Number(getVal("esi")||0);
    const ins     = Number(getVal("insurance")||0);
    const bonus   = Number(getVal("bonus")||0);

    const clInput = Number(getVal("clThisMonth")||0);
    const mlInput = Number(getVal("mlThisMonth")||0);

    const absent  = Number(getVal("absentDays")||0);
    const half    = Number(getVal("halfDays")||0);
    const incHalf = Number(getVal("incentiveHalf")||0);

    const staffId = getVal("staffId").trim();
    const year = getVal("salaryYear").trim();
    const yearRec = getYearRecord(staffId,year);

    const perDay = monthly/30;

    let clUsedBefore = yearRec.clUsed || 0;
    let clAvail = Math.max(0, 10 - clUsedBefore);

    let manualCL = Math.min(clInput, clAvail);
    clAvail -= manualCL;

    const halfToCL = Math.floor(half/2);
    const halfRem  = half % 2;

    const clForHalf = Math.min(halfToCL, clAvail);
    clAvail -= clForHalf;

    const unpaidPairs = halfToCL - clForHalf;

    const clForAbsent = Math.min(absent, clAvail);
    clAvail -= clForAbsent;

    const remainingAbsent = absent - clForAbsent;

    const totalCL = manualCL + clForHalf + clForAbsent;

    const effectiveHalfDays = unpaidPairs + (halfRem * 0.5);

    let totalAbsentEffective = remainingAbsent + effectiveHalfDays;
    if(totalAbsentEffective < 0) totalAbsentEffective = 0;

    setVal("totalAbsent", totalAbsentEffective.toFixed(2));

    const salaryDeduction = totalAbsentEffective * perDay;
    const incentiveAmount = (perDay/2) * incHalf;

    let total = monthly + bonus + incentiveAmount - pf - esi - ins - salaryDeduction;

    if(!isFinite(total)) total = 0;
    const rounded = Math.round(total);

    setVal("totalSalary", rounded);
    setVal("totalInWords", numberToWords(rounded));

    let statusText = "FULL PAID";

    if(salaryDeduction>0 && incentiveAmount<=0)
        statusText="PARTLY PAID";
    else if(salaryDeduction<=0 && incentiveAmount>0)
        statusText="FULL PAID WITH INCENTIVE";
    else if(salaryDeduction>0 && incentiveAmount>0)
        statusText="PARTLY PAID WITH INCENTIVE";

    document.getElementById("salaryStatus").value = statusText;

    document.getElementById("clInfo").textContent =
        "Year CL Used: "+(clUsedBefore+totalCL)+" | Remaining: "+(10-(clUsedBefore+totalCL));

    let mlUsedBefore = yearRec.mlUsed || 0;
    document.getElementById("mlInfo").textContent =
        "Year ML Used: "+(mlUsedBefore+mlInput)+" | Remaining: "+(10-(mlUsedBefore+mlInput));
}

/* Recalculate on change */
[
"pf","esi","insurance","bonus","clThisMonth","mlThisMonth",
"absentDays","halfDays","incentiveHalf"
].forEach(id=>{
    document.getElementById(id).addEventListener("input",calculateTotal);
});

/* ======================================================
   STAFF AUTO-FILL WHEN TYPING STAFF ID
====================================================== */
document.getElementById("staffId").addEventListener("change", async ()=>{
    const id = getVal("staffId").trim();
    if(!id) return;

    const s = await getStaffById(id);
    if(s){
        setVal("staffName",s.staffName||"");
        setVal("staffCategory",s.category||"");
        setVal("monthly",s.salary||"");
        setStatus("Staff loaded");
    }else{
        setVal("staffName","");
        setVal("staffCategory","");
        setVal("monthly","");
        setStatus("Staff not found");
    }
    updateYearLabels();
    calculateTotal();
});

/* Year change ⇒ update CL/ML */
document.getElementById("salaryYear").addEventListener("change",()=>{
    updateYearLabels();
    calculateTotal();
});

/* ======================================================
   INIT SYSTEM
====================================================== */
let currentIndex = -1;

async function loadRecordByIndex(i){
    const bills = await getSortedBills();
    if(!bills.length){ setStatus("No data"); return; }

    if(i<0)i=0;
    if(i>=bills.length)i=bills.length-1;

    currentIndex=i;

    const rec = await getSalary(bills[i]);
    if(rec) fillForm(rec);

    setStatus("Loaded "+bills[i]);
}

async function refreshTable(){
    const all = await getAllSalary();

    const nameFilter = getVal("filterName").toLowerCase();
    const idFilter   = getVal("filterId").toLowerCase();
    const mFilter    = getVal("filterMonth");
    const yFilter    = getVal("filterYear");

    const filtered = all.filter(r=>{
        if(nameFilter && !String(r.staffName||"").toLowerCase().includes(nameFilter)) return false;
        if(idFilter && !String(r.staffId||"").toLowerCase().includes(idFilter)) return false;
        if(mFilter && r.salaryMonth!==mFilter) return false;
        if(yFilter && String(r.salaryYear)!==yFilter) return false;
        return true;
    });

    const tbody = document.getElementById("salaryTableBody");
    tbody.innerHTML="";

    filtered.sort((a,b)=>a.salaryBill.localeCompare(b.salaryBill));

    for(const r of filtered){
        const tr=document.createElement("tr");
        tr.innerHTML =
        `<td>${r.salaryBill}</td>
         <td>${r.staffId}</td>
         <td>${r.staffName}</td>
         <td>${r.salaryMonth}</td>
         <td>${r.salaryYear}</td>
         <td>${r.clThisMonth}</td>
         <td>${r.mlThisMonth}</td>
         <td>${r.totalSalary}</td>
         <td>${r.salaryStatus}</td>
         <td><button class='small-btn sb-print' data-bill='${r.salaryBill}'>Print</button></td>
         <td><button class='small-btn sb-edit' data-bill='${r.salaryBill}'>Edit</button></td>
         <td><button class='small-btn sb-del' data-bill='${r.salaryBill}'>Delete</button></td>`;
        tbody.appendChild(tr);
    }
}

/* INITIAL LOAD */
(async function init(){
    await openSalaryDB();

    setVal("salaryBill", await generateNextBill());

    const d = new Date();
    setVal("salaryDate", d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}));
    setVal("salaryYear", d.getFullYear());

    updateYearLabels();
    calculateTotal();
    await refreshTable();

    const bills = await getSortedBills();
    if(bills.length) loadRecordByIndex(0);

    setStatus("Ready");
})();

/* ======================================================
   SAVE
====================================================== */
document.getElementById("saveBtn").addEventListener("click", async ()=>{
    const rec = getFormObj();

    if(!rec.staffId){ alert("Enter Staff ID"); return; }
    if(!rec.salaryMonth || !rec.salaryYear){ alert("Select month and year"); return; }

    const yr = getVal("salaryYear").trim();
    const staffId = getVal("staffId").trim();
    const yrRec = getYearRecord(staffId,yr);

    yrRec.clUsed = Math.min(10, yrRec.clUsed + rec.clThisMonth);
    yrRec.mlUsed = Math.min(10, yrRec.mlUsed + rec.mlThisMonth);
    saveYearRecord(staffId,yr,yrRec);

    await saveSalary(rec);
    alert("Saved: "+rec.salaryBill);

    updateYearLabels();
    setVal("salaryBill",await generateNextBill());
    await refreshTable();

    setStatus("Saved");
});

/* ======================================================
   EDIT
====================================================== */
document.getElementById("editBtn").addEventListener("click", async ()=>{
    const bill = prompt("Enter Salary Bill No:");
    if(!bill) return;

    const rec = await getSalary(bill.trim());
    if(!rec){ alert("Not found"); return; }

    fillForm(rec);

    const bills = await getSortedBills();
    currentIndex = bills.indexOf(bill);

    setStatus("Loaded "+bill);
});

/* ======================================================
   DELETE
====================================================== */
document.getElementById("deleteBtn").addEventListener("click", async ()=>{
    const bill = getVal("salaryBill").trim();
    if(!bill){ alert("No bill selected"); return; }

    if(!confirm("Delete "+bill+" ?")) return;

    await deleteSalary(bill);
    alert("Deleted");

    setVal("salaryBill",await generateNextBill());
    await refreshTable();

    setStatus("Deleted "+bill);
});

/* ======================================================
   SEARCH
====================================================== */
document.getElementById("searchBtn").addEventListener("click", async ()=>{
    const bill = getVal("searchBill").trim();
    if(!bill){ alert("Enter bill no"); return; }

    const rec = await getSalary(bill);
    if(!rec){ alert("Not found"); return; }

    fillForm(rec);

    const bills = await getSortedBills();
    currentIndex = bills.indexOf(bill);

    setStatus("Loaded "+bill);
});

/* ======================================================
   NEXT / PREV
====================================================== */
document.getElementById("nextBtn").addEventListener("click", async ()=>{
    const bills = await getSortedBills();
    if(currentIndex < bills.length-1){
        currentIndex++;
        await loadRecordByIndex(currentIndex);
    }else alert("Last record");
});
document.getElementById("prevBtn").addEventListener("click", async ()=>{
    if(currentIndex > 0){
        currentIndex--;
        await loadRecordByIndex(currentIndex);
    }else alert("First record");
});

/* ======================================================
   JSON EXPORT / IMPORT
====================================================== */
document.getElementById("jsonExportBtn").addEventListener("click", async ()=>{
    const all = await getAllSalary();

    const blob = new Blob([JSON.stringify(all,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "salary_backup.json";
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("jsonImportBtn").addEventListener("click",()=>{
    document.getElementById("jsonFileInput").click();
});

document.getElementById("jsonFileInput").addEventListener("change",function(){
    const f = this.files[0]; if(!f) return;

    const r = new FileReader();
    r.onload = async e=>{
        const arr = JSON.parse(e.target.result);
        for(const rec of arr) await saveSalary(rec);
        alert("Import Completed");
        location.reload();
    };
    r.readAsText(f);
});

/* ======================================================
   CSV EXPORT
====================================================== */
document.getElementById("csvBtn").addEventListener("click",()=>{
    const r = getFormObj();

    const csv = 
`Bill,StaffID,Name,Month,Year,TotalSalary,Status
${r.salaryBill},${r.staffId},"${r.staffName}",${r.salaryMonth},${r.salaryYear},${r.totalSalary},"${r.salaryStatus}"`;

    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.salaryBill+"_salary.csv";
    a.click();
    URL.revokeObjectURL(url);
});

/* ======================================================
   TABLE ACTION BUTTONS (PRINT / EDIT / DELETE)
====================================================== */
document.getElementById("salaryTableBody").addEventListener("click", async e=>{
    const btn = e.target;
    if(!(btn instanceof HTMLButtonElement)) return;

    const bill = btn.getAttribute("data-bill");
    if(!bill) return;

    const rec = await getSalary(bill);
    if(!rec) return;

    if(btn.classList.contains("sb-print")){
        openSalarySlip(rec);
    }
    else if(btn.classList.contains("sb-edit")){
        fillForm(rec);
        setStatus("Loaded "+bill+" for edit");
    }
    else if(btn.classList.contains("sb-del")){
        if(confirm("Delete "+bill+" ?")){
            await deleteSalary(bill);
            await refreshTable();
            setStatus("Deleted "+bill);
        }
    }
});

/* FILTER */
document.getElementById("filterApply").addEventListener("click", refreshTable);
document.getElementById("filterReset").addEventListener("click", ()=>{
    setVal("filterName","");
    setVal("filterId","");
    setVal("filterYear","");
    document.getElementById("filterMonth").value="";
    refreshTable();
});

/* ======================================================
   PRINT SLIP WINDOW
====================================================== */
function openSalarySlip(r){
    const win = window.open("","_blank","width=900,height=700");

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Salary Slip - ${r.salaryBill}</title>

        <style>
            body{font-family:Arial,sans-serif;padding:20px;}
            .header{text-align:center;font-weight:bold;font-size:20px;}
            .sub{text-align:center;font-size:12px;margin-top:-4px;}
            .logo{position:absolute;right:25px;top:20px;width:70px;height:70px;}
            hr{margin:10px 0;}
            table{border-collapse:collapse;width:100%;font-size:13px;}
            td,th{border:1px solid #ffcc80;padding:6px;}
            th{background:#ffb74d;}
            .box{border:1px solid #ffcc80;border-radius:6px;padding:8px;margin-top:10px;}
            .signature{text-align:right;margin-top:40px;font-weight:bold;}
        </style>
    </head>
    <body>

        <img src="logo.png" class="logo">

        <div class="header">CHATUSHPATHI FOUNDATION</div>
        <div class="sub">True education uplifts the self</div>
        <div class="sub">Chhatimtala, Chakdaha, Nadia - 741222</div>
        <div class="sub">Phone: 9064880703 | Email: chatushpathifoundation@gmail.com</div>

        <hr>

        <h3 style="text-align:center;margin:5px 0;">STAFF SALARY SLIP</h3>

        <table>
            <tr><td><b>Bill No:</b> ${r.salaryBill}</td><td><b>Date:</b> ${r.salaryDate}</td></tr>
            <tr><td><b>Staff ID:</b> ${r.staffId}</td><td><b>Name:</b> ${r.staffName}</td></tr>
            <tr><td><b>Category:</b> ${r.staffCategory}</td>
                <td><b>Month & Year:</b> ${r.salaryMonth} ${r.salaryYear}</td></tr>
        </table>

        <div class="box">
            <table>
                <tr><th>Particulars</th><th>Amount</th></tr>
                <tr><td>Monthly Salary</td><td>${r.monthly}</td></tr>
                <tr><td>PF</td><td>${r.pf}</td></tr>
                <tr><td>ESI</td><td>${r.esi}</td></tr>
                <tr><td>Health Insurance</td><td>${r.insurance}</td></tr>
                <tr><td>Bonus (+)</td><td>${r.bonus}</td></tr>
                <tr><td>CL Used (This Month)</td><td>${r.clThisMonth}</td></tr>
                <tr><td>ML Used (This Month)</td><td>${r.mlThisMonth}</td></tr>
                <tr><td>Absent Days</td><td>${r.absentDays}</td></tr>
                <tr><td>Half Days</td><td>${r.halfDays}</td></tr>
                <tr><td>Incentive Half-Day (+)</td><td>${r.incentiveHalf}</td></tr>
                <tr><td>Total Effective Absent</td><td>${r.totalAbsent}</td></tr>
            </table>
        </div>

        <h3>Total Salary: ₹ ${r.totalSalary}</h3>
        <p><b>In words:</b> ${r.totalInWords}</p>
        <p><b>Status:</b> ${r.salaryStatus}</p>

        <div class="signature">Authorized Signature</div>

    </body>
    </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
}

/* ======================================================
   HOME BUTTON
====================================================== */
document.getElementById("homeBtn").addEventListener("click",()=>{
    window.location.href="index.html";
});
