import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Login.css';

/**
 * Componente de login com interface moderna
 * Inclui validação, toggle de senha e navegação automática
 */
export default function Login({ switchToSignup, switchToForgotPassword, setUser }) {
  // Estados do formulário de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Processa o login do usuário via Supabase
   * Redireciona para dashboard em caso de sucesso
   */
  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setMessage(error.message);
    } else {
      setUser(data.user);
      setMessage('Login bem-sucedido!');
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  // Permite login com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card grid">
          {/* HERO LATERAL */}
          <div className="login-hero">
            <div className="hero-overlay">
              <div className="hero-content">
                <div className="login-logo">
                  <span className="logo-icon"><i className="fas fa-box"></i></span>
                  <h1>Estoque Pro</h1>
                </div>
                <p className="login-subtitle">Gerencie seu estoque com eficiência e controle total.</p>
                <ul className="hero-highlights">
                  <li><i className="fas fa-check"></i> Painel de controle intuitivo</li>
                  <li><i className="fas fa-check"></i> Gestão completa de produtos</li>
                  <li><i className="fas fa-check"></i> Sistema seguro e confiável</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FORMULÁRIO */}
          <div className="login-content">
            <div className="login-header">
              <p className="login-subtitle">Acesse sua conta para continuar</p>
            </div>

            <div className="login-form">
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    id="email"
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="form-input"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="toggle-password"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button 
                className={`btn-primary login-btn ${loading ? 'loading' : ''}`} 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Entrando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Entrar
                  </>
                )}
              </button>

              <div className="login-footer">
                <p className="forgot-password" onClick={switchToForgotPassword}>
                  <i className="fas fa-key"></i>
                  Esqueci minha senha
                </p>
                <p className="auth-switch" onClick={switchToSignup}>
                  Ainda não tem conta? <span>Criar conta</span>
                </p>
              </div>

              {message && (
                <div className={`auth-message ${message.includes('sucedido') ? 'success' : 'error'}`}>
                  <i className={`fas ${message.includes('sucedido') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
