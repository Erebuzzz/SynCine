import React, { useState, useEffect, useRef } from 'react';
import { databases, realtime, APPWRITE_DATABASE_ID, COLLECTIONS, ID, Query, MessageDocument, RealtimeResponseEvent } from '../lib/appwrite';
import { Send, X, MessageSquare, Sparkles } from 'lucide-react';

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

  // Load initial messages
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

    // Subscribe to real-time chat messages
    const channel = `databases.${APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
    const unsubscribe = realtime.subscribe<MessageDocument>(channel, (event: RealtimeResponseEvent<MessageDocument>) => {
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
    });

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
    <aside className="w-80 h-full liquid-glass-dock border-l border-white/10 flex flex-col z-30 transition-all shadow-2xl relative">
      {/* Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
            <MessageSquare size={16} />
          </div>
          <h3 className="text-white font-bold text-sm">Room Chat</h3>
          <span className="text-xs text-slate-400 font-normal">({messages.length})</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs px-4">
            <Sparkles size={30} className="mb-2 text-indigo-400/50" />
            <p className="font-semibold text-slate-300">No messages yet</p>
            <p className="text-slate-500 mt-1">Start chatting with your watch party!</p>
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
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isSelf ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-500">{time}</span>
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[85%] break-words shadow-md ${
                    isSelf
                      ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white rounded-tr-none shadow-indigo-600/20'
                      : 'bg-white/10 text-slate-200 border border-white/10 rounded-tl-none backdrop-blur-md'
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

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 bg-white/5 text-slate-100 placeholder-slate-500 text-xs rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-white p-3 rounded-2xl transition shrink-0 flex items-center justify-center shadow-lg shadow-indigo-600/30"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
};
