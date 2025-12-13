
document.addEventListener("DOMContentLoaded", () => {

    // ---------- Load Student Count ----------
    loadIndexedDBCount("schoolDB_v1", "students", "studentCount");

    // ---------- Load Staff Count ----------
    loadIndexedDBCount("staffDB_v1", "staff", "staffCount");

    // ---------- Salary Load ----------
    loadSalary();

    // ---------- Income / Expense ----------
    loadIncomeExpense();

    // ---------- Fee Collection ----------
    loadFeeData();

    // ---------- Birthdays ----------
    loadBirthdays();
});


// ===== IndexedDB Counter =====
function loadIndexedDBCount(dbName, storeName, elementId){
    const req = indexedDB.open(dbName);
    req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
            document.getElementById(elementId).textContent = getAll.result.length;
        }
    }
}


// ===== Salary Loader =====
function loadSalary(){
    const req = indexedDB.open("salaryDB_v1");
    req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction("salary", "readonly");
        const store = tx.objectStore("salary");
        const all = store.getAll();
        all.onsuccess = () => {
            const list = document.getElementById("salaryList");
            let sum = 0;

            list.innerHTML = "";
            all.result.sort((a,b)=> (b.salaryDate||"").localeCompare(a.salaryDate||""));

            all.result.forEach(r=>{
                sum += Number(r.amount||0);
                let li = document.createElement("li");
                li.textContent = r.salaryBill + " — " + r.amount;
                list.appendChild(li);
            });

        }
    }
}


// ===== Income / Expense Loader =====
function loadIncomeExpense(){
    let incomes = 0, expenses = 0;

    // incomes
    ["extra_income_v1","business_income_v1","unified_investment_income_v1"].forEach(key=>{
        const v = JSON.parse(localStorage.getItem(key)||"[]");
        v.forEach(x=> incomes += Number(x.amount||0));
    });

    // expenses
    ["extra_expense_v1","business_expense_v1","unified_family_expense_v1"].forEach(key=>{
        const v = JSON.parse(localStorage.getItem(key)||"[]");
        v.forEach(x=> expenses += Number(x.amount||0));
    });

    document.getElementById("totalIncome").textContent = incomes;
    document.getElementById("totalExpense").textContent = expenses;
    document.getElementById("netProfit").textContent = incomes - expenses;
}


// ===== Fee Loader =====
function loadFeeData(){
    const req = indexedDB.open("feeDB_v1");
    req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction("fees", "readonly");
        const store = tx.objectStore("fees");
        const all = store.getAll();

        all.onsuccess = () => {
            let today=0, month=0, year=0;
            const now = new Date();
            const y = now.getFullYear();
            const m = ("0"+(now.getMonth()+1)).slice(-2);
            const d = ("0"+now.getDate()).slice(-2);

            all.result.forEach(r=>{
                if(!r.totalAmount) return;
                if(r.payDate === `${y}-${m}-${d}`) today += Number(r.totalAmount);
                if(r.payMonth === m && r.payYear == y) month += Number(r.totalAmount);
                if(r.payYear == y) year += Number(r.totalAmount);
            });

            document.getElementById("todayCollection").textContent = today;
            document.getElementById("monthCollection").textContent = month;
            document.getElementById("yearCollection").textContent = year;
        }
    }
}


// ===== Birthday Loader =====
function loadBirthdays(){
    const req = indexedDB.open("schoolDB_v1");
    req.onsuccess = e => {
        const db = e.target.result;
        const tx = db.transaction("students", "readonly");
        const store = tx.objectStore("students");
        const all = store.getAll();

        all.onsuccess = () => {
            const list = document.getElementById("birthdayList");
            list.innerHTML="";

            const today=new Date();
            const tMonth=today.getMonth()+1;
            const tDate=today.getDate();

            let upcoming = [];

            all.result.forEach(s=>{
                if(!s.dob) return;
                const [y,m,d]=s.dob.split("-");
                if(!m || !d) return;

                const date = new Date(today.getFullYear(), m-1, d);
                if(date >= today){
                    upcoming.push({name:s.studentName, date, show:`${d}/${m}`});
                }
            });

            upcoming.sort((a,b)=>a.date-b.date);
            upcoming.slice(0,5).forEach(u=>{
                let li=document.createElement("li");
                li.textContent = u.name + " — " + u.show;
                list.appendChild(li);
            });
        }
    }
}
