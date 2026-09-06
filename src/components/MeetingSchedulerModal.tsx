import React, { useState, useEffect } from 'react';
import type { Models } from 'appwrite';
import {
  databases,
  APPWRITE_DATABASE_ID,
  COLLECTIONS,
  RoomDocument,
  generateRoomCode,
  formatRoomCode
} from '../lib/appwrite';
import { Permission, Role } from 'appwrite';
import { saveLocalPermanentRoom } from './PermanentLinksModal';
import {
  Calendar as CalendarIcon,
  Mail,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  X,
  Lock,
  CalendarPlus
} from 'lucide-react';

export interface ScheduledMeeting {
  id: string;
  roomId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  mediaMode: 'screen' | 'local_file' | 'youtube';
  description?: string;
  createdAt: string;
}

interface MeetingSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Models.User<Models.Preferences> | null;
  onJoinRoom: (roomId: string) => void;
  onOpenAuth: () => void;
}

const STORAGE_KEY = 'syncine-scheduled-meetings';

export function getLocalScheduledMeetings(): ScheduledMeeting[] {
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

export function saveLocalScheduledMeeting(item: ScheduledMeeting) {
  if (typeof window === 'undefined') return;
  const current = getLocalScheduledMeetings().filter((m) => m.id !== item.id);
  const updated = [item, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeLocalScheduledMeeting(id: string) {
  if (typeof window === 'undefined') return;
  const updated = getLocalScheduledMeetings().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Generates an RFC 5545 standard .ics iCalendar file string
 */
function generateICSContent(meeting: ScheduledMeeting, roomUrl: string): string {
  const startDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + meeting.durationMinutes * 60 * 1000);

  const formatICSDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStart = formatICSDate(startDateTime);
  const dtEnd = formatICSDate(endDateTime);
  const now = formatICSDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SynCine//Synchronized Cinema Watchroom//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@syncine.confluxa.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${meeting.title} - SynCine Watchroom`,
    `DESCRIPTION:${meeting.description ? meeting.description + '\\n\\n' : ''}Join Watchroom Link: ${roomUrl}\\nRoom Code: ${formatRoomCode(meeting.roomId)}\\n\\n(Use SynCine link to join. No software installation required.)`,
    `LOCATION:${roomUrl}`,
    `URL:${roomUrl}`,
    `CONFERENCE;VALUE=URI:${roomUrl}`,
    'X-GOOGLE-CONFERENCE:DISABLED',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Generates Google Calendar Template URL
 */
function generateGoogleCalendarUrl(meeting: ScheduledMeeting, roomUrl: string): string {
  const startDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + meeting.durationMinutes * 60 * 1000);

  const formatGCal = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dates = `${formatGCal(startDateTime)}/${formatGCal(endDateTime)}`;
  const text = encodeURIComponent(`${meeting.title} • SynCine Watchroom`);
  const details = encodeURIComponent(
    `${meeting.description ? meeting.description + '\n\n' : ''}🎬 SynCine Watchroom Link: ${roomUrl}\n🔑 Room Code: ${formatRoomCode(meeting.roomId)}\n\n⚠️ Note: Click the SynCine Watchroom link above to join.\nSynchronized cinema experience powered by SynCine.`
  );
  const location = encodeURIComponent(roomUrl);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&addv=0`;
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onJoinRoom,
  onOpenAuth
}) => {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('20:00');
  const [duration, setDuration] = useState(120);
  const mediaMode: 'screen' | 'local_file' | 'youtube' = 'screen';
  const [description, setDescription] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<ScheduledMeeting | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const isAuthenticated = Boolean(currentUser?.email && currentUser.email.length > 0);

  useEffect(() => {
    if (isOpen) {
      setMeetings(getLocalScheduledMeetings());
      setCreatedMeeting(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Month navigation helpers
  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const currentYear = viewMonth.getFullYear();
  const currentMonthIdx = viewMonth.getMonth();
  const monthName = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute days in month
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  const handleDayClick = (day: number) => {
    const mm = String(currentMonthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setSelectedDate(`${currentYear}-${mm}-${dd}`);
    setCreatedMeeting(null);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);

    try {
      const newRoomId = generateRoomCode();

      // Create permanent room document in Appwrite
      if (currentUser?.$id) {
        await databases.createDocument<RoomDocument>(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.ROOMS,
          newRoomId,
          {
            name: title.trim(),
            hostId: currentUser.$id,
            mediaMode,
            participantCount: 1,
            maxParticipants: 4,
            syncState: '',
            isPermanent: true,
            expiresAt: ''
          },
          [
            Permission.read(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any())
          ]
        ).catch(console.warn);
      }

      // Record in permanent rooms list
      saveLocalPermanentRoom({
        id: newRoomId,
        name: title.trim(),
        mediaMode,
        createdAt: new Date().toISOString()
      });

      // Record scheduled meeting
      const meetingItem: ScheduledMeeting = {
        id: `sched-${Date.now()}`,
        roomId: newRoomId,
        title: title.trim(),
        date: selectedDate,
        time,
        durationMinutes: duration,
        mediaMode,
        description: description.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      saveLocalScheduledMeeting(meetingItem);
      setMeetings((prev) => [meetingItem, ...prev]);
      setCreatedMeeting(meetingItem);
    } catch (err) {
      console.warn('Failed to schedule meeting:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadICS = (meeting: ScheduledMeeting) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const roomUrl = `${origin}/?room=${meeting.roomId}`;
    const icsString = generateICSContent(meeting, roomUrl);

    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${meeting.title.toLowerCase().replace(/\s+/g, '-')}-invite.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenGoogleCalendar = (meeting: ScheduledMeeting) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const roomUrl = `${origin}/?room=${meeting.roomId}`;
    const gcalUrl = generateGoogleCalendarUrl(meeting, roomUrl);
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendEmailInvite = (meeting: ScheduledMeeting) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const roomUrl = `${origin}/?room=${meeting.roomId}`;
    const subject = encodeURIComponent(`Invitation: ${meeting.title} on SynCine`);
    const body = encodeURIComponent(
      `Hi there,\n\nYou're invited to join a synchronized watchroom on SynCine!\n\nEvent: ${meeting.title}\nDate: ${meeting.date}\nTime: ${meeting.time}\nDuration: ${meeting.durationMinutes} minutes\n\nJoin Link: ${roomUrl}\nRoom Code: ${formatRoomCode(meeting.roomId)}\n\n${meeting.description ? 'Notes: ' + meeting.description + '\n\n' : ''}Add to Google Calendar: ${generateGoogleCalendarUrl(meeting, roomUrl)}\n\nSee you there!`
    );

    const to = encodeURIComponent(inviteEmails.trim());
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const handleCopyInviteText = (meeting: ScheduledMeeting) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const roomUrl = `${origin}/?room=${meeting.roomId}`;
    const text = `🎬 You're invited to ${meeting.title} on SynCine!\n📅 Date: ${meeting.date}\n⏰ Time: ${meeting.time} (${meeting.durationMinutes} mins)\n🔗 Watchroom Link: ${roomUrl}\n🔑 Code: ${formatRoomCode(meeting.roomId)}`;
    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleDeleteMeeting = (id: string) => {
    removeLocalScheduledMeeting(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (createdMeeting?.id === id) {
      setCreatedMeeting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-enter-smooth select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F] dark:text-[#F5F5F7] leading-tight">
                Schedule Watchroom & Calendar
              </h3>
              <p className="text-[11px] text-black/55 dark:text-white/55">
                Pick a date, generate permanent link, and send calendar invites
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {!isAuthenticated ? (
            /* Auth Required Guard */
            <div className="py-12 px-4 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mb-3">
                <Lock size={22} />
              </div>
              <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                Host Sign-In Required
              </h4>
              <p className="text-xs text-black/55 dark:text-white/55 max-w-sm mb-5 leading-relaxed">
                Scheduling watchrooms and generating permanent calendar invites is exclusively available to authenticated host accounts.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                Sign In as Host
              </button>
            </div>
          ) : (
            <>
              {/* Success Banner when meeting was just scheduled */}
              {createdMeeting && (
                <div className="p-4 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/20 space-y-3 animate-enter-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#30D158]/20 text-[#30D158]">
                        <Check size={16} />
                      </div>
                      <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        Watchroom Scheduled: {createdMeeting.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#30D158] font-bold">
                      {createdMeeting.date} @ {createdMeeting.time}
                    </span>
                  </div>

                  {/* Room Link Quick Actions */}
                  <div className="p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-black/70 dark:text-white/70 truncate mr-2">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/?room={createdMeeting.roomId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/?room=${createdMeeting.roomId}`;
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-2 py-1 rounded bg-[var(--accent)] text-black text-[11px] font-bold shrink-0 cursor-pointer"
                    >
                      {copiedLink ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>

                  {/* Calendar & Email Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleCalendar(createdMeeting)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold transition cursor-pointer"
                    >
                      <CalendarPlus size={14} className="text-[#30D158]" />
                      <span>Google Calendar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadICS(createdMeeting)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold transition cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Download .ICS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyInviteText(createdMeeting)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold transition cursor-pointer"
                    >
                      {copiedInvite ? <Check size={14} className="text-[#30D158]" /> : <Copy size={14} />}
                      <span>{copiedInvite ? 'Copied' : 'Copy Message'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid: Interactive Calendar & Schedule Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left: Interactive Month Calendar (5 cols) */}
                <div className="md:col-span-5 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
                  {/* Month Header Navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {monthName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 transition cursor-pointer"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-black/60 dark:text-white/60 transition cursor-pointer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-black/40 dark:text-white/40 mb-1.5">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {/* Empty padding slots */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {/* Days in Month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const mm = String(currentMonthIdx + 1).padStart(2, '0');
                      const dd = String(day).padStart(2, '0');
                      const dateStr = `${currentYear}-${mm}-${dd}`;
                      const isSelected = selectedDate === dateStr;
                      const hasMeeting = meetings.some((m) => m.date === dateStr);

                      return (
                        <button
                          key={`day-${day}`}
                          type="button"
                          onClick={() => handleDayClick(day)}
                          className={`h-8 rounded-xl font-medium transition flex flex-col items-center justify-center relative cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--accent)] text-black font-bold shadow-xs'
                              : 'hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[#1D1D1F] dark:text-[#F5F5F7]'
                          }`}
                        >
                          <span>{day}</span>
                          {hasMeeting && (
                            <span
                              className={`w-1 h-1 rounded-full absolute bottom-1 ${
                                isSelected ? 'bg-black' : 'bg-[var(--accent)]'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] text-[11px] text-black/55 dark:text-white/55 flex items-center justify-between">
                    <span>Selected Date:</span>
                    <span className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-mono">
                      {selectedDate}
                    </span>
                  </div>
                </div>

                {/* Right: Schedule Meeting Form (7 cols) */}
                <form onSubmit={handleScheduleSubmit} className="md:col-span-7 space-y-3.5">
                  {/* Meeting Title */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                      Event / Watchroom Name
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Blade Runner 2049 Watch Party"
                      required
                      className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition"
                    />
                  </div>

                  {/* Time & Duration */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                        Duration
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition appearance-none cursor-pointer"
                      >
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                        <option value={180}>3 hours</option>
                        <option value={240}>4 hours</option>
                      </select>
                    </div>
                  </div>

                  {/* Invitee Email Input */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                      Invite Emails (Optional)
                    </label>
                    <input
                      type="text"
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      placeholder="friend@example.com, team@cinema.org"
                      className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] mb-1">
                      Notes / Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Bring your popcorn! We will watch the director's cut."
                      rows={2}
                      className="w-full bg-black/[0.03] dark:bg-white/[0.04] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2 border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:border-[var(--accent)] transition resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isCreating || !title.trim()}
                    className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-black text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CalendarPlus size={14} />
                    <span>{isCreating ? 'Creating Watchroom...' : 'Schedule & Generate Link'}</span>
                  </button>
                </form>
              </div>

              {/* Upcoming Scheduled Watchrooms */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] uppercase tracking-wider">
                    Upcoming Watchrooms ({meetings.length})
                  </span>
                </div>

                {meetings.length === 0 ? (
                  <div className="py-4 text-center text-xs text-black/45 dark:text-white/45">
                    No upcoming sessions scheduled yet. Click any date above to plan one.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {meetings.map((m) => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      const roomUrl = `${origin}/?room=${m.roomId}`;

                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                                {m.title}
                              </h5>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/15 text-[var(--accent)] font-bold shrink-0">
                                {m.date} • {m.time}
                              </span>
                            </div>
                            <div className="text-[10px] text-black/45 dark:text-white/45 truncate">
                              Room Code: {formatRoomCode(m.roomId)} ({m.durationMinutes}m duration)
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(roomUrl);
                              }}
                              className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                              title="Copy Watchroom Link"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenGoogleCalendar(m)}
                              className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                              title="Add to Google Calendar"
                            >
                              <CalendarPlus size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadICS(m)}
                              className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                              title="Download .ICS file"
                            >
                              <Download size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendEmailInvite(m)}
                              className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-black/75 dark:text-white/75 transition cursor-pointer"
                              title="Send Email Invitation"
                            >
                              <Mail size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onJoinRoom(m.roomId);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-bold hover:opacity-90 transition cursor-pointer"
                              title="Launch Watchroom"
                            >
                              <ExternalLink size={12} />
                              <span>Start</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMeeting(m.id)}
                              className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition cursor-pointer"
                              title="Delete meeting"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
