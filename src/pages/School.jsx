import { useState, useEffect } from "react";
import { useFirestore } from "../hooks/useFirestore";

const SUBJECT_COLORS = {
  English: { bg: "#ef4444", text: "#fff" },
  Maths: { bg: "#3b82f6", text: "#fff" },
  Chemistry: { bg: "#22c55e", text: "#fff" },
  Biology: { bg: "#ec4899", text: "#fff" },
  Physics: { bg: "#a855f7", text: "#fff" },
  SST: { bg: "#f97316", text: "#fff" },
  Tamil: { bg: "#eab308", text: "#000" },
  Islamic: { bg: "#16a34a", text: "#fff" },
  ICT: { bg: "#67e8f9", text: "#000" },
  Arabic: { bg: "#ec4899", text: "#fff" },
  General: { bg: "#64748b", text: "#fff" },
};

const SUBJECTS = Object.keys(SUBJECT_COLORS);
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PROGRESS_OPTIONS = ["Not Started", "In Progress", "Completed"];
const LEVEL_OPTIONS = ["High", "Medium", "Low"];

function SubjectTag({ subject }) {
  const c = SUBJECT_COLORS[subject] || SUBJECT_COLORS.General;
  return (
    <span style={{
      background: c.bg + "22", color: c.bg,
      border: `1px solid ${c.bg}44`,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 600, fontFamily: 'Syne',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      whiteSpace: 'nowrap'
    }}>
      {subject}
    </span>
  );
}

function ProgressBadge({ value }) {
  const colors = {
    "Not Started": { bg: "rgba(100,116,139,0.15)", color: "#64748b" },
    "In Progress": { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    "Completed": { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  };
  const c = colors[value] || colors["Not Started"];
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontWeight: 600, fontFamily: 'Syne',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      whiteSpace: 'nowrap'
    }}>
      {value}
    </span>
  );
}

function LevelBadge({ value, type }) {
  const colors = {
    High: type === "importance" ? { bg: "rgba(239,68,68,0.15)", color: "#ef4444" } : { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
    Medium: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Low: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
  };
  const c = colors[value] || colors.Medium;
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10, fontFamily: 'Syne',
      whiteSpace: 'nowrap'
    }}>
      {value}
    </span>
  );
}

function isDueSoon(deadline) {
  if (!deadline) return false;
  const now = new Date();
  const due = new Date(deadline);
  const diff = due - now;
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

export default function School({ userId, fabTrigger }) {
  const fs = useFirestore(userId);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => { if (fabTrigger > 0) setShowAddTask(true); }, [fabTrigger]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterProgress, setFilterProgress] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");
  const [newTask, setNewTask] = useState({
    subject: "Maths", name: "", deadline: "", progress: "Not Started",
    importance: "Medium", difficulty: "Medium"
  });
  const [newEvent, setNewEvent] = useState({ title: "", subject: "General", date: "" });

  useEffect(() => {
    const unsub1 = fs.watchCollection("tasks", setTasks);
    const unsub2 = fs.watchCollection("events", setEvents);
    return () => { unsub1(); unsub2(); };
  }, [userId]);

  const addTask = async () => {
    if (!newTask.name.trim()) return;
    await fs.addItem("tasks", newTask);
    setNewTask({ subject: "Maths", name: "", deadline: "", progress: "Not Started", importance: "Medium", difficulty: "Medium" });
    setShowAddTask(false);
  };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) return;
    await fs.addItem("events", newEvent);
    setNewEvent({ title: "", subject: "General", date: "" });
    setShowAddEvent(false);
  };

  const updateTask = async () => {
    await fs.updateItem("tasks", editTask.id, editTask);
    setEditTask(null);
  };

  const deleteTask = async (id) => {
    await fs.deleteItem("tasks", id);
    setEditTask(null);
  };

  const deleteEvent = async (id) => {
    await fs.deleteItem("events", id);
  };

  // Calendar logic
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calCells = [];
  for (let i = 0; i < firstDay; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getTasksForDay = (day) => {
    if (!day) return [];
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.deadline === dateStr && t.progress !== "Completed");
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setNewTask(p => ({ ...p, deadline: dateStr }));
    setNewEvent(p => ({ ...p, date: dateStr }));
    setShowAddEvent(true);
  };

  // Filter and sort tasks
  let filteredTasks = [...tasks];
  if (filterSubject !== "All") filteredTasks = filteredTasks.filter(t => t.subject === filterSubject);
  if (filterProgress !== "All") filteredTasks = filteredTasks.filter(t => t.progress === filterProgress);
  if (sortBy === "deadline") filteredTasks.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  else if (sortBy === "importance") {
    const order = { High: 0, Medium: 1, Low: 2 };
    filteredTasks.sort((a, b) => (order[a.importance] || 1) - (order[b.importance] || 1));
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '28px 16px 0', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 4 }}>school</p>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          My Classes
        </h1>
      </div>

      {/* Subject Legend */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUBJECTS.map(s => <SubjectTag key={s} subject={s} />)}
        </div>
      </div>

      {/* Calendar */}
      <div style={{ padding: '0 16px', marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14
            }}>‹</button>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14
            }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_OF_WEEK.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
                color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 0'
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calCells.map((day, idx) => {
              const evs = getEventsForDay(day);
              const taskEvs = getTasksForDay(day);
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const allDots = [...evs, ...taskEvs].slice(0, 3);
              return (
                <div
                  key={idx}
                  className={`cal-day ${isToday ? 'today' : ''} ${!day ? 'other-month' : ''}`}
                  onClick={() => handleDayClick(day)}
                  style={{ cursor: day ? 'pointer' : 'default' }}
                >
                  {day && (
                    <>
                      <span style={{
                        fontSize: 12, fontFamily: 'Syne', fontWeight: isToday ? 700 : 400,
                        color: isToday ? 'var(--accent-blue-bright)' : 'var(--text-primary)'
                      }}>{day}</span>
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 2, justifyContent: 'center' }}>
                        {allDots.map((e, i) => {
                          const subj = e.subject || "General";
                          const c = SUBJECT_COLORS[subj]?.bg || "#64748b";
                          return <div key={i} className="cal-event-dot" style={{ background: c }} />;
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ padding: '0 16px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
          }}>
            <h2 style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700 }}>Tasks</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select className="input" style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}
                value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option>All</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="input" style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}
                value={filterProgress} onChange={e => setFilterProgress(e.target.value)}>
                <option>All</option>
                {PROGRESS_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
              <select className="input" style={{ width: 'auto', fontSize: 11, padding: '4px 8px' }}
                value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="deadline">Sort: Deadline</option>
                <option value="importance">Sort: Importance</option>
              </select>
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setShowAddTask(true)}>
                + Add Task
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Task</th>
                  <th>Deadline</th>
                  <th>Progress</th>
                  <th>Importance</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                      No tasks yet. Add one!
                    </td>
                  </tr>
                )}
                {filteredTasks.map(task => {
                  const due = isDueSoon(task.deadline);
                  const subjectColor = SUBJECT_COLORS[task.subject]?.bg || "#64748b";
                  return (
                    <tr key={task.id}
                      onClick={() => setEditTask({ ...task })}
                      style={{
                        cursor: 'pointer',
                        background: due ? 'rgba(239,68,68,0.05)' : 'transparent',
                        borderLeft: `3px solid ${subjectColor}`
                      }}>
                      <td><SubjectTag subject={task.subject} /></td>
                      <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {due && <span title="Due soon!" style={{ color: '#ef4444', fontSize: 10 }}>⚠️</span>}
                          {task.name}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'DM Mono', fontSize: 11, color: due ? '#ef4444' : 'var(--text-secondary)' }}>
                        {task.deadline || "—"}
                      </td>
                      <td><ProgressBadge value={task.progress} /></td>
                      <td><LevelBadge value={task.importance} type="importance" /></td>
                      <td><LevelBadge value={task.difficulty} type="difficulty" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Add Task</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
                <select className="input" value={newTask.subject} onChange={e => setNewTask(p => ({ ...p, subject: e.target.value }))}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>TASK NAME</label>
                <input className="input" placeholder="Task description" value={newTask.name}
                  onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DEADLINE</label>
                <input className="input" type="date" value={newTask.deadline}
                  onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROGRESS</label>
                  <select className="input" value={newTask.progress} onChange={e => setNewTask(p => ({ ...p, progress: e.target.value }))}>
                    {PROGRESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>IMPORTANCE</label>
                  <select className="input" value={newTask.importance} onChange={e => setNewTask(p => ({ ...p, importance: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DIFFICULTY</label>
                  <select className="input" value={newTask.difficulty} onChange={e => setNewTask(p => ({ ...p, difficulty: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddTask(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTask}>Add Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Add Event</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'DM Mono', marginBottom: 20 }}>
              {selectedDate || ""}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>EVENT TITLE</label>
                <input className="input" placeholder="e.g. Chemistry test" value={newEvent.title}
                  onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
                <select className="input" value={newEvent.subject} onChange={e => setNewEvent(p => ({ ...p, subject: e.target.value }))}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DATE</label>
                <input className="input" type="date" value={newEvent.date}
                  onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => { setShowAddEvent(false); setShowAddTask(true); }}>
                Add Task Instead
              </button>
              <button className="btn btn-ghost" onClick={() => setShowAddEvent(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addEvent}>Add Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <div className="modal-overlay" onClick={() => setEditTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Edit Task</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
                <select className="input" value={editTask.subject} onChange={e => setEditTask(p => ({ ...p, subject: e.target.value }))}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>TASK NAME</label>
                <input className="input" value={editTask.name}
                  onChange={e => setEditTask(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DEADLINE</label>
                <input className="input" type="date" value={editTask.deadline}
                  onChange={e => setEditTask(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>PROGRESS</label>
                  <select className="input" value={editTask.progress} onChange={e => setEditTask(p => ({ ...p, progress: e.target.value }))}>
                    {PROGRESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>IMPORTANCE</label>
                  <select className="input" value={editTask.importance} onChange={e => setEditTask(p => ({ ...p, importance: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>DIFFICULTY</label>
                  <select className="input" value={editTask.difficulty} onChange={e => setEditTask(p => ({ ...p, difficulty: e.target.value }))}>
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
              <button
                className="btn"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                onClick={() => deleteTask(editTask.id)}
              >Delete</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditTask(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={updateTask}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
