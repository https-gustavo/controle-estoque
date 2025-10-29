import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import { supabase } from './supabaseClient';

/**
 * Componente principal da aplicação
 * Gerencia roteamento e estado de autenticação global
 */
function App() {
  // Estados globais de autenticação
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Inicializa sessão e monitora mudanças de autenticação
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
    // Escuta mudanças no estado de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <Router basename={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
      <Routes>
        <Route
          path="/forgot-password"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <div className="App">
                {authChecked ? (
                  <AuthWrapper showForgotPassword={true} setUser={setUser} />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
                )}
              </div>
            )
          }
        />

        <Route
            path="/reset-password"
            element={
              <div className="App">
                <ResetPassword onPasswordReset={() => window.location.href = './'} />
              </div>
            }
          />

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

/**
 * Wrapper para alternar entre componentes de autenticação
 * Controla qual formulário de autenticação exibir (login, cadastro ou recuperação)
 */
const AuthWrapper = ({ showSignup, showForgotPassword, setUser }) => {
  const [currentView, setCurrentView] = useState(
    showForgotPassword ? 'forgot' : showSignup ? 'signup' : 'login'
  );

  const switchToLogin = () => setCurrentView('login');
  const switchToSignup = () => setCurrentView('signup');
  const switchToForgotPassword = () => setCurrentView('forgot');

  return (
    <div className="auth-wrapper">
      <h1>ESTOQUE ONLINE</h1>
      {currentView === 'signup' && (
        <Signup switchToLogin={switchToLogin} setUser={setUser} />
      )}
      {currentView === 'login' && (
        <Login 
          switchToSignup={switchToSignup} 
          switchToForgotPassword={switchToForgotPassword}
          setUser={setUser} 
        />
      )}
      {currentView === 'forgot' && (
        <ForgotPassword switchToLogin={switchToLogin} />
      )}
    </div>
  );
};

export default App;
