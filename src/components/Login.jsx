import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/NeonLogin.css';
export default function Login({ switchToSignup, switchToForgotPassword, setUser, onStartDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreatorLogo, setShowCreatorLogo] = useState(true);
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
      const msg = String(error.message || '');
      const friendly = msg.toLowerCase().includes('invalid') ? 'Email ou senha inválidos' : msg;
      setMessage(friendly);
    } else {
      setUser(data.user);
      setMessage('Login bem-sucedido!');
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const startDemo = () => {
    try { onStartDemo?.(); } finally { navigate('/dashboard'); }
  };


  return (
    <div className="nl-root">
      <div className="nl-grid" />
      <div className="nl-blob a" />
      <div className="nl-blob b" />
      <div className="nl-blob c" />

      <div className="nl-shell">
        <section className="nl-left" aria-label="Apresentação">
          <div className="nl-brand">
            <span className="nl-mark"><i className="fas fa-box"></i></span>
            <span>Tech Estoque</span>
          </div>
          <h1 className="nl-headline">
            Controle total. <span>Simples.</span> Inteligente.
          </h1>
          <p className="nl-tagline">
            Um mini ERP com estoque, vendas e financeiro em tempo real. Pronto para operação e portfólio.
          </p>
          <div className="nl-features" aria-label="Recursos">
            <div className="nl-feature">
              <div className="nl-feature-k"><i className="fas fa-eye"></i> Demo</div>
              <div className="nl-feature-v">Entrar como visitante sem afetar dados reais</div>
            </div>
            <div className="nl-feature">
              <div className="nl-feature-k"><i className="fas fa-layer-group"></i> Cadastro em lote</div>
              <div className="nl-feature-v">Monte uma lista de produtos antes de salvar</div>
            </div>
            <div className="nl-feature">
              <div className="nl-feature-k"><i className="fas fa-barcode"></i> Scanner</div>
              <div className="nl-feature-v">Leitor de código de barras para operação rápida</div>
            </div>
          </div>

          <div className="nl-mock" aria-label="Mock do dashboard">
            <div className="nl-mock-inner">
              <div className="nl-mock-top">
                <div className="nl-mock-title">Dashboard</div>
                <div className="nl-pills" aria-label="Recursos">
                  <span className="nl-pill">Receita</span>
                  <span className="nl-pill">Despesas</span>
                  <span className="nl-pill">Lucro</span>
                </div>
              </div>
              <div className="nl-mock-note">Preview ilustrativo</div>
              <div className="nl-mock-grid">
                <div className="nl-mini">
                  <div className="nl-mini-k">Receita</div>
                  <div className="nl-mini-v">R$ —</div>
                </div>
                <div className="nl-mini">
                  <div className="nl-mini-k">Lucro</div>
                  <div className="nl-mini-v">R$ —</div>
                </div>
                <div className="nl-mini">
                  <div className="nl-mini-k">Estoque</div>
                  <div className="nl-mini-v">— itens</div>
                </div>
              </div>
              <div className="nl-spark" aria-label="Gráfico animado">
                <svg viewBox="0 0 320 54" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="nlGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="rgba(34,211,238,0.95)" />
                      <stop offset="50%" stopColor="rgba(168,85,247,0.95)" />
                      <stop offset="100%" stopColor="rgba(59,130,246,0.95)" />
                    </linearGradient>
                  </defs>
                  <path d="M10 40 C 40 10, 70 44, 100 18 S 160 48, 190 22 S 250 40, 310 14" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="nl-right" aria-label="Login">
          <div className="nl-card" aria-busy={loading}>
            <div className="nl-card-inner">
              <div className="nl-card-head">
                <h2 className="nl-title">Entrar</h2>
                <p className="nl-sub">Acesse sua conta ou entre como visitante</p>
              </div>
              <div className="nl-form">
                <div className="nl-field">
                  <span className="nl-icon"><i className="fas fa-envelope"></i></span>
                  <input
                    id="nl-email"
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder=" "
                    autoComplete="email"
                  />
                  <label htmlFor="nl-email">E-mail</label>
                </div>
                <div className="nl-field">
                  <span className="nl-icon"><i className="fas fa-lock"></i></span>
                  <input
                    id="nl-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder=" "
                    autoComplete="current-password"
                  />
                  <label htmlFor="nl-pass">Senha</label>
                  <button type="button" className="nl-eye" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>

                <div className="nl-actions">
                  <button className="nl-btn primary" onClick={handleLogin} disabled={loading || !email || !password}>
                    {loading ? <><i className="fas fa-spinner fa-spin"></i>Entrando...</> : <>Entrar</>}
                  </button>
                  <button className="nl-btn secondary" type="button" onClick={startDemo} disabled={loading}>
                    Entrar como visitante
                  </button>
                </div>

                <div className="nl-links">
                  <button className="nl-link" type="button" onClick={switchToForgotPassword}>Esqueci minha senha</button>
                  <button className="nl-link" type="button" onClick={switchToSignup}>Criar conta</button>
                </div>

                {message && (
                  <div role="alert" aria-live="polite" className={`nl-alert ${message.includes('sucedido') ? 'success' : 'error'}`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <a className="nl-creditline" href="https://techsolutions.net.br" target="_blank" rel="noopener noreferrer" aria-label="Créditos">
        {showCreatorLogo && (
          <img
            className="nl-credit-logo"
            src={`${import.meta.env.BASE_URL || '/'}creator-logo.png`}
            alt=""
            onError={() => setShowCreatorLogo(false)}
          />
        )}
        <span>Desenvolvido por</span>
      </a>
    </div>
  );
}
