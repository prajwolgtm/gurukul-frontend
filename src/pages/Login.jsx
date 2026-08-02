import { useState } from 'react';
import { login, loginParent } from '../api/auth';
import { useAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';

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
      navigate(isParentLogin ? '/parent-dashboard' : user?.role === 'Security' ? '/security-scanner' : '/');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero-copy">
          <div className="login-mark">
            <span>G</span>
          </div>
          <h1>Gurukul</h1>
          <p>Modern school operations for students, teachers, classes, exams, attendance, and parent requests.</p>
          <div className="login-feature-strip">
            <span>Student records</span>
            <span>Exam planning</span>
            <span>Attendance</span>
            <span>Reports</span>
          </div>
        </section>

        <section>
          <div className="login-card">
          <div className="login-tabs">
            <button
              onClick={() => setIsParentLogin(false)}
              className={`login-tab ${!isParentLogin ? 'active' : ''}`}
            >
              Staff Login
            </button>
            <button
              onClick={() => setIsParentLogin(true)}
              className={`login-tab ${isParentLogin ? 'active' : ''}`}
            >
              Parent Login
            </button>
          </div>

          <div className="login-card-body">
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="login-form">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {isParentLogin ? 'Parent Phone or Email' : 'Email Address'}
                </label>
                <input
                  type={isParentLogin ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isParentLogin ? 'Phone number or parent email' : 'Enter your email'}
                  required
                  className="form-control"
                />
              </div>

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
                    className="form-control font-mono"
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
                    className="form-control"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (isParentLogin && dob.length !== 8)}
                className="login-button"
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

            <div className="login-test-box">
              <p><span className="font-semibold">Admin:</span> admin@demo.com / admin123</p>
            </div>
          </div>
        </div>

        <p className="login-footer">
          Gurukul Education System
        </p>
        </section>
      </div>
    </div>
  );
};

export default Login;
