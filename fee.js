/* =============================
   SIMPLE DELAY (GitHub FIX)
============================= */
function delay(ms){
    return new Promise(r=>setTimeout(r,ms));
}

/* =============================
   NUMBER TO WORDS
============================= */
function numberToIndianWords(n){
  n = Math.round(Number(n)||0);
  if(n===0) return "zero rupees";
  var ones=["","one","two","three","four","five","six","seven","eight","nine",
            "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
            "seventeen","eighteen","nineteen"];
  var tens=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  
  function twoDigits(num){
    if(num===0) return "";
    if(num<20) return ones[num];
    return tens[Math.floor(num/10)] + (num%10? " "+ones[num%10]:"");
  }
  function threeDigits(num){
    var h=Math.floor(num/100), rest=num%100, out=[];
    if(h>0) out.push(ones[h]+" hundred");
    if(rest>0){ if(out.length) out.push("and"); out.push(twoDigits(rest)); }
    return out.join(" ");
  }
  
  var out=[], crore=Math.floor(n/1e7); n%=1e7;
  var lakh=Math.floor(n/1e5); n%=1e5;
  var thousand=Math.floor(n/1000); n%=1000;
  var hundred=n;
  
  if(crore) out.push(threeDigits(crore)+" crore");
  if(lakh) out.push(threeDigits(lakh)+" lakh");
  if(thousand) out.push(threeDigits(thousand)+" thousand");
  if(hundred) out.push(threeDigits(hundred));
  
  return out.join(" ")+" rupees";
}

/* =============================
   STATUS
============================= */
function setStatus(t){
    statusText.textContent = t;
}

/* =============================
   FANCY DATE
============================= */
function ordinal(n){
    let s=["th","st","nd","rd"], v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}
function formatFancy(iso){
    if(!iso) return "";
    let [y,m,d] = iso.split("-");
    let dt = new Date(y, m-1, d);
    let months=["Jan","Feb","Mar","Apr","May","Jun","Jul",
                "Aug","Sep","Oct","Nov","Dec"];
    return ordinal(dt.getDate())+" "+months[dt.getMonth()]+", "+dt.getFullYear();
}

/* =============================
   STUDENT DB
============================= */
const STUD_DB="schoolDB_v1";
let studDb=null;

function openStudentDb(){
    return new Promise(res=>{
        if(studDb) return res(studDb);
        let req=indexedDB.open(STUD_DB,1);
        req.onupgradeneeded=e=>{
            let db=e.target.result;
            if(!db.objectStoreNames.contains("students")){
                db.createObjectStore("students",{keyPath:"studentId"});
            }
        };
        req.onsuccess=e=>{
            studDb=e.target.result;
            res(studDb);
        };
    });
}
async function getStudent(id){
    if(!id) return null;
    let db=await openStudentDb();
    return new Promise(res=>{
        let tx=db.transaction("students","readonly");
        let rq=tx.objectStore("students").get(id);
        rq.onsuccess=()=>res(rq.result||null);
    });
}

/* =============================
   AUTO STUDENT FILL
============================= */
studentId.addEventListener("change", async ()=>{
    let id = studentId.value.trim();
    if(!id) return;

    let s = await getStudent(id);
    if(s){
        studentName.value = s.studentName;
        className.value   = s.className;
        section.value     = s.section;
        roll.value        = s.roll;
        setStatus("Student loaded");
    } else {
        studentName.value = "";
        className.value   = "";
        section.value     = "";
        roll.value        = "";
        setStatus("Student not found");
    }
});

/* =============================
   TODAY DATE
============================= */
function setTodayPaymentDate(){
    let t = new Date();
    let y=t.getFullYear();
    let m=("0"+(t.getMonth()+1)).slice(-2);
    let d=("0"+t.getDate()).slice(-2);
    let iso=`${y}-${m}-${d}`;
    payDate.value=iso;
    payDateFancy.textContent=formatFancy(iso);
}

/* =============================
   FEE DB
============================= */
const FEE_DB="feeDB_v1";
let feeDb=null;

function openFeeDb(){
    return new Promise(res=>{
        if(feeDb) return res(feeDb);
        let req=indexedDB.open(FEE_DB,1);
        req.onupgradeneeded=e=>{
            let db=e.target.result;
            if(!db.objectStoreNames.contains("fees")){
                db.createObjectStore("fees",{keyPath:"billNo"});
            }
        };
        req.onsuccess=e=>{
            feeDb=e.target.result;
            res(feeDb);
        };
    });
}
async function getAllFees(){
    let db=await openFeeDb();
    return new Promise(res=>{
        let tx=db.transaction("fees","readonly");
        let rq=tx.objectStore("fees").getAll();
        rq.onsuccess=()=>res(rq.result||[]);
    });
}

/* =============================
   GITHUB-SAFE BILL NUMBER
============================= */
async function generateNextBillNo(){
    await delay(150);     // GitHub FIX (critical!)
    let all = await getAllFees();

    if(!all.length) return "BL0001";

    let nums = all
        .map(r=>r.billNo)
        .filter(b=>/^BL\d+$/.test(b))
        .map(b=>parseInt(b.slice(2)))
        .filter(n=>!isNaN(n));

    if(!nums.length) return "BL0001";

    let next = Math.max(...nums)+1;
    return "BL"+String(next).padStart(4,"0");
}

/* =============================
   TOTAL CALC
============================= */
function calculateTotal(){
    const n=id=>Number(document.getElementById(id).value||0);
    let total =
        n("admissionAmount")+
        n("developmentAmount")+
        n("uniformSets")+
        n("tiffin")+
        n("misc")+
        n("picnic")+
        n("fieldtrip")+
        n("sports");

    totalAmount.value = total;
    totalInWords.textContent = numberToIndianWords(total);
}

["admissionAmount","developmentAmount","uniformSets",
 "tiffin","misc","picnic","fieldtrip","sports"]
.forEach(id=> document.getElementById(id).addEventListener("input",calculateTotal));

/* =============================
   SAVE
============================= */
saveBtn.onclick = async ()=>{
    let rec = {
        billNo: billNo.value.trim(),
        studentId: studentId.value.trim(),
        studentName: studentName.value.trim(),
        className: className.value.trim(),
        section: section.value.trim(),
        roll: roll.value.trim(),
        payDate: payDate.value,
        payMonth: payDate.value.split("-")[1],
        payYear: payDate.value.split("-")[0],
        admissionAmount: Number(admissionAmount.value||0),
        developmentAmount: Number(developmentAmount.value||0),
        uniformSets: Number(uniformSets.value||0),
        tiffin: Number(tiffin.value||0),
        misc: Number(misc.value||0),
        picnic: Number(picnic.value||0),
        fieldtrip: Number(fieldtrip.value||0),
        sports: Number(sports.value||0),
        paymentMode: paymentMode.value,
        totalAmount: Number(totalAmount.value||0)
    };

    if(!rec.billNo){
        rec.billNo = await generateNextBillNo();
        billNo.value = rec.billNo;
    }

    let db = await openFeeDb();
    await new Promise(res=>{
        let tx=db.transaction("fees","readwrite");
        tx.objectStore("fees").put(rec);
        tx.oncomplete=res;
    });

    alert("Saved Bill: "+rec.billNo);
    await initForm();
};

/* =============================
   INIT (GITHUB PROOF)
============================= */
async function initForm(){
    await openFeeDb();
    await delay(200); // GitHub mandatory FIX

    billNo.value = await generateNextBillNo();
    setTodayPaymentDate();
    calculateTotal();
    setStatus("Ready");
}

window.onload = initForm;
