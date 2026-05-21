import React from 'react';
import { Copy, CopyPlus, Trash2 } from 'lucide-react';

interface ShiftPreset {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  color: string;
  text: string;
  textColor: string;
}

interface SmartScheduleContextMenuProps {
  activePopupCell: { empId: string; date: string; presetId: string; x: number; y: number } | null;
  setActivePopupCell: (val: any) => void;
  schedules: any[];
  onAddShift: (val: any) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  activeBranch: string;
  copiedShift: any;
  setCopiedShift: (val: any) => void;
  getShiftDeterministicId: (empId: string, date: string, presetId: string) => string;
  SHIFT_PRESETS: ShiftPreset[];
}

export const SmartScheduleContextMenu: React.FC<SmartScheduleContextMenuProps> = ({
  activePopupCell,
  setActivePopupCell,
  schedules,
  onAddShift,
  onDeleteShift,
  activeBranch,
  copiedShift,
  setCopiedShift,
  getShiftDeterministicId,
  SHIFT_PRESETS
}) => {
  if (!activePopupCell) return null;

  return (
    <div 
      className="fixed z-[150] bg-white border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl p-1 flex gap-0.5 animate-in fade-in zoom-in duration-200"
      style={{ top: activePopupCell.y - 60, left: Math.min(window.innerWidth - 140, Math.max(10, activePopupCell.x - 60)) }}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={async () => {
          const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
          const existing = schedules.filter(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
          for (const s of existing) await onDeleteShift(s.id);
          
          await onAddShift({
            empId: activePopupCell.empId,
            date: activePopupCell.date,
            startTime: preset.startTime,
            endTime: preset.endTime,
            locationId: activeBranch === 'All' ? 'Góc Phố' : activeBranch,
            isOff: true
          });
          setActivePopupCell(null);
        }}
        className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors font-black text-[10px]"
        title="OFF"
      >
        OFF
      </button>
      <button 
        onClick={async () => {
          const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
          const shift = schedules.find(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
          if (shift) {
            // Omit id, date, empId for clipboard
            const { id, date, empId, ...cleanShift } = shift as any;
            setCopiedShift({ ...cleanShift, sourceType: preset.id });
          }
          setActivePopupCell(null);
        }}
        className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
        title="Copy"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button 
        onClick={async () => {
          if (copiedShift) {
            const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
            const item = copiedShift as any;
            
            // Restriction: Check if source type matches target type
            if (item.sourceType && item.sourceType !== preset.id) {
              setActivePopupCell(null);
              return;
            }

            // 1. Delete existing shifts in this slot
            const existing = schedules.filter(s => s.empId === activePopupCell.empId && s.date === activePopupCell.date && s.startTime === preset.startTime);
            for (const s of existing) await onDeleteShift(s.id);

            // 2. Add the copied shift config to the new target
            await onAddShift({
              ...item,
              empId: activePopupCell.empId,
              date: activePopupCell.date,
              // Ensure times match the target slot's preset if it's a cross-copy (though we restricted it now)
              startTime: preset.startTime,
              endTime: preset.endTime
            } as any);
          }
          setActivePopupCell(null);
        }}
        className="p-2.5 hover:bg-sky-50 text-sky-600 rounded-xl transition-colors"
        title="Paste"
      >
        <CopyPlus className="w-4 h-4" />
      </button>
      <button 
        onClick={async () => {
          const preset = SHIFT_PRESETS.find(p => p.id === activePopupCell.presetId)!;
          
          const shiftId = getShiftDeterministicId(activePopupCell.empId, activePopupCell.date, preset.id);
          await onDeleteShift(shiftId);
          setActivePopupCell(null);
        }}
        className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
