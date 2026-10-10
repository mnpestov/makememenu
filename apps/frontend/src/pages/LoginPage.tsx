import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Home } from 'lucide-react';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, refreshToken } = await api.auth.login({ username, password });
      login(accessToken, refreshToken);
    } catch (err: any) {
      setError(err.message || 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="card login__card">
        <div className="login__brand">
          <Home className="login__brand-icon" size={32} />
          <h1 className="login__brand-title">Make Me Menu</h1>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__field">
            <label className="login__label">Логин</label>
            <input
              className="login__input"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите логин"
            />
          </div>

          <div className="login__field">
            <label className="login__label">Пароль</label>
            <input
              className="login__input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
            />
          </div>

          {error && <p className="login__error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary login__submit"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
