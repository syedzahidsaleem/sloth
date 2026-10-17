/**
 * Sloth ListenTogetherBar Component
 * Compact Nuclear-style peer indicators and collaborative listening drawer.
 *
 * Flat UI - NO glassmorphism, NO frosted panels.
 * Colors: #1e2327 (bg), #282d33 (surface), #31383f (raised surface), #3d444c (border).
 * Motion strictly via "motion/react" with useReducedMotion().
 */

import { FC, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Radio,
  Copy,
  Check,
  Crown,
  MessageSquare,
  LogOut,
  X,
  Send,
  Sparkles,
  UserPlus,
  UserX,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useListenTogether } from './useListenTogether';
import { Peer } from './types';

export interface ListenTogetherBarProps {
  className?: string;
  listenTogetherHook?: ReturnType<typeof useListenTogether>;
}

export const ListenTogetherBar: FC<ListenTogetherBarProps> = ({
  className,
  listenTogetherHook,
}) => {
  // If hook is not passed from top level, fallback to local instance
  const defaultHook = useListenTogether();
  const lt = listenTogetherHook || defaultHook;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'session' | 'peers' | 'chat'>('session');
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [usernameInput, setUsernameInput] = useState(lt.username);

  const shouldReduceMotion = useReducedMotion();

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    lt.sendChat(chatInput);
    setChatInput('');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const activePeers = lt.peers.filter((p) => p.is_connected);

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* ----------------------------------------------------------------- */}
      {/* COMPACT TRIGGER BAR BUTTON (Inside PlayerBar Secondary Controls)  */}
      {/* ----------------------------------------------------------------- */}
      {lt.roomState ? (
        // ACTIVE ROOM: Compact Overlapping Avatars + Live Room Code Pill
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-[3px] border border-[var(--border)] cursor-pointer select-none transition-colors outline-none',
            'bg-[var(--surface-raised)] hover:border-[var(--color-accent)]/60 text-xs font-sans',
            isOpen ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30' : ''
          )}
          title={`Listen Together Room: ${lt.roomState.room_code} (${activePeers.length} listening)`}
          aria-label="Listen Together session details"
        >
          {/* Overlapping Avatar Stack (Nuclear Style) */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {activePeers.slice(0, 3).map((peer: Peer) => (
              <div
                key={peer.user_id}
                className={cn(
                  'relative size-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono text-white border border-[var(--surface)]',
                  peer.is_host ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]' : 'bg-[#3d444c]'
                )}
                title={`${peer.username}${peer.is_host ? ' (Host)' : ''}`}
              >
                {getInitials(peer.username)}
                {peer.is_host && (
                  <Crown
                    size={8}
                    className="absolute -top-1 -right-1 text-amber-400 fill-amber-400"
                  />
                )}
              </div>
            ))}
            {activePeers.length > 3 && (
              <div className="size-5 rounded-full bg-[#23272b] border border-[var(--surface)] flex items-center justify-center text-[8px] font-mono font-semibold text-[var(--text-muted)]">
                +{activePeers.length - 3}
              </div>
            )}
          </div>

          {/* Sync indicator dot & Room Code */}
          <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--text-primary)]">
            <span
              className={cn(
                'size-1.5 rounded-full',
                lt.driftReport?.needsCorrection
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-[var(--color-accent)] animate-pulse'
              )}
              title={lt.driftReport ? `Drift: ${lt.driftReport.driftMs}ms` : 'Sync Active'}
            />
            <span className="text-[var(--color-accent)]">{lt.roomState.room_code}</span>
          </div>
        </motion.button>
      ) : (
        // INACTIVE ROOM: Minimal Nuclear Button to Launch Listen Together
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
          className={cn(
            'p-1.5 rounded-[3px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-transparent transition-colors cursor-pointer outline-none',
            isOpen ? 'text-[var(--color-accent)] bg-[var(--surface-raised)] border-[var(--border)]' : ''
          )}
          title="Listen Together (Synchronized Social Listening)"
          aria-label="Open Listen Together panel"
        >
          <Radio size={16} />
        </motion.button>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* POPOVER / DRAWER PANEL (FLAT UI, NO GLASSMORPHISM, OKLCH COLORS)  */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute bottom-full right-0 mb-2 w-80 sm:w-96 rounded-[4px] border border-[var(--border)] shadow-xl z-50 select-none font-sans',
              'bg-[var(--surface)] text-[var(--text-primary)] divide-y divide-[var(--border)]'
            )}
            style={{
              backgroundColor: 'var(--surface)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-raised)]">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-[var(--color-accent)]" />
                <span className="text-xs font-bold tracking-tight uppercase font-mono">
                  Listen Together
                </span>
                {lt.connected ? (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 font-semibold">
                    CONNECTED
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                    DISCONNECTED
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-muted)] hover:text-white p-1 rounded-[3px] cursor-pointer transition-colors"
                aria-label="Close panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* Error Banner */}
            {lt.error && (
              <div className="px-3 py-1.5 bg-red-950/60 border-b border-red-800 text-[11px] text-red-300 font-mono flex items-center justify-between">
                <span>{lt.error}</span>
              </div>
            )}

            {/* Content area: Active Room vs Inactive Room */}
            {lt.roomState ? (
              <div>
                {/* Navigation Tabs */}
                <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab('session')}
                    className={cn(
                      'flex-1 py-1.5 text-center cursor-pointer font-semibold border-b-2 transition-colors',
                      activeTab === 'session'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('peers')}
                    className={cn(
                      'flex-1 py-1.5 text-center cursor-pointer font-semibold border-b-2 transition-colors flex items-center justify-center gap-1',
                      activeTab === 'peers'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <span>Peers</span>
                    <span className="text-[10px] px-1 rounded-full bg-[var(--surface-raised)] border border-[var(--border)]">
                      {activePeers.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={cn(
                      'flex-1 py-1.5 text-center cursor-pointer font-semibold border-b-2 transition-colors flex items-center justify-center gap-1',
                      activeTab === 'chat'
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <span>Chat</span>
                    {lt.chatMessages.length > 0 && (
                      <span className="text-[10px] px-1 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-bold">
                        {lt.chatMessages.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB 1: SESSION */}
                {activeTab === 'session' && (
                  <div className="p-3 space-y-3 text-xs">
                    {/* Room Code Card */}
                    <div className="p-2.5 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                          Room Code
                        </div>
                        <div className="text-base font-bold font-mono tracking-wider text-[var(--color-accent)]">
                          {lt.roomState.room_code}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(lt.roomState!.room_code)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[var(--surface)] hover:bg-[var(--surface)]/80 border border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-white cursor-pointer transition-colors"
                      >
                        {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Sync & Drift Diagnostics */}
                    <div className="space-y-1.5 font-mono text-[11px] p-2 rounded-[3px] bg-[var(--background)] border border-[var(--border)]">
                      <div className="flex items-center justify-between text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Activity size={12} className="text-[var(--color-accent)]" />
                          <span>Status:</span>
                        </span>
                        <span className="text-[var(--text-primary)] font-semibold">
                          {lt.isHost ? 'Host (Authoritative)' : 'Synchronized Listener'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[var(--text-secondary)]">
                        <span>NTP Clock Offset:</span>
                        <span className="text-[var(--text-primary)]">
                          {lt.clockOffsetMs >= 0 ? `+${lt.clockOffsetMs}ms` : `${lt.clockOffsetMs}ms`}
                        </span>
                      </div>
                      {!lt.isHost && lt.driftReport && (
                        <div className="flex items-center justify-between text-[var(--text-secondary)]">
                          <span>Playback Drift:</span>
                          <span
                            className={cn(
                              'font-semibold',
                              lt.driftReport.needsCorrection ? 'text-amber-400' : 'text-emerald-400'
                            )}
                          >
                            {lt.driftReport.driftMs}ms {lt.driftReport.needsCorrection ? '(Correcting...)' : '(Stable <500ms)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Host Pending Join Requests Notification */}
                    {lt.isHost && lt.pendingJoinRequests.length > 0 && (
                      <div className="space-y-1 p-2 rounded-[3px] bg-amber-950/40 border border-amber-600/60">
                        <div className="text-[10px] font-mono text-amber-300 font-bold uppercase">
                          Pending Join Requests ({lt.pendingJoinRequests.length})
                        </div>
                        {lt.pendingJoinRequests.map((req) => (
                          <div key={req.user_id} className="flex items-center justify-between py-1">
                            <span className="text-xs text-white font-semibold">{req.username}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => lt.approveJoin(req.user_id)}
                                className="px-2 py-0.5 rounded-[3px] bg-emerald-600 text-white text-[10px] font-mono cursor-pointer hover:bg-emerald-500"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => lt.rejectJoin(req.user_id)}
                                className="px-2 py-0.5 rounded-[3px] bg-red-600 text-white text-[10px] font-mono cursor-pointer hover:bg-red-500"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Leave Room Button */}
                    <button
                      type="button"
                      onClick={lt.leaveRoom}
                      className="w-full py-1.5 rounded-[3px] bg-[var(--surface-raised)] hover:bg-red-950/60 hover:text-red-300 border border-[var(--border)] hover:border-red-800 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <LogOut size={13} />
                      <span>Leave Session</span>
                    </button>
                  </div>
                )}

                {/* TAB 2: PEERS */}
                {activeTab === 'peers' && (
                  <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                    {lt.peers.map((peer) => (
                      <div
                        key={peer.user_id}
                        className="flex items-center justify-between p-2 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'size-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white',
                              peer.is_host ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]' : 'bg-[#3d444c]'
                            )}
                          >
                            {getInitials(peer.username)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                              <span>{peer.username}</span>
                              {peer.user_id === lt.userId && (
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">(You)</span>
                              )}
                              {peer.is_host && (
                                <Crown size={12} className="text-amber-400 fill-amber-400" />
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                              <span
                                className={cn(
                                  'size-1.5 rounded-full',
                                  peer.is_connected ? 'bg-emerald-400' : 'bg-gray-500'
                                )}
                              />
                              <span>{peer.is_connected ? 'Listening' : 'Disconnected'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Host controls over peer */}
                        {lt.isHost && peer.user_id !== lt.userId && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => lt.transferHost(peer.user_id)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-amber-300 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                              title="Transfer Host role"
                            >
                              <Crown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => lt.kickUser(peer.user_id)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                              title="Kick user from room"
                            >
                              <UserX size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: CHAT */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-64">
                    {/* Chat Messages Log */}
                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-xs font-sans">
                      {lt.chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] font-mono text-[11px] gap-1">
                          <MessageSquare size={16} />
                          <span>No messages yet. Say hi!</span>
                        </div>
                      ) : (
                        lt.chatMessages.map((msg) => {
                          const isMe = msg.user_id === lt.userId;
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                'flex flex-col max-w-[85%]',
                                isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                              )}
                            >
                              <span className="text-[10px] font-mono text-[var(--text-muted)] px-1">
                                {isMe ? 'You' : msg.username}
                              </span>
                              <div
                                className={cn(
                                  'px-2.5 py-1.5 rounded-[3px] text-xs leading-snug break-words',
                                  isMe
                                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium'
                                    : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)]'
                                )}
                              >
                                {msg.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Input Form */}
                    <form
                      onSubmit={handleSendChat}
                      className="p-2 border-t border-[var(--border)] flex items-center gap-1.5 bg-[var(--surface)]"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-2.5 py-1 text-xs rounded-[3px] bg-[var(--background)] border border-[var(--border)] focus:border-[var(--color-accent)] outline-none text-[var(--text-primary)] font-sans"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="p-1.5 rounded-[3px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] disabled:opacity-40 cursor-pointer transition-opacity"
                        aria-label="Send message"
                      >
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              // -------------------------------------------------------------
              // INACTIVE ROOM: CREATE OR JOIN INTERFACE
              // -------------------------------------------------------------
              <div className="p-3.5 space-y-4 text-xs font-sans">
                {/* Username input */}
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter your listener name"
                    className="w-full px-2.5 py-1.5 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)] font-sans"
                  />
                </div>

                {/* Host a Room */}
                <div className="p-3 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                    <Sparkles size={14} className="text-[var(--color-accent)]" />
                    <span>Host New Session</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Create a synchronized room. Friends who join will stay locked to your playback with &lt;500ms precision.
                  </p>
                  <button
                    type="button"
                    onClick={() => lt.createRoom(usernameInput)}
                    className="w-full py-1.5 rounded-[3px] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold text-xs font-mono cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Start Hosting
                  </button>
                </div>

                {/* Join Existing Room */}
                <div className="p-3 rounded-[3px] bg-[var(--surface-raised)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                    <UserPlus size={14} className="text-[var(--color-accent)]" />
                    <span>Join Existing Session</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={8}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="6-DIGIT CODE"
                      className="flex-1 px-2.5 py-1.5 rounded-[3px] bg-[var(--background)] border border-[var(--border)] font-mono text-xs uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      type="button"
                      disabled={joinCodeInput.trim().length < 4 || lt.isPendingApproval}
                      onClick={() => lt.joinRoom(joinCodeInput, usernameInput)}
                      className="px-3 py-1.5 rounded-[3px] bg-[var(--surface)] hover:bg-[var(--surface)]/80 border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      {lt.isPendingApproval ? 'Waiting...' : 'Join'}
                    </button>
                  </div>
                  {lt.isPendingApproval && (
                    <p className="text-[10px] font-mono text-amber-300">
                      Join request sent. Awaiting host approval...
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
