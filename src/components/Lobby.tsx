import React, { useState } from 'react';
import { Tv, Film, Users, Shield, Zap, Sparkles, ArrowRight, Clapperboard } from 'lucide-react';

interface LobbyProps {
  currentUserId: string;
  userName: string;
  onUserNameChange: (name: string) => void;
  onCreateRoom: (name: string, mode: 'screen' | 'local_file') => Promise<void>;
  onJoinRoom: (roomId: string) => Promise<void>;
  initialRoomId?: string;
  isAuthenticating: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  currentUserId,
  userName,
  onUserNameChange,
  onCreateRoom,
  onJoinRoom,
  initialRoomId = '',
  isAuthenticating
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState(initialRoomId);
  const [mediaMode, setMediaMode] = useState<'screen' | 'local_file'>('screen');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !userName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onCreateRoom(roomName.trim(), mediaMode);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim() || !userName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onJoinRoom(joinRoomId.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to join room.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050811] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden overflow-y-auto">
      {/* Dynamic Liquid Gradient Ambient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-600/30 to-purple-600/20 blur-3xl animate-liquid-orb-1" />
        <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-pink-600/25 via-indigo-600/20 to-cyan-500/20 blur-3xl animate-liquid-orb-2" />
        <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-gradient-to-t from-cyan-600/20 to-indigo-700/15 blur-3xl animate-liquid-orb-1" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 h-16 px-6 sm:px-12 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 border border-white/20">
            <Clapperboard size={20} className="text-white drop-shadow" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-none flex items-center gap-1.5">
              <span>SynCine</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                P2P
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight">Synchronized Watch Parties</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs shadow-inner">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUserId ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-medium hidden sm:inline">
              {isAuthenticating ? 'Connecting Session...' : 'Anonymous Guest Session'}
            </span>
          </div>
        </div>
      </header>

      {/* Hero / Main Card Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 via-pink-500/10 to-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4 shadow-lg backdrop-blur-md">
            <Sparkles size={14} className="text-pink-400" />
            <span>Zero Server Costs - Direct WebRTC P2P Mesh</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight mb-3">
            Watch Together in Real-Time Sync
          </h2>
          <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Zero-latency screen streaming or synchronized local file playback with drift compensation. Maximum 4 users for optimal peer-to-peer performance.
          </p>
        </div>

        {/* Liquid Glass Main Card */}
        <div className="w-full max-w-lg liquid-glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all duration-300">
          {/* Subtle Specular Rim Light */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-black/40 rounded-2xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create New Room
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition duration-200 ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Join Existing Room
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between backdrop-blur-md">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 font-bold ml-2 hover:text-rose-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* User Name Input */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={32}
              className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
            />
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Friday Movie Night"
                  maxLength={64}
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                />
              </div>

              {/* Media Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Playback Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMediaMode('screen')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'screen'
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          mediaMode === 'screen' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Tv size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Screen Share</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Host streams browser tab or screen via WebRTC H.264
                    </span>
                  </div>

                  <div
                    onClick={() => setMediaMode('local_file')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col ${
                      mediaMode === 'local_file'
                        ? 'bg-indigo-600/20 border-indigo-500/80 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          mediaMode === 'local_file'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Film size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Local File Sync</span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-snug">
                      Load local video file; zero bandwidth & perfect sync
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !roomName.trim() || !userName.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Creating Room...' : 'Create Watch Party'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  required
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Paste Room ID here"
                  maxLength={36}
                  className="w-full bg-black/40 text-slate-100 placeholder-slate-500 text-sm rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isAuthenticating || !joinRoomId.trim() || !userName.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Joining Room...' : 'Join Watch Party'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Room Capacity Footer */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-indigo-400" />
              <span>Max 4 Users / Room</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-emerald-400" />
              <span>DLS Protected</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>Realtime Sync</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
