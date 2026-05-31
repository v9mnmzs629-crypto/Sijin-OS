import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Home from "./pages/Home";
import School from "./pages/School";
import JEE from "./pages/JEE";
import BottomNav from "./components/BottomNav";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [fabTrigger, setFabTrigger] = useState(0);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)',
        flexDirection: 'column', gap: 16
      }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }`}</style>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s ease infinite'
        }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'white' }}>S</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 768,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(8,12,18,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: 'white' }}>S</span>
          </div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Sijin OS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.photoURL && (
            <img src={user.photoURL} alt="avatar" style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)' }} />
          )}
          <button
            onClick={logout}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              fontFamily: 'Syne', fontSize: 11, fontWeight: 600,
              color: 'var(--text-secondary)', transition: 'all 0.15s'
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Page content */}
      <div style={{ paddingTop: 60 }} className="page-enter">
        {page === "home" && <Home userId={user.uid} fabTrigger={fabTrigger} />}
        {page === "school" && <School userId={user.uid} fabTrigger={fabTrigger} />}
        {page === "jee" && <JEE userId={user.uid} fabTrigger={fabTrigger} />}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setFabTrigger(t => t + 1)} title="Quick Add">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Bottom Nav */}
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
