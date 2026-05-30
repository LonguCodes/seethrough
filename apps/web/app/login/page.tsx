'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokens } from '../../lib/auth';
import { Lock, User, Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';
import api from '../../lib/api';

interface SsoProvider {
  id: string;
  name: string;
  type: string;
}

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<SsoProvider[]>([]);
  const [ssoLoading, setSsoLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle SSO callback redirect
  useEffect(() => {
    const ssoAccessToken = searchParams.get('sso_access_token');
    const ssoRefreshToken = searchParams.get('sso_refresh_token');
    const ssoError = searchParams.get('sso_error');

    if (ssoError) {
      setError(decodeURIComponent(ssoError));
      router.replace('/login');
      return;
    }

    if (ssoAccessToken && ssoRefreshToken) {
      setTokens({
        accessToken: ssoAccessToken,
        refreshToken: ssoRefreshToken,
      });
      router.push('/');
      router.refresh();
      return;
    }
  }, [searchParams, router]);

  // Fetch SSO providers
  useEffect(() => {
    const fetchSsoProviders = async () => {
      try {
        const data: any = await api.get('auth/sso/providers').json();
        setSsoProviders(data);
      } catch (err) {
        // SSO might not be configured - that's fine
      }
    };
    fetchSsoProviders();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data: any = await api.post('auth/login', {
        json: { username, password },
      }).json();

      setTokens(data);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setError(data.message || 'Invalid credentials');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async (provider: SsoProvider) => {
    setSsoLoading(true);
    setError('');
    try {
      const data: any = await api.get(`auth/sso/authorize/${provider.id}`).json();
      window.location.href = data.url;
    } catch (err: any) {
      if (err.response) {
        const data = await err.response.json();
        setError(data.message || 'Failed to initiate SSO login');
      } else {
        setError('Failed to initiate SSO login');
      }
      setSsoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-[#020617] overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/10 blur-[100px]" />

      {/* Login Card */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden group">
          {/* Subtle line flash effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 shadow-lg shadow-blue-900/20">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Seethrough</h1>
            <p className="text-slate-400 mt-2">Kubernetes Monitoring System</p>
          </div>

          {/* SSO Buttons */}
          {ssoProviders.length > 0 && (
            <div className="mb-6 space-y-3">
              <p className="text-xs text-slate-500 text-center uppercase tracking-widest">Single Sign-On</p>
              {ssoProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSsoLogin(provider)}
                  disabled={ssoLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogIn size={18} className="text-slate-400" />
                  Sign in with {provider.name}
                </button>
              ))}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600 uppercase">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40 relative overflow-hidden group/btn"
            >
              <span className="relative z-10 flex items-center justify-center">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Sign In'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}