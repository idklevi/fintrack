// src/hooks/useSummary.js
import { useMemo } from "react";

/**
 * Derives all dashboard metrics from the raw transactions array.
 * Pure computation — no Firestore reads. Recomputes whenever `transactions` changes.
 *
 * @param {Array} transactions   — from useTransactions().allTransactions
 * @param {string} [month]       — "YYYY-MM" filter; defaults to current month
 *
 * @returns {{
 *   totalIncome:      number,
 *   totalSpend:       number,
 *   netBalance:       number,
 *   savingsRate:      number,   // 0–100
 *   txCount:          number,
 *   dupeCount:        number,
 *   transferCount:    number,
 *   byCategory:       Array<{ category, total, count, pct }>,
 *   byAccount:        Array<{ account_id, income, spend, count }>,
 *   dailySpend:       Array<{ date, spend }>,          // last 30 days
 * }}
 */
export function useSummary(transactions, month) {
  return useMemo(() => {
    const target = month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const inMonth = transactions.filter(t =>
      !t.is_transfer && t.date?.startsWith(target)
    );

    const income = inMonth
      .filter(t => t.amount > 0 && !t.is_duplicate)
      .reduce((s, t) => s + t.amount, 0);

    const spend = inMonth
      .filter(t => t.amount < 0 && !t.is_duplicate)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // ── By category ────────────────────────────────────────────
    const catMap = {};
    inMonth
      .filter(t => t.amount < 0 && !t.is_duplicate)
      .forEach(t => {
        const cat = t.category || "uncategorized";
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
        catMap[cat].total += Math.abs(t.amount);
        catMap[cat].count += 1;
      });

    const byCategory = Object.entries(catMap)
      .map(([category, v]) => ({
        category,
        total: v.total,
        count: v.count,
        pct:   spend > 0 ? Math.round((v.total / spend) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ── By account ─────────────────────────────────────────────
    const acctMap = {};
    inMonth
      .filter(t => !t.is_duplicate)
      .forEach(t => {
        const a = t.account_id;
        if (!acctMap[a]) acctMap[a] = { income: 0, spend: 0, count: 0 };
        if (t.amount > 0) acctMap[a].income += t.amount;
        else              acctMap[a].spend  += Math.abs(t.amount);
        acctMap[a].count += 1;
      });

    const byAccount = Object.entries(acctMap).map(([account_id, v]) => ({
      account_id, ...v,
    }));

    // ── Daily spend (last 30 days) ─────────────────────────────
    const dayMap = {};
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    transactions
      .filter(t => t.amount < 0 && !t.is_duplicate && !t.is_transfer)
      .filter(t => t.date && new Date(t.date) >= cutoff)
      .forEach(t => {
        const d = t.date.slice(0, 10);
        dayMap[d] = (dayMap[d] || 0) + Math.abs(t.amount);
      });

    const dailySpend = Object.entries(dayMap)
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalIncome:   income,
      totalSpend:    spend,
      netBalance:    income - spend,
      savingsRate:   income > 0 ? Math.round(((income - spend) / income) * 100) : 0,
      txCount:       inMonth.length,
      dupeCount:     transactions.filter(t => t.is_duplicate).length,
      transferCount: transactions.filter(t => t.is_transfer).length,
      byCategory,
      byAccount,
      dailySpend,
    };
  }, [transactions, month]);
}
