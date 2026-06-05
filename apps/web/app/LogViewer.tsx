'use client';

import { useEffect, useRef, useState } from 'react';

import Ansi from 'ansi-to-react';
import { X, Terminal, ChevronDown } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface LogViewerProps {
  podName: string;
  namespace: string;
  onClose: () => void;
  isEmbedded?: boolean;
}

export default function LogViewer({ podName, namespace, onClose, isEmbedded }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const logBuffer = useRef<string>('');

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('stream-logs', { podName, namespace });
    });

    socket.on('log-data', (data: { podName: string; data: string }) => {
      if (data.podName === podName) {
        const fullContent = logBuffer.current + data.data;
        const lines = fullContent.split('\n');
        // The last element is either an empty string (if ended with \n) or an incomplete line
        logBuffer.current = lines.pop() || '';
        
        if (lines.length > 0) {
          setLogs((prev) => [...prev, ...lines].slice(-1000));
        }
      }
    });

    socket.on('log-error', (err: { message: string }) => {
      setLogs((prev) => [...prev, `[ERROR] ${err.message}`]);
    });

    return () => {
      socket.emit('stop-logs', { podName });
      socket.disconnect();
    };
  }, [podName, namespace]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const content = (
    <div className={`glass w-full h-full flex flex-col overflow-hidden ${!isEmbedded ? 'max-w-5xl h-[80vh] rounded-3xl shadow-2xl border border-white/10' : ''}`}>
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)]">
            <Terminal size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Logs: <span className="text-[var(--accent)]">{podName}</span>
            </h3>
            {!isEmbedded && <p className="text-xs text-slate-500">Namespace: {namespace}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all ${autoScroll ? 'bg-[var(--accent)] text-white' : 'bg-white/5 text-slate-400'}`}
          >
            <ChevronDown size={14} className={autoScroll ? 'animate-bounce' : ''} />
            Auto-scroll
          </button>
          {!isEmbedded && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 p-6 overflow-y-auto font-mono text-sm bg-black/40 selection:bg-[var(--accent)] selection:text-white"
        onScroll={(e) => {
          const target = e.currentTarget;
          const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
          if (autoScroll && !isAtBottom) setAutoScroll(false);
        }}
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 animate-pulse">
            Waiting for logs...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="py-0.5 leading-relaxed break-all">
              <span className="text-slate-600 mr-3 select-none">{i + 1}</span>
              <Ansi className="text-slate-300 whitespace-pre-wrap">{log}</Ansi>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (isEmbedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {content}
    </div>
  );
}
