const NAV_ITEMS = [
  {
    id: "school",
    label: "School",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    )
  },
  {
    id: "home",
    label: "Home",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    )
  },
  {
    id: "jee",
    label: "JEE",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )
  },
];

export default function BottomNav({ page, setPage }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(8, 12, 18, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 30
    }}>
      {NAV_ITEMS.map(item => {
        const active = page === item.id;
        return (
          <button
            key={item.id}
            className={`nav-btn ${active ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
            style={{ minWidth: 90, position: 'relative' }}
          >
            {/* Active indicator dot */}
            {active && (
              <div style={{
                position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%',
                background: 'var(--accent-blue-bright)',
                boxShadow: '0 0 6px var(--accent-blue)'
              }} />
            )}
            <span style={{ marginTop: active ? 6 : 0, transition: 'margin 0.2s' }}>
              {item.icon(active)}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
