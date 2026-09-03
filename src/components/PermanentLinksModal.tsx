import React, { useState, useEffect } from 'react';
import type { Models } from 'appwrite';
import {
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  RoomDocument,
  formatRoomCode
} from '../lib/appwrite';
import { Query } from 'appwrite';
import {
  Link2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Trash2,
  X,
  Lock,
  Plus,
  Tv,
  Film
} from 'lucide-react';

export interface PermanentRoomItem {
  id: string;
  name: string;
  mediaMode: 'screen' | 'local_file';
  createdAt?: string;
}

interface PermanentLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Models.User<Models.Preferences> | null;
  onJoinRoom: (roomId: string) => void;
  onOpenAuth: () => void;
  onCreateNew?: () => void;
}

const STORAGE_KEY = 'syncine-permanent-rooms';

export function getLocalPermanentRooms(): PermanentRoomItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveLocalPermanentRoom(item: PermanentRoomItem) {
  if (typeof window === 'undefined') return;
  const current = getLocalPermanentRooms().filter((r) => r.id !== item.id);
  const updated = [item, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeLocalPermanentRoom(id: string) {
  if (typeof window === 'undefined') return;
  const updated = getLocalPermanentRooms().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export const PermanentLinksModal: React.FC<PermanentLinksModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onJoinRoom,
  onOpenAuth,
  onCreateNew
}) => {
  const [rooms, setRooms] = useState<PermanentRoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser?.email && currentUser.email.length > 0);

  // Load permanent rooms from Appwrite and local storage cache
  useEffect(() => {
    if (!isOpen) return;

    const localList = getLocalPermanentRooms();
    setRooms(localList);

    if (isAuthenticated && currentUser?.$id) {
      setIsLoading(true);
      databases
        .listDocuments<RoomDocument>(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, [
          Query.equal('hostId', currentUser.$id),
          Query.equal('isPermanent', true),
          Query.orderDesc('$createdAt'),
          Query.limit(25)
        ])
        .then((res) => {
          const remoteRooms: PermanentRoomItem[] = res.documents.map((doc) => ({
            id: doc.$id,
            name: doc.name,
            mediaMode: doc.mediaMode,
            createdAt: doc.$createdAt
          }));

          // Merge unique rooms
          const combined = [...remoteRooms];
          localList.forEach((l) => {
            if (!combined.some((r) => r.id === l.id)) {
              combined.push(l);
            }
          });

          setRooms(combined);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
        })
        .catch(console.warn)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, isAuthenticated, currentUser?.$id]);

  if (!isOpen) return null;

  const handleCopy = (id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/?room=${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShare = async (room: PermanentRoomItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/?room=${room.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `SynCine Watchroom: ${room.name}`,
          text: `Join my permanent synchronized cinema room on SynCine!`,
          url: fullUrl
        });
        return;
      } catch {}
    }

    handleCopy(room.id);
  };

  const handleDelete = async (id: string) => {
    removeLocalPermanentRoom(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));

    if (isAuthenticated) {
      databases.deleteDocument(APPWRITE_DATABASE_ID, COLLECTIONS.ROOMS, id).catch(console.warn);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-enter-smooth select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Link2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                Permanent Watchroom Links
              </h3>
              <p className="text-[11px] text-black/55 dark:text-white/55">
                Re-usable cinema links that never expire
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!isAuthenticated ? (
            /* Locked State for Non-Signed-In Users */
            <div className="py-8 px-4 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mb-3">
                <Lock size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                Host Sign-In Required
              </h4>
              <p className="text-xs text-black/55 dark:text-white/55 max-w-sm mb-5 leading-relaxed">
                Permanent links are exclusively available to authenticated host accounts. Create re-usable watchrooms for your film club, team, or family that stay active indefinitely.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                Sign In or Register as Host
              </button>
            </div>
          ) : isLoading && rooms.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-black/50 dark:text-white/50">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-2" />
              <span>Loading permanent rooms...</span>
            </div>
          ) : rooms.length === 0 ? (
            /* Empty State for Signed In Users */
            <div className="py-8 px-4 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-black/40 dark:text-white/40 flex items-center justify-center mb-3">
                <Tv size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                No Permanent Rooms Yet
              </h4>
              <p className="text-xs text-black/55 dark:text-white/55 max-w-sm mb-5 leading-relaxed">
                When creating a watchroom, check the "Permanent Room" option to generate a lasting cinema link that never expires.
              </p>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNew();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Permanent Room</span>
                </button>
              )}
            </div>
          ) : (
            /* List of Permanent Rooms */
            <div className="space-y-3">
              {rooms.map((room) => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const fullUrl = `${origin}/?room=${room.id}`;
                const isCopied = copiedId === room.id;

                return (
                  <div
                    key={room.id}
                    className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-[var(--accent)]/40 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
                          {room.mediaMode === 'screen' ? <Tv size={12} /> : <Film size={12} />}
                        </span>
                        <h4 className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                          {room.name}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-black/60 dark:text-white/60 shrink-0">
                          {formatRoomCode(room.id)}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-black/45 dark:text-white/45 truncate select-all">
                        {fullUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(room.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isCopied
                            ? 'bg-[#30D158]/15 text-[#30D158]'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75'
                        }`}
                        title="Copy Room URL"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(room)}
                        className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                        title="Share Link"
                      >
                        <Share2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onJoinRoom(room.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
                        title="Launch Watchroom"
                      >
                        <ExternalLink size={13} />
                        <span>Launch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(room.id)}
                        className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition cursor-pointer"
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
