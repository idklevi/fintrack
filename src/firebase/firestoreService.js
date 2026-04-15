// src/firebase/firestoreService.js
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Accounts ──────────────────────────────────────────────

export async function createAccount(userId, { name, bankName, type }) {
  return addDoc(collection(db, "accounts"), {
    user_id: userId,
    name,
    bank_name: bankName,
    type,
    created_at: serverTimestamp(),
  });
}

export async function getAccounts(userId) {
  const q = query(
    collection(db, "accounts"),
    where("user_id", "==", userId),
    orderBy("created_at", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteAccount(accountId) {
  await deleteDoc(doc(db, "accounts", accountId));
}

// ─── Transactions ───────────────────────────────────────────

/**
 * Bulk-write transactions, skipping fingerprints already in Firestore.
 * Returns { inserted, skipped } counts.
 */
export async function saveTransactions(userId, transactions) {
  // Fetch existing fingerprints for this user
  const existingQ = query(
    collection(db, "transactions"),
    where("user_id", "==", userId)
  );
  const existingSnap = await getDocs(existingQ);
  const existingFingerprints = new Set(
    existingSnap.docs.map((d) => d.data().fingerprint).filter(Boolean)
  );

  const batch = writeBatch(db);
  let inserted = 0;
  let skipped = 0;

  for (const tx of transactions) {
    if (existingFingerprints.has(tx.fingerprint)) {
      skipped++;
      continue;
    }
    const ref = doc(collection(db, "transactions"));
    batch.set(ref, {
      user_id: userId,
      account_id: tx.account_id,
      amount: tx.amount,
      date: tx.date,
      description: tx.description,
      normalized_description: tx.normalized_description,
      category: tx.category || "uncategorized",
      is_duplicate: tx.is_duplicate ?? false,
      is_transfer: tx.is_transfer ?? false,
      fingerprint: tx.fingerprint,
      created_at: serverTimestamp(),
    });
    inserted++;
  }

  await batch.commit();
  return { inserted, skipped };
}

export async function getTransactions(userId, filters = {}) {
  let q = query(
    collection(db, "transactions"),
    where("user_id", "==", userId),
    orderBy("date", "desc")
  );

  if (filters.account_id) {
    q = query(q, where("account_id", "==", filters.account_id));
  }
  if (filters.category) {
    q = query(q, where("category", "==", filters.category));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateTransactionCategory(txId, category) {
  await updateDoc(doc(db, "transactions", txId), { category });
}

export async function deleteTransaction(txId) {
  await deleteDoc(doc(db, "transactions", txId));
}
