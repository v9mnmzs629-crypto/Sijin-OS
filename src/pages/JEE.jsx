import { useState, useEffect } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SUBJECTS = {
  Maths: { label: "Maths", icon: "∑", theme: "theme-maths", accent: "#0ea5e9", bg: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(3,105,161,0.04))", border: "rgba(14,165,233,0.2)" },
  Chemistry: { label: "Chemistry", icon: "⚗", theme: "theme-chemistry", accent: "#10b981", bg: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))", border: "rgba(16,185,129,0.2)" },
  Physics: { label: "Physics", icon: "⚡", theme: "theme-physics", accent: "#a855f7", bg: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04))", border: "rgba(168,85,247,0.2)" },
};

// ---- Schedule settings (edit here to tune) ----
const DIFFS = {
  easy: { label: "Easy", color: "#10b981", days: [7, 30, 75] },
  medium: { label: "Medium", color: "#f59e0b", days: [4, 18, 49] },
  hard: { label: "Hard", color: "#f97316", days: [2, 8, 24] },
  vhard: { label: "Very hard", color: "#ef4444", days: [1, 4, 10] },
};
const RANK = { easy: 0, medium: 1, hard: 2, vhard: 3 };
const LEARN_SLOTS = [0, 1, 1, 0, 1, 2, 1]; // Sun..Sat (Mon/Tue/Thu = half module, Fri = 2 backlogs, Sat = up to 1)
const REV_SLOTS = [2, 0, 0, 3, 2, 0, 0];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const RECENT_DAYS = 14, MEDIUM_DAYS = 42;
const SET = "jee_tracker";

// ---- Dates (UAE time) ----
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" }).format(new Date());
const ms = s => Date.parse(s + "T00:00:00Z");
const addDays = (s, n) => new Date(ms(s) + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((ms(b) - ms(a)) / 864e5);
const dow = s => new Date(ms(s)).getUTCDay();
const nice = s => s ? new Date(ms(s)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "-";

const behindOf = t => Math.max(0, (t.taught || 0) - (t.studied || 0));
const oldestUnstudied = t => (t.taughtDates || [])[t.studied || 0];
const ageOf = (t, today) => {
  const d = daysBetween(t.taughtDate || oldestUnstudied(t) || today, today);
  return d < RECENT_DAYS ? "recent" : d < MEDIUM_DAYS ? "medium" : "old";
};
const AGE_RANK = { recent: 0, medium: 1, old: 2 };
const AGE_COLOR = { recent: "#60a5fa", medium: "#f59e0b", old: "#ef4444" };

function Tag({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color, padding: "2px 8px", borderRadius: 99, fontSize: 10,
      fontWeight: 600, fontFamily: "Syne", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em"
    }}>{label}</span>
  );
}

const F = ({ l, children }) => (
  <div>
    <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{l}</label>
    {children}
  </div>
);

const Modal = ({ title, accent, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
      <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, marginBottom: 20, color: accent }}>{title}</h3>
      {children}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label, accent }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontFamily: "DM Mono", fontSize: 12 }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
        <p style={{ color: accent, fontWeight: 600 }}>{payload[0].value} / 240</p>
      </div>
    );
  }
  return null;
};

export default function JEE({ userId, fabTrigger }) {
  const raw = useFirestore(userId);
  const guard = f => async (...a) => {
    try { return await f(...a); }
    catch (e) { alert("Could not save: " + (e.code || e.message)); throw e; }
  };
  const fs = { ...raw, addItem: guard(raw.addItem), updateItem: guard(raw.updateItem), deleteItem: guard(raw.deleteItem) };
  const today = todayStr();
  const [activeSubject, setActiveSubject] = useState("Maths");
  const [items, setItems] = useState([]);
  const [scores, setScores] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [log, setLog] = useState(null);
  const [pick, setPick] = useState(null);
  const [edit, setEdit] = useState(null);
  const [showAddScore, setShowAddScore] = useState(false);
  const [newScore, setNewScore] = useState({ exam: "", marks: "" });

  const subj = SUBJECTS[activeSubject];
  const blankLog = (mode = "module") => ({ mode, name: "", subject: activeSubject, chapter: "", state: "done", difficulty: "medium", date: today, total: 6, taught: 1, studied: 0 });

  useEffect(() => { if (fabTrigger > 0) setLog(blankLog()); }, [fabTrigger]);

  useEffect(() => {
    const u1 = fs.watchCollection(SET, setItems);
    const us = Object.keys(SUBJECTS).map(s =>
      fs.watchCollection(`jee_scores_${s}`, data =>
        setScores(p => ({ ...p, [s]: data.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")) }))
      )
    );
    return () => { u1(); us.forEach(u => u()); };
  }, [userId]);

  // ---- Queues ----
  const ongoing = items.filter(t => t.status === "ongoing").sort((a, b) => (a.startedDate || "").localeCompare(b.startedDate || ""));
  const backlogs = items.filter(t => t.status === "backlog")
    .sort((a, b) => (b.taughtDate || "").localeCompare(a.taughtDate || ""));
  const openAll = items.filter(t => t.status === "open");
  const openBehind = openAll.filter(t => behindOf(t) > 0).sort((a, b) => (oldestUnstudied(a) || "9").localeCompare(oldestUnstudied(b) || "9"));
  const openOk = openAll.filter(t => behindOf(t) === 0);
  const learnQ = [...openBehind, ...ongoing, ...backlogs];
  const statusOf = k => {
    const b = openAll.filter(t => t.subject === k).reduce((n, t) => n + behindOf(t), 0);
    const bl = items.filter(t => t.subject === k && t.status === "backlog").length;
    return (b ? `${b} behind` : "up to date") + (bl ? ` +${bl} backlog` : "");
  };
  const revQ = items.filter(t => t.status === "active" && t.nextDue && t.nextDue <= today)
    .sort((a, b) => RANK[b.difficulty] - RANK[a.difficulty] || a.nextDue.localeCompare(b.nextDue));
  const d = dow(today);
  const recLearn = learnQ.slice(0, LEARN_SLOTS[d]);
  const recRev = revQ.slice(0, REV_SLOTS[d]);
  const restLearn = learnQ.slice(LEARN_SLOTS[d]);
  const restRev = revQ.slice(REV_SLOTS[d]);
  const upcoming = items.filter(t => t.status === "active" && t.nextDue > today).sort((a, b) => a.nextDue.localeCompare(b.nextDue));

  // ---- Actions ----
  const submitLog = async () => {
    if (!log.name.trim()) return;
    const base = { name: log.name.trim(), subject: log.subject, chapter: log.chapter.trim(), notes: "" };
    if (log.mode === "module") {
      const tg = Math.max(0, Number(log.taught) || 0), st = Math.min(tg, Math.max(0, Number(log.studied) || 0));
      await fs.addItem(SET, { ...base, status: "open", total: Math.max(1, Number(log.total) || 6), taught: tg, studied: st, taughtDates: Array(tg).fill(log.date) });
    } else if (log.mode === "backlog") await fs.addItem(SET, { ...base, status: "backlog", taughtDate: log.date });
    else if (log.state === "ongoing") await fs.addItem(SET, { ...base, status: "ongoing", startedDate: log.date });
    else await fs.addItem(SET, { ...base, status: "active", difficulty: log.difficulty, stage: 0, lastDone: log.date, nextDue: addDays(log.date, DIFFS[log.difficulty].days[0]), history: [] });
    setLog(null);
  };

  const applyPick = async diff => {
    const { t, kind } = pick;
    if (kind === "revise") {
      const stage = RANK[diff] > RANK[t.difficulty] ? 0 : (t.stage || 0) + 1;
      await fs.updateItem(SET, t.id, {
        difficulty: diff, stage, lastDone: today,
        nextDue: addDays(today, DIFFS[diff].days[Math.min(stage, 2)]),
        history: [...(t.history || []), { date: today, difficulty: diff }],
      });
    } else {
      await fs.updateItem(SET, t.id, { status: "active", difficulty: diff, stage: 0, lastDone: today, nextDue: addDays(today, DIFFS[diff].days[0]), history: [] });
    }
    setPick(null);
  };

  const startBacklog = t => fs.updateItem(SET, t.id, { status: "ongoing", startedDate: today });
  const addTaught = t => fs.updateItem(SET, t.id, { taught: (t.taught || 0) + 1, taughtDates: [...(t.taughtDates || []), today] });
  const addStudied = t => {
    const st = (t.studied || 0) + 1, upd = { studied: st };
    if (st > (t.taught || 0)) { upd.taught = st; upd.taughtDates = [...(t.taughtDates || []), today]; }
    return fs.updateItem(SET, t.id, upd);
  };

  const saveEdit = async () => {
    const t = edit;
    const upd = { name: t.name, chapter: t.chapter || "", notes: t.notes || "" };
    if (t.status === "open") {
      const tg = Math.max(0, Number(t.taught) || 0), dates = (t.taughtDates || []).slice(0, tg);
      while (dates.length < tg) dates.push(today);
      Object.assign(upd, { total: Math.max(1, Number(t.total) || 6), taught: tg, studied: Math.min(tg, Math.max(0, Number(t.studied) || 0)), taughtDates: dates });
    }
    if (t.status === "active") {
      upd.difficulty = t.difficulty;
      upd.nextDue = addDays(t.lastDone, DIFFS[t.difficulty].days[Math.min(t.stage || 0, 2)]);
    }
    await fs.updateItem(SET, t.id, upd);
    setEdit(null);
  };

  const addScore = async () => {
    if (!newScore.exam.trim() || !newScore.marks) return;
    await fs.addItem(`jee_scores_${activeSubject}`, { ...newScore, marks: Number(newScore.marks) });
    setNewScore({ exam: "", marks: "" });
    setShowAddScore(false);
  };

  // ---- Row ----
  const Row = ({ t, kind }) => {
    const s = SUBJECTS[t.subject] || subj;
    const late = kind === "revise" ? daysBetween(t.nextDue, today) : 0;
    const btn = { fontSize: 11, padding: "4px 10px" };
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 140, cursor: "pointer" }} onClick={() => setEdit({ ...t })}>
          <div style={{ fontFamily: "DM Mono", fontSize: 13, color: "var(--text-primary)" }}>{t.name}</div>
          <div style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            {t.subject}{t.chapter ? ` / ${t.chapter}` : ""}
            {kind === "backlog" && ` / taught ${nice(t.taughtDate)}`}
            {kind === "ongoing" && ` / started ${nice(t.startedDate)}`}
            {kind === "open" && ` / ${t.studied || 0} of ${t.total || "?"} studied, ${behindOf(t) ? `${behindOf(t)} behind` : "up to date"}`}
            {kind === "revise" && ` / ${late > 0 ? `${late}d overdue` : "due today"}`}
          </div>
        </div>
        {kind === "backlog" && <Tag label={`${ageOf(t, today)} backlog`} color={AGE_COLOR[ageOf(t, today)]} />}
        {kind === "ongoing" && <Tag label="ongoing" color="#f59e0b" />}
        {kind === "open" && (behindOf(t) ? <Tag label={`${ageOf(t, today)} / ${behindOf(t)} behind`} color={AGE_COLOR[ageOf(t, today)]} /> : <Tag label="up to date" color="#10b981" />)}
        {kind === "revise" && <Tag label={DIFFS[t.difficulty].label} color={DIFFS[t.difficulty].color} />}
        <div style={{ display: "flex", gap: 6 }}>
          {kind === "backlog" && <button className="btn btn-ghost" style={btn} onClick={() => startBacklog(t)}>Start</button>}
          {kind === "backlog" && <button className="btn btn-primary" style={{ ...btn, background: s.accent }} onClick={() => setPick({ t, kind: "clear" })}>Clear</button>}
          {kind === "ongoing" && <button className="btn btn-primary" style={{ ...btn, background: s.accent }} onClick={() => setPick({ t, kind: "finish" })}>Finish</button>}
          {kind === "open" && <button className="btn btn-ghost" style={btn} onClick={() => addTaught(t)}>+ Taught</button>}
          {kind === "open" && behindOf(t) > 0 && <button className="btn btn-primary" style={{ ...btn, background: s.accent }} onClick={() => addStudied(t)}>+ Studied</button>}
          {kind === "open" && <button className="btn btn-ghost" style={btn} onClick={() => setPick({ t, kind: "finish" })}>Finish</button>}
          {kind === "revise" && <button className="btn btn-primary" style={{ ...btn, background: s.accent }} onClick={() => setPick({ t, kind: "revise" })}>Revise</button>}
        </div>
      </div>
    );
  };
  const kindOf = t => (t.status === "open" ? "open" : t.status === "ongoing" ? "ongoing" : "backlog");
  const Empty = ({ text }) => <div style={{ padding: "16px", fontFamily: "DM Mono", fontSize: 12, color: "var(--text-muted)" }}>{text}</div>;
  const Label = ({ children }) => <div style={{ padding: "10px 16px 6px", fontFamily: "Syne", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{children}</div>;

  const tableItems = items.filter(t => t.subject === activeSubject).sort((a, b) => {
    const o = { open: 0, ongoing: 0, backlog: 1, active: 2 };
    return o[a.status] - o[b.status] || (a.nextDue || "").localeCompare(b.nextDue || "");
  });
  const chartData = (scores[activeSubject] || []).map(s => ({ name: s.exam, marks: s.marks }));
  const currentScores = scores[activeSubject] || [];
  const recTotal = recLearn.length + recRev.length;

  return (
    <div className={subj.theme} style={{ paddingBottom: 100, transition: "all 0.3s ease" }}>
      <div style={{ padding: "28px 16px 0", marginBottom: 24 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 12, fontFamily: "DM Mono", marginBottom: 4 }}>jee prep</p>
        <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>JEE Tracker</h1>
      </div>

      {/* Today */}
      <div style={{ padding: "0 16px", marginBottom: 24 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <h2 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700 }}>{DAYS[d]}</h2>
              <p style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                {LEARN_SLOTS[d] ? `${d === 5 ? "2 backlogs" : d === 6 ? "up to 1 module" : "half a module"}` : "no new learning"}
                {" / "}{REV_SLOTS[d] ? `${REV_SLOTS[d]} revisions` : "no revisions"} recommended
              </p>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setLog(blankLog())}>+ Log</button>
          </div>

          <Label>LEARN</Label>
          {recLearn.length === 0 && <Empty text={LEARN_SLOTS[d] ? "Nothing queued. Log a backlog or a new topic." : "No new learning planned today."} />}
          {recLearn.map(t => <Row key={t.id} t={t} kind={kindOf(t)} />)}

          {openOk.length > 0 && <Label>IN PROGRESS (UP TO DATE)</Label>}
          {openOk.map(t => <Row key={t.id} t={t} kind="open" />)}

          <Label>REVISE</Label>
          {recRev.length === 0 && <Empty text={REV_SLOTS[d] ? "Nothing due. You're clear." : "No revision day today."} />}
          {recRev.map(t => <Row key={t.id} t={t} kind="revise" />)}

          <button onClick={() => setShowAll(v => !v)} style={{
            width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--border)",
            color: "var(--text-secondary)", fontFamily: "Syne", fontSize: 12, fontWeight: 600, padding: 12, cursor: "pointer"
          }}>
            {showAll ? "Hide the rest" : `Show everything else (${restLearn.length + restRev.length + upcoming.length})`}
          </button>

          {showAll && (
            <div>
              {restLearn.length > 0 && <Label>MORE TO LEARN</Label>}
              {restLearn.map(t => <Row key={t.id} t={t} kind={kindOf(t)} />)}
              {restRev.length > 0 && <Label>MORE DUE</Label>}
              {restRev.map(t => <Row key={t.id} t={t} kind="revise" />)}
              {upcoming.length > 0 && <Label>COMING UP (revise early if you want)</Label>}
              {upcoming.slice(0, 15).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, fontFamily: "DM Mono", fontSize: 12 }}>{t.name} <span style={{ color: "var(--text-secondary)" }}>/ {nice(t.nextDue)}</span></div>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setPick({ t, kind: "revise" })}>Revise</button>
                </div>
              ))}
            </div>
          )}
          {recTotal === 0 && !showAll && learnQ.length + revQ.length === 0 && <Empty text="All caught up." />}
        </div>
      </div>

      {/* Subject Switcher */}
      <div style={{ padding: "0 16px", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, padding: 6, background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)" }}>
          {Object.entries(SUBJECTS).map(([key, s]) => (
            <button key={key} onClick={() => setActiveSubject(key)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "Syne", fontWeight: 700, fontSize: 13, transition: "all 0.25s ease",
              background: activeSubject === key ? s.bg : "transparent",
              color: activeSubject === key ? s.accent : "var(--text-secondary)",
              boxShadow: activeSubject === key ? `0 0 0 1px ${s.border}, 0 4px 12px rgba(0,0,0,0.2)` : "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2
            }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 11 }}>{s.label}</span>
              <span style={{ fontSize: 9, opacity: 0.8, fontFamily: "DM Mono", fontWeight: 400 }}>{statusOf(key)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic table */}
      <div style={{ padding: "0 16px", marginBottom: 24 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: subj.border }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700, color: subj.accent }}>{activeSubject} Topics</h2>
            <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)" }}>{tableItems.length} total</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Topic</th><th>Level</th><th>Next</th><th>Revs</th></tr></thead>
              <tbody>
                {tableItems.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No topics yet. Log your first one.</td></tr>
                )}
                {tableItems.map(t => {
                  const over = t.status === "active" && t.nextDue <= today;
                  return (
                    <tr key={t.id} onClick={() => setEdit({ ...t })} style={{ cursor: "pointer" }}>
                      <td style={{ fontFamily: "DM Mono", fontWeight: 500, minWidth: 130 }}>
                        {t.name}
                        {t.chapter && <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.chapter}</div>}
                      </td>
                      <td>
                        {t.status === "active" && <Tag label={DIFFS[t.difficulty].label} color={DIFFS[t.difficulty].color} />}
                        {t.status === "ongoing" && <Tag label="ongoing" color="#f59e0b" />}
                        {t.status === "open" && <Tag label={`${t.studied || 0}/${t.total || "?"} studied`} color={behindOf(t) ? "#f59e0b" : "#10b981"} />}
                        {t.status === "backlog" && <Tag label={`${ageOf(t, today)} backlog`} color={AGE_COLOR[ageOf(t, today)]} />}
                      </td>
                      <td style={{ fontFamily: "DM Mono", fontSize: 11, color: over ? "#ef4444" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {t.status === "active" ? nice(t.nextDue) : "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ background: `${subj.accent}20`, color: subj.accent, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontFamily: "Syne", fontWeight: 700 }}>
                          {(t.history || []).length}×
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Exam progress */}
      <div style={{ padding: "0 16px" }}>
        <div className="card" style={{ padding: 20, borderColor: subj.border }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "Syne", fontSize: 15, fontWeight: 700, color: subj.accent, marginBottom: 2 }}>Exam Progress</h2>
              <p style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)" }}>Out of 240 marks</p>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: "4px 10px", background: subj.accent }} onClick={() => setShowAddScore(true)}>+ Add Score</button>
          </div>
          {chartData.length === 0 ? (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "DM Mono", fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8 }}>
              No scores yet. Add your first exam result!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "DM Mono" }} />
                <YAxis domain={[0, 240]} tick={{ fill: "var(--text-secondary)", fontSize: 10, fontFamily: "DM Mono" }} />
                <Tooltip content={<CustomTooltip accent={subj.accent} />} />
                <Line type="monotone" dataKey="marks" stroke={subj.accent} strokeWidth={2.5} dot={{ fill: subj.accent, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: subj.accent }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {currentScores.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {currentScores.map(s => (
                <div key={s.id} style={{ background: `${subj.accent}10`, border: `1px solid ${subj.border}`, borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)" }}>{s.exam}</span>
                  <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 13, color: subj.accent }}>{s.marks}</span>
                  <button onClick={() => fs.deleteItem(`jee_scores_${activeSubject}`, s.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log modal */}
      {log && (
        <Modal title="Log" accent={subj.accent} onClose={() => setLog(null)}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[["module", "Module"], ["topic", "Topic"], ["backlog", "Backlog"]].map(([m, l]) => (
              <button key={m} className="btn" onClick={() => setLog(p => ({ ...p, mode: m }))} style={{
                flex: 1, background: log.mode === m ? subj.accent : "transparent", color: log.mode === m ? "white" : "var(--text-secondary)", border: "1px solid var(--border)"
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <F l="TOPIC NAME"><input className="input" placeholder="e.g. Integration" value={log.name} onChange={e => setLog(p => ({ ...p, name: e.target.value }))} autoFocus /></F>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <F l="SUBJECT">
                <select className="input" value={log.subject} onChange={e => setLog(p => ({ ...p, subject: e.target.value }))}>
                  {Object.keys(SUBJECTS).map(s => <option key={s}>{s}</option>)}
                </select>
              </F>
              <F l="CHAPTER"><input className="input" placeholder="optional" value={log.chapter} onChange={e => setLog(p => ({ ...p, chapter: e.target.value }))} /></F>
            </div>
            {log.mode === "module" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <F l="TOTAL CLASSES"><input className="input" type="number" min="1" value={log.total} onChange={e => setLog(p => ({ ...p, total: e.target.value }))} /></F>
                <F l="TAUGHT"><input className="input" type="number" min="0" value={log.taught} onChange={e => setLog(p => ({ ...p, taught: e.target.value }))} /></F>
                <F l="STUDIED"><input className="input" type="number" min="0" value={log.studied} onChange={e => setLog(p => ({ ...p, studied: e.target.value }))} /></F>
              </div>
            )}
            {log.mode === "topic" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <F l="PROGRESS">
                  <select className="input" value={log.state} onChange={e => setLog(p => ({ ...p, state: e.target.value }))}>
                    <option value="done">Done</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </F>
                {log.state === "done" && (
                  <F l="DIFFICULTY">
                    <select className="input" value={log.difficulty} onChange={e => setLog(p => ({ ...p, difficulty: e.target.value }))}>
                      {Object.entries(DIFFS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </F>
                )}
              </div>
            )}
            <F l={log.mode === "backlog" ? "TAUGHT IN CLASS ON" : log.mode === "module" ? "CLASSES TAUGHT ON" : "DATE STUDIED"}>
              <input className="input" type="date" value={log.date} max={today} onChange={e => setLog(p => ({ ...p, date: e.target.value }))} />
            </F>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setLog(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: subj.accent }} onClick={submitLog}>{log.mode === "backlog" ? "Log backlog" : log.mode === "module" ? "Log module" : "Log topic"}</button>
          </div>
        </Modal>
      )}

      {/* Difficulty picker */}
      {pick && (
        <Modal title={pick.kind === "revise" ? "How did it feel?" : "Set difficulty"} accent={subj.accent} onClose={() => setPick(null)}>
          <p style={{ fontFamily: "DM Mono", fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
            {pick.t.name}. {pick.kind === "revise" ? "Pick the level it is at now." : "Day 1 of revision starts today."}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(DIFFS).map(([k, v]) => (
              <button key={k} className="btn" onClick={() => applyPick(k)} style={{
                background: `${v.color}18`, color: v.color, border: `1px solid ${v.color}55`, padding: "14px 8px",
                outline: pick.t.difficulty === k ? `2px solid ${v.color}` : "none"
              }}>{v.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setPick(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {edit && (
        <Modal title="Edit Topic" accent={subj.accent} onClose={() => setEdit(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <F l="TOPIC NAME"><input className="input" value={edit.name} onChange={e => setEdit(p => ({ ...p, name: e.target.value }))} /></F>
            <F l="CHAPTER"><input className="input" value={edit.chapter || ""} onChange={e => setEdit(p => ({ ...p, chapter: e.target.value }))} /></F>
            {edit.status === "active" && (
              <F l="DIFFICULTY">
                <select className="input" value={edit.difficulty} onChange={e => setEdit(p => ({ ...p, difficulty: e.target.value }))}>
                  {Object.entries(DIFFS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </F>
            )}
            {edit.status === "open" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <F l="TOTAL"><input className="input" type="number" min="1" value={edit.total || ""} onChange={e => setEdit(p => ({ ...p, total: e.target.value }))} /></F>
                <F l="TAUGHT"><input className="input" type="number" min="0" value={edit.taught ?? 0} onChange={e => setEdit(p => ({ ...p, taught: e.target.value }))} /></F>
                <F l="STUDIED"><input className="input" type="number" min="0" value={edit.studied ?? 0} onChange={e => setEdit(p => ({ ...p, studied: e.target.value }))} /></F>
              </div>
            )}
            <F l="NOTES / LINK"><input className="input" placeholder="Quick note or Drive link" value={edit.notes || ""} onChange={e => setEdit(p => ({ ...p, notes: e.target.value }))} /></F>
            {edit.status === "active" && (
              <div style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 12px", fontFamily: "DM Mono", fontSize: 11, color: "var(--text-secondary)" }}>
                Last done {nice(edit.lastDone)}, next {nice(edit.nextDue)}, revised <span style={{ color: subj.accent, fontWeight: 700 }}>{(edit.history || []).length}×</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button className="btn" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
              onClick={async () => { await fs.deleteItem(SET, edit.id); setEdit(null); }}>Delete</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: subj.accent }} onClick={saveEdit}>Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add score modal */}
      {showAddScore && (
        <Modal title="Add Exam Score" accent={subj.accent} onClose={() => setShowAddScore(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <F l="EXAM NAME"><input className="input" placeholder="e.g. Allen Mock 3" value={newScore.exam} onChange={e => setNewScore(p => ({ ...p, exam: e.target.value }))} autoFocus /></F>
            <F l="MARKS (out of 240)"><input className="input" type="number" min="0" max="240" placeholder="e.g. 156" value={newScore.marks} onChange={e => setNewScore(p => ({ ...p, marks: e.target.value }))} /></F>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setShowAddScore(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: subj.accent }} onClick={addScore}>Add Score</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
