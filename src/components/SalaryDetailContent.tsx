import React, { useState, useEffect, useMemo } from 'react';
import { Hourglass, DollarSign, Award, Smartphone, Briefcase, PlusCircle, AlertTriangle, Clock, Save, StickyNote, Coffee, X, History, CheckCircle2, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculateNetSalary } from '../utils/salaryCalculator';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { safeFormat } from '../utils/dateUtils';

interface SalaryDetailContentProps {
  employee: any;
  month: string;
  stats: any;
  theme?: any;
  adminTheme?: any;
  onAdjustmentChange?: (empId: string, key: string, value: any) => void;
  onSave: (empId: string, adj: any) => void;
  onMonthChange?: (month: string) => void;
  localAdj: any;
  timesheets: any[];
  adjustments: any[];
  holidays: any[];
  violations?: any[];
}

export default function SalaryDetailContent({ 
  employee, month, stats: initialStats, theme, adminTheme,
  onAdjustmentChange, onSave, onMonthChange, localAdj, 
  timesheets = [], adjustments = [], holidays = [], violations = []
}: SalaryDetailContentProps) {
  const [showLateDetails, setShowLateDetails] = useState(false);
  const [showViolationDetails, setShowViolationDetails] = useState(false);
  const [showMaterialLossDetails, setShowMaterialLossDetails] = useState(false);
  const [showNoteFields, setShowNoteFields] = useState<{[key: string]: boolean}>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const isAdmin = theme?.isAdmin || false;
  
  // Local state for adjustments
  const [internalAdj, setInternalAdj] = useState(localAdj || {});

  // Sync internal state when external localAdj changes
  useEffect(() => {
    setInternalAdj(localAdj || {});
  }, [localAdj]);

  const persistedAdj = useMemo(() => {
    return adjustments.find(a => (a.empId === employee.id || a.empId === employee.empId) && a.monthYear === month) || {};
  }, [employee, month, adjustments]);

  const currentStats = useMemo(() => {
    return calculateNetSalary(employee, month, timesheets, adjustments, holidays, internalAdj, violations);
  }, [employee, month, timesheets, adjustments, holidays, internalAdj, violations]);

  const [editingField, setEditingField] = useState<string | null>(null);

  const handleInputChange = (key: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '')) || 0;
    let finalValue: any = numValue;
    
    if (key === 'overrideTtnPercentage') {
      finalValue = Math.min(100, numValue);
    }
    
    setInternalAdj(prev => {
      const newState = { ...prev, [key]: finalValue };
      
      // Auto-clear penalty overrides when minutes/counts are adjusted to allow "jumping" to calculated value
      if (key === 'overrideLateMinutes' || key === 'overrideLateCount') {
        newState.overrideLatePenalty = undefined;
      }
      if (key === 'overridePhoneMinutes' || key === 'overridePhoneCount') {
        newState.overridePhonePenalty = undefined;
      }
      
      return newState;
    });

    // Mirror to parent state immediately
    onAdjustmentChange?.(employee.id || employee.empId, key, finalValue);
  };

  const handleNoteChange = (key: string, value: string) => {
    setInternalAdj(prev => ({
      ...prev,
      [key]: value
    }));
    onAdjustmentChange?.(employee.id || employee.empId, key, value);
  };

  const toggleNoteField = (field: string) => {
    setShowNoteFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleFinalSave = async () => {
    try {
      await onSave(employee.id || employee.empId, internalAdj);
      setSaveSuccess(true);
      toast.success('Đã đồng bộ với bảng lương chính');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      toast.error('Lỗi khi cập nhật dữ liệu');
    }
  };
  
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };
  
  const formatNumber = (val: number) => val.toLocaleString('vi-VN');
  const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

  const displayedMonth = useMemo(() => {
    const [y, m] = month.split('-');
    return `${m}-${y}`;
  }, [month]);

  // Generate recent months for the picker
  const recentMonths = useMemo(() => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
       months.push(format(date, 'yyyy-MM'));
       date.setMonth(date.getMonth() - 1);
    }
    return months;
  }, []);

  return (
    <div className="p-3 overflow-y-auto flex-1 space-y-3 font-sans text-stone-800 bg-[#fdfaf9]">
      {/* Employee Info Header */}
      <div className="flex justify-between items-center px-1 pb-2 mb-1 border-b border-stone-100 relative">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-stone-900 tracking-tight leading-none uppercase">{employee.fullName}</h2>
        </div>
        
        <div className="flex flex-col items-end relative">
          <button 
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all shadow-sm border ${
              showMonthPicker ? 'bg-stone-900 text-white border-stone-800' : `bg-white ${adminTheme?.text || 'text-[#5c3529]'} border-stone-200 hover:border-stone-400`
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${showMonthPicker ? 'text-white/50' : `${adminTheme?.text ? adminTheme.text.replace('text-', 'text-').concat('/40') : 'text-[#5c3529]/40'}`}`} />
            <span className="text-sm font-black font-mono">{displayedMonth}</span>
            <PlusCircle className={`w-3.5 h-3.5 ml-1 transition-transform ${showMonthPicker ? 'rotate-45' : ''}`} />
          </button>

          {/* Month Picker Dropdown */}
          <AnimatePresence>
            {showMonthPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-12 right-0 w-32 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50 p-1"
              >
                {recentMonths.map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      onMonthChange?.(m);
                      setShowMonthPicker(false);
                    }}
                    className={`w-full px-4 py-2.5 text-xs font-black rounded-xl text-center transition-all ${
                      m === month ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    {m.split('-')[1]}-{m.split('-')[0]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* 1. THU NHẬP */}
      <div className="space-y-2">
        <div className="bg-white rounded-2xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50 space-y-2.5">
          <div className="flex justify-between text-sm items-center pb-2 border-b border-stone-50 font-black">
            <span className="flex items-center gap-3 text-stone-800 uppercase tracking-wide"><Hourglass className="w-4 h-4 text-stone-400"/> Giờ Công</span> 
            <span className="text-emerald-600 font-mono text-base">{currentStats.totalHours.toFixed(2)}h</span>
          </div>
          
          <div className="space-y-2.5">
            {/* Lương Cơ Bản (/h) - ADMIN ONLY */}
            {isAdmin && (
              <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <span className="flex items-center gap-3 text-stone-500 font-medium group-hover:text-stone-700 transition-colors"><DollarSign className="w-4 h-4 text-stone-400"/> Lương Cơ Bản (/h)</span>
                <div className="relative">
                  {editingField === 'hourlyRate' ? (
                    <input 
                      type="text" 
                      autoFocus
                      value={currentStats.currentHourlyRate?.toLocaleString('vi-VN') || ''} 
                      onBlur={() => setEditingField(null)}
                      onFocus={handleFocus} 
                      onChange={(e) => handleInputChange('hourlyRate', e.target.value)} 
                      className="w-32 bg-white border border-stone-200 text-right font-black text-stone-800 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                    />
                  ) : (
                    <button 
                      onClick={() => setEditingField('hourlyRate')}
                      className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.hourlyRate !== undefined ? 'text-amber-700 bg-amber-50' : 'text-stone-800 border-b border-transparent hover:bg-stone-50'}`}
                    >
                      {formatNumber(currentStats.currentHourlyRate)}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Thưởng trách nhiệm(/h) - ADMIN ONLY */}
            {isAdmin && (
              <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <span className="flex items-center gap-3 text-stone-500 font-medium group-hover:text-stone-700 transition-colors"><Award className="w-4 h-4 text-stone-400"/> Thưởng trách nhiệm(/h)</span>
                {editingField === 'responsibilityBonus' ? (
                  <input 
                    type="text" 
                    autoFocus
                    value={currentStats.currentResponsibilityBonus?.toLocaleString('vi-VN') || ''} 
                    onBlur={() => setEditingField(null)}
                    onFocus={handleFocus} 
                    onChange={(e) => handleInputChange('responsibilityBonus', e.target.value)} 
                    className="w-32 bg-white border border-stone-200 text-right font-black text-stone-800 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                  />
                ) : (
                  <button 
                    onClick={() => setEditingField('responsibilityBonus')}
                    className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.responsibilityBonus !== undefined ? 'text-amber-700 bg-amber-50' : 'text-stone-800 border-b border-transparent hover:bg-stone-50'}`}
                  >
                    {formatNumber(currentStats.currentResponsibilityBonus)}
                  </button>
                )}
              </div>
            )}

            {/* % Thưởng TN */}
            {(isAdmin || currentStats.finalTtnPercentage !== 0) && (
              <div className="flex flex-col border-l-2 border-stone-100 ml-5 group">
                <div className="flex justify-between items-center text-sm px-3 py-2">
                  <span className="text-stone-400 font-bold text-[10px] flex items-center gap-2 italic uppercase group-hover:text-stone-500 transition-colors">% Thưởng TN</span>
                  {isAdmin ? (
                      <div className="flex items-center gap-1">
                        {editingField === 'overrideTtnPercentage' ? (
                          <input 
                            type="text" 
                            autoFocus
                            value={currentStats.finalTtnPercentage ?? 0} 
                            onBlur={() => setEditingField(null)}
                            onFocus={handleFocus} 
                            onChange={(e) => handleInputChange('overrideTtnPercentage', e.target.value)} 
                            className="w-16 bg-white border border-stone-200 text-right font-black text-black rounded-lg p-1 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono text-xs" 
                          />
                        ) : (
                          <button 
                            onClick={() => setEditingField('overrideTtnPercentage')}
                            className={`min-w-[40px] text-right p-1 rounded font-black transition-all font-mono text-xs ${internalAdj.overrideTtnPercentage !== undefined ? 'text-amber-700 bg-amber-50' : 'text-black border-b border-transparent hover:bg-stone-50'}`}
                          >
                            {currentStats.finalTtnPercentage}%
                          </button>
                        )}
                      </div>
                  ) : <span className="font-black text-black font-mono text-xs">{currentStats.finalTtnPercentage}%</span>}
                </div>

                {/* Violation Indicator */}
                {currentStats.violationCount > 0 && (
                   <div className="mx-3 mb-2 p-2 bg-red-50 rounded-lg flex items-center justify-between border border-red-100">
                     <button 
                       onClick={() => setShowViolationDetails(true)}
                       className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors"
                     >
                       <AlertTriangle className="w-3 h-3" />
                       <span className="text-[9px] font-black uppercase tracking-wider underline decoration-dotted">
                         {currentStats.violationCount} Vi phạm
                       </span>
                     </button>
                     <span className="text-[9px] font-black text-red-500 uppercase">
                       {currentStats.violationCount >= 8 ? '-100% Thưởng TN' : currentStats.violationCount >= 5 ? '-50% Thưởng TN' : 'Chưa trừ thưởng'}
                     </span>
                   </div>
                )}
              </div>
            )}
            
            {/* Thu nhập khác */}
            {(isAdmin || currentStats.finalExtraAdditions !== 0) && (
              <div className="p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-3 text-stone-500">
                    <PlusCircle className="w-4 h-4 text-emerald-400"/> 
                    Thu nhập khác
                    {isAdmin && (
                      <button 
                        onClick={() => toggleNoteField('extraAdditions')}
                        className={`ml-1 p-0.5 rounded transition-colors ${currentStats.extraAdditionsNote ? 'text-stone-600 bg-stone-100' : 'text-stone-300 hover:text-stone-500'}`}
                      >
                        <StickyNote className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                  {isAdmin ? (
                    editingField === 'extraAdditions' ? (
                      <input 
                        type="text" 
                        autoFocus
                        value={currentStats.finalExtraAdditions?.toLocaleString('vi-VN') || ''} 
                        onBlur={() => setEditingField(null)}
                        onFocus={handleFocus} 
                        onChange={(e) => handleInputChange('extraAdditions', e.target.value)} 
                        className="w-32 bg-white border border-stone-200 text-right font-black text-stone-800 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                      />
                    ) : (
                      <button 
                        onClick={() => setEditingField('extraAdditions')}
                        className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.extraAdditions !== undefined ? 'text-amber-700 bg-amber-50' : 'text-stone-800 border-b border-transparent hover:bg-stone-50'}`}
                      >
                        {formatNumber(currentStats.finalExtraAdditions)}
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      {currentStats.extraAdditionsNote && <StickyNote className="w-3 h-3 text-stone-300" />}
                      <span className="font-black text-stone-800 font-mono text-xs">{formatNumber(currentStats.finalExtraAdditions)}</span>
                    </div>
                  )}
                </div>
                {isAdmin && showNoteFields['extraAdditions'] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <input 
                      type="text" 
                      placeholder="Lý do thu nhập khác..." 
                      value={currentStats.extraAdditionsNote || ''} 
                      onChange={(e) => handleNoteChange('extraAdditionsNote', e.target.value)} 
                      className="w-full bg-stone-50 border-none text-[10px] italic text-stone-400 p-2 rounded-lg focus:ring-1 focus:ring-stone-100 outline-none" 
                    />
                  </motion.div>
                )}
              </div>
            )}

            {/* Công Lễ */}
            {(currentStats.holidayBonusTotal !== 0) && (
              <div className="p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="flex items-center gap-3 text-stone-500">
                    <History className="w-4 h-4 text-emerald-400"/> 
                    Thanh toán Công Lễ (x3)
                  </span>
                  <span className="font-black text-emerald-600 font-mono text-xs">+{formatNumber(currentStats.holidayBonusTotal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. KHẤU TRỪ */}
      <div className="space-y-2">
        <div className="px-1 flex items-center justify-between">
          <h3 className="text-[13px] font-black text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            KHẤU TRỪ KHÁC
          </h3>
        </div>
        
        <div className="bg-white rounded-xl p-3 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-stone-50 space-y-2">
            {/* Đi Trễ */}
            {(isAdmin || currentStats.latePenaltyTotal !== 0) && (
              <div className="p-3 bg-white rounded-base shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100/50 space-y-2 group transition-all">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col gap-0.5">
                    <button 
                      onClick={() => setShowLateDetails(true)}
                      className="text-stone-500 font-medium flex items-center gap-3 hover:text-stone-700 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-stone-400 group-hover:text-stone-500 transition-colors"/> 
                      <span className="border-b border-dotted border-stone-200">Đi Trễ</span>
                    </button>
                    {currentStats.latePenaltyTotal < currentStats.rawLatePenaltyTotal && (
                      <span className="ml-7 text-[8px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded tracking-tighter w-fit uppercase">
                        Quản lý đã giảm
                      </span>
                    )}
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      {(internalAdj.overrideLateMinutes !== undefined || internalAdj.overrideLatePenalty !== undefined || internalAdj.overrideLateCount !== undefined ||
                        persistedAdj.overrideLateMinutes !== undefined || persistedAdj.overrideLatePenalty !== undefined || persistedAdj.overrideLateCount !== undefined) && (
                        <button 
                          onClick={() => setInternalAdj(prev => { 
                            const n = {...prev}; 
                            // Set to null to explicitly override persisted values with system values
                            n.overrideLateMinutes = null; 
                            n.overrideLatePenalty = null;
                            n.overrideLateCount = null;
                            return n; 
                          })}
                          className="w-6 h-6 flex items-center justify-center bg-stone-50 text-stone-400 hover:text-amber-600 rounded-full transition-colors"
                          title="Reset về hệ thống"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 text-xs font-mono">{currentStats.lateCount} lần</span>
                          <span className="text-stone-200 text-[10px]">|</span>
                          
                          <div className="relative flex items-center bg-stone-50 rounded-lg border border-stone-200 px-2 py-1 focus-within:ring-1 focus-within:ring-stone-200 transition-all">
                            <input 
                              type="number" 
                              value={currentStats.totalLatePenaltyMinutes} 
                              onFocus={handleFocus} 
                              onChange={(e) => handleInputChange('overrideLateMinutes', e.target.value)} 
                              className="w-8 bg-transparent text-right font-black text-amber-700 outline-none text-xs font-mono" 
                            />
                            <span className="text-stone-400 text-[10px] ml-0.5 font-bold">p</span>
                          </div>

                          <span className="text-stone-200 text-[10px]">|</span>
                          <span className="text-rose-800 font-black font-mono text-xs">
                            -{formatNumber(currentStats.latePenaltyTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      {currentStats.totalLatePenaltyMinutes !== currentStats.systemLatePenaltyMinutes && (
                        <span className="text-[10px] text-stone-300 line-through font-mono">
                          HT: {currentStats.systemLateCount} lần | {currentStats.systemLatePenaltyMinutes}p | -{formatNumber(currentStats.rawLatePenaltyTotal)}
                        </span>
                      )}
                      <span className="font-black text-rose-800 font-mono text-[10px] sm:text-xs">
                        {currentStats.lateCount} lần | {currentStats.totalLatePenaltyMinutes}p | -{formatNumber(currentStats.latePenaltyTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Sử dụng ĐT */}
            {(isAdmin || currentStats.phonePenaltyTotal !== 0) && (
              <div className="p-3 bg-white rounded-base shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100/50 space-y-2 group transition-all">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-stone-500 font-medium flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-stone-400 group-hover:text-stone-500 transition-colors"/> Sử dụng ĐT
                    </span>
                    {currentStats.phonePenaltyTotal < currentStats.rawPhonePenaltyTotal && (
                      <span className="ml-7 text-[8px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded tracking-tighter w-fit uppercase">
                        Quản lý đã giảm
                      </span>
                    )}
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      {(internalAdj.overridePhoneMinutes !== undefined || internalAdj.overridePhonePenalty !== undefined || internalAdj.overridePhoneCount !== undefined ||
                        persistedAdj.overridePhoneMinutes !== undefined || persistedAdj.overridePhonePenalty !== undefined || persistedAdj.overridePhoneCount !== undefined) && (
                         <button 
                           onClick={() => setInternalAdj(prev => { 
                             const n = {...prev}; 
                             // Set to null to explicitly override persisted values with system values
                             n.overridePhoneMinutes = null;
                             n.overridePhonePenalty = null;
                             n.overridePhoneCount = null;
                             return n; 
                           })}
                           className="w-6 h-6 flex items-center justify-center bg-stone-50 text-stone-400 hover:text-amber-600 rounded-full transition-colors"
                           title="Reset về hệ thống"
                         >
                           <History className="w-3.5 h-3.5" />
                         </button>
                      )}
                      <div className="flex flex-col gap-1 items-end">
                         <div className="flex items-center gap-1.5">
                            <span className="text-stone-400 text-xs font-mono">{currentStats.phonePenaltyCount} lần</span>
                            <span className="text-stone-200 text-[10px]">|</span>
                            
                            <div className="relative flex items-center bg-stone-50 rounded-lg border border-stone-200 px-2 py-1 focus-within:ring-1 focus-within:ring-stone-200 transition-all">
                              <input 
                                type="number" 
                                value={currentStats.phonePenaltyMinutes} 
                                onFocus={handleFocus} 
                                onChange={(e) => handleInputChange('overridePhoneMinutes', e.target.value)} 
                                className="w-8 bg-transparent text-right font-black text-amber-700 outline-none text-xs font-mono" 
                              />
                              <span className="text-stone-400 text-[10px] ml-0.5 font-bold">p</span>
                            </div>

                            <span className="text-stone-200 text-[10px]">|</span>
                            <span className="text-rose-800 font-black font-mono text-xs">
                              -{formatNumber(currentStats.phonePenaltyTotal)}
                            </span>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      {currentStats.phonePenaltyMinutes !== currentStats.systemPhoneMinutes && (
                        <span className="text-[10px] text-stone-300 line-through font-mono">
                          HT: {currentStats.systemPhonePenaltyCount} lần | {currentStats.systemPhoneMinutes}p | -{formatNumber(currentStats.rawPhonePenaltyTotal)}
                        </span>
                      )}
                      <span className="font-black text-rose-800 font-mono text-[10px] sm:text-xs">
                        {currentStats.phonePenaltyCount} lần | {currentStats.phonePenaltyMinutes}p | -{formatNumber(currentStats.phonePenaltyTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tạm ứng lương */}
            {(isAdmin || currentStats.finalAdvance !== 0) && (
              <div className="p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-500 font-medium flex items-center gap-3"><DollarSign className="w-4 h-4 text-stone-400"/> Tạm ứng lương</span>
                  {isAdmin ? (
                    editingField === 'advanceSalary' ? (
                      <input 
                        type="text" 
                        autoFocus
                        value={currentStats.finalAdvance?.toLocaleString('vi-VN') || ''} 
                        onBlur={() => setEditingField(null)}
                        onFocus={handleFocus} 
                        onChange={(e) => handleInputChange('advanceSalary', e.target.value)} 
                        className="w-32 bg-white border border-stone-200 text-right font-black text-rose-800 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                      />
                    ) : (
                      <button 
                        onClick={() => setEditingField('advanceSalary')}
                        className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.advanceSalary !== undefined ? 'text-amber-700 bg-amber-50' : 'text-rose-800 border-b border-transparent hover:bg-stone-50'}`}
                      >
                        -{formatNumber(currentStats.finalAdvance)}
                      </button>
                    )
                  ) : <span className="font-black text-rose-800 font-mono text-xs">-{formatNumber(currentStats.finalAdvance)}</span>}
                </div>
              </div>
            )}
            
            {/* Lương Giữ Tạm */}
            {(isAdmin || currentStats.finalRetained !== 0) && (
              <div className="p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500 font-medium flex items-center gap-3"><Briefcase className="w-4 h-4 text-stone-400"/> Lương Giữ Tạm</span>
                    {isAdmin ? (
                      editingField === 'retainedSalary' ? (
                        <input 
                          type="text" 
                          autoFocus
                          value={currentStats.finalRetained?.toLocaleString('vi-VN') || ''} 
                          onBlur={() => setEditingField(null)}
                          onFocus={handleFocus} 
                          onChange={(e) => handleInputChange('retainedSalary', e.target.value)} 
                          className="w-32 bg-white border border-stone-200 text-right font-black text-stone-800 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                        />
                      ) : (
                        <button 
                          onClick={() => setEditingField('retainedSalary')}
                          className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.retainedSalary !== undefined ? 'text-amber-700 bg-amber-50' : 'text-stone-800 border-b border-transparent hover:bg-stone-50'}`}
                        >
                          -{formatNumber(currentStats.finalRetained)}
                        </button>
                      )
                    ) : <span className="font-black text-stone-800 font-mono text-xs">-{formatNumber(currentStats.finalRetained)}</span>}
                </div>
              </div>
            )}
            
            {/* Khấu trừ dụng cụ (Material Loss) */}
            {(isAdmin || currentStats.finalMaterialLoss !== 0) && (
              <div className="p-3 bg-white rounded-xl shadow-[0_4px_12px_rgb(0,0,0,0.04)] border border-stone-100 transition-all group">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500 font-medium flex items-center gap-3">
                      <Coffee className="w-4 h-4 text-stone-400"/> 
                      Khấu trừ dụng cụ
                      {(currentStats.materialLossNote || (currentStats.finalMaterialLoss > 0 && !isAdmin)) && (
                        <button 
                          onClick={() => setShowMaterialLossDetails(true)}
                          className="ml-1 p-0.5 text-stone-300 hover:text-stone-500 transition-colors"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                    {isAdmin ? (
                      editingField === 'materialLoss' ? (
                        <input 
                          type="text" 
                          autoFocus
                          value={currentStats.finalMaterialLoss?.toLocaleString('vi-VN') || ''} 
                          onBlur={() => setEditingField(null)}
                          onFocus={handleFocus} 
                          onChange={(e) => handleInputChange('materialLoss', e.target.value)} 
                          className="w-32 bg-white border border-stone-200 text-right font-black text-stone-700 rounded-lg p-1.5 focus:ring-1 focus:ring-stone-200 outline-none transition-all font-mono" 
                        />
                      ) : (
                        <button 
                          onClick={() => setEditingField('materialLoss')}
                          className={`w-32 text-right p-1.5 rounded-lg font-black transition-all font-mono ${internalAdj.materialLoss !== undefined ? 'text-amber-700 bg-amber-50' : 'text-stone-700 border-b border-transparent hover:bg-stone-50'}`}
                        >
                          -{formatNumber(currentStats.finalMaterialLoss)}
                        </button>
                      )
                    ) : <span className="font-black text-stone-700 font-mono text-xs">-{formatNumber(currentStats.finalMaterialLoss)}</span>}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* GHI CHÚ */}
      <div className="space-y-1.5">
        <div className="px-1">
          <h3 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <StickyNote className="w-3.5 h-3.5 text-stone-400" />
            GHI CHÚ
          </h3>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-50">
           <textarea 
             placeholder={isAdmin ? "Nhập ghi chú quan trọng..." : "Chưa có ghi chú"}
             value={internalAdj.note || ''}
             onChange={(e) => handleNoteChange('note', e.target.value)}
             className="w-full bg-stone-50/20 border-none text-[11px] text-stone-600 p-2 rounded-lg focus:ring-0 outline-none min-h-[40px] resize-none leading-normal"
             disabled={!isAdmin}
             rows={2}
           />
        </div>
      </div>

      {/* 3. TỔNG LÃNH */}
      <div className={`${currentStats.actualSalary < 0 ? 'bg-rose-900 shadow-rose-900/20' : `${theme?.accent || adminTheme?.accent || 'bg-[#5c3529]'} shadow-stone-900/10`} rounded-t-[2rem] rounded-b-[2rem] p-5 pb-[min(env(safe-area-inset-bottom,20px)+20px,20px)] sm:pb-5 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] space-y-2 sticky bottom-0 -mx-3 -mb-3 mt-4 transition-all duration-500 z-50`}>
        <div className="flex justify-between items-center px-2">
           <div className="space-y-0.5">
             <p className="text-base font-black text-white uppercase tracking-[0.2em]">Thực lãnh</p>
             <p className="text-[10px] text-white/50 italic font-medium">Bao gồm khấu trừ & thưởng</p>
           </div>
           <div className="text-right">
             <p className="text-xl pb-3 font-black text-white font-mono tracking-tighter">
               {currentStats.actualSalary < 0 ? '-' : ''}{formatNumber(Math.abs(currentStats.actualSalary))}
             </p>
             {currentStats.actualSalary < 0 && (
               <p className="text-[8px] font-black text-rose-300 uppercase animate-pulse mt-0.5">Nợ lương</p>
             )}
           </div>
        </div>
        
        {isAdmin && (
            <motion.button 
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.01 }}
                onClick={handleFinalSave} 
                className={`w-full py-2.5 rounded-xl font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                  saveSuccess 
                    ? 'bg-emerald-500 text-white shadow-emerald-900/20' 
                    : `bg-white ${adminTheme?.text || 'text-[#5c3529]'} hover:bg-stone-50`
                }`}
            >
                {saveSuccess ? (
                  <><CheckCircle2 className="w-4 h-4" /> ĐÃ LƯU BẢNG LƯƠNG</>
                ) : (
                  <><Save className="w-4 h-4" /> XÁC NHẬN BẢNG LƯƠNG</>
                )}
            </motion.button>
        )}
      </div>

      {/* Material Loss Details Popup */}
      <AnimatePresence>
        {showMaterialLossDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className={`${adminTheme?.header || 'bg-[#764333]'} p-5 text-white flex justify-between items-center`}>
                 <div>
                   <h3 className="font-black text-base uppercase tracking-wider">Chi tiết khấu trừ dụng cụ</h3>
                   <p className="text-white/60 text-[10px] uppercase tracking-widest mt-1">Ghi nhận trong tháng {month}</p>
                 </div>
                 <button onClick={() => setShowMaterialLossDetails(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 space-y-4">
                 {currentStats.materialLossNote ? (
                   <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                     <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                       {currentStats.materialLossNote}
                     </p>
                   </div>
                 ) : (
                   <div className="py-8 text-center">
                      <p className="text-stone-400 text-sm italic">Không có chi tiết cụ thể</p>
                   </div>
                 )}
                 
                 <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
                   <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Tổng khấu trừ:</span>
                   <span className="font-black text-rose-600 text-lg">{formatCurrency(currentStats.finalMaterialLoss)}</span>
                 </div>
              </div>

              <div className="p-4 bg-stone-50">
                <button 
                  onClick={() => setShowMaterialLossDetails(false)}
                  className={`w-full py-2.5 rounded-lg ${adminTheme?.button || 'bg-[#764333]'} text-white font-bold text-sm shadow-sm`}
                >
                  ĐÓNG
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Late Details Popup */}
      <AnimatePresence>
        {showLateDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className={`${adminTheme?.header || 'bg-[#764333]'} p-6 text-white flex justify-between items-center`}>
                 <div>
                   <h3 className="font-black text-lg">Chi tiết đi trễ</h3>
                   <p className="text-white/60 text-[10px] uppercase tracking-widest leading-none mt-1">Dữ liệu chấm công tháng {month}</p>
                 </div>
                 <button onClick={() => setShowLateDetails(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
                 {currentStats.lateDetails && currentStats.lateDetails.length > 0 ? (
                   currentStats.lateDetails.map((late: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                          <p className="font-black text-slate-800 text-sm">{safeFormat(late.date, 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ca: {late.shift}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-rose-600 text-sm">+{late.minutes}p</p>
                          <p className="text-[10px] text-rose-300 font-bold">-{formatCurrency(late.penalty)}</p>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-slate-400 italic">Không có dữ liệu đi trễ</p>
                   </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <div className="flex justify-between items-center">
                   <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tổng phạt tháng:</span>
                   <span className={`font-black ${adminTheme?.text || 'text-[#764333]'}`}>{formatCurrency(currentStats.latePenaltyTotal)}</span>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Violation Details Popup */}
      <AnimatePresence>
        {showViolationDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="bg-red-600 p-6 text-white flex justify-between items-center">
                 <div>
                   <h3 className="font-black text-lg uppercase tracking-tight">Chi tiết vi phạm</h3>
                   <p className="text-white/60 text-[10px] uppercase tracking-widest mt-1">Ghi nhận trong tháng {month}</p>
                 </div>
                 <button onClick={() => setShowViolationDetails(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
                 {violations && violations.length > 0 ? (
                   violations
                    .filter((v: any) => v.date.startsWith(month))
                    .map((v: any, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="flex flex-col items-center justify-center bg-white w-12 h-12 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                           <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                             {safeFormat(v.date, 'MMM')}
                           </span>
                           <span className="text-lg font-black text-slate-900 leading-none">
                             {safeFormat(v.date, 'dd')}
                           </span>
                         </div>
                         <div className="flex flex-col flex-1 min-w-0">
                           <span className="text-xs font-black text-slate-800 uppercase truncate mb-0.5">{v.type}</span>
                           <span className="text-[10px] text-slate-400 font-medium italic leading-relaxed">
                             {v.note || 'Không có ghi chú'}
                           </span>
                         </div>
                      </div>
                    ))
                 ) : (
                   <div className="py-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="font-bold text-slate-400 italic">Không có dữ liệu vi phạm</p>
                   </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tổng số vi phạm:</span>
                   <span className="font-black text-red-600 text-lg">{currentStats.violationCount} lần</span>
                 </div>
                 <button 
                  onClick={() => setShowViolationDetails(false)}
                  className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-200 uppercase tracking-widest text-sm"
                >
                  ĐÓNG
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
