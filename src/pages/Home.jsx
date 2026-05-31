import { useState, useEffect, useRef } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_HABITS = [
  { id: "h1", name: "Workout", days: [0, 1, 3, 4], color: "#3b82f6" },
  { id: "h2", name: "Study > 2hrs", days: [0, 1, 2, 3, 4, 5, 6], color: "#10b981" },
  { id: "h3", name: "Eat Healthy", days: [0, 1, 2, 3, 4, 5, 6], color: "#f59e0b" },
  { id: "h4", name: "Fajr", days: [0, 1, 2, 3, 4, 5, 6], color: "#a855f7" },
  { id: "h5", name: "Dhuhr", days: [0, 1, 2, 3, 4, 5, 6], color: "#ec4899" },
  { id: "h6", name: "Asr", days: [0, 1, 2, 3, 4, 5, 6], color: "#f97316" },
  { id: "h7", name: "Maghrib", days: [0, 1, 2, 3, 4, 5, 6], color: "#06b6d4" },
  { id: "h8", name: "Isha", days: [0, 1, 2, 3, 4, 5, 6], color: "#8b5cf6" },
];

const COLORS = ["#3b82f6","#10b981","#f59e0b","#a855f7","#ec4899","#f97316","#06b6d4","#8b5cf6","#ef4444","#84cc16"];

function getWeekKey() {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  monday.setDate(now.getDate() + diff);
  return `${monday.getFullYear()}-W${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function getTodayDayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function Home({ userId, fabTrigger }) {
  const fs = useFirestore(userId);
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [checks, setChecks] = useState({});
  const [monthlyData, setMonthlyData] = useState({});
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showYearly, setShowYearly] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newHabit, setNewHabit] = useState({ name: "", days: [...ALL_DAYS] });
  const weekKey = getWeekKey();
  const monthKey = getMonthKey();
  const todayIdx = getTodayDayIndex();


  useEffect(() => { if (fabTrigger > 0) setShowAddHabit(true); }, [fabTrigger]);
  // Load habits config
  useEffect(() => {
    const unsub = fs.watchData("habits/config", (data) => {
      if (data && data.habits) setHabits(data.habits);
    });
    return unsub;
  }, [userId]);

  // Load weekly checks
  useEffect(() => {
    const unsub = fs.watchData(`habits/weeks/${weekKey}`, (data) => {
      if (data) setChecks(data);
    });
    return unsub;
  }, [userId, weekKey]);

  // Load monthly data for charts
  useEffect(() => {
    const unsub = fs.watchData(`habits/months/${monthKey}`, (data) => {
      if (data) setMonthlyData(data);
    });
    return unsub;
  }, [userId, monthKey]);

  const saveHabits = async (newHabits) => {
    setHabits(newHabits);
    await fs.setData("habits/config", { habits: newHabits });
  };

  const toggleCheck = async (habitId, dayIdx) => {
    const key = `${habitId}_${dayIdx}`;
    const newChecks = { ...checks, [key]: !checks[key] };
    setChecks(newChecks);
    await fs.setData(`habits/weeks/${weekKey}`, newChecks);

    // Also update monthly aggregate
    const monthChecks = { ...monthlyData };
    if (!monthChecks[habitId]) monthChecks[habitId] = { checked: 0, possible: 0 };
    if (newChecks[key]) {
      monthChecks[habitId].checked = (monthChecks[habitId].checked || 0) + 1;
    } else {
      monthChecks[habitId].checked = Math.max(0, (monthChecks[habitId].checked || 0) - 1);
    }
    setMonthlyData(monthChecks);
    await fs.setData(`habits/months/${monthKey}`, monthChecks);
  };

  // Streak calculation
  const getStreak = (habitId) => {
    let streak = 0;
    for (let d = todayIdx; d >= 0; d--) {
      if (habits.find(h => h.id === habitId)?.days?.includes(d)) {
        if (checks[`${habitId}_${d}`]) streak++;
        else break;
      }
    }
    return streak;
  };

  // Progress per day
  const getDayProgress = (dayIdx) => {
    const activeHabits = habits.filter(h => h.days?.includes(dayIdx));
    if (!activeHabits.length) return 0;
    const done = activeHabits.filter(h => checks[`${h.id}_${dayIdx}`]).length;
    return Math.round((done / activeHabits.length) * 100);
  };

  const addHabit = async () => {
    if (!newHabit.name.trim()) return;
    const h = {
      id: `h${Date.now()}`,
      name: newHabit.name.trim(),
      days: newHabit.days,
      color: COLORS[habits.length % COLORS.length]
    };
    await saveHabits([...habits, h]);
    setNewHabit({ name: "", days: [...ALL_DAYS] });
    setShowAddHabit(false);
  };

  const deleteHabit = async (id) => {
    await saveHabits(habits.filter(h => h.id !== id));
  };

  const saveEditHabit = async () => {
    const updated = habits.map(h => h.id === editingHabit.id ? editingHabit : h);
    await saveHabits(updated);
    setEditingHabit(null);
  };

  const toggleDayInNew = (dayIdx, target) => {
    const arr = target === "new" ? newHabit.days : editingHabit.days;
    const setFn = target === "new"
      ? (d) => setNewHabit(p => ({ ...p, days: d }))
      : (d) => setEditingHabit(p => ({ ...p, days: d }));
    if (arr.includes(dayIdx)) setFn(arr.filter(d => d !== dayIdx));
    else setFn([...arr, dayIdx].sort());
  };

  // Monthly chart data
  const chartData = habits.map(h => {
    const md = monthlyData[h.id] || { checked: 0 };
    const possibleDays = h.days?.length || 7;
    const daysInMonth = new Date().getDate();
    const weeksElapsed = Math.ceil(daysInMonth / 7);
    const possible = Math.min(possibleDays * weeksElapsed, possibleDays * 4);
    return {
      name: h.name,
      value: md.checked || 0,
      possible: Math.max(possible, 1),
      pct: Math.round(((md.checked || 0) / Math.max(possible, 1)) * 100),
      color: h.color
    };
  });

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '28px 16px 0', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 4 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{
          fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.02em'
        }}>
          Hello, Sijin! <span style={{ color: 'var(--accent-blue)' }}>👋</span>
        </h1>
      </div>

      {/* Habit Tracker */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            padding: '16px 16px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Habit Tracker
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowYearly(true)}
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                Yearly
              </button>
              <button
                onClick={() => setShowAddHabit(true)}
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Scrollable table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 600, width: '100%', borderCollapse: 'collapse' }}>
              {/* Row 1: Day headers */}
              <thead>
                <tr>
                  <th style={{
                    padding: '10px 12px', textAlign: 'left', width: 130,
                    fontFamily: 'Syne', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', borderBottom: '1px solid var(--border)',
                    position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2
                  }}>Habit</th>
                  {DAYS.map((day, i) => (
                    <th key={day} style={{
                      padding: '10px 8px', textAlign: 'center', minWidth: 64,
                      fontFamily: 'Syne', fontSize: 11, fontWeight: 700,
                      color: i === todayIdx ? 'var(--accent-blue-bright)' : 'var(--text-secondary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border)',
                      background: i === todayIdx ? 'var(--accent-glow)' : 'transparent'
                    }}>{day}</th>
                  ))}
                </tr>

                {/* Row 2: Progress bars */}
                <tr>
                  <td style={{
                    padding: '8px 12px',
                    fontFamily: 'Syne', fontSize: 9, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.08em', borderBottom: '1px solid var(--border)',
                    position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2
                  }}>Progress</td>
                  {DAYS.map((_, i) => {
                    const pct = getDayProgress(i);
                    return (
                      <td key={i} style={{
                        padding: '8px', textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                        background: i === todayIdx ? 'var(--accent-glow)' : 'transparent'
                      }}>
                        <div style={{ marginBottom: 2 }}>
                          <div className="progress-bar-track" style={{ margin: '0 4px' }}>
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                          {pct}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </thead>

              {/* Habit rows */}
              <tbody>
                {habits.map((habit) => {
                  const streak = getStreak(habit.id);
                  return (
                    <tr key={habit.id} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Habit name cell */}
                      <td style={{
                        padding: '10px 12px', minWidth: 130,
                        borderBottom: '1px solid var(--border)',
                        position: 'sticky', left: 0, background: 'inherit', zIndex: 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: habit.color, flexShrink: 0
                          }} />
                          <span
                            style={{
                              fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer',
                              fontFamily: 'DM Mono, monospace', flexGrow: 1
                            }}
                            onClick={() => setEditingHabit({ ...habit })}
                            title="Click to edit"
                          >
                            {habit.name}
                          </span>
                          {streak > 0 && (
                            <span className="streak-badge">🔥{streak}</span>
                          )}
                        </div>
                      </td>

                      {/* Checkbox cells */}
                      {DAYS.map((_, dayIdx) => {
                        const active = habit.days?.includes(dayIdx);
                        return (
                          <td key={dayIdx} style={{
                            padding: '10px 8px', textAlign: 'center',
                            borderBottom: '1px solid var(--border)',
                            background: dayIdx === todayIdx ? 'rgba(59,130,246,0.04)' : 'transparent',
                            opacity: active ? 1 : 0.2
                          }}>
                            {active ? (
                              <input
                                type="checkbox"
                                className="habit-checkbox"
                                checked={!!checks[`${habit.id}_${dayIdx}`]}
                                onChange={() => toggleCheck(habit.id, dayIdx)}
                                style={{ margin: '0 auto', display: 'block' }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{
            fontFamily: 'Syne', fontSize: 15, fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: 4
          }}>Monthly Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 20, fontFamily: 'DM Mono' }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {chartData.map((item) => (
              <div key={item.name} style={{ textAlign: 'center', width: 90 }}>
                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="30" fill="none"
                      stroke={item.color} strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - item.pct / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: item.color }}>
                      {item.pct}%
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'DM Mono' }}>
                  {item.name}
                </p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
                  {item.value}/{item.possible}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddHabit && (
        <div className="modal-overlay" onClick={() => setShowAddHabit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
              Add Habit
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                HABIT NAME
              </label>
              <input
                className="input"
                placeholder="e.g. Read 30 mins"
                value={newHabit.name}
                onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                ACTIVE DAYS
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleDayInNew(i, "new")}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 11,
                      fontFamily: 'Syne', fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: newHabit.days.includes(i) ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: newHabit.days.includes(i) ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddHabit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addHabit}>Add Habit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {editingHabit && (
        <div className="modal-overlay" onClick={() => setEditingHabit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
              Edit Habit
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                HABIT NAME
              </label>
              <input
                className="input"
                value={editingHabit.name}
                onChange={e => setEditingHabit(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                ACTIVE DAYS
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleDayInNew(i, "edit")}
                    style={{
                      padding: '5px 10px', borderRadius: 8, fontSize: 11,
                      fontFamily: 'Syne', fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: editingHabit.days?.includes(i) ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: editingHabit.days?.includes(i) ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button
                className="btn"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={() => { deleteHabit(editingHabit.id); setEditingHabit(null); }}
              >
                Delete
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditingHabit(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEditHabit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yearly Report Modal */}
      {showYearly && (
        <div className="modal-overlay" onClick={() => setShowYearly(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18 }}>
                Yearly Report {new Date().getFullYear()}
              </h3>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowYearly(false)}>
                Close
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 20 }}>
              Based on data recorded this year. Keep going!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {habits.map(h => {
                const md = monthlyData[h.id] || { checked: 0 };
                const possiblePerMonth = h.days?.length * 4 || 28;
                const monthsElapsed = new Date().getMonth() + 1;
                const yearTotal = (md.checked || 0) * monthsElapsed;
                const yearPossible = possiblePerMonth * monthsElapsed;
                const pct = Math.min(100, Math.round((yearTotal / yearPossible) * 100));
                return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'DM Mono' }}>
                        {h.name}
                      </span>
                      <span style={{ fontSize: 12, color: h.color, fontFamily: 'Syne', fontWeight: 700 }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress-bar-track" style={{ height: 8 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${h.color}88, ${h.color})`
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
