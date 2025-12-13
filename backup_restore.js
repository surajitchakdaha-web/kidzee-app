
// Full Backup + Merge Restore

import { getFirestore, doc, setDoc, getDoc } 
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

// Backup all localStorage keys
export async function backupAll(userEmail){
    let data = {};
    for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
    }
    await setDoc(doc(db, "backups", userEmail), data, {merge:true});
    alert("Backup completed!");
}

// Restore with merge logic
export async function restoreAll(userEmail){
    const snap = await getDoc(doc(db,"backups",userEmail));
    if(!snap.exists()){ alert("No backup found"); return; }
    const cloud = snap.data();
    for(const k in cloud){
        if(localStorage.getItem(k)==null){
            localStorage.setItem(k, cloud[k]);
        }
    }
    alert("Restore completed!");
}
