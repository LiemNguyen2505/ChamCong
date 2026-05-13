import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  serverTimestamp,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Pin, 
  CheckCircle2, 
  Clock, 
  User, 
  X, 
  Send,
  Sparkles,
  Trash2,
  Smile,
  CheckSquare,
  Square,
  AlertTriangle,
  Edit3,
  Calendar,
  Flag,
  Palette,
  MapPin,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface BulletinNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  locationId: string;
  createdAt: any;
  readBy: string[];
  color: string;
  isPinned: boolean;
  emoji?: string;
  updatedAt?: any;
  repeatType?: 'none' | 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  expiresAt?: any;
}

interface BulletinBoardProps {
  currentEmployee: any;
  locationId: string;
  isAdmin?: boolean;
  theme?: any;
  employees?: any[];
}

const NOTE_COLORS = [
  'bg-white border-stone-200 text-stone-800', // Default White
  'bg-[#F4ECE1] border-[#D7CCC8] text-[#3E2723]', // Vintage Brown
  'bg-sky-100 border-sky-200 text-sky-900',
  'bg-rose-100 border-rose-200 text-rose-900',
  'bg-emerald-100 border-emerald-200 text-emerald-900',
  'bg-violet-100 border-violet-200 text-violet-900',
  'bg-orange-100 border-orange-200 text-orange-900',
  'bg-lime-100 border-lime-200 text-lime-900',
  'bg-pink-100 border-pink-200 text-pink-900',
  'bg-cyan-100 border-cyan-200 text-cyan-900',
  'bg-fuchsia-100 border-fuchsia-200 text-fuchsia-900',
  'bg-yellow-100 border-yellow-200 text-yellow-900',
  'bg-blue-100 border-blue-200 text-blue-900',
  'bg-red-100 border-red-200 text-red-900',
  'bg-green-100 border-green-200 text-green-900',
  'bg-purple-100 border-purple-200 text-purple-900',
];

const ROLE_ICONS: Record<string, string> = {
  'Quản lý': '👩🏻‍💼',
  'Admin': '👩🏻‍💼',
  'Nhân viên': '☕️',
  'NV Quầy': '☕️',
  'NV Phục vụ': '🏃‍♂️',
  'NV Bếp': '👨‍🍳',
};

const EMOJIS = [
  '😊', '😂', '🤣', '😍', '🥰', '😎', '🤔', '🤨', '🙄', '😴', 
  '🤩', '🥳', '😏', '🤤', '😭', '😤', '🤯', '🤫', '🫠', '🫡', 
  '🫣', '🤗', '🤝', '🙌', '👏', '💪', '✨', '🌈', '☀️', '🍀',
  '☕️', '🔥', '📢', '⚠️', '✅', '🎉', '💡', '🏃‍♂️', '👨‍🍳', '🥛', 
  '🥐', '🍵', '🍰', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍫'
];

  // Module-level cache to persist data across re-mounts (e.g., when Camera opens/closes)
let bulletinCache: {
  notes: BulletinNote[];
  lastFetch: number;
} | null = null;

let isFetchingNotes = false;

export default function BulletinBoard({ currentEmployee, locationId, isAdmin, theme, employees: employeesProp, globalData }: BulletinBoardProps & { globalData?: any }) {
  if (!currentEmployee) return null;
  const isSuperAdmin = currentEmployee?.empId?.toUpperCase() === 'ADMIN';
  const [notes, setNotes] = useState<BulletinNote[]>([]);
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [editingNote, setEditingNote] = useState<BulletinNote | null>(null);
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<BulletinNote | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [targetLocations, setTargetLocations] = useState<string[]>(isSuperAdmin ? ['Góc Phố', 'Phố Xanh'] : [locationId]);
  const [repeatType, setRepeatType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employees, setEmployees] = useState<{ id: string, fullName: string, avatar?: string, empId: string }[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close pickers when exiting add mode
  useEffect(() => {
    if (!isAddingInline) {
      setShowEmojiPicker(false);
      setShowColorPicker(false);
    }
  }, [isAddingInline]);

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineContent, setInlineContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const locationIdRef = useRef(locationId);
  const isSuperAdminRef = useRef(isSuperAdmin);

  useEffect(() => {
    locationIdRef.current = locationId;
    isSuperAdminRef.current = isSuperAdmin;
  }, [locationId, isSuperAdmin]);

  const startLongPress = (note: BulletinNote) => {
    if (!isAdmin) return;
    setIsLongPressActive(false);
    const timer = setTimeout(() => {
      handleTogglePin(null, note.id, note.isPinned);
      setIsLongPressActive(true);
      toast.success(note.isPinned ? 'Đã bỏ ghim!' : 'Đã ghim tin nhắn!');
    }, 2000);
    setLongPressTimer(timer);
  };

  const cancelLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const unreadCount = notes.filter(n => !n.readBy?.includes(currentEmployee.empId)).length;

  // Sync notes from globalData
  useEffect(() => {
    if (!globalData?.bulletinNotes) return;

    const now = new Date();
    const filteredNotes = globalData.bulletinNotes.filter((note: any) => {
      // Filter by location
      if (!isSuperAdmin && note.locationId !== locationId && note.locationId !== 'all') return false;

      // Auto-cleanup: non-pinned older than 24h
      if (!note.isPinned && note.createdAt) {
        const createdAt = typeof note.createdAt.toDate === 'function' ? note.createdAt.toDate() : new Date(note.createdAt);
        const diff = now.getTime() - createdAt.getTime();
        if (diff > 24 * 60 * 60 * 1000) return false;
      }

      // Check expiration
      if (note.expiresAt) {
        const expiryDate = typeof note.expiresAt.toDate === 'function' ? note.expiresAt.toDate() : new Date(note.expiresAt);
        if (now > expiryDate) return false;
      }

      // Check start date
      if (note.startDate) {
        const start = new Date(note.startDate);
        if (now < start) return false;
      }

      return true;
    });

    setNotes(filteredNotes);
  }, [globalData?.bulletinNotes, locationId, isSuperAdmin]);

  useEffect(() => {
    // Use employees from prop or globalData
    const empsSource = employeesProp || globalData?.nhanViens;
    if (empsSource && empsSource.length > 0) {
      setEmployees(empsSource.map((e: any) => ({
        id: e.id,
        fullName: e.fullName,
        avatar: e.avatar,
        empId: e.empId
      })));
    }
  }, [employeesProp, globalData?.nhanViens]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    setNewNoteContent(value);

    // Mention logic
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const queryText = textBeforeCursor.substring(lastAtSymbol + 1);
      // Check if there's a space after the @ or if it's too far back
      if (!queryText.includes(' ') && queryText.length < 20) {
        setMentionSearch(queryText);
        setMentionIndex(lastAtSymbol);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (employeeName: string) => {
    const beforeMention = newNoteContent.substring(0, mentionIndex);
    const afterMention = newNoteContent.substring(mentionIndex + mentionSearch.length + 1);
    const updatedContent = `${beforeMention}@${employeeName} ${afterMention}`;
    setNewNoteContent(updatedContent);
    setShowMentions(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      let expiresAt: any = null;

      if (endDate) {
        // If end date is set, expire at the end of that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        expiresAt = end;
      } else if (!startDate) {
        // Default: expire after 24 hours if no range is set
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      const noteData = {
        content: newNoteContent,
        color: selectedColor,
        emoji: selectedEmoji,
        locationId: targetLocations.length === 2 ? 'all' : targetLocations[0],
        repeatType,
        startDate: startDate || null,
        endDate: endDate || null,
        expiresAt: expiresAt ? expiresAt : null
      };

      if (editingNote) {
        await updateDoc(doc(db, 'BulletinBoard', editingNote.id), {
          ...noteData,
          updatedAt: serverTimestamp()
        });
        toast.success('Đã cập nhật ghi chú!');
      } else {
        await addDoc(collection(db, 'BulletinBoard'), {
          ...noteData,
          authorId: currentEmployee.empId,
          authorName: currentEmployee.fullName,
          authorAvatar: currentEmployee.avatar || '',
          authorRole: isAdmin ? 'Quản lý' : (currentEmployee.defaultRole || 'Nhân viên'),
          createdAt: serverTimestamp(),
          readBy: [currentEmployee.empId],
          isPinned: false
        });
        toast.success('Đã đăng ghi chú mới!');
      }

      // Instead of manual full re-fetch, we can trigger a parent refresh 
      // or just wait for the next stabilizer sync if it's frequent.
      // But for better UX, let's just clear the form.
      // If parent has a refresh function, it should be called here.

      setNewNoteContent('');
      setSelectedEmoji(EMOJIS[0]);
      setSelectedColor(NOTE_COLORS[0]);
      setRepeatType('none');
      setStartDate('');
      setEndDate('');
      setEditingNote(null);
      setIsAddingInline(false);
      setShowEmojiPicker(false);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error adding/editing note:', error);
      toast.error('Lỗi khi lưu ghi chú');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = (note: BulletinNote) => {
    if (note.authorId !== currentEmployee.empId) return false;
    
    // Condition: created < 15 mins ago
    const createdAt = note.createdAt?.toDate();
    if (createdAt) {
      const diffMins = (new Date().getTime() - createdAt.getTime()) / (1000 * 60);
      if (diffMins > 15) return false;
    }

    // Condition: < 2 people read (excluding author)
    const readers = note.readBy?.filter(id => id !== note.authorId) || [];
    if (readers.length >= 2) return false;

    return true;
  };

  const openEditModal = (note: BulletinNote) => {
    setEditingNote(note);
    setNewNoteContent(note.content);
    setSelectedEmoji(note.emoji || EMOJIS[0]);
    setSelectedColor(note.color);
    setRepeatType(note.repeatType || 'none');
    setStartDate(note.startDate || '');
    setEndDate(note.endDate || '');
    setTargetLocations(note.locationId === 'all' ? ['Góc Phố', 'Phố Xanh'] : [note.locationId]);
    setIsAddingInline(true);
    setSelectedNote(null);
  };

  const handleMarkAsRead = async (noteId: string) => {
    if (notes.find(n => n.id === noteId)?.readBy?.includes(currentEmployee.empId)) return;
    try {
      await updateDoc(doc(db, 'BulletinBoard', noteId), {
        readBy: arrayUnion(currentEmployee.empId)
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNoteClick = (note: BulletinNote) => {
    if (isLongPressActive) {
      setIsLongPressActive(false);
      return;
    }
    handleMarkAsRead(note.id);
  };

  const handleSaveInline = async (noteId: string) => {
    if (!inlineContent.trim()) {
      setInlineEditingId(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'BulletinBoard', noteId), {
        content: inlineContent,
        updatedAt: serverTimestamp()
      });
      setInlineEditingId(null);

      // Simple local state update to avoid full re-fetch for inline edits
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: inlineContent, updatedAt: new Date() } : n));
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Lỗi cập nhật');
    }
  };

  const handleTogglePin = async (e: React.MouseEvent | null, noteId: string, currentPinned: boolean) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;
    
    try {
      if (!currentPinned) {
        // Check pin limit (max 4)
        const pinnedCount = notes.filter(n => n.isPinned).length;
        if (pinnedCount >= 4) {
          toast.error('Chỉ ghim được tối đa 4 tin');
          return;
        }
      }

      await updateDoc(doc(db, 'BulletinBoard', noteId), {
        isPinned: !currentPinned
      });

      // Local update
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isPinned: !currentPinned } : n));
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setDeletingNoteId(noteId);
  };

  const confirmDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'BulletinBoard', noteId));
      setDeletingNoteId(null);
      // Local update
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Lỗi khi xóa thông báo');
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    // Priority 1: Pinned
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Priority 2: Unread
    const aUnread = !a.readBy?.includes(currentEmployee.empId);
    const bUnread = !b.readBy?.includes(currentEmployee.empId);
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;

    // Priority 3: Newest
    const aTime = a.createdAt?.toMillis() || 0;
    const bTime = b.createdAt?.toMillis() || 0;
    return bTime - aTime;
  });

  const mainDisplayNotes = sortedNotes.slice(0, 3);
  const hiddenNotes = sortedNotes.slice(3);
  const hiddenUnreadCount = hiddenNotes.filter(n => !n.readBy?.includes(currentEmployee.empId)).length;

  return (
    <div className="w-full space-y-1 py-1">
      <div className="flex items-center justify-between px-2">
        <div 
          className="flex items-center gap-1.5 cursor-pointer group"
          onClick={() => setShowAllNotesModal(true)}
        >
          <div className={`p-1.5 ${theme?.accent || 'bg-[#6F4E37]'} rounded-lg shadow-md ${theme?.shadow || 'shadow-stone-200'} group-hover:scale-110 transition-transform`}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">BẢNG THÔNG BÁO</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddingInline(!isAddingInline)}
            className={`p-1.5 rounded-lg transition-all active:scale-95 ${isAddingInline ? 'bg-red-50 text-red-500' : 'bg-white shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50'}`}
          >
            {isAddingInline ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Inline Add/Edit Entry (iOS Reminders Style) */}
      <AnimatePresence>
        {isAddingInline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-2"
          >
            <div className={`rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 transition-all ${selectedColor}`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 relative min-h-[60px]">
                    <textarea
                      autoFocus
                      value={newNoteContent}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: Hôm nay hết bạc xỉu..."
                      className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-slate-300 resize-none min-h-[60px]"
                      rows={2}
                    />
                    
                    {/* Mention Suggestions */}
                    <AnimatePresence>
                      {showMentions && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                        >
                          <div className="max-h-48 overflow-y-auto no-scrollbar p-1">
                            {employees
                              .filter(emp => emp.fullName.toLowerCase().includes(mentionSearch.toLowerCase()))
                              .slice(0, 5)
                              .map(emp => (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => insertMention(emp.fullName)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                                    {emp.fullName.charAt(0)}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{emp.fullName}</span>
                                </button>
                              ))}
                            {employees.filter(emp => emp.fullName.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                              <div className="p-4 text-center text-xs text-slate-400 font-bold">Không tìm thấy nhân viên</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Quick Access Toolbar (iOS Glyph style) */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-6">
                    {/* Emoji Picker */}
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowColorPicker(false);
                        }}
                        className={`transition-colors flex items-center justify-center p-1 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-0 mt-2 z-[200] bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 w-64"
                          >
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Emoji</span>
                              <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmoji(emoji);
                                    setNewNoteContent(prev => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Color Picker */}
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowColorPicker(!showColorPicker);
                          setShowEmojiPicker(false);
                        }}
                        className={`transition-colors flex items-center justify-center p-1 ${showColorPicker ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <Palette className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {showColorPicker && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-0 mt-2 z-[200] bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 w-48"
                          >
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu nền</span>
                              <button onClick={() => setShowColorPicker(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                              {NOTE_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedColor(color);
                                    setShowColorPicker(false);
                                  }}
                                  className={`w-8 h-8 rounded-lg border border-black/5 transition-all ${color} ${selectedColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Location Toggles (Super Admin only) */}
                    {isSuperAdmin && (
                      <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        {['Góc Phố', 'Phố Xanh'].map(loc => {
                          const isSelected = targetLocations.includes(loc);
                          const isOwnBranch = loc === locationId;
                          const canSelect = isSuperAdmin || isOwnBranch;
                          
                          return (
                            <button
                              key={loc}
                              type="button"
                              disabled={!canSelect}
                              onClick={() => {
                                if (!isSuperAdmin) return;
                                if (isSelected) {
                                  if (targetLocations.length > 1) setTargetLocations(targetLocations.filter(l => l !== loc));
                                } else {
                                  setTargetLocations([...targetLocations, loc]);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-400 border-transparent'} ${!canSelect ? 'opacity-30' : ''}`}
                            >
                              {loc}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || isSubmitting}
                    className={`text-sm font-black uppercase tracking-widest transition-all px-4 py-2 rounded-xl ${newNoteContent.trim() ? 'text-blue-600 bg-blue-50' : 'text-slate-300 bg-slate-50'}`}
                  >
                    {isSubmitting ? '...' : (editingNote ? 'Xong' : 'Đăng')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcements - Vertical List View */}
      <div className="px-2 space-y-1">
        <AnimatePresence mode="popLayout">
          {mainDisplayNotes.map((note) => {
            const displayIcon = note.emoji || ROLE_ICONS[note.authorRole] || '📝';
            const isUnread = !note.readBy?.includes(currentEmployee.empId);

            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onMouseDown={() => startLongPress(note)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(note)}
                onTouchEnd={cancelLongPress}
                onClick={() => handleNoteClick(note)}
                className={`relative flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                  isUnread 
                    ? `${note.color || 'bg-white'} ${theme?.border || 'border-stone-200'} shadow-md ring-1 ${theme?.ring || 'ring-stone-100'}` 
                    : `${note.color ? note.color.replace('bg-', 'bg-opacity-50 bg-') : 'bg-white/50'} border-slate-100 hover:bg-white hover:border-slate-200 shadow-sm`
                }`}
              >
                {note.isPinned && (
                  <div className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white p-1 rounded-lg shadow-md ring-2 ring-white z-10">
                    <Pin className="w-2.5 h-2.5 fill-current" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0 ${note.color || 'bg-white'}`}>
                  {displayIcon}
                </div>
                <div className="flex-1 min-w-0">
                  {inlineEditingId === note.id ? (
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        value={inlineContent}
                        onChange={(e) => setInlineContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveInline(note.id);
                          }
                          if (e.key === 'Escape') {
                            setInlineEditingId(null);
                          }
                        }}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl p-2 text-sm font-semibold italic leading-tight focus:ring-2 focus:ring-sky-500/20 outline-none resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setInlineEditingId(null)}
                          className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all uppercase tracking-widest"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveInline(note.id)}
                          className="px-3 py-1.5 text-[10px] font-black bg-sky-500 text-white hover:bg-sky-600 rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-lg shadow-sky-500/20"
                        >
                          <Send strokeWidth={2} className="w-3 h-3" />
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm font-semibold italic leading-snug ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                      {note.content}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 leading-none mt-1.5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                      {note.authorName.split(' ').slice(-1)[0]}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap opacity-60">
                      {note.createdAt ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <>
                      {deletingNoteId === note.id ? (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-rose-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setDeletingNoteId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => confirmDeleteNote(note.id)}
                            className="px-2 py-1 bg-rose-500 text-white text-[9px] font-black rounded uppercase tracking-tighter hover:bg-rose-600 transition-all"
                          >
                            Xóa
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInlineEditingId(note.id);
                              setInlineContent(note.content);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteNote(e, note.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {isUnread && !inlineEditingId && (
                  <div className={`w-1.5 h-1.5 rounded-full ${theme?.accent || 'bg-amber-500'} flex-shrink-0`} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {sortedNotes.length > 3 && (
          <button 
            onClick={() => setShowAllNotesModal(true)}
            className="w-full py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            {hiddenUnreadCount > 0 ? (
              <span className={`flex items-center gap-1 ${theme?.text || 'text-[#6F4E37]'}`}>
                <Sparkles className="w-3 h-3" />
                +{hiddenUnreadCount} tin chưa đọc
              </span>
            ) : (
              `Xem thêm ${hiddenNotes.length} tin`
            )}
          </button>
        )}
        
        {sortedNotes.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Chưa có thông báo nào</p>
          </div>
        )}
      </div>

      {/* Zoom Modal - REMOVED per user request */}
      
      {/* Expanded List Modal */}
      <AnimatePresence>
        {showAllNotesModal && (
          <div className="fixed inset-0 z-[250] flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
            <div className="p-6 flex items-center justify-between bg-white border-b border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${theme?.accent || 'bg-[#6F4E37]'} rounded-xl shadow-lg ${theme?.shadow || 'shadow-stone-200'}`}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tất cả thông báo</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bảng thông báo nội bộ</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAllNotesModal(false)}
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-90"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24">
              {sortedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-50">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="font-bold">Chưa có thông báo nào</p>
                </div>
              ) : (
                sortedNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    layout
                    onMouseDown={() => startLongPress(note)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(note)}
                    onTouchEnd={cancelLongPress}
                    onClick={() => handleNoteClick(note)}
                    className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden ${note.color} ${note.readBy?.includes(currentEmployee.empId) ? 'opacity-70 border-transparent' : 'border-white shadow-xl shadow-black/5'}`}
                  >
                    {note.isPinned && (
                      <div className="absolute top-4 left-4 text-rose-500">
                        <Pin className="w-5 h-5 fill-current" />
                      </div>
                    )}
                    
                    <p className={`text-lg font-semibold italic text-slate-900 leading-relaxed mb-3 ${note.isPinned ? 'mt-6' : ''}`}>
                      "{note.content}"
                    </p>
                    
                    <div className="flex items-center gap-3 mb-4 opacity-80">
                      <div className="w-8 h-8 rounded-xl bg-white/50 border border-white/30 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {note.authorAvatar ? (
                          <img src={note.authorAvatar} alt={note.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4 opacity-30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-400 truncate">{note.authorName.split(' ').slice(-1)[0]}</h4>
                        <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{note.authorRole}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">
                          {note.createdAt ? formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            {deletingNoteId === note.id ? (
                              <div className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-rose-100" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setDeletingNoteId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => confirmDeleteNote(note.id)}
                                  className="px-2 py-1 bg-rose-500 text-white text-[9px] font-black rounded uppercase tracking-tighter hover:bg-rose-600 transition-all"
                                >
                                  Xóa
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingId(note.id);
                                    setInlineContent(note.content);
                                    setShowAllNotesModal(false);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteNote(e, note.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white/50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {!note.readBy?.includes(currentEmployee.empId) && (
                          <div className={`flex items-center gap-1 ${theme?.accent || 'bg-[#6F4E37]'} text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter`}>
                            Mới
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <button
                onClick={() => {
                  setShowAllNotesModal(false);
                  setIsAddingInline(true);
                }}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                <Plus className="w-5 h-5" />
                Đăng tin mới
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
