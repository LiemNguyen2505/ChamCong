import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HolidayConfig } from '../types/admin';
import { toast } from 'react-hot-toast';

interface HolidayConfigModalProps {
  holidays: HolidayConfig[];
  onClose: () => void;
  fetchInitialData?: (month?: string, force?: boolean) => Promise<any>;
  adminTheme: any;
}

export const HolidayConfigModal: React.FC<HolidayConfigModalProps> = ({
  holidays,
  onClose,
  fetchInitialData,
  adminTheme
}) => {
  const [localHolidays, setLocalHolidays] = useState<HolidayConfig[]>(holidays);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('2');
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
  };

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [newDate, newName]); // Re-bind when dirty state changes

  const handleAdd = async () => {
    if (!newDate || !newName) return;
    setLoading(true);
    try {
      const newHoliday: HolidayConfig = {
        id: newDate,
        date: newDate,
        name: newName,
        multiplier: parseFloat(newMultiplier) || 2
      };
      await setDoc(doc(db, 'Holidays', newDate), newHoliday);
      setLocalHolidays([...localHolidays, newHoliday]);
      if (fetchInitialData) await fetchInitialData(undefined, true);
      setNewDate('');
      setNewName('');
      setNewMultiplier('2');
      toast.success('Đã thêm ngày lễ');
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Có lỗi xảy ra khi thêm ngày lễ.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'Holidays', id));
      setLocalHolidays(localHolidays.filter(h => h.id !== id));
      if (fetchInitialData) await fetchInitialData(undefined, true);
      toast.success('Đã xóa ngày lễ');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Có lỗi xảy ra khi xóa ngày lễ.');
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        {confirmDeleteId && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa</h3>
              <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa ngày lễ này?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={`${adminTheme.header} p-6 border-b border-white/10 flex justify-between items-center`}>
          <h3 className="font-bold text-xl uppercase tracking-widest text-white">Cấu hình ngày lễ</h3>
          <button onClick={handleClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex gap-4 mb-6 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Ngày</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm font-bold text-slate-700`}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tên ngày lễ</label>
              <input
                type="text"
                placeholder="VD: Tết Dương Lịch"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm font-bold text-slate-700`}
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hệ số</label>
              <input
                type="number"
                step="0.5"
                value={newMultiplier}
                onChange={(e) => setNewMultiplier(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm font-bold text-slate-700`}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={loading || !newDate || !newName}
              className={`px-6 h-[42px] ${adminTheme.button} text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-96 border border-gray-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-bold text-gray-600">Ngày</th>
                  <th className="p-4 font-bold text-gray-600">Tên ngày lễ</th>
                  <th className="p-4 font-bold text-gray-600">Hệ số</th>
                  <th className="p-4 font-bold text-gray-600 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {localHolidays.sort((a, b) => a.date.localeCompare(b.date)).map(holiday => (
                  <tr key={holiday.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">{holiday.date}</td>
                    <td className="p-4 font-medium">{holiday.name}</td>
                    <td className="p-4">x{holiday.multiplier}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setConfirmDeleteId(holiday.id)}
                        disabled={loading}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {localHolidays.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Chưa có ngày lễ nào được cấu hình.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
