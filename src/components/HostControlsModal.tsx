import React from 'react';
import { Participant } from './WatchStage';
import {
  ShieldAlert,
  MicOff,
  UserX,
  Lock,
  Unlock,
  Power,
  X,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { formatRoomCode } from '../lib/appwrite';

interface HostControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  isRoomLocked: boolean;
  onToggleRoomLock: () => void;
  participants: Participant[];
  onMuteAll: () => void;
  onMuteParticipant: (peerId: string) => void;
  onKickParticipant: (peerId: string) => void;
  onEndSessionForAll: () => void;
}

export const HostControlsModal: React.FC<HostControlsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  isRoomLocked,
  onToggleRoomLock,
  participants,
  onMuteAll,
  onMuteParticipant,
  onKickParticipant,
  onEndSessionForAll
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const remoteParticipants = participants.filter((p) => !p.isSelf);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-enter-smooth select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                Host Controls {roomName ? `• ${roomName}` : ''}
              </h3>
              <p className="text-[11px] text-black/55 dark:text-white/55">
                Manage room access, audio streams, and participant permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-black/55 dark:text-white/55 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Room Security Card */}
          <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isRoomLocked ? 'bg-[#FF453A]/15 text-[#FF453A]' : 'bg-[#30D158]/15 text-[#30D158]'}`}>
                {isRoomLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </div>
              <div>
                <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {isRoomLocked ? 'Room is Locked' : 'Room is Unlocked'}
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55">
                  {isRoomLocked ? 'New participants cannot join' : 'Anyone with the room code can join'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleRoomLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isRoomLocked
                  ? 'bg-[#30D158]/15 text-[#30D158] hover:bg-[#30D158]/25'
                  : 'bg-[#FF453A]/15 text-[#FF453A] hover:bg-[#FF453A]/25'
              }`}
            >
              {isRoomLocked ? 'Unlock' : 'Lock Room'}
            </button>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="text-xs font-bold text-black/55 dark:text-white/55 uppercase tracking-wider mb-2.5 px-1">
              Room Actions
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onMuteAll}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] transition cursor-pointer"
              >
                <MicOff size={15} className="text-[#FF453A]" />
                <span>Mute All Viewers</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] transition cursor-pointer"
              >
                {copied ? <CheckCircle2 size={15} className="text-[#30D158]" /> : <Copy size={15} />}
                <span>{copied ? 'Code Copied' : formatRoomCode(roomId)}</span>
              </button>
            </div>
          </div>

          {/* Participant Roster Management */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-black/55 dark:text-white/55 uppercase tracking-wider mb-2.5 px-1">
              <span>Viewers ({remoteParticipants.length})</span>
              <span className="text-[11px] font-normal normal-case">Individual permissions</span>
            </div>

            {remoteParticipants.length === 0 ? (
              <div className="py-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] text-center text-xs text-black/45 dark:text-white/45">
                No remote viewers currently in the room
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {remoteParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate max-w-[140px] sm:max-w-[180px]">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-black/45 dark:text-white/45 font-mono">
                          ID: {p.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onMuteParticipant(p.id)}
                        className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] hover:bg-[#FF453A]/15 text-black/65 dark:text-white/65 hover:text-[#FF453A] transition cursor-pointer"
                        title={`Mute ${p.name}`}
                      >
                        <MicOff size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onKickParticipant(p.id)}
                        className="p-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] hover:bg-[#FF453A]/15 text-black/65 dark:text-white/65 hover:text-[#FF453A] transition cursor-pointer"
                        title={`Remove ${p.name} from room`}
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-xs font-bold text-[#FF453A] uppercase tracking-wider mb-2 px-1">
              Danger Zone
            </div>
            <button
              type="button"
              onClick={onEndSessionForAll}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF453A]/10 hover:bg-[#FF453A]/20 border border-[#FF453A]/20 text-xs font-bold text-[#FF453A] transition cursor-pointer"
            >
              <Power size={15} />
              <span>End Watchroom for Everyone</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
