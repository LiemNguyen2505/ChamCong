import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PayrollAdjustment } from './AdminView';

interface PayrollAdjustmentModalProps {
  adjustment: PayrollAdjustment;
  empName: string;
  monthYear: string;
  empId: string;
  onClose: () => void;
  onSave: () => void;
}

export const PayrollAdjustmentModal: React.FC<PayrollAdjustmentModalProps> = ({
  adjustment,
  empName,
  monthYear,
  empId,
  onClose,
  onSave
}) => {
  const [penalty, setPenalty] = useState(adjustment?.penalty?.toString() || '0');
  const [returnRetainedSalary, setReturnRetainedSalary] = useState(adjustment?.returnRetainedSalary?.toString() || '0');
  const [advanceSalary, setAdvanceSalary] = useState(adjustment?.advanceSalary?.toString() || '0');
  const [compensation, setCompensation] = useState(adjustment?.compensation?.toString() || '0');
  const [note, setNote] = useState(adjustment?.note || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docId = `${monthYear}_${empId}`;
      await setDoc(doc(db, 'PayrollAdjustments', docId), {
        empId,
        monthYear,
        penalty: parseInt(penalty.replace(/\D/g, '')) || 0,
        returnRetainedSalary: parseInt(returnRetainedSalary.replace(/\D/g, '')) || 0,
        advanceSalary: parseInt(advanceSalary.replace(/\D/g, '')) || 0,
        compensation: parseInt(compensation.replace(/\D/g, '')) || 0,
        note
      });
      onSave();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      alert('Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const number = parseInt(value.replace(/\D/g, ''));
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat('vi-VN').format(number);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-center">
          <h3 className="font-bold text-xl">Điều chỉnh lương - {empName}</h3>
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phạt (đi trễ, điện thoại...)</label>
            <input
              type="text"
              value={formatCurrency(penalty)}
              onChange={(e) => setPenalty(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Trả lương giữ tạm</label>
            <input
              type="text"
              value={formatCurrency(returnRetainedSalary)}
              onChange={(e) => setReturnRetainedSalary(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ứng lương</label>
            <input
              type="text"
              value={formatCurrency(advanceSalary)}
              onChange={(e) => setAdvanceSalary(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tiền đền ly tách, dụng cụ</label>
            <input
              type="text"
              value={formatCurrency(compensation)}
              onChange={(e) => setCompensation(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              rows={3}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Đang lưu...' : 'Lưu điều chỉnh'}
          </button>
        </div>
      </div>
    </div>
  );
};
