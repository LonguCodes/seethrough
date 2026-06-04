'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCodeLib from 'qrcode';
import { Shield, Key, Trash2, Check, AlertCircle, RefreshCw, Fingerprint, Copy } from 'lucide-react';
import api from '../../lib/api';

interface MfaEnrollment {
  id: string;
  type: string;
  mfaConfig: {
    id: string;
    name: string;
    type: string;
  };
  verified: boolean;
  enabled: boolean;
  secret?: string;
  lastUsedAt?: string;
  createdAt: string;
}

interface MfaConfigOption {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

// Helper: encode ArrayBuffer to Base64URL (WebAuthn format)
function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: generate otpauth:// URL for QR code
function generateTotpUrl(accountName: string, secretBase32: string, issuer: string): string {
  const params = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`;
}

function TotpQrCode({ totpUrl }: { totpUrl: string }) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    QRCodeLib.toDataURL(totpUrl, { width: 200, margin: 2, color: { dark: '#000', light: '#fff' } })
      .then(setDataUrl)
      .catch(() => {});
  }, [totpUrl]);
  if (!dataUrl) {
    return <div className="w-20 h-20 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>;
  }
  return <img src={dataUrl} alt="TOTP QR Code" width={80} height={80} />;
}

function TotpEnrollPanel({ secret, verifyCode, onVerifyCodeChange, onVerify, isPending }: {
  secret: string;
  verifyCode: string;
  onVerifyCodeChange: (code: string) => void;
  onVerify: () => void;
  isPending: boolean;
}) {
  const totpUrl = generateTotpUrl('user@seethrough', secret, 'SeeThrough');
  return (
    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <p className="text-xs text-slate-400 mb-3">Scan the QR code or enter the secret manually in your authenticator app.</p>
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white rounded-xl shrink-0">
          <TotpQrCode totpUrl={totpUrl} />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <p className="text-xs text-slate-500">Manual secret:</p>
          <div className="flex items-center gap-2">
            <code className="text-sm text-slate-200 font-mono bg-black/40 px-3 py-1.5 rounded-lg block select-all truncate">{secret}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(secret)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Copy secret"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <input type="text" maxLength={6} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] font-mono text-lg tracking-[0.5em] text-center" placeholder="000000" value={verifyCode} onChange={ev => onVerifyCodeChange(ev.target.value)} />
        <button onClick={onVerify} disabled={isPending || verifyCode.length < 6} className="px-4 py-2.5 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
          {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} Verify
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [verifyCode, setVerifyCode] = useState<Record<string, string>>({});
  const [passkeyCreating, setPasskeyCreating] = useState(false);

  const { data: enrollments = [], isLoading, error } = useQuery({
    queryKey: ['mfa-enrollments'],
    queryFn: async () => {
      const data: any = await api.get('mfa/enrollments').json();
      return data as MfaEnrollment[];
    },
  });

  const { data: allConfigs = [] } = useQuery({
    queryKey: ['mfa-configs-list'],
    queryFn: async () => {
      const data: any = await api.get('mfa-configs').json();
      return (data as MfaConfigOption[]).filter(c => c.enabled);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ enrollmentId, code }: { enrollmentId: string; code: string }) => {
      const result: any = await api.post(`mfa/enroll/${enrollmentId}/verify`, { json: { code } }).json();
      return result;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mfa-enrollments'] });
      setVerifyCode(prev => { const n = { ...prev }; delete n[vars.enrollmentId]; return n; });
    },
    onError: () => { alert('Verification failed.'); },
  });

  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      await api.delete(`mfa/enrollments/${enrollmentId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mfa-enrollments'] }); },
    onError: () => { alert('Failed to remove.'); },
  });

  const handleTotpEnroll = (mfaConfigId: string) => {
    // TOTP enrollment still uses the old flow
    api.post(`mfa/enroll/${mfaConfigId}`).json().then(() => {
      queryClient.invalidateQueries({ queryKey: ['mfa-enrollments'] });
    }).catch(() => {
      alert('Failed to enroll. You may already be enrolled in this method.');
    });
  };

  const handlePasskeyEnroll = async (mfaConfigId: string) => {
    if (!window.PublicKeyCredential) {
      alert('Passkeys are not supported in this browser.');
      return;
    }

    setPasskeyCreating(true);
    try {
      // 1. Get registration options from server
      const options: any = await api.post('mfa/passkey/register-options', {
        json: { mfaConfigId },
      }).json();

      // 2. Call navigator.credentials.create()
      const credential = (await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          user: {
            ...options.user,
            id: Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          },
          excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
            ...cred,
            id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          })),
        },
      })) as any;

      // 3. Send the response back to server for verification
      const result: any = await api.post('mfa/passkey/register-verify', {
        json: {
          mfaConfigId,
          response: credential ? {
            id: credential.id,
            rawId: bufferToBase64URL(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
              attestationObject: bufferToBase64URL(credential.response.attestationObject),
            },
          } : null,
        },
      }).json();

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['mfa-enrollments'] });
      } else {
        alert('Passkey registration failed.');
      }
    } catch (err: any) {
      console.error('Passkey registration error:', err);
      alert('Passkey registration failed: ' + (err.message || 'Unknown error'));
    } finally {
      setPasskeyCreating(false);
    }
  };

  const handleEnroll = (mfaConfigId: string) => {
    const config = allConfigs.find(c => c.id === mfaConfigId);
    if (config?.type === 'passkey') {
      handlePasskeyEnroll(mfaConfigId);
    } else {
      handleTotpEnroll(mfaConfigId);
    }
  };

  const handleVerify = (enrollmentId: string) => {
    const code = verifyCode[enrollmentId];
    if (!code || code.length < 6) return;
    verifyMutation.mutate({ enrollmentId, code });
  };

  const handleRemove = (enrollmentId: string) => {
    if (!confirm('Remove this MFA method? You may be locked out if it is required.')) return;
    removeMutation.mutate(enrollmentId);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { totp: 'Authenticator App', email: 'Email', passkey: 'Passkey' };
    return labels[type] || type;
  };

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-screen">
        <header className="flex items-center gap-4 mb-12"><Shield size={32} className="text-[var(--accent)]" /><h1 className="text-4xl text-gradient">My Profile</h1></header>
        <div className="glass p-16 text-center rounded-3xl flex flex-col items-center gap-6"><AlertCircle size={48} className="text-[var(--danger)]" /><p className="text-slate-400 max-w-md">Failed to load MFA settings.</p></div>
      </div>
    );
  }

  const availableConfigs = allConfigs.filter(c => !enrollments.some(e => e.mfaConfig?.id === c.id));

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <header className="flex items-center gap-4 mb-12">
        <Shield size={32} className="text-[var(--accent)]" /><h1 className="text-4xl text-gradient">My Profile</h1>
      </header>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <Key size={24} className="text-[var(--accent)]" />Multi-Factor Authentication
          </h2>
          {availableConfigs.length > 0 && (
            <div className="relative">
              <select
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
                onChange={e => { if (e.target.value) handleEnroll(e.target.value); e.target.value = ''; }}
                defaultValue=""
              >
                <option value="" disabled>+ Enroll in MFA...</option>
                {availableConfigs.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({getTypeLabel(c.type)})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading || passkeyCreating ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
            <p className="text-sm text-slate-500">{passkeyCreating ? 'Creating passkey — follow your browser prompt...' : 'Loading MFA settings...'}</p>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center text-slate-400">
            <Key size={36} className="text-slate-500 mx-auto mb-4" />
            <p>No MFA methods enrolled. Add one to secure your account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enrollments.map(e => (
              <div key={e.id} className="glass rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-white">{e.mfaConfig?.name || getTypeLabel(e.type)}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] uppercase tracking-wider font-medium">{getTypeLabel(e.type)}</span>
                      {e.verified ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wider font-medium flex items-center gap-1"><Check size={10} /> Verified</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wider font-medium">Pending</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Enrolled: {new Date(e.createdAt).toLocaleDateString()}{e.lastUsedAt && ` · Last used: ${new Date(e.lastUsedAt).toLocaleString()}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRemove(e.id)} className="p-2 rounded-xl transition-colors bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/30" title="Remove"><Trash2 size={16} /></button>
                  </div>
                </div>

                {!e.verified && e.type === 'totp' && e.secret && (
                  <TotpEnrollPanel
                    secret={e.secret}
                    verifyCode={verifyCode[e.id] || ''}
                    onVerifyCodeChange={code => setVerifyCode(prev => ({ ...prev, [e.id]: code }))}
                    onVerify={() => handleVerify(e.id)}
                    isPending={verifyMutation.isPending}
                  />
                )}

                {!e.verified && e.type !== 'totp' && (
                  <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs text-slate-400 mb-3">Enter the verification code sent to your {getTypeLabel(e.type)}.</p>
                    <div className="flex items-center gap-3">
                      <input type="text" maxLength={6} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[var(--accent)] font-mono text-lg tracking-[0.5em] text-center" placeholder="000000" value={verifyCode[e.id] || ''} onChange={ev => setVerifyCode(prev => ({ ...prev, [e.id]: ev.target.value }))} />
                      <button onClick={() => handleVerify(e.id)} disabled={verifyMutation.isPending || (verifyCode[e.id]?.length || 0) < 6} className="px-4 py-2.5 rounded-xl text-white bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                        {verifyMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />} Verify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}