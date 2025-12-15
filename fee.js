/* ===================================
   FEE PAGE — MAIN SCRIPT
   =================================== */

/* ---------- STATUS ---------- */
function setStatus(msg){
  document.getElementById("statusText").textContent = msg;
}

/* ---------- FORMAT DATE ---------- */
function ordinal(n){
  var s=["th","st","nd","rd"], v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}
function formatFancy(iso){
  if(!iso) return "";
  var p = iso.split("-");
  if(p.length!==3) return "";
  var y = +p[0], m = +p[1], d = +p[2];
  var dt = new Date(y, m-1, d);
  var months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return ordinal(dt.getDate())+" "+months[dt.getMonth()]+", "+dt.getFullYear();
}

/* ---------- STUDENT DB (READ ONLY) ---------- */
var STUD_DB_NAME="schoolDB_v1";
var STUD_DB_VERSION=1;
var studDb=null;

function openStudentDb(){
  return new Promise((resolve,reject)=>{
    if(studDb) return resolve(studDb);
    var req=indexedDB.open(STUD_DB_NAME,STUD_DB_VERSION);
    req.onerror=()=>reject(req.error);
    req.onsuccess=e=>{ studDb=e.target.result; resolve(studDb); };
  });
}

async function getStudentById(id){
  if(!id) return null;
  var db = await openStudentDb();
  return new Promise((resolve)=>{
    var tx=db.transaction("students","readonly");
    var req=tx.objectStore("students").get(id);
    req.onsuccess=()=>resolve(req.result||null);
  });
}

/* ---------- AUTO-LOAD STUDENT DETAIL WHEN ID ENTERED ---------- */
document.getElementById("studentId").addEventListener("change",async function(){
  var id=this.value.trim();
  if(!id) return;

  var s=await getStudentById(id);
  if(s){
    document.getElementById("studentName").value = s.studentName||"";
    document.getElementById("className").value   = s.className||"";
    document.getElementById("section").value     = s.section||"A";  // default A
    document.getElementById("roll").value        = s.roll||"";
    setStatus("Student loaded");
  }else{
    document.getElementById("studentName").value="";
    document.getElementById("className").value="";
    document.getElementById("section").value="A";
    document.getElementById("roll").value="";
    setStatus("Student not found");
  }

  await refreshStudentHistory(id);
});

/* ---------- FEE DATABASE ---------- */
var FEE_DB_NAME="feeDB_v1";
var FEE_DB_VERSION=1;
var feeDb=null;

function openFeeDb(){
  return new Promise((resolve,reject)=>{
    if(feeDb) return resolve(feeDb);
    var req=indexedDB.open(FEE_DB_NAME,FEE_DB_VERSION);
    req.onerror=()=>reject(req.error);
    req.onupgradeneeded=e=>{
      var db=e.target.result;
      if(!db.objectStoreNames.contains("fees")){
        db.createObjectStore("fees",{keyPath:"billNo"});
      }
    };
    req.onsuccess=e=>{ feeDb=e.target.result; resolve(feeDb); };
  });
}

/* ---------- DB FUNCTIONS ---------- */
async function saveFee(rec){
  var db=await openFeeDb();
  return new Promise((resolve)=>{
    var tx=db.transaction("fees","readwrite");
    tx.objectStore("fees").put(rec);
    tx.oncomplete=resolve;
  });
}

async function getFee(bill){
  var db=await openFeeDb();
  return new Promise((resolve)=>{
    var tx=db.transaction("fees","readonly");
    var req=tx.objectStore("fees").get(bill);
    req.onsuccess=()=>resolve(req.result||null);
  });
}

async function deleteFee(bill){
  var db=await openFeeDb();
  return new Promise((resolve)=>{
    var tx=db.transaction("fees","readwrite");
    tx.objectStore("fees").delete(bill);
    tx.oncomplete=resolve;
  });
}

async function getAllFees(){
  var db=await openFeeDb();
  return new Promise((resolve)=>{
    var tx=db.transaction("fees","readonly");
    var req=tx.objectStore("fees").getAll();
    req.onsuccess=()=>resolve(req.result||[]);
  });
}

/* ---------- AUTO BILL NUMBER ---------- */
async function generateNextBillNo(){
  var all = await getAllFees();
  if(!all.length) return "BL0001";

  var nums = all
    .map(r=>r.billNo)
    .filter(b=>/^BL\d{4}$/.test(b))
    .map(b=>parseInt(b.substring(2)));

  if(!nums.length) return "BL0001";

  var next = Math.max(...nums)+1;
  return "BL"+String(next).padStart(4,"0");
}

/* ---------- TODAY DATE ---------- */
function setTodayPaymentDate(){
  var t=new Date();
  var y=t.getFullYear();
  var m=("0"+(t.getMonth()+1)).slice(-2);
  var d=("0"+t.getDate()).slice(-2);
  var iso=y+"-"+m+"-"+d;

  document.getElementById("payDate").value = iso;
  document.getElementById("payDateFancy").textContent = formatFancy(iso);
}

/* ---------- PAYMENT DATE CHANGE ---------- */
document.getElementById("payDate").addEventListener("change", function(){
  document.getElementById("payDateFancy").textContent = formatFancy(this.value);
});

/* ---------- TOTAL CALCULATION ---------- */
function calculateTotal(){
  function num(id){ return Number(document.getElementById(id).value||0); }

  var total=
    num("admissionAmount")+
    num("developmentAmount")+
    num("uniformSets")+
    num("tiffin")+
    num("misc")+
    num("picnic")+
    num("fieldtrip")+
    num("sports");

  document.getElementById("totalAmount").value = total;
  updateTotalInWords(total);
}

/* ---------- NUMBERS TO WORDS ---------- */
function numberToIndianWords(n){
  n=Math.round(Number(n)||0);
  if(n===0) return "zero rupees";

  var ones=[
    "","one","two","three","four","five","six","seven","eight","nine",
    "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen"
  ];
  var tens=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

  function two(n){
    if(n<20) return ones[n];
    return tens[Math.floor(n/10)] + (n%10?" "+ones[n%10]:"");
  }
  function three(n){
    return (n>=100? ones[Math.floor(n/100)]+" hundred ":"") +
      (n%100? two(n%100):"");
  }

  var parts=[];
  var crore=Math.floor(n/10000000); n%=10000000;
  var lakh=Math.floor(n/100000); n%=100000;
  var thousand=Math.floor(n/1000); n%=1000;

  if(crore) parts.push(three(crore)+" crore");
  if(lakh) parts.push(three(lakh)+" lakh");
  if(thousand) parts.push(three(thousand)+" thousand");
  if(n) parts.push(three(n));

  return parts.join(" ")+" rupees";
}

function updateTotalInWords(n){
  document.getElementById("totalInWords").textContent =
    n ? numberToIndianWords(n)+" only" : "";
}

/* ---------- COLLECT FORM ---------- */
function getFormData(){
  return {
    billNo:document.getElementById("billNo").value.trim(),
    studentId:document.getElementById("studentId").value.trim(),
    studentName:document.getElementById("studentName").value.trim(),
    className:document.getElementById("className").value.trim(),
    section:document.getElementById("section").value.trim(),
    roll:document.getElementById("roll").value.trim(),
    payDate:document.getElementById("payDate").value.trim(),
    payMonth:document.getElementById("feeMonth").value,
    payYear:document.getElementById("feeYear").value,
    admissionAmount:Number(document.getElementById("admissionAmount").value||0),
    developmentAmount:Number(document.getElementById("developmentAmount").value||0),
    uniformSets:Number(document.getElementById("uniformSets").value||0),
    tiffin:Number(document.getElementById("tiffin").value||0),
    misc:Number(document.getElementById("misc").value||0),
    picnic:Number(document.getElementById("picnic").value||0),
    fieldtrip:Number(document.getElementById("fieldtrip").value||0),
    sports:Number(document.getElementById("sports").value||0),
    paymentMode:document.getElementById("paymentMode").value,
    totalAmount:Number(document.getElementById("totalAmount").value||0)
  };
}

/* ---------- FILL FORM ---------- */
function fillForm(d){
  document.getElementById("billNo").value=d.billNo;
  document.getElementById("studentId").value=d.studentId;
  document.getElementById("studentName").value=d.studentName;
  document.getElementById("className").value=d.className;
  document.getElementById("section").value=d.section;
  document.getElementById("roll").value=d.roll;

  document.getElementById("payDate").value=d.payDate;
  document.getElementById("payDateFancy").textContent=formatFancy(d.payDate);

  document.getElementById("feeMonth").value=d.payMonth;
  document.getElementById("feeYear").value=d.payYear;

  document.getElementById("admissionAmount").value=d.admissionAmount;
  document.getElementById("developmentAmount").value=d.developmentAmount;
  document.getElementById("uniformSets").value=d.uniformSets;
  document.getElementById("tiffin").value=d.tiffin;
  document.getElementById("misc").value=d.misc;
  document.getElementById("picnic").value=d.picnic;
  document.getElementById("fieldtrip").value=d.fieldtrip;
  document.getElementById("sports").value=d.sports;
  document.getElementById("paymentMode").value=d.paymentMode;

  document.getElementById("totalAmount").value=d.totalAmount;
  updateTotalInWords(d.totalAmount);

  calculateTotal();
}

/* ---------- CLEAR FORM ---------- */
async function clearForm(){
  document.getElementById("feeForm").reset();
  document.getElementById("section").value="A";

  var newBill = await generateNextBillNo();
  document.getElementById("billNo").value=newBill;

  setTodayPaymentDate();
  calculateTotal();
}

/* ---------- INIT ---------- */
let currentIndex=-1;

(async function init(){
  await openFeeDb();
  document.getElementById("billNo").value = await generateNextBillNo();
  setTodayPaymentDate();
  calculateTotal();
  await refreshTable();
  setStatus("Ready");
})();

/* ============================================================
   BUTTONS
   ============================================================ */

/* ---------- SAVE ---------- */
document.getElementById("saveBtn").onclick = async ()=>{
  var rec = getFormData();

  if(!rec.studentId){
    alert("Student ID missing!");
    return;
  }
  if(!rec.payMonth || !rec.payYear){
    alert("Select Month & Year");
    return;
  }
  await saveFee(rec);
  alert("Saved bill "+rec.billNo);
  await clearForm();
  await refreshTable();
};

/* ---------- EDIT ---------- */
document.getElementById("editBtn").onclick = async ()=>{
  var b = prompt("Enter Bill No:");
  if(!b) return;

  var rec=await getFee(b);
  if(!rec){ alert("Bill not found!"); return; }

  fillForm(rec);

  var all=await getAllFees();
  all.sort((a,b)=>a.billNo.localeCompare(b.billNo));
  currentIndex=all.findIndex(r=>r.billNo===rec.billNo);

  await refreshStudentHistory(rec.studentId);
  setStatus("Loaded "+b);
};

/* ---------- DELETE ---------- */
document.getElementById("deleteBtn").onclick = async ()=>{
  var bill=document.getElementById("billNo").value.trim();
  if(!bill){ alert("No Bill"); return; }

  if(!confirm("Delete "+bill+"?")) return;

  await deleteFee(bill);
  alert("Deleted");
  await clearForm();
  await refreshTable();
};

/* ---------- SEARCH ---------- */
document.getElementById("searchBtn").onclick = async ()=>{
  var b=document.getElementById("searchBill").value.trim();
  if(!b) return;

  var rec=await getFee(b);
  if(!rec){ alert("Not found"); return; }

  fillForm(rec);

  var all=await getAllFees();
  all.sort((a,b)=>a.billNo.localeCompare(b.billNo));
  currentIndex=all.findIndex(r=>r.billNo===b);

  await refreshStudentHistory(rec.studentId);
  setStatus("Loaded "+b);
};

/* ---------- NEXT ---------- */
document.getElementById("nextBtn").onclick = async ()=>{
  var all=await getAllFees();
  all.sort((a,b)=>a.billNo.localeCompare(b.billNo));

  if(currentIndex<all.length-1){
    currentIndex++;
    fillForm(all[currentIndex]);
    await refreshStudentHistory(all[currentIndex].studentId);
  }else alert("Last record");
};

/* ---------- PREV ---------- */
document.getElementById("prevBtn").onclick = async ()=>{
  if(currentIndex>0){
    var all=await getAllFees();
    all.sort((a,b)=>a.billNo.localeCompare(b.billNo));

    currentIndex--;
    fillForm(all[currentIndex]);
    await refreshStudentHistory(all[currentIndex].studentId);
  }else alert("First record");
};

/* ---------- HOME ---------- */
document.getElementById("homeBtn").onclick = ()=>{
  location.href="index.html";
};

/* ---------- PRINT ---------- */
document.getElementById("printBtn").onclick = ()=>{
  var bill = document.getElementById("billNo").value.trim();
  if(!bill){
    alert("No Bill Selected");
    return;
  }
  window.location.href = "print_fee.html?bill="+bill;
};

/* ---------- CSV EXPORT ---------- */
document.getElementById("csvBtn").onclick = async ()=>{
  var all=await getAllFees();

  if(!all.length){
    alert("No records");
    return;
  }

  var headers=[
    "Bill","StudentID","Name","Class","Section","Roll",
    "Month","Year","Admission","Development","Uniform",
    "Tiffin","Misc","Picnic","FieldTrip","Sports",
    "Total","Mode","Date"
  ];

  var rows = all.map(r=>[
    r.billNo, r.studentId, r.studentName, r.className, r.section, r.roll,
    r.payMonth, r.payYear, r.admissionAmount, r.developmentAmount,
    r.uniformSets, r.tiffin, r.misc, r.picnic, r.fieldtrip,
    r.sports, r.totalAmount, r.paymentMode, r.payDate
  ]);

  var csv = headers.join(",")+"\n"+
            rows.map(row=>row.map(v=>`"${v||""}"`).join(",")).join("\n");

  var blob=new Blob([csv],{type:"text/csv"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="fee_records.csv";
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------- TABLE LIST ---------- */
async function refreshTable(){
  var all=await getAllFees();
  all.sort((a,b)=>a.billNo.localeCompare(b.billNo));

  var tbody=document.getElementById("feeTableBody");
  tbody.innerHTML="";

  var monthsFull=["January","February","March","April","May","June","July","August",
    "September","October","November","December"];

  all.forEach(r=>{
    var mName = r.payMonth ? monthsFull[parseInt(r.payMonth)-1] : "";

    var tr=document.createElement("tr");
    tr.innerHTML=
      "<td>"+r.billNo+"</td>"+
      "<td>"+r.studentId+"</td>"+
      "<td>"+r.studentName+"</td>"+
      "<td>"+r.className+"</td>"+
      "<td>"+mName+"</td>"+
      "<td>"+r.payYear+"</td>"+
      "<td>"+r.totalAmount+"</td>"+
      "<td>"+r.paymentMode+"</td>"+
      "<td><button class='small-btn sb-print' data-bill='"+r.billNo+"'>Print</button></td>"+
      "<td><button class='small-btn sb-edit' data-bill='"+r.billNo+"'>Edit</button></td>"+
      "<td><button class='small-btn sb-del' data-bill='"+r.billNo+"'>Del</button></td>";

    tbody.appendChild(tr);
  });
}

/* ---------- TABLE BUTTON ACTIONS ---------- */
document.getElementById("feeTableBody").addEventListener("click",async e=>{
  var btn=e.target;
  if(!(btn instanceof HTMLButtonElement)) return;

  var bill=btn.getAttribute("data-bill");
  if(!bill) return;

  var rec=await getFee(bill);
  if(!rec) return;

  if(btn.classList.contains("sb-print")){
    window.location.href="print_fee.html?bill="+bill;
  }
  else if(btn.classList.contains("sb-edit")){
    fillForm(rec);
    setStatus("Loaded "+bill+" for editing");
    await refreshStudentHistory(rec.studentId);
  }
  else if(btn.classList.contains("sb-del")){
    if(confirm("Delete "+bill+" ?")){
      await deleteFee(bill);
      await refreshTable();
      await refreshStudentHistory(rec.studentId);
    }
  }
});

/* ---------- STUDENT HISTORY TABLE ---------- */
async function refreshStudentHistory(studentId){
  var tbody=document.getElementById("studentHistoryBody");
  if(!tbody) return; // Optional

  tbody.innerHTML="";
  if(!studentId) return;

  var all=await getAllFees();
  var filtered=all.filter(r=>r.studentId===studentId);

  filtered.sort((a,b)=> (a.payDate||"").localeCompare(b.payDate||""));

  filtered.forEach(r=>{
    var tr=document.createElement("tr");
    tr.innerHTML=
      "<td>"+r.billNo+"</td>"+
      "<td>"+formatFancy(r.payDate)+"</td>"+
      "<td>"+r.totalAmount+"</td>"+
      "<td>"+r.paymentMode+"</td>";
    tbody.appendChild(tr);
  });
}
