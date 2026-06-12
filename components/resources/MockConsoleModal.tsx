'use client';

import { useEffect, useRef, useState } from 'react';

type MockConsoleModalProps = {
  open: boolean;
  onClose: () => void;
  vmName: string;
  publicIp: string;
};

type TerminalLine = {
  type: 'prompt' | 'output' | 'system';
  text: string;
};

const CANNED_COMMANDS: Record<string, string[]> = {
  uptime: [' 14:32:01 up 2 days,  4:15,  0 users,  load average: 0.12, 0.08, 0.05'],
  'df -h': [
    'Filesystem      Size  Used Avail Use% Mounted on',
    '/dev/vda1        80G   24G   53G  32% /',
    'tmpfs           4.0G     0  4.0G   0% /dev/shm',
  ],
  help: ['Available demo commands: uptime, df -h, whoami, exit'],
  whoami: ['pico'],
};

export function MockConsoleModal({ open, onClose, vmName, publicIp }: MockConsoleModalProps) {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: `Connected to ${publicIp} (${vmName})` },
    { type: 'system', text: 'Demo console — canned responses only, no real SSH.' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  if (!open) return null;

  function runCommand(command: string) {
    const trimmed = command.trim();
    if (!trimmed) return;

    setLines((prev) => [...prev, { type: 'prompt', text: `$ ${trimmed}` }]);

    if (trimmed === 'exit') {
      onClose();
      return;
    }

    const output = CANNED_COMMANDS[trimmed];
    if (output) {
      setLines((prev) => [
        ...prev,
        ...output.map((text) => ({ type: 'output' as const, text })),
      ]);
    } else {
      setLines((prev) => [
        ...prev,
        { type: 'output', text: `bash: ${trimmed}: command not found (demo console)` },
      ]);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    runCommand(input);
    setInput('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-console-title"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-[#0d1117] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-4 py-3">
          <div>
            <h2 id="mock-console-title" className="font-body-base text-body-base font-semibold text-white">
              VM Console
            </h2>
            <p className="font-body-sm text-body-sm text-gray-400">
              Demo terminal — try <span className="font-code-inline">uptime</span> or{' '}
              <span className="font-code-inline">df -h</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-gray-400 hover:text-white"
            aria-label="Close console"
          >
            close
          </button>
        </div>

        <div
          ref={scrollRef}
          className="max-h-80 overflow-y-auto px-4 py-3 font-mono text-sm text-gray-200"
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={
                line.type === 'system'
                  ? 'text-gray-500'
                  : line.type === 'prompt'
                    ? 'text-emerald-400'
                    : 'text-gray-300'
              }
            >
              {line.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-outline-variant/40 px-4 py-3">
          <span className="font-mono text-sm text-emerald-400">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent font-mono text-sm text-white outline-none"
            placeholder="uptime"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
