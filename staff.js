/* =======================================
   DATE HELPERS
======================================= */
function ordinal(n){
  let s=["th","st","nd","rd"], v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}

function fancy(d){
  if(!d) return "";
  const [y,m,day] = d.split("-");
  const dt = new Date(y, m-1, day);
  const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${ordinal(dt.getDate())} ${mn[dt.getMonth()]}, ${dt.getFullYear()}`;
}

function today(){
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth()+1).padStart(2,"0");
  const d = String(t.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function status(msg){
  document.getElementById("statusText").textContent = msg;
}

/* =======================================
   PICTURE PREVIEW
======================================= */
let pic = "";

document.getElementById("staffPicture").addEventListener("change", function(){
  const f = this.files[0];
  if(!f) return;

  const r = new FileReader();
  r.onload = e => {
    pic = e.target.result;
    document.getElementById("preview").src = pic;
  };
  r.readAsDataURL(f);
});

/* =======================================
   INDEXEDDB SETUP
======================================= */
let db;
const DB = "staffDB_fullV1";

const req = indexedDB.open(DB, 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  if(!db.objectStoreNames.contains("staff")){
    db.createObjectStore("staff", { keyPath: "staffId" });
  }
};

req.onsuccess = e => {
  db = e.target.result;
  status("Ready");
  init();
};

req.onerror = () => alert("Database failed");

/* =======================================
   DB FUNCTIONS
======================================= */
function allStaff(){
  return new Promise(res => {
    const tx = db.transaction("staff","readonly");
    const st = tx.objectStore("staff");
    const q = st.getAll();
    q.onsuccess = () => res(q.result);
  });
}

async function nextId(){
  const arr = await allStaff();
  if(arr.length === 0) return "SF0001";

  arr.sort((a,b)=>a.staffId.localeCompare(b.staffId));
  const last = arr[arr.length-1].staffId;
  async function nextId(){
  const arr = await allStaff();
  if(arr.length === 0) return "SF0001";

  // filter only valid IDs
  let ids = arr
    .map(s => s.staffId)
    .filter(id => /^SF\d{4}$/.test(id));

  if(ids.length === 0) return "SF0001";

  // sort numerically
  ids.sort((a,b)=> parseInt(a.slice(2)) - parseInt(b.slice(2)));

  let last = ids[ids.length - 1];
  let num = parseInt(last.slice(2)) + 1;

  return "SF" + String(num).padStart(4,"0");
}


function saveStaff(rec){
  return new Promise(res=>{
    const tx = db.transaction("staff","readwrite");
    tx.objectStore("staff").put(rec);
    tx.oncomplete = res;
  });
}

function getStaff(id){
  return new Promise(res=>{
    const tx = db.transaction("staff","readonly");
    const q = tx.objectStore("staff").get(id);
    q.onsuccess = () => res(q.result || null);
  });
}

function deleteStaff(id){
  return new Promise(res=>{
    const tx = db.transaction("staff","readwrite");
    tx.objectStore("staff").delete(id);
    tx.oncomplete = res;
  });
}

/* =======================================
   FORM FUNCTIONS
======================================= */
async function clearForm(){
  document.getElementById("staffForm").reset();
  pic = "";
  document.getElementById("preview").src = "";

  document.getElementById("staffId").value = await nextId();
  document.getElementById("doj").value = today();
  document.getElementById("dojFancy").textContent = fancy(today());
}

function getForm(){
  return {
    staffId: staffId.value,
    staffName: staffName.value,
    dob: dob.value,
    dobFancy: fancy(dob.value),
    doj: doj.value,
    dojFancy: fancy(doj.value),
    category: category.value,
    qualification: qualification.value,
    experience: experience.value,
    salary: salary.value,
    father: father.value,
    mother: mother.value,
    contact: contact.value,
    email: email.value,
    address: address.value,
    picture: pic
  };
}

function fillForm(s){
  staffId.value = s.staffId;
  staffName.value = s.staffName;
  dob.value = s.dob;
  dobFancy.textContent = fancy(s.dob);
  doj.value = s.doj;
  dojFancy.textContent = fancy(s.doj);
  category.value = s.category;
  qualification.value = s.qualification;
  experience.value = s.experience;
  salary.value = s.salary;
  father.value = s.father;
  mother.value = s.mother;
  contact.value = s.contact;
  email.value = s.email;
  address.value = s.address;

  pic = s.picture;
  preview.src = pic;
}

/* =======================================
   LIST TABLE
======================================= */
async function refreshList(){
  const tbody = document.querySelector("#listTable tbody");
  tbody.innerHTML = "";

  const arr = await allStaff();
  arr.sort((a,b)=>a.staffId.localeCompare(b.staffId));

  arr.forEach(s=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.staffId}</td>
      <td>${s.staffName}</td>
      <td>${s.category}</td>
      <td>${s.contact}</td>
      <td>${s.address}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* =======================================
   INIT
======================================= */
async function init(){
  dobFancy.textContent = "";
  doj.value = today();
  dojFancy.textContent = fancy(today());
  staffId.value = await nextId();
  refreshList();
}

/* =======================================
   BUTTON ACTIONS
======================================= */
addBtn.onclick = async () => {
  const s = getForm();
  if(!s.staffName) return alert("Staff name required!");
  await saveStaff(s);
  alert("Saved!");
  await clearForm();
  refreshList();
};

editBtn.onclick = async () => {
  const id = prompt("Enter Staff ID:");
  if(!id) return;
  const s = await getStaff(id);
  if(!s) return alert("Not found!");
  fillForm(s);
};

deleteBtn.onclick = async () => {
  const id = staffId.value;
  if(!confirm("Delete " + id + "?")) return;
  await deleteStaff(id);
  alert("Deleted");
  await clearForm();
  refreshList();
};

searchBtn.onclick = async () => {
  const id = searchId.value;
  const s = await getStaff(id);
  if(!s) return alert("Not found!");
  fillForm(s);
};

nextBtn.onclick = async () => {
  const arr = await allStaff();
  arr.sort((a,b)=>a.staffId.localeCompare(b.staffId));

  let current = staffId.value;
  let index = arr.findIndex(x=>x.staffId===current);

  if(index < arr.length-1){
    fillForm(arr[index+1]);
  }
};

prevBtn.onclick = async () => {
  const arr = await allStaff();
  arr.sort((a,b)=>a.staffId.localeCompare(b.staffId));

  let current = staffId.value;
  let index = arr.findIndex(x=>x.staffId===current);

  if(index > 0){
    fillForm(arr[index-1]);
  }
};

csvBtn.onclick = () => {
  const s = getForm();

  const csv = 
`ID,NAME,DOB,DOJ,CATEGORY,QUALIFICATION,EXPERIENCE,SALARY,FATHER,MOTHER,CONTACT,EMAIL,ADDRESS
${s.staffId},"${s.staffName}",${s.dob},${s.doj},"${s.category}","${s.qualification}",${s.experience},${s.salary},"${s.father}","${s.mother}",${s.contact},"${s.email}","${s.address}"`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
  a.download = s.staffId + "_staff.csv";
  a.click();
};

printBtn.onclick = () => window.print();
