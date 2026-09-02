import React, { useState, useEffect, useRef } from 'react';
import {
  databases,
  realtime,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  ID,
  Query,
  MessageDocument,
  RealtimeResponseEvent
} from '../lib/appwrite';
import { Send, X, MessageSquare } from 'lucide-react';

interface ChatSidebarProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  isOpen: boolean;
  onClose: () => void;
  onNewMessageReceived?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  roomId,
  currentUserId,
  currentUserName,
  isOpen,
  onClose,
  onNewMessageReceived
}) => {
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMessages() {
      try {
        const res = await databases.listDocuments<MessageDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.MESSAGES,
          [
            Query.equal('roomId', roomId),
            Query.orderAsc('$createdAt'),
            Query.limit(100)
          ]
        );
        if (isMounted) {
          setMessages(res.documents);
        }
      } catch (err) {
        console.warn('Failed to load chat history:', err);
      }
    }

    loadMessages();

    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
    const unsubscribe = realtime.subscribe<MessageDocument>(
      channel,
      (event: RealtimeResponseEvent<MessageDocument>) => {
        const doc = event.payload;
        if (doc && doc.roomId === roomId) {
          setMessages((prev) => {
            if (prev.some((m) => m.$id === doc.$id)) return prev;
            return [...prev, doc];
          });

          if (doc.senderId !== currentUserId) {
            onNewMessageReceived?.();
          }
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomId, currentUserId, onNewMessageReceived]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          roomId,
          senderId: currentUserId,
          senderName: currentUserName,
          content: text
        }
      );
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 h-full bg-white/95 dark:bg-black/95 backdrop-blur-xl border-l border-black/[0.06] dark:border-white/[0.06] flex flex-col z-30 transition-all shadow-none relative">
      {/* Header */}
      <div className="h-16 px-5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-black/55 dark:text-white/55">
            <MessageSquare size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[#1D1D1F] dark:text-[#F5F5F7] font-bold text-sm">Watchroom Chat</h3>
            <span className="text-[11px] text-black/55 dark:text-white/55 font-semibold">({messages.length})</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-black/55 dark:text-white/55 hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] p-1.5 rounded-xl hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
          aria-label="Close Chat"
          title="Close Chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-black/55 dark:text-white/55 text-xs px-4">
            <MessageSquare size={28} className="mb-2.5 text-black/30 dark:text-white/30" />
            <p className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">Quiet in the Theater</p>
            <p className="text-black/55 dark:text-white/55 mt-1">Send a message to everyone in this watchroom.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;
            const time = new Date(msg.$createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.$id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-black/55 dark:text-white/55">
                    {isSelf ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-black/30 dark:text-white/30">{time}</span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] break-words shadow-none leading-relaxed ${
                    isSelf
                      ? 'bg-black/[0.06] dark:bg-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-tr-none'
                      : 'bg-black/[0.03] dark:bg-white/[0.04] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.04] dark:border-white/[0.06] rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-black/50 backdrop-blur-xl flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Transmit a message..."
          maxLength={1000}
          className="flex-1 bg-black/[0.03] dark:bg-white/[0.04] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder-black/30 dark:placeholder-white/30 text-xs rounded-xl px-4 py-3 border border-black/[0.06] dark:border-white/[0.08] focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition shadow-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-[#8B7355] dark:bg-[#C8A97E] text-white dark:text-black p-3 rounded-xl transition shrink-0 flex items-center justify-center shadow-none cursor-pointer disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
};
