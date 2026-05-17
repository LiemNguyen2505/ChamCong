import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PayrollAdjustment } from '../types/admin';
import toast from 'react-hot-toast';

interface PayrollAdjustmentModalProps {
  adjustment: PayrollAdjustment;
  empName: string;
  monthYear: string;
  empId: string;
  onClose: () => void;
  onSave: () => void;
  adminTheme: any;
}

export const PayrollAdjustmentModal: React.FC<PayrollAdjustmentModalProps> = ({
  adjustment,
  empName,
  monthYear,
  empId,
  onClose,
  onSave,
  adminTheme
}) => {
  const [penalty, setPenalty] = useState(adjustment?.penalty?.toString() || '0');
  const [penaltyNote, setPenaltyNote] = useState(adjustment?.penaltyNote || '');
  const [returnRetainedSalary, setReturnRetainedSalary] = useState(adjustment?.returnRetainedSalary?.toString() || '0');
  const [extraAdditions, setExtraAdditions] = useState(adjustment?.extraAdditions?.toString() || '0');
  const [extraAdditionsNote, setExtraAdditionsNote] = useState(adjustment?.extraAdditionsNote || '');
  const [advanceSalary, setAdvanceSalary] = useState(adjustment?.advanceSalary?.toString() || '0');
  const [advanceSalaryNote, setAdvanceSalaryNote] = useState(adjustment?.advanceSalaryNote || '');
  const [compensation, setCompensation] = useState(adjustment?.compensation?.toString() || '0');
  const [compensationNote, setCompensationNote] = useState(adjustment?.compensationNote || '');
  const [materialLoss, setMaterialLoss] = useState(adjustment?.materialLoss?.toString() || '0');
  const [materialLossNote, setMaterialLossNote] = useState(adjustment?.materialLossNote || '');
  const [note, setNote] = useState(adjustment?.note || '');
  const [loading, setLoading] = useState(false);

  const [isDirty, setIsDirty] = useState(false);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isDirty, onClose]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docId = `${empId}_${monthYear}`;
      await setDoc(doc(db, 'PayrollAdjustments', docId), {
        empId,
        monthYear,
        penalty: parseInt(penalty.replace(/\D/g, '')) || 0,
        penaltyNote,
        returnRetainedSalary: parseInt(returnRetainedSalary.replace(/\D/g, '')) || 0,
        extraAdditions: parseInt(extraAdditions.replace(/\D/g, '')) || 0,
        extraAdditionsNote,
        advanceSalary: parseInt(advanceSalary.replace(/\D/g, '')) || 0,
        advanceSalaryNote,
        materialLoss: parseInt(materialLoss.replace(/\D/g, '')) || 0,
        materialLossNote,
        compensation: parseInt(compensation.replace(/\D/g, '')) || 0,
        compensationNote,
        note
      });
      toast.success('Đã lưu điều chỉnh lương');
      onSave();
    } catch (error) {
      console.error('Error saving adjustment:', error);
      toast.error('Có lỗi xảy ra khi lưu dữ liệu.');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onChange={() => setIsDirty(true)}>
        <div className={`p-6 ${adminTheme.header} text-white flex justify-between items-center`}>
          <h3 className="font-bold text-xl">Điều chỉnh lương - {empName}</h3>
          <button onClick={handleClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Phạt (đi trễ, điện thoại...)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatCurrency(penalty)}
                onChange={(e) => setPenalty(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              />
              <input
                type="text"
                placeholder="Ghi chú..."
                value={penaltyNote}
                onChange={(e) => setPenaltyNote(e.target.value)}
                className={`w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 ${adminTheme.ring} outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Thu nhập bổ sung</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatCurrency(extraAdditions)}
                onChange={(e) => setExtraAdditions(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              />
              <input
                type="text"
                placeholder="Ghi chú..."
                value={extraAdditionsNote}
                onChange={(e) => setExtraAdditionsNote(e.target.value)}
                className={`w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 ${adminTheme.ring} outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ứng lương</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatCurrency(advanceSalary)}
                onChange={(e) => setAdvanceSalary(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              />
              <input
                type="text"
                placeholder="Ghi chú..."
                value={advanceSalaryNote}
                onChange={(e) => setAdvanceSalaryNote(e.target.value)}
                className={`w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 ${adminTheme.ring} outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tiền đền ly tách, dụng cụ</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatCurrency(compensation)}
                onChange={(e) => setCompensation(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              />
              <input
                type="text"
                placeholder="Ghi chú..."
                value={compensationNote}
                onChange={(e) => setCompensationNote(e.target.value)}
                className={`w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 ${adminTheme.ring} outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Hao hụt vật tư</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formatCurrency(materialLoss)}
                onChange={(e) => setMaterialLoss(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              />
              <input
                type="text"
                placeholder="Ghi chú..."
                value={materialLossNote}
                onChange={(e) => setMaterialLossNote(e.target.value)}
                className={`w-1/3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 ${adminTheme.ring} outline-none`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
              rows={3}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 ${adminTheme.button} text-white rounded-xl font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-2`}
          >
            <Save className="w-5 h-5" />
            {loading ? 'Đang lưu...' : 'Lưu điều chỉnh'}
          </button>
        </div>
      </div>
    </div>
  );
};
