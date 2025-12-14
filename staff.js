/* ======================================================
   DATE HELPERS
====================================================== */
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
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
}

function status(msg){
  document.getElementById("statusText").textContent = msg;
}


/* ======================================================
   PHOTO PREVIEW
====================================================== */
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


/* ======================================================
   INDEXEDDB SETUP
====================================================== */
let db;
const req = indexedDB.open("staffDB_finalClean", 1);

req.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore("staff", { keyPath: "staffId" });
};

req.onsuccess = () => {
  db = req.result;
  init();
};


/* ======================================================
   DB FUNCTIONS
====================================================== */
function allStaff(){
  return new Promise(res=>{
    const tx = db.transaction("staff","readonly");
    const store = tx.objectStore("staff");
    const q = store.getAll();
    q.onsuccess = () => res(q.result);
  });
}

function saveStaff(s){
  return new Promise(res=>{
    const tx = db.transaction("staff","readwrite");
    tx.objectStore("staff").put(s);
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


/* ======================================================
   AUTO ID GENERATOR (NO DUPLICATE)
====================================================== */
async function nextId(){
  const arr = await allStaff();
  if(arr.length === 0) return "SF0001";

  // only valid records
  const ids = arr
    .map(r => r.staffId)
    .filter(id => /^SF\d{4}$/.test(id));

  if(ids.length === 0) return "SF0001";

  // numeric sort
  ids.sort((a,b)=> parseInt(a.slice(2)) - parseInt(b.slice(2)));

  const last = ids[ids.length - 1];
  const num = parseInt(last.slice(2)) + 1;

  return "SF" + String(num).padStart(4,"0");
}


/* ======================================================
   FORM FUNCTIONS
====================================================== */
async function clearForm(){
  document.getElementById("staffForm").reset();
  pic = "";
  document.getElementById("preview").src = "";

  document.getElementById("staffId").value = await nextId();
  document.getElementById("doj").value = today();
  document.getElementById("dojFancy").textContent = fancy(today());
  document.getElementById("dobFancy").textContent = "";
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
  dobFancy.textContent = s.dobFancy;
  doj.value = s.doj;
  dojFancy.textContent = s.dojFancy;
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


/* ======================================================
   TABLE REFRESH
====================================================== */
async function refreshList(){
  const tbody = document.querySelector("#listTable tbody");
  tbody.innerHTML = "";

  const arr = await allStaff();
  arr.sort((a,b)=> a.staffId.localeCompare(b.staffId));

  for(const s of arr){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.staffId}</td>
      <td>${s.staffName}</td>
      <td>${s.category}</td>
      <td>${s.contact}</td>
      <td>${s.address}</td>
    `;
    tbody.appendChild(tr);
  }
}


/* ======================================================
   INIT
====================================================== */
async function init(){
  document.getElementById("staffId").value = await nextId();
  document.getElementById("doj").value = today();
  document.getElementById("dojFancy").textContent = fancy(today());
  refreshList();
}


/* ======================================================
   BUTTON ACTIONS
====================================================== */

// SAVE
addBtn.onclick = async () => {
  const s = getForm();
  if(!s.staffName) return alert("Staff name required");

  await saveStaff(s);
  alert("Saved!");

  await clearForm();
  refreshList();
};

// EDIT
editBtn.onclick = async() => {
  const id = prompt("Enter Staff ID:");
  const s = await getStaff(id);
  if(!s) return alert("Not found");
  fillForm(s);
};

// DELETE
deleteBtn.onclick = async () => {
  const id = staffId.value;
  if(!confirm("Delete " + id + "?")) return;
  await deleteStaff(id);
  alert("Deleted");
  await clearForm();
  refreshList();
};

// SEARCH
searchBtn.onclick = async () => {
  const id = searchId.value;
  const s = await getStaff(id);
  if(!s) return alert("Not found");
  fillForm(s);
};

// NEXT
nextBtn.onclick = async () => {
  const arr = await allStaff();
  arr.sort((a,b)=> a.staffId.localeCompare(b.staffId));

  let i = arr.findIndex(x=> x.staffId === staffId.value);
  if(i < arr.length-1) fillForm(arr[i+1]);
};

// PREV
prevBtn.onclick = async () => {
  const arr = await allStaff();
  arr.sort((a,b)=> a.staffId.localeCompare(b.staffId));

  let i = arr.findIndex(x=> x.staffId === staffId.value);
  if(i > 0) fillForm(arr[i-1]);
};

// CSV
csvBtn.onclick = () => {
  const s = getForm();
  const csv =
`ID,NAME,DOB,DOJ,CATEGORY,QUALIFICATION,EXPERIENCE,SALARY,FATHER,MOTHER,CONTACT,EMAIL,ADDRESS
${s.staffId},"${s.staffName}",${s.dob},${s.doj},"${s.category}","${s.qualification}",${s.experience},${s.salary},"${s.father}","${s.mother}",${s.contact},"${s.email}","${s.address}"`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download = s.staffId + "_staff.csv";
  a.click();
};

// PRINT
printBtn.onclick = () => window.print();
