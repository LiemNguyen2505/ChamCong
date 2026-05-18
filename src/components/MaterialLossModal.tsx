import React from 'react';
import { X, Save, Box, Trash2 } from 'lucide-react';
import { Employee } from '../types/admin';

interface MaterialLossModalProps {
  show: boolean;
  onClose: () => void;
  onProcess: () => Promise<void>;
  itemType: string;
  setItemType: (val: string) => void;
  lossType?: 'general' | 'individual';
  setLossType?: (val: 'general' | 'individual') => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  totalLossAmount?: string;
  setTotalLossAmount?: (val: string) => void;
  weightedEmployees: any[];
  setWeightedEmployees: (val: any[]) => void;
  materialItems: any[];
  materialLossLogs: any[];
  isProcessingLoss: boolean;
  handleSelectItemType: (name: string) => void;
  adminTheme: any;
  quantity?: string;
  setQuantity?: (val: string) => void;
  deductionPrice?: number;
}

export const MaterialLossModal: React.FC<MaterialLossModalProps> = ({
  show,
  onClose,
  onProcess,
  itemType,
  setItemType,
  lossType,
  setLossType,
  originalPrice,
  setOriginalPrice,
  totalLossAmount,
  setTotalLossAmount,
  weightedEmployees,
  setWeightedEmployees,
  materialItems,
  materialLossLogs,
  isProcessingLoss,
  handleSelectItemType,
  adminTheme,
  quantity,
  setQuantity,
  deductionPrice,
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
              <h2 className="text-xl font-bold text-white">Khấu trừ hao hụt dụng cụ</h2>
              <p className="text-sm text-white/70">Ghi nhận và phân bổ chi phí đền bù dụng cụ</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 lg:p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="flex flex-col gap-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 overflow-hidden text-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className={`w-6 h-6 ${adminTheme.accent} text-white rounded-full flex items-center justify-center text-xs`}>1</span>
                Thông tin dụng cụ
              </h3>
              
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 text-xs font-semibold text-slate-700 w-1/4">Tên dụng cụ</th>
                      <th className="pb-2 text-xs font-semibold text-slate-700 w-1/6">Giá gốc (VNĐ)</th>
                      <th className="pb-2 text-xs font-semibold text-slate-700 w-1/6">Giá đền bù (= 70%)</th>
                      <th className="pb-2 text-xs font-semibold text-slate-700 w-1/6">Số lượng</th>
                      <th className="pb-2 text-xs font-semibold text-slate-700 w-1/6">Tổng tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-4 pr-3 align-top">
                        <div className="relative">
                          <input
                            type="text"
                            value={itemType}
                            onChange={e => setItemType(e.target.value)}
                            className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm`}
                            placeholder="Nhập tên..."
                          />
                          {materialItems.filter(item => item.name.toLowerCase().includes(itemType.toLowerCase()) && item.name !== itemType).length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 p-2 space-y-1 max-h-40 overflow-y-auto">
                              <p className="text-[10px] uppercase font-black text-slate-400 px-2 py-1">Gợi ý từ lịch sử:</p>
                              {materialItems.filter(item => item.name.toLowerCase().includes(itemType.toLowerCase()) && item.name !== itemType).map(item => (
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
                      </td>
                      <td className="pt-4 pr-3 align-top">
                        <input
                          type="number"
                          value={originalPrice}
                          onChange={e => setOriginalPrice(e.target.value)}
                          className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm`}
                          placeholder="0"
                        />
                      </td>
                      <td className="pt-4 pr-3 align-top">
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm">
                          {deductionPrice ? new Intl.NumberFormat('vi-VN').format(deductionPrice) : '0'} ₫
                        </div>
                      </td>
                      <td className="pt-4 pr-3 align-top">
                        <input
                          type="number"
                          value={quantity || ''}
                          onChange={e => setQuantity && setQuantity(e.target.value)}
                          className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none text-sm`}
                          placeholder="Số lượng"
                        />
                      </td>
                      <td className="pt-4 align-top">
                        <input
                          type="number"
                          value={totalLossAmount || ''}
                          onChange={e => setTotalLossAmount && setTotalLossAmount(e.target.value)}
                          className={`w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 ${adminTheme.ring} outline-none font-bold ${adminTheme.text} text-sm`}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {weightedEmployees.filter(e => e.checked).length > 1 ? (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 h-fit">
                  <h3 className="font-bold text-amber-900 mb-2 font-black uppercase text-[10px] tracking-widest bg-amber-200/50 w-fit px-2 py-0.5 rounded-full">Phạt tập thể</h3>
                  <h3 className="font-bold text-amber-900 mb-2 mt-2">Công thức phân bổ</h3>
                  <p className="text-xs text-amber-700 leading-relaxed mb-4">
                    Chi phí sẽ được chia đều dựa trên tổng số giờ làm của các nhân viên được chọn trong tháng này.
                  </p>
                  <div className="p-3 bg-white/50 rounded-xl border border-amber-100 text-xs font-mono text-amber-800">
                    Phạt mỗi giờ = Tổng tiền / Tổng giờ nhân viên<br/>
                    Khấu trừ NV = Phạt mỗi giờ × Số giờ NV đó làm
                  </div>
                </div>
              ) : weightedEmployees.filter(e => e.checked).length === 1 ? (
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 h-fit">
                  <h3 className="font-bold text-indigo-900 mb-2 font-black uppercase text-[10px] tracking-widest bg-indigo-200/30 w-fit px-2 py-0.5 rounded-full">Phạt cá nhân</h3>
                  <h3 className="font-bold text-indigo-900 mb-2 mt-2">Khấu trừ riêng</h3>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Hệ thống sẽ áp 100% giá trị khấu trừ vào nhân viên được chọn.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit border-dashed">
                  <p className="text-xs text-slate-400 text-center italic">Chọn một hoặc nhiều nhân viên để áp dụng khấu trừ</p>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className={`w-6 h-6 ${adminTheme.accent} text-white rounded-full flex items-center justify-center text-xs`}>2</span>
                  Danh sách Nhân viên
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
                      <div key={emp.id} className={`p-4 flex items-center gap-4 transition-colors hover:bg-slate-50 ${emp.checked ? 'bg-slate-50' : ''}`} onClick={() => {
                        setWeightedEmployees(weightedEmployees.map(e => e.id === emp.id ? { ...e, checked: !e.checked } : e));
                      }}>
                        <div className="relative inline-flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={emp.checked}
                            onChange={() => {
                              setWeightedEmployees(weightedEmployees.map(e => e.id === emp.id ? { ...e, checked: !e.checked } : e));
                            }}
                            className={`w-5 h-5 border-slate-300 ${adminTheme.text} ${adminTheme.ring} transition-all cursor-pointer rounded-lg`}
                          />
                        </div>
                        <div className="flex-1 cursor-pointer">
                          <p className={`font-bold text-sm ${emp.checked ? adminTheme.text : 'text-slate-700'}`}>{emp.fullName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">{emp.empId}</span>
                            <span className={`text-[10px] font-black ${adminTheme.text}`}>{emp.totalHours.toFixed(1)}h làm việc</span>
                          </div>
                        </div>
                        {emp.checked && totalLossAmount && Number(totalLossAmount) > 0 && (
                          <div className="text-right">
                            <p className={`text-xs font-black ${adminTheme.text} tracking-tight`}>
                              -{new Intl.NumberFormat('vi-VN').format(
                                weightedEmployees.filter(e => e.checked).length === 1 
                                  ? Number(totalLossAmount) 
                                  : Math.round((Number(totalLossAmount) / weightedEmployees.filter(e => e.checked).reduce((sum, e) => sum + e.totalHours, 0)) * emp.totalHours)
                              )}
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

          <div className="mt-8">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className={`w-6 h-6 border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-xs`}>3</span>
              Lịch sử nhập liệu
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Thời gian</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Loại dụng cụ</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Hình thức</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Tổng tiền</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Nhân viên liên quan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {materialLossLogs && materialLossLogs.length > 0 ? (
                      materialLossLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {log.processedAt ? (log.processedAt.toDate ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(log.processedAt.toDate()) : new Date(log.processedAt).toLocaleString('vi-VN')) : '---'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{log.itemType}</td>
                          <td className="px-4 py-3">
                            {log.type === 'general' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                                Tập thể (Chia đều)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                                Cá nhân (Phạt riêng)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900">{new Intl.NumberFormat('vi-VN').format(log.totalAmount)} ₫</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={log.affectedEmployees?.join(', ')}>
                            {log.affectedEmployees?.join(', ') || '---'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Chưa có lịch sử trong tháng này</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 mb-6">
          <button
            onClick={handleClose}
            className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onProcess}
            disabled={isProcessingLoss || !itemType || !totalLossAmount}
            className={`px-8 py-3 ${adminTheme.button} text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:grayscale active:scale-95`}
          >
            {isProcessingLoss ? 'Đang xử lý...' : 'Xác nhận khấu trừ'}
            {!isProcessingLoss && <Save className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
