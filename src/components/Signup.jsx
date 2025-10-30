import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

/**
 * Componente de cadastro de novos usuários
 * Inclui validação de senhas e criação automática de conta
 */
export default function Signup({ switchToLogin, setUser }) {
  // Estados do formulário de cadastro
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Processa o cadastro do usuário com validações
   * Verifica se senhas coincidem e atendem critérios mínimos
   */
  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setMessage('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      setMessage(error.message);
    } else {
      setUser(data.user);
      setMessage('Conta criada com sucesso!');
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  // Permite cadastro com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignup();
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <span className="logo-icon"><i className="fas fa-box"></i></span>
              <h1>Estoque Pro</h1>
            </div>
            <p className="login-subtitle">Crie sua conta e comece a gerenciar seu estoque</p>
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
                  type="password"
                  placeholder="Crie uma senha (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Senha</label>
              <div className="input-wrapper">
                <i className="fas fa-lock input-icon"></i>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                />
              </div>
            </div>
            
            <button 
              className={`btn-primary login-btn ${loading ? 'loading' : ''}`} 
              onClick={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Criando conta...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  Criar Conta
                </>
              )}
            </button>
            
            <div className="login-footer">
              <p className="auth-switch" onClick={switchToLogin}>
                Já possui uma conta? <span>Fazer login</span>
              </p>
            </div>
            
            {message && (
              <div className={`auth-message ${message.includes('sucesso') ? 'success' : 'error'}`}>
                <i className={`fas ${message.includes('sucesso') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
