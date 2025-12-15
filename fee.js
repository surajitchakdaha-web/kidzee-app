/* ============================================
   NUMBER → WORDS (Indian Format)
============================================ */
function numberToIndianWords(n){
    n = Math.round(Number(n)||0);
    if(n===0) return "zero rupees";

    let ones=["","one","two","three","four","five","six","seven","eight","nine","ten",
              "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen",
              "eighteen","nineteen"];
    let tens=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

    function twoDigits(num){
        if(num===0) return "";
        if(num<20) return ones[num];
        return tens[Math.floor(num/10)] + (num%10? " "+ones[num%10]:"");
    }
    function threeDigits(num){
        let h=Math.floor(num/100);
        let rest=num%100;
        let out=[];
        if(h>0) out.push(ones[h]+" hundred");
        if(rest>0){
            if(out.length) out.push("and");
            out.push(twoDigits(rest));
        }
        return out.join(" ");
    }

    let out=[];
    let crore=Math.floor(n/10000000); n%=10000000;
    let lakh=Math.floor(n/100000); n%=100000;
    let thousand=Math.floor(n/1000); n%=1000;
    let hundred=n;

    if(crore) out.push(threeDigits(crore)+" crore");
    if(lakh)  out.push(threeDigits(lakh)+" lakh");
    if(thousand) out.push(threeDigits(thousand)+" thousand");
    if(hundred) out.push(threeDigits(hundred));

    return out.join(" ")+" rupees";
}

/* ============================================
   STATUS
============================================ */
function setStatus(msg){
    document.getElementById("statusText").textContent = msg;
}

/* ============================================
   DATE FORMAT
============================================ */
function ordinal(n){
    let s=["th","st","nd","rd"], v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}
function formatFancy(iso){
    if(!iso) return "";
    let [y,m,d] = iso.split("-");
    let dt=new Date(y,m-1,d);
    let months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return ordinal(dt.getDate())+" "+months[dt.getMonth()]+", "+dt.getFullYear();
}

/* ============================================
   STUDENT DB (READ)
============================================ */
const STUD_DB="schoolDB_v1";
let studDb=null;

function openStudentDb(){
    return new Promise(resolve=>{
        if(studDb) return resolve(studDb);

        let req=indexedDB.open(STUD_DB,1);
        req.onupgradeneeded=e=>{
            let db=e.target.result;
            if(!db.objectStoreNames.contains("students")){
                db.createObjectStore("students",{keyPath:"studentId"});
            }
        };
        req.onsuccess=e=>{
            studDb=e.target.result;
            resolve(studDb);
        };
    });
}

async function getStudent(id){
    if(!id) return null;
    let db=await openStudentDb();
    return new Promise(res=>{
        let tx=db.transaction("students","readonly");
        let req=tx.objectStore("students").get(id);
        req.onsuccess=()=>res(req.result||null);
    });
}

/* ============================================
   AUTO FILL STUDENT
============================================ */
studentId.addEventListener("change", async ()=>{
    let s=await getStudent(studentId.value.trim());
    if(s){
        studentName.value=s.studentName||"";
        className.value=s.className||"";
        section.value=s.section||"";
        roll.value=s.roll||"";
        setStatus("Student loaded");
    } else {
        studentName.value="";
        className.value="";
        section.value="";
        roll.value="";
        setStatus("Student not found");
    }
});

/* ============================================
   TODAY DATE
============================================ */
function setToday(){
    let t=new Date();
    let y=t.getFullYear();
    let m=("0"+(t.getMonth()+1)).slice(-2);
    let d=("0"+t.getDate()).slice(-2);
    let iso=`${y}-${m}-${d}`;
    payDate.value=iso;
    payDateFancy.textContent=formatFancy(iso);
}
payDate.addEventListener("change",()=>{
    payDateFancy.textContent=formatFancy(payDate.value);
});

/* ============================================
   FEE DB
============================================ */
const FEE_DB="feeDB_v2_fixed";
let feeDb=null;

function openFeeDb(){
    return new Promise(resolve=>{
        if(feeDb) return resolve(feeDb);

        let req=indexedDB.open(FEE_DB,1);
        req.onupgradeneeded=e=>{
            let db=e.target.result;
            if(!db.objectStoreNames.contains("fees")){
                db.createObjectStore("fees",{keyPath:"billNo"});
            }
        };
        req.onsuccess=e=>{
            feeDb=e.target.result;
            resolve(feeDb);
        };
    });
}

async function saveFee(rec){
    let db=await openFeeDb();
    return new Promise(res=>{
        let tx=db.transaction("fees","readwrite");
        tx.objectStore("fees").put(rec);
        tx.oncomplete=res;
    });
}
async function getAllFees(){
    let db=await openFeeDb();
    return new Promise(res=>{
        let tx=db.transaction("fees","readonly");
        let req=tx.objectStore("fees").getAll();
        req.onsuccess=()=>res(req.result||[]);
    });
}
async function getFee(id){
    let db=await openFeeDb();
    return new Promise(res=>{
        let tx=db.transaction("fees","readonly");
        let req=tx.objectStore("fees").get(id);
        req.onsuccess=()=>res(req.result||null);
    });
}
async function deleteFee(id){
    let db=await openFeeDb();
    return new Promise(res=>{
        let tx=db.transaction("fees","readwrite");
        tx.objectStore("fees").delete(id);
        tx.oncomplete=res;
    });
}

/* ============================================
   BILL NUMBER FIXED (GitHub Safe)
============================================ */
async function generateNextBillNo(){
    let all=await getAllFees();
    if(!all.length) return "BL0001";

    let nums = all
        .map(r=>r.billNo)
        .filter(b=>/^BL\d+$/.test(b))
        .map(b=>parseInt(b.slice(2)))
        .filter(n=>!isNaN(n));

    if(!nums.length) return "BL0001";

    let next=Math.max(...nums)+1;
    return "BL"+String(next).padStart(4,"0");
}

/* ============================================
   TOTAL + WORDS
============================================ */
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

    totalAmount.value=total;
    totalInWords.textContent = numberToIndianWords(total);
}

["admissionAmount","developmentAmount","uniformSets","tiffin","misc","picnic","fieldtrip","sports"]
.forEach(id=> document.getElementById(id).addEventListener("input", calculateTotal));

/* ============================================
   GET FORM DATA
============================================ */
function getFormData(){
    return {
        billNo: billNo.value.trim(),
        studentId: studentId.value.trim(),
        studentName: studentName.value.trim(),
        className: className.value.trim(),
        section: section.value.trim(),
        roll: roll.value.trim(),
        payDate: payDate.value,
        payMonth: payDate.value.split("-")[1],
        payYear: payDate.value.split("-")[0],
        admissionAmount:Number(admissionAmount.value||0),
        developmentAmount:Number(developmentAmount.value||0),
        uniformSets:Number(uniformSets.value||0),
        tiffin:Number(tiffin.value||0),
        misc:Number(misc.value||0),
        picnic:Number(picnic.value||0),
        fieldtrip:Number(fieldtrip.value||0),
        sports:Number(sports.value||0),
        paymentMode:paymentMode.value,
        totalAmount:Number(totalAmount.value||0)
    };
}

/* ============================================
   FILL FORM
============================================ */
function fillForm(d){
    billNo.value=d.billNo;
    studentId.value=d.studentId;
    studentName.value=d.studentName;
    className.value=d.className;
    section.value=d.section;
    roll.value=d.roll;

    payDate.value=d.payDate;
    payDateFancy.textContent=formatFancy(d.payDate);

    admissionAmount.value=d.admissionAmount;
    developmentAmount.value=d.developmentAmount;
    uniformSets.value=d.uniformSets;

    tiffin.value=d.tiffin;
    misc.value=d.misc;
    picnic.value=d.picnic;
    fieldtrip.value=d.fieldtrip;
    sports.value=d.sports;

    paymentMode.value=d.paymentMode;
    totalAmount.value=d.totalAmount;

    calculateTotal();
}

/* ============================================
   CLEAR FORM
============================================ */
async function clearForm(){
    feeForm.reset();
    billNo.value = await generateNextBillNo();
    setToday();
    calculateTotal();
}

/* ============================================
   SAVE BUTTON
============================================ */
saveBtn.onclick = async ()=>{
    let rec = getFormData();

    if(!rec.billNo){
        rec.billNo = await generateNextBillNo();
        billNo.value = rec.billNo;
    }

    await saveFee(rec);
    alert("Saved Bill "+rec.billNo);
    await clearForm();
};

/* ============================================
   SEARCH BUTTON
============================================ */
searchBtn.onclick = async ()=>{
    let b=searchBill.value.trim();
    if(!b) return;

    let rec=await getFee(b);
    if(!rec){ alert("Not found"); return; }
    fillForm(rec);
};

/* ============================================
   DELETE BUTTON
============================================ */
deleteBtn.onclick = async ()=>{
    let b=billNo.value.trim();
    if(!b) return alert("No bill selected");
    if(!confirm("Delete "+b+" ?")) return;

    await deleteFee(b);
    alert("Deleted "+b);
    await clearForm();
};

/* ============================================
   CSV EXPORT
============================================ */
csvBtn.onclick = async ()=>{
    let all=await getAllFees();
    if(!all.length){ alert("No records"); return; }

    let header=Object.keys(all[0]).join(",")+"\n";
    let rows=all.map(r=> Object.values(r).map(v=>`"${v}"`).join(",")).join("\n");

    let csv=header+rows;

    let blob=new Blob([csv],{type:"text/csv"});
    let url=URL.createObjectURL(blob);

    let a=document.createElement("a");
    a.href=url;
    a.download="fee_records.csv";
    a.click();

    URL.revokeObjectURL(url);
};

/* ============================================
   PRINT BUTTON
============================================ */
printBtn.onclick=()=>{
    window.location.href="print_fee.html?bill="+billNo.value;
};

/* ============================================
   INIT (GitHub Safe)
============================================ */
(async function init(){
    await openFeeDb();
    billNo.value = await generateNextBillNo();
    setToday();
    calculateTotal();
    setStatus("Ready");
})();
