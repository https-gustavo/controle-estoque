import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

/**
 * Componente para redefinição de senha
 * Permite ao usuário definir uma nova senha após clicar no link do email
 */
export default function ResetPassword({ onPasswordReset }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isValidSession, setIsValidSession] = useState(null); // null = carregando, true = válido, false = inválido

  /**
   * Verifica se há uma sessão válida para redefinição de senha
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('=== DEBUG RESET PASSWORD ===');
        console.log('URL completa:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash:', window.location.hash);
        
        // Verifica parâmetros da URL (tanto search quanto hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Tenta pegar tokens do search params primeiro
        let accessToken = urlParams.get('access_token');
        let refreshToken = urlParams.get('refresh_token');
        let type = urlParams.get('type');
        
        // Se não encontrou no search, tenta no hash
        if (!accessToken) {
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          type = hashParams.get('type');
        }
        
        console.log('Tokens encontrados:', { 
          accessToken: accessToken ? 'SIM' : 'NÃO', 
          refreshToken: refreshToken ? 'SIM' : 'NÃO', 
          type 
        });

        if (type === 'recovery' && accessToken && refreshToken) {
          console.log('Tentando definir sessão com tokens...');
          // Define a sessão com os tokens da URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Erro ao definir sessão:', error);
            setIsValidSession(false);
            setMessage('Link de recuperação inválido ou expirado');
          } else {
            console.log('Sessão definida com sucesso:', data);
            setIsValidSession(true);
          }
        } else {
          console.log('Verificando sessão existente...');
          // Verifica se já existe uma sessão ativa
          const { data: { session } } = await supabase.auth.getSession();
          console.log('Sessão existente:', !!session);
          console.log('Detalhes da sessão:', session);
          
          if (session) {
            setIsValidSession(true);
          } else {
            setIsValidSession(false);
            setMessage('Link de recuperação inválido ou expirado');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setIsValidSession(false);
        setMessage('Erro ao verificar link de recuperação');
      }
    };

    checkSession();
  }, []);

  /**
   * Calcula a força da senha
   */
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    return strength;
  };

  /**
   * Atualiza a força da senha quando a senha muda
   */
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  /**
   * Processa a redefinição de senha
   */
  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setMessage('Por favor, preencha todos os campos');
      return;
    }

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

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Senha redefinida com sucesso!');
        setTimeout(() => {
          if (onPasswordReset) {
            onPasswordReset();
          } else {
            // Redireciona para a página inicial usando caminho relativo
            window.location.href = './';
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      setMessage('Erro ao redefinir senha. Tente novamente.');
    }

    setLoading(false);
  };

  /**
   * Manipula a tecla Enter para submeter o formulário
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleResetPassword();
    }
  };

  /**
   * Retorna a cor da barra de força da senha
   */
  const getStrengthColor = () => {
    if (passwordStrength < 50) return '#ff4757';
    if (passwordStrength < 75) return '#ffa502';
    return '#2ed573';
  };

  /**
   * Retorna o texto da força da senha
   */
  const getStrengthText = () => {
    if (passwordStrength < 25) return 'Muito fraca';
    if (passwordStrength < 50) return 'Fraca';
    if (passwordStrength < 75) return 'Média';
    return 'Forte';
  };

  // Estado de carregamento - mostra loading enquanto verifica a sessão
  if (isValidSession === null) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            <div className="login-content">
              <div className="login-header">
                <div className="login-logo">
                  <i className="fas fa-spinner fa-spin"></i>
                </div>
                <h2>Verificando Link</h2>
                <p className="login-subtitle">
                  Aguarde enquanto verificamos seu link de recuperação...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sessão inválida - mostra erro
  if (isValidSession === false) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            <div className="login-content">
              <div className="login-header">
                <div className="login-logo">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Link Inválido</h2>
                <p className="login-subtitle">
                  O link de recuperação é inválido ou expirou
                </p>
              </div>

              <div className="login-form">
                <div className="error-message">
                  <i className="fas fa-times-circle"></i>
                  <p>{message}</p>
                </div>

                <button 
                  className="btn-primary login-btn"
                  onClick={() => window.location.href = './'}
                >
                  <i className="fas fa-home"></i>
                  Voltar ao Início
                </button>
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
                <i className="fas fa-lock"></i>
              </div>
              <h2>Nova Senha</h2>
              <p className="login-subtitle">
                Digite sua nova senha para concluir a recuperação
              </p>
            </div>

            <div className="login-form">
              <div className="form-group">
                <label htmlFor="password">Nova Senha</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="form-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div 
                        className="strength-fill" 
                        style={{ 
                          width: `${passwordStrength}%`,
                          backgroundColor: getStrengthColor()
                        }}
                      ></div>
                    </div>
                    <span className="strength-text" style={{ color: getStrengthColor() }}>
                      {getStrengthText()}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                
                {confirmPassword && password !== confirmPassword && (
                  <div className="password-mismatch">
                    <i className="fas fa-times-circle"></i>
                    As senhas não coincidem
                  </div>
                )}
              </div>

              <div className="password-requirements">
                <p>A senha deve conter:</p>
                <ul>
                  <li className={password.length >= 8 ? 'valid' : ''}>
                    <i className={`fas ${password.length >= 8 ? 'fa-check' : 'fa-times'}`}></i>
                    Pelo menos 8 caracteres
                  </li>
                  <li className={password.match(/[a-z]/) ? 'valid' : ''}>
                    <i className={`fas ${password.match(/[a-z]/) ? 'fa-check' : 'fa-times'}`}></i>
                    Uma letra minúscula
                  </li>
                  <li className={password.match(/[A-Z]/) ? 'valid' : ''}>
                    <i className={`fas ${password.match(/[A-Z]/) ? 'fa-check' : 'fa-times'}`}></i>
                    Uma letra maiúscula
                  </li>
                  <li className={password.match(/[0-9]/) ? 'valid' : ''}>
                    <i className={`fas ${password.match(/[0-9]/) ? 'fa-check' : 'fa-times'}`}></i>
                    Um número
                  </li>
                </ul>
              </div>

              <button 
                className={`btn-primary login-btn ${loading ? 'loading' : ''}`} 
                onClick={handleResetPassword}
                disabled={loading || password !== confirmPassword || passwordStrength < 50}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Redefinindo...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Redefinir Senha
                  </>
                )}
              </button>

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
    </div>
  );
}