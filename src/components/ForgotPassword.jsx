import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

/**
 * Componente para recuperação de senha
 * Permite ao usuário solicitar um email de redefinição de senha
 */
export default function ForgotPassword({ switchToLogin }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  /**
   * Processa a solicitação de recuperação de senha
   * Envia email com link para redefinir senha
   */
  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Por favor, digite seu e-mail');
      return;
    }

    setLoading(true);
    setMessage('');

    // Detecta automaticamente a URL base correta
    const getResetUrl = () => {
      const origin = window.location.origin;
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      
      let resetUrl;
      if (isLocalhost) {
        // Em desenvolvimento local
        resetUrl = `${origin}/reset-password`;
      } else {
        // Em produção (GitHub Pages) - força a URL correta
        resetUrl = `https://https-gustavo.github.io/controle-estoque/reset-password`;
      }
      
      console.log('🔗 URL de reset configurada:', resetUrl);
      console.log('🌍 Origin atual:', origin);
      console.log('🏠 É localhost?', isLocalhost);
      
      return resetUrl;
    };

    const resetUrl = getResetUrl();
    console.log('📧 Enviando email com redirectTo:', resetUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setEmailSent(true);
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }

    setLoading(false);
  };

  /**
   * Manipula a tecla Enter para submeter o formulário
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleForgotPassword();
    }
  };

  if (emailSent) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            <div className="login-content">
              <div className="login-header">
                <div className="login-logo">
                  <i className="fas fa-envelope-circle-check"></i>
                </div>
                <h2>Email Enviado!</h2>
                <p className="login-subtitle">
                  Enviamos um link de recuperação para seu email. Clique no link para redefinir sua senha.
                </p>
              </div>

              <div className="login-form">
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                  <p>Verifique sua caixa de entrada e spam</p>
                </div>

                <button 
                  className="btn-primary login-btn"
                  onClick={switchToLogin}
                >
                  <i className="fas fa-arrow-left"></i>
                  Voltar ao Login
                </button>

                <div className="login-footer">
                  <p className="resend-info">
                    Não recebeu o email? Aguarde alguns minutos ou tente novamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-content">
            <div className="login-header">
              <div className="login-logo">
                <i className="fas fa-key"></i>
              </div>
              <h2>Recuperar Senha</h2>
              <p className="login-subtitle">
                Digite seu email para receber um link de recuperação de senha
              </p>
            </div>

            <div className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    id="email"
                    type="email"
                    placeholder="Digite seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="form-input"
                    autoFocus
                  />
                </div>
              </div>

              <button 
                className={`btn-primary login-btn ${loading ? 'loading' : ''}`} 
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Enviando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Enviar Link de Recuperação
                  </>
                )}
              </button>

              <div className="login-footer">
                <p className="auth-switch" onClick={switchToLogin}>
                  Lembrou da senha? <span>Fazer login</span>
                </p>
              </div>

              {message && (
                <div className={`auth-message ${message.includes('enviado') ? 'success' : 'error'}`}>
                  <i className={`fas ${message.includes('enviado') ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
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