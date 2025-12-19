import { useState } from 'react';
import { login, loginParent } from '../api/auth';
import { useAuth } from '../store/auth';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const { loginSuccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isParentLogin, setIsParentLogin] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let resp;
      if (isParentLogin) {
        resp = await loginParent(email, dob);
      } else {
        resp = await login(email, password);
      }
      const token = resp?.token || resp?.data?.token;
      const user = resp?.user || resp?.data?.user || null;
      if (!token) throw new Error('Token missing in response');
      loginSuccess(token, user);
      navigate(isParentLogin ? '/parent-dashboard' : '/');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <span className="text-4xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Gurukul</h1>
          <p className="text-white/80 mt-1">Education Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setIsParentLogin(false)}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${
                !isParentLogin 
                  ? 'text-violet-700 bg-violet-50 border-b-2 border-violet-500' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              👤 Staff Login
            </button>
            <button
              onClick={() => setIsParentLogin(true)}
              className={`flex-1 py-4 text-sm font-semibold transition-all ${
                isParentLogin 
                  ? 'text-emerald-700 bg-emerald-50 border-b-2 border-emerald-500' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              👨‍👩‍👧 Parent Login
            </button>
          </div>

          <div className="p-8">
            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-rose-100 border-l-4 border-rose-500 text-rose-700 rounded-xl text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all text-slate-800"
                />
              </div>

              {/* Password or DOB */}
              {isParentLogin ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Child's Date of Birth
                  </label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="DDMMYYYY (e.g., 16082002)"
                    maxLength={8}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all text-slate-800 font-mono tracking-wider"
                  />
                  <p className="mt-2 text-xs text-slate-500">Format: DDMMYYYY</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all text-slate-800"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (isParentLogin && dob.length !== 8)}
                className={`w-full py-3.5 rounded-xl font-semibold text-white text-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg ${
                  isParentLogin
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200'
                    : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-200'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  `Sign In${isParentLogin ? ' as Parent' : ''}`
                )}
              </button>
            </form>

            {/* Register */}
            {!isParentLogin && (
              <p className="mt-6 text-center text-sm text-slate-600">
                Need a staff account?{' '}
                <Link to="/register-staff" className="text-violet-600 hover:text-violet-700 font-semibold">
                  Register here
                </Link>
              </p>
            )}

            {/* Test Accounts */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-400 text-center mb-3 font-medium">TEST ACCOUNTS</p>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
                <p><span className="font-semibold">Admin:</span> admin@demo.com / admin123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-8">
          © 2025 Gurukul Education System
        </p>
      </div>
    </div>
  );
};

export default Login;
