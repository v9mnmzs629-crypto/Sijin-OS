export default function FAB({ page, onAction }) {
  const labels = {
    home: "Add Habit",
    school: "Add Task",
    jee: "Add Topic",
  };

  return (
    <button
      className="fab"
      onClick={onAction}
      title={labels[page] || "Add"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  );
}
