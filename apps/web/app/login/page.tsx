'use client';

import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useMutation, useQuery} from '@tanstack/react-query';
import {AuthTokens, setTokens} from '../../lib/auth';
import {Eye, EyeOff, Fingerprint, Key, Lock, LogIn, ShieldCheck, User} from 'lucide-react';
import api from '../../lib/api';
import {useAuth} from "../../lib/use-auth";

// Helper: encode ArrayBuffer to Base64URL (WebAuthn format)
function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

interface AuthConfiguration {
  id: string;
  name: string;
  type: string;
}

function LoginForm() {
  const {refresh} = useAuth()

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaType, setMfaType] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);
  const passkeyStartedRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: configs = [], isLoading: configsLoading, isPlaceholderData } = useQuery({
    queryKey: ['auth-configurations'],
    queryFn: async () => {
      const data: any = await api.get('auth/configurations').json();
      const result = data as AuthConfiguration[];
      localStorage.setItem('cached-auth-configs', JSON.stringify(result));
      return result;
    },
    placeholderData: () => {
      const cached = localStorage.getItem('cached-auth-configs');
      if (cached) {
        try { return JSON.parse(cached) as AuthConfiguration[]; } catch { /* ignore */ }
      }
      return undefined;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const data: any = await api.post('auth/login', { json: body }).json();
      return data;
    },
    onSuccess: (data) => {
      if (data.mfaRequired && data.mfaChallenge) {
        setMfaRequired(true);
        setMfaChallenge(data.mfaChallenge);
        setMfaType(data.mfaChallenge.mfaMethodType || 'totp');
        if (data.mfaChallenge.mfaMethodType !== 'passkey') {
          setTimeout(() => mfaInputRef.current?.focus(), 100);
        }
        return;
      }
      setTokens(data);
      refresh()
      router.push('/');
      router.refresh();
    },
    onError: (err: any) => {
      if (err.response) {
        err.response.json().then((data: any) => setError(data.message || 'Invalid credentials'));
      } else {
        setError('An error occurred. Please try again.');
      }
    },
  });

  const mfaMutation = useMutation({
    mutationFn: async (code?: string) => {
      const verificationCode = code ?? mfaCode;
      return await api.post<AuthTokens>('mfa/verify', {
        json: {challengeToken: mfaChallenge.challengeToken, type: mfaType, code: verificationCode},
      }).json();
    },
    onSuccess: (data: AuthTokens) => {
      setTokens(data);
      setMfaRequired(false);
      setMfaChallenge(null);
      setMfaCode('');
      refresh();
      router.push('/');
      router.refresh();
    },
    onError: (err: any) => {
      setPasskeyLoading(false);
      passkeyStartedRef.current = false;
      if (err.response) {
        err.response.json().then((data: any) => setMfaError(data.message || 'Invalid verification code'));
      } else {
        setMfaError('Verification failed. Please try again.');
      }
    },
  });

  // Handle SSO callback redirect
  useEffect(() => {
    const ssoAccessToken = searchParams.get('sso_access_token');
    const ssoRefreshToken = searchParams.get('sso_refresh_token');
    const ssoError = searchParams.get('sso_error');
    const mfaRequiredParam = searchParams.get('mfa_required');
    const challengeToken = searchParams.get('challenge_token');

    if (ssoError) {
      setError(decodeURIComponent(ssoError));
      router.replace('/login');
      return;
    }

    if (mfaRequiredParam === 'true' && challengeToken) {
      setMfaRequired(true);
      setMfaChallenge({
        challengeToken,
        mfaMethodId: '',
        mfaMethodType: 'totp',
        mfaMethodName: 'Authenticator',
      });
      setMfaType('totp');
      router.replace('/login');
      return;
    }

    if (ssoAccessToken && ssoRefreshToken) {
      setTokens({
        accessToken: ssoAccessToken,
        refreshToken: ssoRefreshToken,
      });
      refresh();
      router.push('/');
      router.refresh();
      return;
    }
  }, [searchParams, router]);

  const passwordConfigs = configs.filter(c => c.type === 'password');
  const ssoConfigs = configs.filter(c => c.type === 'oidc' || c.type === 'saml');

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwConfig = passwordConfigs[0];
    if (!pwConfig) {
      setError('Password login is not configured');
      return;
    }

    loginMutation.mutate({ configId: pwConfig.id, username, password });
  };

  const handleSsoStart = async (config: AuthConfiguration) => {
    setError('');
    try {
      const data: any = await api.post('auth/login', { json: { configId: config.id } }).json();
      window.location.href = data.redirectUrl;
    } catch {
      setError('Failed to initiate login');
    }
  };

  const handleMfaVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) return;
    setMfaError('');
    mfaMutation.mutate(undefined);
  };

  const handlePasskeyAuth = useCallback(async () => {
    if (passkeyStartedRef.current) return;
    passkeyStartedRef.current = true;

    if (!window.PublicKeyCredential) {
      setMfaError('Passkeys are not supported in this browser.');
      passkeyStartedRef.current = false;
      return;
    }

    setPasskeyLoading(true);
    setMfaError('');

    try {
      // 1. Get authentication options from server
      const options: any = await api.post('mfa/passkey/authenticate-options', {
        json: { challengeToken: mfaChallenge.challengeToken },
      }).json();

      // 2. Call navigator.credentials.get()
      const assertion = (await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: Uint8Array.from(
            atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')),
            c => c.charCodeAt(0),
          ),
          allowCredentials: options.allowCredentials?.map((cred: any) => ({
            ...cred,
            id: Uint8Array.from(
              atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')),
              c => c.charCodeAt(0),
            ),
          })),
        },
      })) as any;

      if (!assertion) {
        setMfaError('Passkey authentication was cancelled.');
        setPasskeyLoading(false);
        passkeyStartedRef.current = false;
        return;
      }

      // 3. Encode the assertion response and send to MFA verify
      const assertionJson = JSON.stringify({
        id: assertion.id,
        rawId: bufferToBase64URL(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: bufferToBase64URL(assertion.response.clientDataJSON),
          authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
          signature: bufferToBase64URL(assertion.response.signature),
          userHandle: assertion.response.userHandle
            ? bufferToBase64URL(assertion.response.userHandle)
            : undefined,
        },
      });

      setMfaCode(assertionJson);
      setPasskeyLoading(false);

      // Trigger the mutation with the assertion as the code
      mfaMutation.mutate(assertionJson);
    } catch (err: any) {
      console.error('Passkey authentication error:', err);
      setMfaError(err.message || 'Passkey authentication failed.');
      setPasskeyLoading(false);
      passkeyStartedRef.current = false;
    }
  }, [mfaChallenge, mfaMutation]);

  // Automatically start passkey auth when user selects passkey type
  useEffect(() => {
    if (mfaType === 'passkey' && mfaChallenge?.challengeToken && !passkeyStartedRef.current) {
      handlePasskeyAuth();
    }
  }, [mfaType, mfaChallenge, handlePasskeyAuth]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 bg-[#020617] overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 shadow-lg shadow-blue-900/20">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Seethrough</h1>
            <p className="text-slate-400 mt-2">Kubernetes Monitoring System</p>
          </div>

          {/* SSO Buttons */}
          {(!configsLoading || (configsLoading && isPlaceholderData && configs.length > 0)) && ssoConfigs.length > 0 && (
            <div className="mb-6 space-y-3">
              <p className="text-xs text-slate-500 text-center uppercase tracking-widest">Single Sign-On</p>
              {ssoConfigs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => handleSsoStart(config)}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-xl transition-all duration-200"
                >
                  <LogIn size={18} className="text-slate-400" />
                  Sign in with {config.name}
                </button>
              ))}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600 uppercase">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            </div>
          )}

          {(!configsLoading || (configsLoading && isPlaceholderData && configs.length > 0)) && passwordConfigs.length > 0 && (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
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
                disabled={loginMutation.isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40 relative overflow-hidden group/btn"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {loginMutation.isPending ? (
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
          )}

          {configsLoading && !isPlaceholderData && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
              </div>
              <p className="text-sm text-slate-500">Loading sign-in options...</p>
            </div>
          )}

          {(!configsLoading || (configsLoading && isPlaceholderData && configs.length > 0)) && passwordConfigs.length === 0 && ssoConfigs.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p>No authentication methods configured.</p>
              <p className="text-xs mt-2">Contact your administrator.</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              Contact your administrator if you need access.
            </p>
          </div>
        </div>

        {/* MFA Verification Modal */}
        {mfaRequired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-sm bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
              <div className="text-center mb-8">
                {mfaType === 'passkey' && passkeyLoading ? (
                  <>
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-4">
                      <Fingerprint className="w-7 h-7 text-violet-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Passkey Verification</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      Follow your browser prompt to authenticate with your passkey.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-4">
                      <Key className="w-7 h-7 text-amber-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      {mfaChallenge?.mfaMethodName
                        ? `Verify with ${mfaChallenge.mfaMethodName} to continue.`
                        : 'Enter the verification code from your authenticator app to continue.'}
                    </p>
                  </>
                )}
              </div>
              {mfaType === 'passkey' && passkeyLoading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin" />
                  <p className="text-sm text-slate-400">Waiting for passkey...</p>
                </div>
              ) : (
                <form onSubmit={handleMfaVerify} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Verification Code</label>
                    <input
                      ref={mfaInputRef}
                      type="text"
                      maxLength={6}
                      className="block w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-white text-2xl font-mono tracking-[0.5em] text-center placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                    />
                  </div>
                  {mfaError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in slide-in-from-top-2">
                      {mfaError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={mfaMutation.isPending || mfaCode.length < 6}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/40"
                  >
                    {mfaMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMfaRequired(false); setMfaChallenge(null); setMfaCode(''); setMfaError(''); setPasskeyLoading(false); passkeyStartedRef.current = false; }}
                    className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
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