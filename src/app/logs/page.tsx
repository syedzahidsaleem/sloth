/**
 * Sloth UI Component
 * Author: Syed Zahid Saleem <syedzahidsaleem2@gmail.com>
 */

import { useState, useMemo } from 'react';
import { Trash2, Download, Search } from 'lucide-react';
import { Input, Button, Badge } from '@/components/ui';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  scope: string;
  message: string;
}

const SAMPLE_LOGS: LogEntry[] = [
  { id: '1', timestamp: '12:00:26.742', level: 'info', scope: 'engine:fastapi', message: 'Application startup complete on port 8001 (Uvicorn)' },
  { id: '2', timestamp: '12:00:27.104', level: 'info', scope: 'engine:graph', message: 'Loaded HeteroGraph with 5 node types and 7 hyperedge relations' },
  { id: '3', timestamp: '12:00:27.521', level: 'info', scope: 'engine:faiss', message: 'IndexFlatIP loaded 500 track MERT embeddings (768-dim)' },
  { id: '4', timestamp: '12:00:45.919', level: 'info', scope: 'downloader', message: 'FastAPI downloader daemon listening on port 8802' },
  { id: '5', timestamp: '12:01:12.829', level: 'info', scope: 'listen-together', message: 'WebSocket sync server listening on port 8000' },
  { id: '6', timestamp: '12:02:15.312', level: 'debug', scope: 'source:resolver', message: 'Resolved stream URL for ISRC USUM71300025 via piped engine (128kbps opus)' },
  { id: '7', timestamp: '12:03:04.110', level: 'warn', scope: 'cache:sponsorblock', message: 'SponsorBlock segment overlap: skipping [14.2s - 22.8s]' },
  { id: '8', timestamp: '12:04:18.420', level: 'info', scope: 'sqlite:db', message: 'Checkpoint executed on sloth.db: 0 wal frames backfilled' },
];

const LEVEL_COLORS: Record<LogEntry['level'], 'green' | 'yellow' | 'red' | 'cyan'> = {
  info: 'cyan',
  warn: 'yellow',
  error: 'red',
  debug: 'green',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'all' && log.level !== selectedLevel) return false;
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.scope.toLowerCase().includes(q)
      );
    });
  }, [logs, selectedLevel, filterQuery]);

  const handleExport = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.scope}]: ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sloth-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="surface-background p-6 space-y-6 select-none" data-testid="logs-page">
      {/* Header bar */}
      <div className="border-border flex flex-wrap items-center justify-between gap-4 pb-3 border-b-(length:--border-width)">
        <div className="flex items-center gap-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Application Logs
          </h1>
          <Badge variant="pill" color="cyan" className="text-xs font-mono">
            {filteredLogs.length} events
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            className="flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export Logs</span>
          </Button>

          <Button
            size="sm"
            variant="text"
            onClick={() => setLogs([])}
            className="flex items-center gap-1.5 text-accent-red"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          tone="secondary"
          size="sm"
          placeholder="Filter messages or scopes..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          startAddon={<Search size={14} className="text-muted-foreground" />}
          className="w-64 h-8 text-xs font-mono"
        />

        <div className="flex items-center gap-1">
          {['all', 'info', 'warn', 'error', 'debug'].map((lvl) => (
            <Button
              key={lvl}
              size="sm"
              variant={selectedLevel === lvl ? 'default' : 'text'}
              onClick={() => setSelectedLevel(lvl)}
              className="text-xs font-mono uppercase"
            >
              {lvl}
            </Button>
          ))}
        </div>
      </div>

      {/* Log Console Viewport */}
      <div className="surface-card border-border shadow-shadow rounded-[4px] border-(length:--border-width) overflow-hidden font-mono text-xs">
        <div className="border-border bg-muted/40 flex items-center justify-between px-3 py-1.5 border-b-(length:--border-width) text-[11px] text-muted-foreground font-semibold">
          <span>TIME • LEVEL • SCOPE</span>
          <span>PAYLOAD</span>
        </div>

        <div className="divide-border divide-y-(length:--border-width) max-h-[500px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center">
              No matching log entries found.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2.5 hover:bg-muted/20 transition-colors select-text"
              >
                <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                  {log.timestamp}
                </span>

                <Badge
                  variant="pill"
                  color={LEVEL_COLORS[log.level]}
                  className="px-1.5 py-0 text-[9px] uppercase shrink-0"
                >
                  {log.level}
                </Badge>

                <span className="text-primary shrink-0 text-[11px] font-semibold">
                  [{log.scope}]
                </span>

                <span className="text-foreground/90 flex-1 break-all leading-relaxed">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
