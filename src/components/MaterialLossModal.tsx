import React from 'react';
import { X, Save, Box, Trash2 } from 'lucide-react';
import { Employee } from '../types/admin';

interface MaterialLossModalProps {
  show: boolean;
  onClose: () => void;
  onProcess: () => Promise<void>;
  itemType: string;
  setItemType: (val: string) => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  totalLossAmount: string;
  setTotalLossAmount: (val: string) => void;
  weightedEmployees: any[];
  setWeightedEmployees: (val: any[]) => void;
  materialItems: any[];
  isProcessingLoss: boolean;
  handleSelectItemType: (name: string) => void;
  adminTheme: any;
}

export const MaterialLossModal: React.FC<MaterialLossModalProps> = ({
  show,
  onClose,
  onProcess,
  itemType,
  setItemType,
  originalPrice,
  setOriginalPrice,
  totalLossAmount,
  setTotalLossAmount,
  weightedEmployees,
  setWeightedEmployees,
  materialItems,
  isProcessingLoss,
  handleSelectItemType,
  adminTheme,
}) => {
  const handleClose = () => {
    if (itemType || totalLossAmount || originalPrice) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto pt-20 pb-20" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden">
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${adminTheme.header}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Khấu trừ hao hụt vật tư</h2>
              <p className="text-sm text-white/70">Phân bổ chi phí hao hụt cho nhân viên dựa trên giờ làm</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 lg:p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className={`w-6 h-6 ${adminTheme.accent} text-white rounded-full flex items-center justify-center text-xs`}>1</span>
                  Thông tin vật tư
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại vật tư (Ly, tách, muỗng...)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemType}
                        onChange={e => setItemType(e.target.value)}
                        className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
                        placeholder="Nhập tên vật tư..."
                      />
                      {materialItems.length > 0 && !itemType && (
                        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 p-2 space-y-1">
                          <p className="text-[10px] uppercase font-black text-slate-400 px-2 py-1">Gợi ý từ lịch sử:</p>
                          {materialItems.map(item => (
                            <button
                              key={item.name}
                              onClick={() => handleSelectItemType(item.name)}
                              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg text-sm text-slate-700 font-medium transition-colors`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Giá gốc (VNĐ)</label>
                      <input
                        type="number"
                        value={originalPrice}
                        onChange={e => setOriginalPrice(e.target.value)}
                        className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tổng tiền phạt (VNĐ)</label>
                      <input
                        type="number"
                        value={totalLossAmount}
                        onChange={e => setTotalLossAmount(e.target.value)}
                        className={`w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none font-bold ${adminTheme.text}`}
                        placeholder="Ví dụ: 150000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <h3 className="font-bold text-amber-900 mb-2">Công thức phân bổ</h3>
                <p className="text-xs text-amber-700 leading-relaxed mb-4">
                  Chi phí sẽ được chia đều dựa trên tổng số giờ làm của các nhân viên được chọn trong tháng này.
                </p>
                <div className="p-3 bg-white/50 rounded-xl border border-amber-100 text-xs font-mono text-amber-800">
                  Phạt mỗi giờ = Tổng tiền / Tổng giờ nhân viên<br/>
                  Khấu trừ NV = Phạt mỗi giờ × Số giờ NV đó làm
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className={`w-6 h-6 ${adminTheme.accent} text-white rounded-full flex items-center justify-center text-xs`}>2</span>
                  Nhân viên chịu phạt
                </h3>
                <button 
                  onClick={() => setWeightedEmployees(weightedEmployees.map(e => ({ ...e, checked: !weightedEmployees.every(w => w.checked) })))}
                  className={`text-[10px] font-black ${adminTheme.text} uppercase hover:underline`}
                >
                  {weightedEmployees.every(w => w.checked) ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                </button>
              </div>
              
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {weightedEmployees.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic text-sm">
                    Không có nhân viên nào có giờ làm trong tháng này.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {weightedEmployees.map(emp => (
                      <div key={emp.id} className={`p-4 flex items-center gap-4 transition-colors hover:bg-slate-50 ${emp.checked ? 'bg-slate-50' : ''}`}>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={emp.checked}
                            onChange={() => setWeightedEmployees(weightedEmployees.map(e => e.id === emp.id ? { ...e, checked: !e.checked } : e))}
                            className={`w-5 h-5 rounded-lg border-slate-300 ${adminTheme.text} ${adminTheme.ring} transition-all cursor-pointer`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${emp.checked ? adminTheme.text : 'text-slate-700'}`}>{emp.fullName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">{emp.empId}</span>
                            <span className={`text-[10px] font-black ${adminTheme.text}`}>{emp.totalHours.toFixed(1)}h làm việc</span>
                          </div>
                        </div>
                        {emp.checked && totalLossAmount && Number(totalLossAmount) > 0 && (
                          <div className="text-right">
                            <p className={`text-xs font-black ${adminTheme.text} tracking-tight`}>
                              -{new Intl.NumberFormat('vi-VN').format(Math.round((Number(totalLossAmount) / weightedEmployees.filter(e => e.checked).reduce((sum, e) => sum + e.totalHours, 0)) * emp.totalHours))}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onProcess}
            disabled={isProcessingLoss || !itemType || !totalLossAmount}
            className={`px-8 py-3 ${adminTheme.button} text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:grayscale`}
          >
            {isProcessingLoss ? 'Đang xử lý...' : 'Xác nhận khấu trừ'}
            {!isProcessingLoss && <Save className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
