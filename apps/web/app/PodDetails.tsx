'use client';

import { X, Info, AlertTriangle, Terminal, Clock, Globe, Cpu, Tag } from 'lucide-react';
import LogViewer from './LogViewer';
import AlertsList from './components/AlertsList';

interface Pod {
  name: string;
  namespace: string;
  status: string;
  nodeName: string;
  podIP?: string;
  startTime?: string;
  labels?: Record<string, string>;
}

interface PodDetailsProps {
  pod: Pod;
  onClose: () => void;
}

export default function PodDetails({ pod, onClose }: PodDetailsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass w-full max-w-6xl h-[90vh] flex flex-col rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[var(--accent-glow)] text-[var(--accent)]">
              <BoxIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{pod.name}</h2>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="text-slate-400">Namespace:</span>
                <span className="text-[var(--accent)] font-medium">{pod.namespace}</span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-slate-500">{pod.podIP || 'No IP'}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white hover:rotate-90 duration-300"
          >
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pod Info Card */}
            <div className="glass p-6 rounded-3xl bg-white/[0.01] flex flex-col gap-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={16} />
                Pod Information
              </h3>
              <div className="grid gap-4">
                <InfoRow icon={<Clock size={16} />} label="Started" value={pod.startTime ? new Date(pod.startTime).toLocaleString() : 'Unknown'} />
                <InfoRow icon={<Cpu size={16} />} label="Node" value={pod.nodeName} />
                <InfoRow icon={<Globe size={16} />} label="Pod IP" value={pod.podIP || 'N/A'} />
                <div className="mt-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-3">Labels</span>
                  <div className="flex flex-wrap gap-2">
                    {pod.labels ? Object.entries(pod.labels).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                        {k}: {v}
                      </span>
                    )) : <span className="text-xs text-slate-600">No labels</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="lg:col-span-2 glass p-6 rounded-3xl bg-white/[0.01] flex flex-col gap-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={16} className="text-[var(--warning)]" />
                Recent Alerts
              </h3>
              <div className="flex-1 flex flex-col overflow-hidden min-h-[200px]">
                <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                  <AlertsList apiUrl="/api/proxy" target={pod.name} compact={true} />
                </div>
              </div>
            </div>

            {/* Log Viewer Section */}
            <div className="lg:col-span-3 mt-4">
               <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={16} />
                  Live Logs
                </h3>
               </div>
               <div className="h-[500px] rounded-3xl overflow-hidden border border-white/5 relative">
                  <LogViewer 
                    podName={pod.name} 
                    namespace={pod.namespace} 
                    onClose={() => {}} 
                    isEmbedded 
                  />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BoxIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium text-slate-300">{value}</span>
    </div>
  );
}
