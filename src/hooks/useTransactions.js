// 
import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  updateTransactionCategory as _updateCategory,
  setDuplicateFlag          as _setDuplicate,
  setTransferFlag           as _setTransfer,
  deleteTransaction         as _delete,
  deleteTransactions        as _deleteBulk,
} from "../firebase/firestoreService";

/**
 * Real-time transactions for the authenticated user.
 *
 * `filters` (all optional, applied client-side to avoid composite index hell):
 *   accountId  — string
 *   category   — string
 *   search     — string (matches normalized_description or description)
 *   onlyDupes  — boolean
 *   onlyIncome — boolean
 *
 * Returns:
 *   transactions        — filtered, sorted array
 *   allTransactions     — unfiltered raw array (used by summary hooks)
 *   loading / error
 *   setCategory(id, cat)
 *   markDuplicate(id, bool)
 *   markTransfer(id, bool)
 *   removeTransaction(id)
 *   removeTransactions(ids[])
 */
export function useTransactions(userId, filters = {}) {
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // ── Real-time listener (base query: all user transactions) ───
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const q = query(
      collection(db, "transactions"),
      where("user_id", "==", userId),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setAll(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      err => {
        console.error("[useTransactions]", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [userId]);

  // ── Client-side filtering ────────────────────────────────────
  const transactions = useMemo(() => {
    let list = all;

    if (filters.accountId) {
      list = list.filter(t => t.account_id === filters.accountId);
    }
    if (filters.category && filters.category !== "all") {
      list = list.filter(t => t.category === filters.category);
    }
    if (filters.onlyDupes) {
      list = list.filter(t => t.is_duplicate);
    }
    if (filters.onlyIncome) {
      list = list.filter(t => t.amount > 0 && !t.is_transfer);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(t =>
        (t.normalized_description || t.description || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [all, filters.accountId, filters.category, filters.onlyDupes, filters.onlyIncome, filters.search]);

  // ── Mutations ────────────────────────────────────────────────
  const setCategory      = useCallback((id, cat)  => _updateCategory(id, cat),  []);
  const markDuplicate    = useCallback((id, bool)  => _setDuplicate(id, bool),   []);
  const markTransfer     = useCallback((id, bool)  => _setTransfer(id, bool),    []);
  const removeTransaction  = useCallback((id)      => _delete(id),               []);
  const removeTransactions = useCallback((ids)     => _deleteBulk(ids),          []);

  return {
    transactions,
    allTransactions: all,
    loading,
    error,
    setCategory,
    markDuplicate,
    markTransfer,
    removeTransaction,
    removeTransactions,
  };
}
