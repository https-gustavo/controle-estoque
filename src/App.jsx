import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(null); // estado de usuário logado
  const [authChecked, setAuthChecked] = useState(false); // evita redirecionar antes de checar sessão

  // Mantém sessão ao recarregar a página e reage a mudanças de auth
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setUser(session?.user ?? null);
        setAuthChecked(true);
      }
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Página de login */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <div className="App">
                {authChecked ? (
                  <AuthWrapper showSignup={false} setUser={setUser} />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
                )}
              </div>
            )
          }
        />

        {/* Página de cadastro */}
        <Route
          path="/signup"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <div className="App">
                {authChecked ? (
                  <AuthWrapper showSignup={true} setUser={setUser} />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
                )}
              </div>
            )
          }
        />

        {/* Dashboard protegido */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard setUser={setUser} />
            ) : authChecked ? (
              <Navigate to="/" />
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
            )
          }
        />
      </Routes>
    </Router>
  );
}

// Wrapper para alternar Login ↔ Signup
const AuthWrapper = ({ showSignup, setUser }) => {
  const [isSignup, setIsSignup] = useState(showSignup);

  return (
    <div className="auth-wrapper">
      <h1>ESTOQUE ONLINE</h1>
      {isSignup ? (
        <Signup switchToLogin={() => setIsSignup(false)} setUser={setUser} />
      ) : (
        <Login switchToSignup={() => setIsSignup(true)} setUser={setUser} />
      )}
    </div>
  );
};

export default App;
