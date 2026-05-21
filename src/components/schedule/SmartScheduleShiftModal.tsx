import React from 'react';
import { Plus, Info, X, XCircle, Circle, Trash2 } from 'lucide-react';
import { WorkSchedule, ShiftTask } from '../../types/admin';

interface SmartScheduleShiftModalProps {
  showModal: boolean;
  selectedCell: { empId: string; date: string } | null;
  editingShift: WorkSchedule | null;
  theme: any;
  isSaving: boolean;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  isOff: boolean;
  setIsOff: (v: boolean) => void;
  locationId: string;
  setLocationId: (v: string) => void;
  roleInShift: 'QUẦY' | 'PV' | 'BOTH' | undefined;
  setRoleInShift: (v: 'QUẦY' | 'PV' | 'BOTH' | undefined) => void;
  managedBranches: string[];
  colorLabel: string;
  setColorLabel: (v: string) => void;
  taskNote: string;
  setTaskNote: (v: string) => void;
  handleDeleteShift: () => void;
  handleSaveShift: () => void;
  setShowModal: (v: boolean) => void;
  setSelectedCell: (v: null) => void;
  setEditingShift: (v: null) => void;
}

export const SmartScheduleShiftModal: React.FC<SmartScheduleShiftModalProps> = ({
  showModal, selectedCell, editingShift, theme, isSaving,
  startTime, setStartTime, endTime, setEndTime,
  isOff, setIsOff, locationId, setLocationId,
  roleInShift, setRoleInShift, managedBranches,
  colorLabel, setColorLabel, taskNote, setTaskNote,
  handleDeleteShift, handleSaveShift, setShowModal,
  setSelectedCell, setEditingShift
}) => {
  if (!showModal || (!selectedCell && !editingShift)) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all scale-100">
        <div className={`p-4 border-b border-white/10 flex justify-between items-center ${theme?.header || 'bg-slate-800'}`}>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            {editingShift ? (
              <><Info className="w-5 h-5 text-white/80" /> Chỉnh sửa ca</>
            ) : (
              <><Plus className="w-5 h-5 text-white/80" /> Tạo ca mới</>
            )}
          </h3>
          <button 
            onClick={() => { setShowModal(false); setSelectedCell(null); setEditingShift(null); }}
            className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-3 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Group 1: Time & Presets */}
            <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-sky-600 rounded-full"></div>
                <span className="text-xs font-black text-sky-800 uppercase tracking-wider">Thời gian và Ca mặc định</span>
              </div>
              
              <div className="flex gap-2">
                {[
                  { label: 'Sáng', start: '06:00', end: '11:00', color: 'emerald' },
                  { label: 'Trưa', start: '12:00', end: '17:00', color: 'sky' },
                  { label: 'Tối', start: '17:00', end: '22:00', color: 'slate' }
                ].map(preset => (
                  <button 
                    key={preset.label}
                    onClick={() => { setIsOff(false); setStartTime(preset.start); setEndTime(preset.end); }}
                    className={`flex-1 py-2.5 bg-white border ${!isOff && startTime === preset.start && endTime === preset.end ? `border-${preset.color}-500 ring-2 ring-${preset.color}-200` : `border-${preset.color}-200`} text-${preset.color}-700 rounded-lg hover:shadow-md active:translate-y-0.5 font-bold text-xs transition-all`}
                  >
                    Ca {preset.label}
                  </button>
                ))}
                <button 
                  onClick={() => setIsOff(!isOff)}
                  className={`flex-1 py-2.5 bg-white border ${isOff ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50' : 'border-rose-200 hover:border-rose-300'} text-rose-700 rounded-lg hover:shadow-md active:translate-y-0.5 font-bold text-xs transition-all flex items-center justify-center gap-1`}
                >
                  {isOff ? <><XCircle className="w-3 h-3" /> Đang OFF</> : <><Circle className="w-3 h-3" /> Đặt OFF</>}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Giờ vào</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Giờ ra</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-sm font-medium"
                  />
                </div>
              </div>
              {isOff && (
                <div className="p-2 bg-rose-50 rounded-lg border border-dashed border-rose-200 flex items-center justify-center text-rose-600">
                  <p className="text-[10px] text-center font-medium italic">Ca này được đánh dấu là OFF (Nghỉ)</p>
                </div>
              )}
            </div>

            {/* Group 2: Branch & Role Selection */}
            {!isOff && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 bg-slate-600 rounded-full"></div>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Chi nhánh & Vị trí</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Làm việc tại chi nhánh</label>
                    <div className="flex flex-wrap gap-2">
                      {managedBranches.map(branch => (
                        <button
                          key={branch}
                          onClick={() => setLocationId(branch)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${locationId === branch ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          {branch}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vai trò trong ca</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={roleInShift === 'QUẦY' || roleInShift === 'BOTH'} 
                          onChange={e => {
                            const isChecked = e.target.checked;
                            if (isChecked) {
                              setRoleInShift(roleInShift === 'PV' ? 'BOTH' : 'QUẦY');
                            } else {
                              setRoleInShift(roleInShift === 'BOTH' ? 'PV' : undefined);
                            }
                          }}
                          className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <span className={`text-sm transition-colors ${roleInShift === 'QUẦY' || roleInShift === 'BOTH' ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                          QUẦY
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={roleInShift === 'PV' || roleInShift === 'BOTH'} 
                          onChange={e => {
                            const isChecked = e.target.checked;
                            if (isChecked) {
                              setRoleInShift(roleInShift === 'QUẦY' ? 'BOTH' : 'PV');
                            } else {
                              setRoleInShift(roleInShift === 'BOTH' ? 'QUẦY' : undefined);
                            }
                          }}
                          className="w-5 h-5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <span className={`text-sm transition-colors ${roleInShift === 'PV' || roleInShift === 'BOTH' ? 'text-sky-700 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                          PHỤC VỤ (PV)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group 3: Labels & Notes */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 bg-violet-600 rounded-full"></div>
              <span className="text-xs font-black text-violet-800 uppercase tracking-wider">Nhãn & Ghi chú</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Màu sắc đánh dấu</label>
              <div className="grid grid-cols-8 gap-2 px-1">
                {[
                  '', 'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange',
                  'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
                  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
                ].map(color => {
                  const colorMap: Record<string, string> = {
                    '': 'bg-white border-slate-200',
                    'slate': 'bg-slate-600 border-slate-700',
                    'gray': 'bg-gray-600 border-gray-700',
                    'zinc': 'bg-zinc-600 border-zinc-700',
                    'neutral': 'bg-neutral-600 border-neutral-700',
                    'stone': 'bg-stone-600 border-stone-700',
                    'red': 'bg-red-600 border-red-700',
                    'orange': 'bg-orange-600 border-orange-700',
                    'amber': 'bg-amber-600 border-amber-700',
                    'yellow': 'bg-yellow-600 border-yellow-700',
                    'lime': 'bg-lime-600 border-lime-700',
                    'green': 'bg-green-600 border-green-700',
                    'emerald': 'bg-emerald-600 border-emerald-700',
                    'teal': 'bg-teal-600 border-teal-700',
                    'cyan': 'bg-cyan-600 border-cyan-700',
                    'sky': 'bg-sky-600 border-sky-700',
                    'blue': 'bg-blue-600 border-blue-700',
                    'indigo': 'bg-indigo-600 border-indigo-700',
                    'violet': 'bg-violet-600 border-violet-700',
                    'purple': 'bg-purple-600 border-purple-700',
                    'fuchsia': 'bg-fuchsia-600 border-fuchsia-700',
                    'pink': 'bg-pink-600 border-pink-700',
                    'rose': 'bg-rose-600 border-rose-700',
                  };
                  return (
                    <button
                      key={color}
                      onClick={() => setColorLabel(color)}
                      className={`w-full aspect-square rounded-lg border transition-all shadow-sm ${colorMap[color]} ${colorLabel === color ? 'ring-2 ring-sky-500 ring-offset-1 scale-110 z-10' : 'hover:scale-105'}`}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Ghi chú Vệ sinh / Công việc (TaskNote)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={taskNote}
                  onChange={e => setTaskNote(e.target.value)}
                  placeholder="VD: Dọn kho, vệ sinh tủ lạnh..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm shadow-inner"
                />
                <span className="absolute right-3 top-3 text-lg">🧹</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
          <div>
            {editingShift && (
              <button 
                onClick={handleDeleteShift}
                disabled={isSaving}
                className="px-4 py-2.5 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 border border-rose-100"
              >
                <Trash2 className="w-4 h-4" />
                XOÁ CA
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setSelectedCell(null); setEditingShift(null); setShowModal(false); }}
              className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all active:scale-95"
            >
              HỦY
            </button>
            <button 
              onClick={handleSaveShift}
              disabled={isSaving}
              className={`px-8 py-2.5 ${theme?.button || 'bg-sky-600'} text-white font-black rounded-xl hover:opacity-90 hover:shadow-lg active:translate-y-0.5 transition-all shadow-md disabled:opacity-50 disabled:grayscale`}
            >
              {isSaving ? 'ĐANG LƯU...' : 'LƯU'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
