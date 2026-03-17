import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link2 } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await register(username, password);
      else await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">LinkBox</h1>
        </div>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {isRegister ? '创建账号，开始收藏链接' : '登录你的链接收藏箱'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-gray-500">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            className="text-indigo-600 hover:underline ml-1"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
          >
            {isRegister ? '去登录' : '注册'}
          </button>
        </p>
      </div>
    </div>
  );
}
