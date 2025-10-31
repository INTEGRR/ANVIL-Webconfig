import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Keyboard, Loader } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, username);

    if (error) {
      setError(error.message || 'Failed to create account');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak' };
    if (password.length < 10) return { strength: 2, label: 'Medium' };
    return { strength: 3, label: 'Strong' };
  };

  const { strength, label } = getPasswordStrength();

  return (
    <div className="min-h-screen bg-brand-brown flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Keyboard className="w-16 h-16 text-brand-beige" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Anvil Native</h1>
          <p className="text-brand-sage">Create your account</p>
        </div>

        <div className="bg-brand-teal rounded-2xl p-8 shadow-xl border border-brand-sage/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-brand-blue mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                placeholder="johndoe"
                minLength={3}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-blue mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-blue mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                placeholder="••••••••"
                minLength={6}
              />
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    <div className={`h-1 flex-1 rounded ${strength >= 1 ? 'bg-red-500' : 'bg-brand-sage/30'}`} />
                    <div className={`h-1 flex-1 rounded ${strength >= 2 ? 'bg-yellow-500' : 'bg-brand-sage/30'}`} />
                    <div className={`h-1 flex-1 rounded ${strength >= 3 ? 'bg-green-500' : 'bg-brand-sage/30'}`} />
                  </div>
                  <p className="text-xs text-brand-sage">{label}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-blue mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-brand-teal/60 text-white px-4 py-3 rounded-lg border border-brand-sage/30 focus:border-brand-beige outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-beige hover:bg-brand-beige/90 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-brand-sage text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-beige hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
