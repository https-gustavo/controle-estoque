import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Logout({ setUser }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Erro ao sair: ' + error.message);
    } else {
      setUser(null);          // limpa usuário
      navigate('/');          // volta para login
      alert('✅ Logout realizado com sucesso!');
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}
