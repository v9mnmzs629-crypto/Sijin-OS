import { useState, useEffect } from "react";
import { useFirestore } from "../hooks/useFirestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const SUBJECTS = {
  Maths: {
    label: "Maths",
    icon: "∑",
    theme: "theme-maths",
    accent: "#0ea5e9",
    bg: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(3,105,161,0.04))",
    border: "rgba(14,165,233,0.2)",
  },
  Chemistry: {
    label: "Chemistry",
    icon: "⚗",
    theme: "theme-chemistry",
    accent: "#10b981",
    bg: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))",
    border: "rgba(16,185,129,0.2)",
  },
  Physics: {
    label: "Physics",
    icon: "⚡",
    theme: "theme-physics",
    accent: "#a855f7",
    bg: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04))",
    border: "rgba(168,85,247,0.2)",
  },
};

const STATUS_OPTIONS = ["Not Started", "Learning", "Revised", "Mastered"];
const LEVEL_OPTIONS = ["High", "Medium", "Low"];

const STATUS_COLORS = {
  "Not Started": { bg: "rgba(100,116,139,0.15)", color: "#64748b" },
  "Learning": { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  "Revised": { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  "Mastered": { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
};

const LEVEL_COLORS = {
  High: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  Medium: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  Low: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
};

function Badge({ value, map }) {
  const c = map[value] || map["Medium"] || { bg: "rgba(100,116,139,0.15)", color: "#64748b" };
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 600, fontFamily: 'Syne',
      whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {value}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label, accent }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono', fontSize: 12
      }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: accent, fontWeight: 600 }}>{payload[0].value} / 240</p>
      </div>
    );
  }
  return null;
};

export default function JEE({ userId, fabTrigger }) {
  const fs = useFirestore(userId);
  const [activeSubject, setActiveSubject] = useState("Maths");
  const [topics, setTopics] = useState({});
  const [scores, setScores] = useState({});
  const [showAddTopic, setShowAddTopic] = useState(false);

  useEffect(() => { if (fabTrigger > 0) setShowAddTopic(true); }, [fabTrigger]);
  const [showAddScore, setShowAddScore] = useState(false);
  const [editTopic, setEditTopic] = useState(null);
  const [newTopic, setNewTopic] = useState({
    name: "", status: "Not Started", difficulty: "Medium",
    weightage: "Medium", lastRevised: "", revisionCount: 0, notes: ""
  });
  const [newScore, setNewScore] = useState({ exam: "", marks: "" });

  const subj = SUBJECTS[activeSubject];

  useEffect(() => {
    const unsubTopics = {};
    const unsubScores = {};
    Object.keys(SUBJECTS).forEach(s => {
      unsubTopics[s] = fs.watchCollection(`jee_topics_${s}`, (data) => {
        setTopics(prev => ({ ...prev, [s]: data }));
      });
      unsubScores[s] = fs.watchCollection(`jee_scores_${s}`, (data) => {
        setScores(prev => ({ ...prev, [s]: data.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")) }));
      });
    });
    return () => {
      Object.values(unsubTopics).forEach(u => u());
      Object.values(unsubScores).forEach(u => u());
    };
  }, [userId]);

  const currentTopics = topics[activeSubject] || [];
  const currentScores = scores[activeSubject] || [];

  const addTopic = async () => {
    if (!newTopic.name.trim()) return;
    await fs.addItem(`jee_topics_${activeSubject}`, newTopic);
    setNewTopic({ name: "", status: "Not Started", difficulty: "Medium", weightage: "Medium", lastRevised: "", revisionCount: 0, notes: "" });
    setShowAddTopic(false);
  };

  const addScore = async () => {
    if (!newScore.exam.trim() || !newScore.marks) return;
    await fs.addItem(`jee_scores_${activeSubject}`, { ...newScore, marks: Number(newScore.marks) });
    setNewScore({ exam: "", marks: "" });
    setShowAddScore(false);
  };

  const saveTopic = async () => {
    // If lastRevised changed, increment revisionCount
    const original = currentTopics.find(t => t.id === editTopic.id);
    let updated = { ...editTopic };
    if (original && original.lastRevised !== editTopic.lastRevised) {
      updated.revisionCount = (editTopic.revisionCount || 0) + 1;
    }
    await fs.updateItem(`jee_topics_${activeSubject}`, editTopic.id, updated);
    setEditTopic(null);
  };

  const deleteTopic = async (id) => {
    await fs.deleteItem(`jee_topics_${activeSubject}`, id);
    setEditTopic(null);
  };

  const deleteScore = async (id) => {
    await fs.deleteItem(`jee_scores_${activeSubject}`, id);
  };

  const chartData = currentScores.map((s, i) => ({
    name: s.exam,
    marks: s.marks,
    index: i + 1
  }));

  return (
    <div className={subj.theme} style={{ paddingBottom: 100, transition: 'all 0.3s ease' }}>
      {/* Header */}
      <div style={{ padding: '28px 16px 0', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 4 }}>jee prep</p>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          JEE Tracker
        </h1>
      </div>

      {/* Subject Switcher */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div style={{
          display: 'flex', gap: 8, padding: 6,
          background: 'var(--bg-secondary)', borderRadius: 14,
          border: '1px solid var(--border)'
        }}>
          {Object.entries(SUBJECTS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActiveSubject(key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                transition: 'all 0.25s ease',
                background: activeSubject === key ? s.bg : 'transparent',
                color: activeSubject === key ? s.accent : 'var(--text-secondary)',
                boxShadow: activeSubject === key ? `0 0 0 1px ${s.border}, 0 4px 12px rgba(0,0,0,0.2)` : 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
              }}
            >
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 11 }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic Table */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: subj.border }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: subj.accent }}>
              {activeSubject} Topics
            </h2>
            <button className="btn btn-primary"
              style={{ fontSize: 11, padding: '4px 10px', background: subj.accent }}
              onClick={() => setShowAddTopic(true)}>
              + Add Topic
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Status</th>
                  <th>Difficulty</th>
                  <th>Weightage</th>
                  <th>Last Revised</th>
                  <th>Revisions</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {currentTopics.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No topics yet. Add your first one!
                    </td>
                  </tr>
                )}
                {currentTopics.map(topic => (
                  <tr key={topic.id} onClick={() => setEditTopic({ ...topic })} style={{ cursor: 'pointer' }}>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', minWidth: 140 }}>
                      {topic.name}
                    </td>
                    <td><Badge value={topic.status} map={STATUS_COLORS} /></td>
                    <td><Badge value={topic.difficulty} map={LEVEL_COLORS} /></td>
                    <td><Badge value={topic.weightage} map={LEVEL_COLORS} /></td>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {topic.lastRevised || "—"}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: `${subj.accent}20`, color: subj.accent,
                        padding: '2px 8px', borderRadius: 99,
                        fontSize: 11, fontFamily: 'Syne', fontWeight: 700
                      }}>
                        {topic.revisionCount || 0}×
                      </span>
                    </td>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {topic.notes || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div style={{ padding: '0 16px' }}>
        <div className="card" style={{ padding: 20, borderColor: subj.border }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: subj.accent, marginBottom: 2 }}>
                Exam Progress
              </h2>
              <p style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)' }}>
                Out of 240 marks
              </p>
            </div>
            <button className="btn btn-primary"
              style={{ fontSize: 11, padding: '4px 10px', background: subj.accent }}
              onClick={() => setShowAddScore(true)}>
              + Add Score
            </button>
          </div>

          {chartData.length === 0 ? (
            <div style={{
              height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontFamily: 'DM Mono', fontSize: 12,
              border: '1px dashed var(--border)', borderRadius: 8
            }}>
              No scores yet. Add your first exam result!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'DM Mono' }} />
                <YAxis domain={[0, 240]} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'DM Mono' }} />
                <Tooltip content={<CustomTooltip accent={subj.accent} />} />
                <Line
                  type="monotone" dataKey="marks"
                  stroke={subj.accent} strokeWidth={2.5}
                  dot={{ fill: subj.accent, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: subj.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Score list */}
          {currentScores.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {currentScores.map(s => (
                <div key={s.id} style={{
                  background: `${subj.accent}10`, border: `1px solid ${subj.border}`,
                  borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)' }}>{s.exam}</span>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: subj.accent }}>{s.marks}</span>
                  <button onClick={() => deleteScore(s.id)} style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 12, padding: 0
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Topic Modal */}
      {showAddTopic && (
        <div className="modal-overlay" onClick={() => setShowAddTopic(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20, color: subj.accent }}>
              Add {activeSubject} Topic
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>TOPIC NAME</label>
                <input className="input" placeholder="e.g. Integration" value={newTopic.name}
                  onChange={e => setNewTopic(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>STATUS</label>
                  <select className="input" value={newTopic.status} onChange={e => setNewTopic(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DIFFICULTY</label>
                  <select className="input" value={newTopic.difficulty} onChange={e => setNewTopic(p => ({ ...p, difficulty: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>WEIGHTAGE</label>
                  <select className="input" value={newTopic.weightage} onChange={e => setNewTopic(p => ({ ...p, weightage: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>LAST REVISED</label>
                  <input className="input" type="date" value={newTopic.lastRevised}
                    onChange={e => setNewTopic(p => ({ ...p, lastRevised: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>NOTES</label>
                <input className="input" placeholder="Quick note..." value={newTopic.notes}
                  onChange={e => setNewTopic(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddTopic(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: subj.accent }} onClick={addTopic}>Add Topic</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Score Modal */}
      {showAddScore && (
        <div className="modal-overlay" onClick={() => setShowAddScore(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20, color: subj.accent }}>
              Add Exam Score
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>EXAM NAME</label>
                <input className="input" placeholder="e.g. Allen Mock 3" value={newScore.exam}
                  onChange={e => setNewScore(p => ({ ...p, exam: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>MARKS (out of 240)</label>
                <input className="input" type="number" min="0" max="240" placeholder="e.g. 156"
                  value={newScore.marks} onChange={e => setNewScore(p => ({ ...p, marks: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddScore(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: subj.accent }} onClick={addScore}>Add Score</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editTopic && (
        <div className="modal-overlay" onClick={() => setEditTopic(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20, color: subj.accent }}>
              Edit Topic
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>TOPIC NAME</label>
                <input className="input" value={editTopic.name}
                  onChange={e => setEditTopic(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>STATUS</label>
                  <select className="input" value={editTopic.status} onChange={e => setEditTopic(p => ({ ...p, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DIFFICULTY</label>
                  <select className="input" value={editTopic.difficulty} onChange={e => setEditTopic(p => ({ ...p, difficulty: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>WEIGHTAGE</label>
                  <select className="input" value={editTopic.weightage} onChange={e => setEditTopic(p => ({ ...p, weightage: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>LAST REVISED</label>
                  <input className="input" type="date" value={editTopic.lastRevised}
                    onChange={e => setEditTopic(p => ({ ...p, lastRevised: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>NOTES</label>
                <input className="input" placeholder="Quick note..." value={editTopic.notes || ""}
                  onChange={e => setEditTopic(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px',
                fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)'
              }}>
                Revision count: <span style={{ color: subj.accent, fontWeight: 700 }}>{editTopic.revisionCount || 0}×</span>
                <span style={{ marginLeft: 8 }}>(auto-increments when you update Last Revised)</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
              <button
                className="btn"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={() => deleteTopic(editTopic.id)}
              >Delete</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditTopic(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: subj.accent }} onClick={saveTopic}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
