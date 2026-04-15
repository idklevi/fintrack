// src/firebase/firestoreService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────

/**
 * Create a new account for the authenticated user.
 * @param {string} userId
 * @param {{ name: string, bankName: string, type: string }} data
 */
export async function createAccount(userId, { name, bankName, type }) {
  const ref = await addDoc(collection(db, "accounts"), {
    user_id:    userId,
    name,
    bank_name:  bankName,
    type,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Rename an account. Only updates mutable fields.
 */
export async function updateAccount(accountId, { name, bankName, type }) {
  const updates = {};
  if (name !== undefined)     updates.name      = name;
  if (bankName !== undefined) updates.bank_name = bankName;
  if (type !== undefined)     updates.type      = type;
  await updateDoc(doc(db, "accounts", accountId), updates);
}

/**
 * Delete account and all its transactions atomically.
 * Firestore max batch size is 500 — chunks if needed.
 */
export async function deleteAccount(userId, accountId) {
  const txQ = query(
    collection(db, "transactions"),
    where("user_id",    "==", userId),
    where("account_id", "==", accountId)
  );
  const txSnap = await getDocs(txQ);
  const txRefs = txSnap.docs.map(d => d.ref);

  // Delete in chunks of 490 (leave headroom)
  const CHUNK = 490;
  for (let i = 0; i < txRefs.length; i += CHUNK) {
    const batch = writeBatch(db);
    txRefs.slice(i, i + CHUNK).forEach(r => batch.delete(r));
    await batch.commit();
  }

  await deleteDoc(doc(db, "accounts", accountId));
}

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS — bulk write (import pipeline)
// ─────────────────────────────────────────────────────────────

/**
 * Bulk-insert parsed transactions, skipping any whose fingerprint
 * already exists in Firestore (idempotent import).
 *
 * @param {string} userId
 * @param {Array<{
 *   account_id: string,
 *   amount: number,
 *   date: string,           // ISO "YYYY-MM-DD"
 *   description: string,
 *   normalized_description: string,
 *   category: string,
 *   is_duplicate: boolean,
 *   is_transfer: boolean,
 *   fingerprint: string,
 * }>} transactions
 * @returns {{ inserted: number, skipped: number }}
 */
export async function saveTransactions(userId, transactions) {
  // 1. Fetch the full fingerprint set for this user in one read.
  const existingQ = query(
    collection(db, "transactions"),
    where("user_id", "==", userId)
  );
  const existingSnap = await getDocs(existingQ);
  const seen = new Set(
    existingSnap.docs.map(d => d.data().fingerprint).filter(Boolean)
  );

  // 2. Batch-write unseen transactions (chunks of 490).
  const novel = transactions.filter(tx => !seen.has(tx.fingerprint));
  const CHUNK = 490;

  for (let i = 0; i < novel.length; i += CHUNK) {
    const batch = writeBatch(db);
    novel.slice(i, i + CHUNK).forEach(tx => {
      const ref = doc(collection(db, "transactions"));
      batch.set(ref, {
        user_id:                userId,
        account_id:             tx.account_id,
        amount:                 tx.amount,
        date:                   tx.date,           // stored as "YYYY-MM-DD" string
        description:            tx.description,
        normalized_description: tx.normalized_description,
        category:               tx.category || "uncategorized",
        is_duplicate:           tx.is_duplicate  ?? false,
        is_transfer:            tx.is_transfer   ?? false,
        fingerprint:            tx.fingerprint,
        created_at:             serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return { inserted: novel.length, skipped: transactions.length - novel.length };
}

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS — single-record mutations
// ─────────────────────────────────────────────────────────────

/**
 * Re-categorise a single transaction (called from the UI category picker).
 */
export async function updateTransactionCategory(txId, category) {
  await updateDoc(doc(db, "transactions", txId), { category });
}

/**
 * Mark/unmark a transaction as a duplicate.
 */
export async function setDuplicateFlag(txId, isDuplicate) {
  await updateDoc(doc(db, "transactions", txId), { is_duplicate: isDuplicate });
}

/**
 * Mark/unmark a transaction as an internal transfer.
 */
export async function setTransferFlag(txId, isTransfer) {
  await updateDoc(doc(db, "transactions", txId), { is_transfer: isTransfer });
}

/**
 * Hard-delete a single transaction.
 */
export async function deleteTransaction(txId) {
  await deleteDoc(doc(db, "transactions", txId));
}

/**
 * Bulk-delete transactions by id array.
 */
export async function deleteTransactions(txIds) {
  const CHUNK = 490;
  for (let i = 0; i < txIds.length; i += CHUNK) {
    const batch = writeBatch(db);
    txIds.slice(i, i + CHUNK).forEach(id => batch.delete(doc(db, "transactions", id)));
    await batch.commit();
  }
}
