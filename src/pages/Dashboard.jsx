// src/pages/Dashboard.jsx
import { useState, useMemo } from "react";
import { useAuth }         from "../firebase/AuthContext";
import { useAccounts }     from "../hooks/useAccounts";
import { useTransactions } from "../hooks/useTransactions";
import { useSummary }      from "../hooks/useSummary";

const CATEGORIES = [
  "food", "transport", "shopping", "bills",
  "health", "salary", "entertainment", "other", "uncategorized",
];

const CAT_COLOR = {
  food:          { bg: "rgba(245,166,35,.15)",  text: "#f5a623" },
  transport:     { bg: "rgba(52,212,138,.15)",  text: "#34d48a" },
  shopping:      { bg: "rgba(79,125,255,.15)",  text: "#4f7dff" },
  bills:         { bg: "rgba(167,139,250,.15)", text: "#a78bfa" },
  health:        { bg: "rgba(255,90,114,.15)",  text: "#ff5a72" },
  salary:        { bg: "rgba(52,212,138,.2)",   text: "#34d48a" },
  entertainment: { bg: "rgba(251,191,36,.15)",  text: "#fbbf24" },
  other:         { bg: "rgba(107,115,148,.15)", text: "#6b7394" },
  uncategorized: { bg: "rgba(107,115,148,.1)",  text: "#6b7394" },
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  // ── Firestore state ──────────────────────────────────────────
  const { accounts, loading: acctLoading, addAccount, removeAccount } = useAccounts(user?.uid);

  const [txFilters, setTxFilters] = useState({});
  const {
    transactions,
    allTransactions,
    loading: txLoading,
    setCategory,
    markDuplicate,
    removeTransaction,
  } = useTransactions(user?.uid, txFilters);

  const summary = useSummary(allTransactions);

  // ── UI state ─────────────────────────────────────────────────
  const [page,        setPage]        = useState("dashboard");
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("all");
  const [showAddAcct, setShowAddAcct] = useState(false);
  const [newAcct,     setNewAcct]     = useState({ name: "", bankName: "", type: "savings" });
  const [acctSaving,  setAcctSaving]  = useState(false);
  const [editingCat,  setEditingCat]  = useState(null); // tx id whose category is being changed

  // Apply search + category filter through the hook filters
  const visibleTx = useMemo(() => {
    let list = transactions;
    if (catFilter !== "all") {
      if (catFilter === "income")    list = list.filter(t => t.amount > 0 && !t.is_transfer);
      else if (catFilter === "dupes") list = list.filter(t => t.is_duplicate);
      else                            list = list.filter(t => t.category === catFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.normalized_description || t.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, catFilter, search]);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleAddAccount(e) {
    e.preventDefault();
    if (!newAcct.name.trim()) return;
    setAcctSaving(true);
    try {
      await addAccount(newAcct);
      setNewAcct({ name: "", bankName: "", type: "savings" });
      setShowAddAcct(false);
    } finally {
      setAcctSaving(false);
    }
  }

  function fmt(n) {
    return "₹" + Math.abs(n).toLocaleString("en-IN");
  }

  const loading = acctLoading || txLoading;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <div style={s.topbar}>
        <div style={s.logo}><span style={s.dot} />fintrack</div>
        <div style={s.nav}>
          {["dashboard","transactions","accounts"].map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ ...s.navBtn, ...(page === p ? s.navBtnActive : {}) }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"12px", color:"#6b7394" }}>{user?.email}</span>
          <button onClick={logout} style={s.logoutBtn}>Sign out</button>
        </div>
      </div>

      <div style={s.body}>

        {/* ── DASHBOARD ─────────────────────────────────────── */}
        {page === "dashboard" && (
          <div>
            <div style={s.sectionLabel}>
              {new Date().toLocaleString("default", { month:"long", year:"numeric" })}
            </div>

            {loading ? <Skeleton rows={1} height={90} cols={4} /> : (
              <div style={s.metricGrid}>
                <MetricCard label="Net balance"   value={fmt(summary.netBalance)}   sub={`${summary.savingsRate}% savings rate`}  color="#4f7dff" />
                <MetricCard label="Total spend"   value={fmt(summary.totalSpend)}   sub={`${summary.txCount} transactions`}        color="#ff5a72" />
                <MetricCard label="Income"        value={fmt(summary.totalIncome)}  sub="this month"                               color="#34d48a" />
                <MetricCard label="Flags"
                  value={`${summary.dupeCount} dupes`}
                  sub={`${summary.transferCount} transfers excluded`}
                  color="#f5a623" />
              </div>
            )}

            {/* Category breakdown */}
            <div style={s.row}>
              <div style={s.card}>
                <div style={s.cardHeader}><span style={s.cardTitle}>Spending by category</span></div>
                {loading ? <Skeleton rows={5} height={14} /> : summary.byCategory.length === 0 ? (
                  <Empty text="No spend data yet. Import transactions to see breakdown." />
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    {summary.byCategory.slice(0,7).map(c => (
                      <div key={c.category} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <div style={{ width:"72px", fontSize:"11px", color:"#6b7394", textAlign:"right", flexShrink:0 }}>
                          {c.category}
                        </div>
                        <div style={{ flex:1, height:"6px", borderRadius:"3px", background:"#2a2f3e", overflow:"hidden" }}>
                          <div style={{ width:`${c.pct}%`, height:"100%", borderRadius:"3px", background: CAT_COLOR[c.category]?.text || "#6b7394" }} />
                        </div>
                        <div style={{ width:"60px", fontSize:"11px", color:"#6b7394", fontFamily:"'DM Mono',monospace" }}>
                          {fmt(c.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent transactions */}
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <span style={s.cardTitle}>Recent</span>
                  <button style={s.smallBtn} onClick={() => setPage("transactions")}>View all</button>
                </div>
                {loading ? <Skeleton rows={5} height={40} /> : allTransactions.length === 0 ? (
                  <Empty text="No transactions yet." />
                ) : (
                  allTransactions.slice(0, 6).map(t => (
                    <TxRow key={t.id} tx={t} onCatClick={() => setEditingCat(t.id)} />
                  ))
                )}
              </div>
            </div>

            {/* Insights */}
            {!loading && summary.dupeCount > 0 && (
              <div style={s.insightBanner}>
                <span style={{ fontSize:"16px" }}>⚠</span>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:500 }}>
                    {summary.dupeCount} duplicate transaction{summary.dupeCount > 1 ? "s" : ""} detected
                  </div>
                  <div style={{ fontSize:"12px", color:"#6b7394", marginTop:"2px" }}>
                    These are excluded from totals.{" "}
                    <button style={s.linkBtn} onClick={() => { setPage("transactions"); setCatFilter("dupes"); }}>
                      Review →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS ──────────────────────────────────── */}
        {page === "transactions" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <div style={s.sectionLabel} >All Transactions</div>
              <input
                style={s.searchInput}
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Filter chips */}
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
              {["all","income","food","transport","shopping","bills","health","dupes"].map(f => (
                <button key={f} onClick={() => setCatFilter(f)}
                  style={{ ...s.chip, ...(catFilter === f ? s.chipActive : {}) }}>
                  {f === "dupes" ? "⚠ Duplicates" : f}
                </button>
              ))}
            </div>

            <div style={s.card}>
              {txLoading ? <Skeleton rows={8} height={44} /> : visibleTx.length === 0 ? (
                <Empty text="No transactions match this filter." />
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Description","Date","Category","Account","Amount","Status",""].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTx.map(t => (
                      <tr key={t.id} style={{ borderBottom:"1px solid rgba(42,47,62,.5)" }}>
                        <td style={s.td}>{t.normalized_description || t.description}</td>
                        <td style={{ ...s.td, color:"#6b7394" }}>{t.date}</td>
                        <td style={s.td}>
                          {editingCat === t.id ? (
                            <select
                              autoFocus
                              defaultValue={t.category}
                              style={s.catSelect}
                              onBlur={() => setEditingCat(null)}
                              onChange={async e => {
                                await setCategory(t.id, e.target.value);
                                setEditingCat(null);
                              }}
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <span
                              style={{ ...s.tag, background: CAT_COLOR[t.category]?.bg, color: CAT_COLOR[t.category]?.text, cursor:"pointer" }}
                              title="Click to change category"
                              onClick={() => setEditingCat(t.id)}
                            >
                              {t.category || "uncategorized"}
                            </span>
                          )}
                        </td>
                        <td style={{ ...s.td, fontSize:"11px", color:"#6b7394" }}>
                          {accounts.find(a => a.id === t.account_id)?.name || t.account_id}
                        </td>
                        <td style={{ ...s.td, fontFamily:"'DM Mono',monospace", textAlign:"right",
                          color: t.amount > 0 ? "#34d48a" : "#ff5a72" }}>
                          {t.amount > 0 ? "+" : "–"}{fmt(t.amount)}
                        </td>
                        <td style={s.td}>
                          {t.is_duplicate
                            ? <span style={{ ...s.tag, background:"rgba(255,90,114,.12)", color:"#ff5a72" }}>duplicate</span>
                            : t.is_transfer
                            ? <span style={{ ...s.tag, background:"rgba(167,139,250,.12)", color:"#a78bfa" }}>transfer</span>
                            : <span style={{ ...s.tag, background:"rgba(52,212,138,.1)", color:"#34d48a" }}>ok</span>
                          }
                        </td>
                        <td style={s.td}>
                          <button
                            style={s.deleteBtn}
                            title="Delete"
                            onClick={() => removeTransaction(t.id)}
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── ACCOUNTS ──────────────────────────────────────── */}
        {page === "accounts" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <div style={s.sectionLabel}>Accounts</div>
              <button style={s.primaryBtn} onClick={() => setShowAddAcct(v => !v)}>
                {showAddAcct ? "Cancel" : "+ Add account"}
              </button>
            </div>

            {/* Add account form */}
            {showAddAcct && (
              <form onSubmit={handleAddAccount} style={{ ...s.card, marginBottom:"16px", display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={s.cardTitle}>New account</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                  <input style={s.input} placeholder="Account name (e.g. HDFC Savings)"
                    value={newAcct.name} onChange={e => setNewAcct(v => ({ ...v, name: e.target.value }))} required />
                  <input style={s.input} placeholder="Bank name"
                    value={newAcct.bankName} onChange={e => setNewAcct(v => ({ ...v, bankName: e.target.value }))} />
                  <select style={s.input} value={newAcct.type}
                    onChange={e => setNewAcct(v => ({ ...v, type: e.target.value }))}>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="credit">Credit card</option>
                    <option value="digital">Digital wallet</option>
                  </select>
                </div>
                <button type="submit" disabled={acctSaving} style={{ ...s.primaryBtn, alignSelf:"flex-start" }}>
                  {acctSaving ? "Saving…" : "Save account"}
                </button>
              </form>
            )}

            {acctLoading ? <Skeleton rows={3} height={80} /> : accounts.length === 0 ? (
              <Empty text="No accounts yet. Add one to start importing transactions." />
            ) : (
              accounts.map(a => {
                const acctSummary = summary.byAccount.find(b => b.account_id === a.id) || { income:0, spend:0, count:0 };
                return (
                  <div key={a.id} style={{ ...s.card, marginBottom:"12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                      <div style={s.acctIcon}>🏦</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:500, fontSize:"14px" }}>{a.name}</div>
                        <div style={{ fontSize:"12px", color:"#6b7394" }}>{a.bank_name} · {a.type}</div>
                      </div>
                      <button
                        style={{ ...s.deleteBtn, fontSize:"18px" }}
                        title="Delete account and all its transactions"
                        onClick={() => {
                          if (window.confirm(`Delete "${a.name}" and all its transactions?`))
                            removeAccount(a.id);
                        }}
                      >×</button>
                    </div>
                    <div style={{ display:"flex", gap:"24px" }}>
                      <Stat label="Income" value={fmt(acctSummary.income)} color="#34d48a" />
                      <Stat label="Spend"  value={fmt(acctSummary.spend)}  color="#ff5a72" />
                      <Stat label="Tx"     value={acctSummary.count}       color="#6b7394" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={s.metricCard}>
      <div style={{ fontSize:"10px", textTransform:"uppercase", letterSpacing:".6px", color:"#6b7394", marginBottom:"8px" }}>{label}</div>
      <div style={{ fontSize:"22px", fontWeight:600, fontFamily:"'DM Mono',monospace", color }}>{value}</div>
      <div style={{ fontSize:"11px", color:"#6b7394", marginTop:"4px" }}>{sub}</div>
    </div>
  );
}

function TxRow({ tx, onCatClick }) {
  const c = CAT_COLOR[tx.category] || CAT_COLOR.uncategorized;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 0", borderBottom:"1px solid #2a2f3e" }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:"13px", fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {tx.normalized_description || tx.description}
        </div>
        <div style={{ fontSize:"11px", color:"#6b7394", marginTop:"2px" }}>{tx.date}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"13px", color: tx.amount > 0 ? "#34d48a" : "#ff5a72" }}>
          {tx.amount > 0 ? "+" : "–"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
        </div>
        <span style={{ ...s.tag, background:c.bg, color:c.text, cursor:"pointer", marginTop:"3px" }} onClick={onCatClick}>
          {tx.category || "uncategorized"}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:"10px", textTransform:"uppercase", letterSpacing:".5px", color:"#6b7394" }}>{label}</div>
      <div style={{ fontSize:"15px", fontWeight:500, fontFamily:"'DM Mono',monospace", color, marginTop:"2px" }}>{value}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign:"center", padding:"32px 0", fontSize:"13px", color:"#6b7394" }}>{text}</div>;
}

function Skeleton({ rows = 3, height = 20, cols = 1 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:"10px" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} style={{
              height, borderRadius:"6px",
              background:"linear-gradient(90deg,#1e2230 25%,#2a2f3e 50%,#1e2230 75%)",
              backgroundSize:"200% 100%",
              animation:"shimmer 1.4s infinite",
            }} />
          ))}
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const s = {
  root:        { minHeight:"100vh", background:"#0d0f14", color:"#e8eaf2", fontFamily:"'DM Sans',sans-serif", fontSize:"14px" },
  topbar:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 24px", borderBottom:"1px solid #2a2f3e", background:"#161920" },
  logo:        { display:"flex", alignItems:"center", gap:"8px", fontWeight:600, fontSize:"15px", letterSpacing:"-0.3px" },
  dot:         { width:"8px", height:"8px", borderRadius:"50%", background:"#4f7dff", display:"inline-block" },
  nav:         { display:"flex", gap:"4px" },
  navBtn:      { padding:"6px 14px", borderRadius:"6px", border:"none", background:"none", color:"#6b7394", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:"13px" },
  navBtnActive:{ color:"#e8eaf2", background:"#1e2230" },
  logoutBtn:   { padding:"5px 12px", border:"1px solid #2a2f3e", borderRadius:"6px", background:"none", color:"#6b7394", cursor:"pointer", fontSize:"12px", fontFamily:"'DM Sans',sans-serif" },
  body:        { padding:"24px", maxWidth:"1100px", margin:"0 auto" },
  sectionLabel:{ fontSize:"11px", fontWeight:600, textTransform:"uppercase", letterSpacing:".7px", color:"#6b7394", marginBottom:"16px" },
  metricGrid:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"20px" },
  metricCard:  { background:"#1e2230", border:"1px solid #2a2f3e", borderRadius:"10px", padding:"16px" },
  row:         { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"20px" },
  card:        { background:"#1e2230", border:"1px solid #2a2f3e", borderRadius:"10px", padding:"16px" },
  cardHeader:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" },
  cardTitle:   { fontSize:"13px", fontWeight:500 },
  smallBtn:    { padding:"4px 10px", border:"1px solid #2a2f3e", borderRadius:"5px", background:"none", color:"#6b7394", cursor:"pointer", fontSize:"11px", fontFamily:"'DM Sans',sans-serif" },
  insightBanner: { background:"rgba(245,166,35,.08)", border:"1px solid rgba(245,166,35,.2)", borderRadius:"10px", padding:"14px 16px", display:"flex", gap:"12px", alignItems:"flex-start" },
  linkBtn:     { background:"none", border:"none", color:"#4f7dff", cursor:"pointer", fontSize:"12px", fontFamily:"'DM Sans',sans-serif", padding:0 },
  tag:         { fontSize:"10px", padding:"2px 7px", borderRadius:"4px", fontWeight:500, display:"inline-block" },
  chip:        { padding:"5px 12px", borderRadius:"20px", border:"1px solid #2a2f3e", background:"none", color:"#6b7394", cursor:"pointer", fontSize:"12px", fontFamily:"'DM Sans',sans-serif" },
  chipActive:  { background:"#4f7dff", borderColor:"#4f7dff", color:"#fff" },
  searchInput: { background:"#1e2230", border:"1px solid #2a2f3e", borderRadius:"7px", padding:"7px 12px", color:"#e8eaf2", fontSize:"13px", outline:"none", fontFamily:"'DM Sans',sans-serif", width:"200px" },
  table:       { width:"100%", borderCollapse:"collapse" },
  th:          { fontSize:"10px", textTransform:"uppercase", letterSpacing:".6px", color:"#6b7394", textAlign:"left", padding:"8px 12px", borderBottom:"1px solid #2a2f3e" },
  td:          { padding:"10px 12px", fontSize:"13px" },
  catSelect:   { background:"#161920", border:"1px solid #4f7dff", borderRadius:"5px", color:"#e8eaf2", fontSize:"12px", padding:"2px 6px", fontFamily:"'DM Sans',sans-serif" },
  deleteBtn:   { background:"none", border:"none", color:"#3d4460", cursor:"pointer", fontSize:"14px", padding:"2px 6px", lineHeight:1, borderRadius:"4px" },
  acctIcon:    { width:"36px", height:"36px", borderRadius:"8px", background:"rgba(79,125,255,.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" },
  input:       { background:"#0d0f14", border:"1px solid #2a2f3e", borderRadius:"8px", padding:"10px 12px", color:"#e8eaf2", fontSize:"13px", outline:"none", fontFamily:"'DM Sans',sans-serif", width:"100%", boxSizing:"border-box" },
  primaryBtn:  { padding:"9px 18px", background:"#4f7dff", border:"none", borderRadius:"8px", color:"#fff", fontSize:"13px", fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
};
