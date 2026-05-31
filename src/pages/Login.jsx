import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div className="text-center" style={{ animation: 'pageIn 0.5s ease' }}>
        {/* Logo mark */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(59,130,246,0.3)'
        }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: 'white' }}>S</span>
        </div>

        <h1 style={{
          fontFamily: 'Syne', fontSize: 36, fontWeight: 800,
          color: 'var(--text-primary)', marginBottom: 8,
          letterSpacing: '-0.02em'
        }}>
          Sijin OS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 40, fontFamily: 'DM Mono, monospace' }}>
          your personal command centre
        </p>

        <button
          onClick={login}
          className="btn btn-primary"
          style={{
            padding: '12px 32px', fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 24, fontFamily: 'DM Mono, monospace' }}>
          Only accessible to you
        </p>
      </div>
    </div>
  );
}
