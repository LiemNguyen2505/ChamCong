import React, { useState } from 'react';
import { X, Save, WineOff, History } from 'lucide-react';
import { motion } from 'motion/react';

interface MaterialLossModalProps {
  show: boolean;
  onClose: () => void;
  openConfirmModal?: (title: string, message: string, onConfirm: () => void) => void;
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

const MaterialLossModal: React.FC<MaterialLossModalProps> = ({
  show,
  onClose,
  openConfirmModal,
  onProcess,
  itemType,
  setItemType,
  lossType = 'general',
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
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleClose = () => {
    if (itemType || (totalLossAmount && totalLossAmount !== '0') || originalPrice) {
      if (openConfirmModal) {
        openConfirmModal('Xác nhận', 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form?', () => {
          onClose();
        });
      } else {
        if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form?')) {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  const handleToggleLossType = (checked: boolean) => {
    if (setLossType) {
       setLossType(checked ? 'general' : 'individual');
    }
    const safeEmployees = weightedEmployees || [];
    if (checked) {
       setWeightedEmployees(safeEmployees.map(e => ({ ...e, checked: true })));
    } else {
       let found = false;
       setWeightedEmployees(safeEmployees.map(e => {
          if (!found && e.checked) {
              found = true;
              return { ...e, checked: true };
          }
          if (!found) {
              found = true;
              return { ...e, checked: true };
          }
          return { ...e, checked: false };
       }));
    }
  };

  const currentTotalAmount = Number(totalLossAmount || 0);

  const safeEmployees = weightedEmployees || [];
  const validEmployees = safeEmployees.filter(e => (e.totalHours || 0) > 0);
  const sumTotalHours = validEmployees.reduce((sum, e) => sum + (e.totalHours || 0), 0);

  const safeLogs = materialLossLogs || [];
  const previousSharedLoss = safeLogs
    .filter(log => log.type === 'general')
    .reduce((sum, log) => sum + (log.totalAmount || 0), 0);

  const currentSharedLoss = lossType === 'general' ? currentTotalAmount : 0;
  const simulatedTotalSharedFund = previousSharedLoss + currentSharedLoss;
  const currentCoefficient = sumTotalHours > 0 ? simulatedTotalSharedFund / sumTotalHours : 0;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto pt-20 pb-20" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-[95vw] lg:max-w-7xl shadow-2xl relative flex flex-col max-h-[90vh]">
        <div className={`p-6 border-b border-slate-100 flex justify-between items-center shrink-0 ${adminTheme?.header || 'bg-emerald-600'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <WineOff className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Khấu trừ dụng cụ (Ly tách)</h2>
              <p className="hidden md:block text-sm text-white/70">Ghi nhận và phân bổ chi phí bồi thường dụng cụ/ly tách</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar relative block h-full">
          <div className="grid grid-cols-12 gap-3 md:gap-6">
            
            {/* CỘT 1: KHUNG NHẬP LIỆU */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:gap-4">
              <div className="bg-slate-50 p-4 md:p-5 rounded-[1.5rem] md:rounded-2xl border border-slate-200 md:border-slate-100 flex flex-col h-full shadow-sm md:shadow-none">
                <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-tight">
                  <span className={`w-6 h-6 ${adminTheme?.accent || 'bg-emerald-500'} text-white rounded-full flex items-center justify-center text-xs shadow-sm`}>1</span>
                  THỐNG KÊ DỤNG CỤ
                </h3>

                <div className="space-y-3 md:space-y-5 flex-1 pb-4">
                  <div className="space-y-1 md:space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 mb-1 md:mb-1.5 uppercase tracking-widest px-1">Tên dụng cụ</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemType || ''}
                        onChange={e => setItemType(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                        className={`w-full min-h-[44px] px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:ring-4 ${adminTheme?.ring || 'focus:ring-emerald-500/10'} focus:border-emerald-500 outline-none font-bold transition-all placeholder:text-slate-300`}
                        placeholder="Nhập tên dụng cụ..."
                      />
                      {isInputFocused && (itemType || '').trim().length > 0 && (materialItems || []).filter(item => item && item.name && item.name.toLowerCase().includes((itemType||'').toLowerCase()) && item.name !== itemType).length > 0 && (
                        <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] p-2 space-y-1 max-h-48 overflow-y-auto border-t-0 rounded-t-none">
                          {(materialItems || []).filter(item => item && item.name && item.name.toLowerCase().includes((itemType||'').toLowerCase()) && item.name !== itemType).map(item => (
                            <button
                              key={item.name}
                              onClick={() => handleSelectItemType(item.name)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 rounded-xl text-sm text-slate-700 font-bold transition-colors"
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="space-y-1 md:space-y-1.5">
                       <label className="block text-[10px] font-black text-slate-400 mb-1 md:mb-1.5 uppercase tracking-widest px-1">Giá gốc (VNĐ)</label>
                       <input
                          type="number"
                          value={originalPrice || ''}
                          onChange={e => setOriginalPrice(e.target.value)}
                          className={`w-full min-h-[40px] md:min-h-[44px] px-3 md:px-4 py-2 md:py-2.5 text-sm bg-white border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 ${adminTheme?.ring || 'focus:ring-emerald-500/10'} focus:border-emerald-500 outline-none font-bold transition-all`}
                          placeholder="0"
                       />
                    </div>

                    <div className="space-y-1 md:space-y-1.5">
                       <label className="block text-[10px] font-black text-slate-400 mb-1 md:mb-1.5 uppercase tracking-widest px-1">Số lượng</label>
                       <input
                          type="number"
                          value={quantity || ''}
                          onChange={e => setQuantity && setQuantity(e.target.value)}
                          className={`w-full min-h-[40px] md:min-h-[44px] px-3 md:px-4 py-2 md:py-2.5 text-sm bg-white border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 ${adminTheme?.ring || 'focus:ring-emerald-500/10'} focus:border-emerald-500 outline-none font-bold transition-all`}
                          placeholder="0"
                       />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-2 md:p-3 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Mức bồi thường (= 70% giá gốc)</p>
                    <p className={`font-black text-lg md:text-xl ${adminTheme?.text || 'text-emerald-600'}`}>
                       {totalLossAmount ? new Intl.NumberFormat('vi-VN').format(Number(totalLossAmount)) : '0'} ₫
                    </p>
                  </div>

                  <div className="pt-1 md:pt-2">
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 md:mb-2 uppercase tracking-widest px-1">Hình Thức Khấu Trừ</label>
                    <div className="flex bg-slate-200/60 p-1.5 rounded-2xl">
                      <button
                        onClick={() => handleToggleLossType(false)}
                        className={`flex-1 min-h-[36px] px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${lossType === 'individual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Cá nhân
                      </button>
                      <button
                        onClick={() => handleToggleLossType(true)}
                        className={`flex-1 min-h-[36px] px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${lossType === 'general' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Tập Thể
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CỘT 2: ĐỐI TƯỢNG ÁP DỤNG */}
            <div className="col-span-12 md:col-span-4 md:h-full">
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-2xl flex flex-col shadow-sm md:h-full md:max-h-[500px]">
                 <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-[1.5rem] md:rounded-t-2xl shrink-0">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
                      <span className={`w-6 h-6 ${adminTheme?.accent || 'bg-emerald-500'} text-white rounded-full flex items-center justify-center text-xs shadow-sm`}>2</span>
                      Danh Sách NV Khấu Trừ
                    </h3>
                    {lossType === 'individual' ? (
                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                         Chọn 1 người
                       </span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        Phân bổ theo giờ
                      </span>
                    )}
                 </div>

                 {lossType === 'general' ? (
                   <div className="flex-1 flex flex-col overflow-hidden rounded-b-2xl">
                     <div className="p-3 md:p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
                       <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Toàn bộ nhân sự</span>
                       <div className="flex items-center gap-2 px-3 py-1 bg-white border border-emerald-200 rounded-xl shadow-sm">
                         <span className="text-[10px] font-black text-emerald-500">TỔNG GIỜ:</span>
                         <span className="text-sm font-black text-emerald-700 tabular-nums">{sumTotalHours.toFixed(2)}</span>
                       </div>
                     </div>
                     <div className="overflow-y-auto md:flex-1 custom-scrollbar max-h-[300px] md:max-h-none md:min-h-0">
                       <div className="divide-y divide-slate-50">
                          {validEmployees.map(emp => (
                            <div key={emp.id} className="p-3 md:p-4 flex items-center gap-3 md:gap-4 hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-slate-700 truncate tracking-tight">{emp.fullName || 'Unknown'}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5 tracking-widest">{emp.totalHours?.toFixed(2) || 0} Giờ công</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Tỷ trọng</p>
                                <p className="text-sm font-black text-emerald-600 tabular-nums">
                                  {((emp.totalHours / (sumTotalHours || 1)) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          ))}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="overflow-y-auto md:flex-1 custom-scrollbar max-h-[300px] md:max-h-none md:min-h-0 divide-y divide-slate-100">
                      {validEmployees.map(emp => {
                        const isSelected = !!emp.checked;
                        return (
                          <div 
                            key={emp.id} 
                            className={`p-3 md:p-4 flex items-center gap-3 md:gap-4 transition-all cursor-pointer hover:bg-emerald-50/50 ${isSelected ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-200' : ''}`}
                            onClick={() => {
                              setWeightedEmployees(safeEmployees.map(e => ({
                                ...e,
                                checked: e.id === emp.id ? !e.checked : false // Radio logic
                              })));
                            }}
                          >
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all shrink-0 shadow-sm ${isSelected ? 'border-emerald-600 bg-white' : 'border-slate-300 bg-slate-50'}`}>
                                {isSelected && <div className="w-3 h-3 bg-emerald-600 rounded-full animate-in zoom-in-50 duration-200"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-sm truncate tracking-tight ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{emp.fullName || 'Unknown'}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5 tracking-widest">{emp.totalHours?.toFixed(2) || 0} Giờ</p>
                            </div>
                            {isSelected && currentTotalAmount > 0 && (
                              <div className="text-right shrink-0 animate-in slide-in-from-right-4 duration-300">
                                <p className="text-base font-black text-emerald-700 tracking-tighter leading-none tabular-nums">
                                  {new Intl.NumberFormat('vi-VN').format(currentTotalAmount)} ₫
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                   </div>
                 )}
              </div>
            </div>

            {/* CỘT 3: THỐNG KÊ */}
            <div className="col-span-12 md:col-span-4 md:h-full">
              <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-2xl flex flex-col shadow-sm md:h-full md:max-h-[500px]">
                <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-[1.5rem] md:rounded-t-2xl shrink-0">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <span className={`w-6 h-6 ${adminTheme?.accent || 'bg-emerald-500'} text-white rounded-full flex items-center justify-center text-xs shadow-sm`}>3</span>
                    Thống Kê Khấu Trừ
                  </h3>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-[11px] whitespace-nowrap min-w-max border-separate border-spacing-0">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-black text-slate-400 border-b border-slate-100 uppercase tracking-widest text-[9px]">Nhân viên</th>
                          <th className="px-3 py-3 font-black text-slate-400 border-b border-slate-100 text-right uppercase tracking-widest text-[9px]">Cá nhân</th>
                          <th className="px-3 py-3 font-black text-slate-400 border-b border-slate-100 text-right uppercase tracking-widest text-[9px]">Chung</th>
                          <th className="px-4 py-3 font-black text-emerald-600 border-b border-slate-100 text-right bg-emerald-50/50 uppercase tracking-widest text-[9px]">Cộng dồn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {validEmployees.map(emp => {
                          const individualHistory = safeLogs
                            .filter(log => log.type === 'individual' && log.affectedEmployees?.includes(emp.fullName))
                            .reduce((sum, log) => sum + (log.totalAmount || 0), 0);
                          
                          const isCurrentIndividual = lossType === 'individual' && !!emp.checked;
                          const individualTotal = individualHistory + (isCurrentIndividual ? currentTotalAmount : 0);
                          
                          const sharedTotal = Math.round((emp.totalHours || 0) * currentCoefficient);
                          const grandTotal = individualTotal + sharedTotal;

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-4 py-2.5 border-r border-slate-100 font-bold text-slate-700 w-32 truncate" title={emp.fullName}>
                                {(emp.fullName || '').split(' ').slice(1).join(' ') || (emp.fullName || 'Unknown')}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 font-medium">
                                {individualTotal > 0 ? new Intl.NumberFormat('vi-VN').format(individualTotal) : '-'}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 font-medium">
                                {sharedTotal > 0 ? new Intl.NumberFormat('vi-VN').format(sharedTotal) : '-'}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-black text-emerald-800 bg-emerald-50/30 group-hover:bg-emerald-50/60 transition-colors">
                                {new Intl.NumberFormat('vi-VN').format(grandTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View for Grid 3 */}
                  <div className="lg:hidden md:flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50 max-h-[300px] md:max-h-none md:min-h-0">
                    {validEmployees.map(emp => {
                      const individualHistory = safeLogs
                        .filter(log => log.type === 'individual' && log.affectedEmployees?.includes(emp.fullName))
                        .reduce((sum, log) => sum + (log.totalAmount || 0), 0);
                      const isCurrentIndividual = lossType === 'individual' && !!emp.checked;
                      const individualTotal = individualHistory + (isCurrentIndividual ? currentTotalAmount : 0);
                      const sharedTotal = Math.round((emp.totalHours || 0) * currentCoefficient);
                      const grandTotal = individualTotal + sharedTotal;

                      if (grandTotal === 0) return null;

                      return (
                        <div key={emp.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800 text-xs truncate w-32">{emp.fullName}</p>
                            <div className="flex gap-2">
                              {individualTotal > 0 && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Riêng: {formatCurrency(individualTotal)}</span>}
                              {sharedTotal > 0 && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Chung: {formatCurrency(sharedTotal)}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cộng dồn</p>
                             <p className="text-sm font-black text-emerald-700 tabular-nums leading-none">{formatCurrency(grandTotal)}</p>
                          </div>
                        </div>
                      );
                    })}
                    {validEmployees.filter(e => {
                        const individualHistory = safeLogs
                          .filter(log => log.type === 'individual' && log.affectedEmployees?.includes(e.fullName))
                          .reduce((sum, log) => sum + (log.totalAmount || 0), 0);
                        const isCurrentIndividual = lossType === 'individual' && !!e.checked;
                        const individualTotal = individualHistory + (isCurrentIndividual ? currentTotalAmount : 0);
                        const sharedTotal = Math.round((e.totalHours || 0) * currentCoefficient);
                        return (individualTotal + sharedTotal) > 0;
                    }).length === 0 && (
                      <div className="py-12 text-center text-slate-400 italic text-xs">Chưa có dữ liệu bồi thường cho nhân sự nào</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* PHẦN LỊCH SỬ DƯỚI CÙNG */}
          <div className="mt-8 col-span-12 pb-10 md:pb-0">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 px-1 text-sm uppercase tracking-tight">
              <span className={`w-6 h-6 border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center text-xs shadow-sm`}>4</span>
              Lịch Sử Khấu Trừ
            </h3>
            <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-2xl overflow-hidden shadow-sm">
              <div className="hidden md:block overflow-x-auto min-h-[150px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 font-black text-[9px] text-slate-400 uppercase tracking-widest">Thời gian</th>
                      <th className="px-4 py-4 font-black text-[9px] text-slate-400 uppercase tracking-widest">Tên Dụng Cụ</th>
                      <th className="px-4 py-4 font-black text-[9px] text-slate-400 uppercase tracking-widest">Hình thức</th>
                      <th className="px-4 py-4 font-black text-[9px] text-slate-400 uppercase tracking-widest text-right">Khấu trừ</th>
                      <th className="px-4 py-4 font-black text-[9px] text-slate-400 uppercase tracking-widest">Đối tượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {safeLogs.length > 0 ? (
                      safeLogs.map((log) => {
                        let dateStr = '---';
                        try {
                          if (log.processedAt) {
                            if (typeof log.processedAt.toDate === 'function') {
                              dateStr = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(log.processedAt.toDate());
                            } else {
                              dateStr = new Date(log.processedAt).toLocaleString('vi-VN');
                            }
                          }
                        } catch (e) {
                          dateStr = 'Lỗi ngày tháng';
                        }
                        
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs font-medium">
                              {dateStr}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {log.itemType || '---'}
                              {log.quantity && log.quantity > 0 ? <span className="text-slate-400 font-medium ml-1 text-[10px]">(x{log.quantity})</span> : null}
                            </td>
                            <td className="px-4 py-3">
                              {log.type === 'general' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Tập Thể
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Cá nhân
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-black text-slate-900 tabular-nums text-right">
                              {new Intl.NumberFormat('vi-VN').format(log.totalAmount || 0)} ₫
                            </td>
                            <td className="px-4 py-3 text-[10px] font-medium text-slate-500 max-w-[200px] truncate" title={(log.affectedEmployees || []).join(', ')}>
                              {(log.affectedEmployees || []).join(', ') || '---'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium italic">Chưa có lịch sử trong tháng này</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile History View */}
              <div className="md:hidden divide-y divide-slate-100">
                {safeLogs.map((log) => {
                  let dateStr = '---';
                  try {
                    if (log.processedAt) {
                      if (typeof log.processedAt.toDate === 'function') {
                        dateStr = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(log.processedAt.toDate());
                      } else {
                        dateStr = new Date(log.processedAt).toLocaleString('vi-VN');
                      }
                    }
                  } catch (e) {}

                  return (
                    <div key={log.id} className="p-4 space-y-2">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-black text-slate-800 text-sm">
                              {log.itemType}
                              {log.quantity && log.quantity > 0 ? <span className="text-slate-400 font-medium ml-1 text-[10px]">(x{log.quantity})</span> : null}
                            </p>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${log.type === 'general' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {log.type === 'general' ? 'Tập thể' : 'Cá nhân'}
                            </span>
                          </div>
                          <div className="text-right font-black text-slate-900">
                            {formatCurrency(log.totalAmount || 0)} ₫
                          </div>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          <span>{dateStr}</span>
                          <span className="truncate w-32 text-right">{(log.affectedEmployees || []).slice(0, 2).join(', ')}{(log.affectedEmployees || []).length > 2 ? '...' : ''}</span>
                       </div>
                    </div>
                  );
                })}
                {safeLogs.length === 0 && (
                  <div className="py-12 text-center text-slate-400 italic text-xs font-medium">Chưa có lịch sử bồi thường</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Removed Floating Mobile Summary Card */}

        <div className="p-3 md:p-6 border-t border-slate-100 bg-white md:bg-slate-50 shrink-0 flex flex-row justify-end gap-2 md:gap-3 z-20 rounded-b-[2rem] md:rounded-b-3xl mt-auto">
          <button
            onClick={handleClose}
            className="w-1/3 md:w-auto min-h-[44px] px-4 md:px-6 py-2.5 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-100 rounded-2xl md:rounded-xl transition-all text-[10px] md:text-xs"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onProcess}
            disabled={isProcessingLoss || !itemType || !totalLossAmount || Number(totalLossAmount) <= 0 || safeEmployees.filter(e => e.checked).length === 0}
            className={`w-2/3 md:w-auto min-h-[44px] px-4 md:px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-[10px] md:text-xs tracking-widest uppercase`}
          >
            {isProcessingLoss ? 'Đang xử lý...' : 'Xác nhận bồi thường'}
            {!isProcessingLoss && <Save className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialLossModal;
