// src/hooks/useAccounts.js
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  createAccount  as _create,
  updateAccount  as _update,
  deleteAccount  as _delete,
} from "../firebase/firestoreService";

/**
 * Real-time accounts for the authenticated user.
 *
 * Returns:
 *   accounts   — live array from Firestore, sorted by created_at asc
 *   loading    — true until first snapshot arrives
 *   error      — string | null
 *   addAccount(data)              — create and return new id
 *   editAccount(id, data)         — rename / retype
 *   removeAccount(id)             — delete account + all its transactions
 */
export function useAccounts(userId) {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // ── Real-time listener ───────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, "accounts"),
      where("user_id", "==", userId),
      orderBy("created_at", "asc")
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      err => {
        console.error("[useAccounts]", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [userId]);

  // ── Mutations ────────────────────────────────────────────────
  const addAccount = useCallback(
    (data) => _create(userId, data),
    [userId]
  );

  const editAccount = useCallback(
    (accountId, data) => _update(accountId, data),
    []
  );

  const removeAccount = useCallback(
    (accountId) => _delete(userId, accountId),
    [userId]
  );

  return { accounts, loading, error, addAccount, editAccount, removeAccount };
}
