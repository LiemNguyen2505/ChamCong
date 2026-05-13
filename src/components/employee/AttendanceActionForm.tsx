import React from 'react';
import { MapPin, X, AlertCircle, Calendar, ChevronDown, Clock, AlertTriangle } from 'lucide-react';
import CameraCapture from '../CameraCapture';

interface AttendanceActionFormProps {
  actionType: 'check-in' | 'check-out' | null;
  theme: any;
  distance: number | null;
  MAX_DISTANCE_METERS: number;
  photoData: string | null;
  cameraRef: any;
  handlePhotoCapture: (data: string) => void;
  todayShifts: any[];
  selectedShiftId: string;
  setSelectedShiftId: (id: string) => void;
  setScheduledShiftTime: (time: string) => void;
  selectedShiftTime: string;
  setSelectedShiftTime: (time: string) => void;
  note: string;
  setNote: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  latestLog: any;
  workSchedules: any[];
  format: (date: Date, str: string) => string;
  scheduledShiftTime: string;
}

export const AttendanceActionForm: React.FC<AttendanceActionFormProps> = ({
  actionType,
  theme,
  distance,
  MAX_DISTANCE_METERS,
  photoData,
  cameraRef,
  handlePhotoCapture,
  todayShifts,
  selectedShiftId,
  setSelectedShiftId,
  setScheduledShiftTime,
  selectedShiftTime,
  setSelectedShiftTime,
  note,
  setNote,
  onCancel,
  onConfirm,
  isSubmitting,
  latestLog,
  workSchedules,
  format,
  scheduledShiftTime
}) => {
  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-stone-800 text-xl flex items-center">
          <MapPin className={`w-5 h-5 mr-2 ${theme.text}`} />
          Xác thực vị trí & Khuôn mặt
        </h3>
        <button 
          onClick={onCancel}
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {actionType === 'check-out' && latestLog && workSchedules.find(s => s.date === format(new Date(), 'yyyy-MM-dd') && s.startTime === latestLog.selectedShiftTime)?.tasks?.some((t: any) => !t.isCompleted) && (
        <div className={`${theme.bg} ${theme.text} p-3 rounded-xl text-sm font-medium border ${theme.border} flex items-start gap-2`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-left">
            <p className="font-bold">Bạn chưa hoàn thành tất cả nhiệm vụ!</p>
          </div>
        </div>
      )}

      {distance !== null && (
        <div className={`p-3 rounded-xl text-sm font-medium border ${
          distance <= MAX_DISTANCE_METERS 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          Khoảng cách: {Math.round(distance)}m (Cho phép: {MAX_DISTANCE_METERS}m)
        </div>
      )}

      {(actionType === 'check-in' || actionType === 'check-out') && (
        <div className="bg-stone-100 rounded-xl overflow-hidden border border-stone-200 max-h-[180px] flex items-center justify-center">
          {photoData ? (
            <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <CameraCapture 
              ref={cameraRef} 
              onCapture={handlePhotoCapture} 
              hideButton={true} 
            />
          )}
        </div>
      )}

      <div className="space-y-4">
            {(actionType === 'check-in' || actionType === 'check-out') && (
              todayShifts.length > 0 ? (
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${actionType === 'check-in' ? 'text-emerald-600' : 'text-red-600'} pointer-events-none`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => {
                      const shiftId = e.target.value;
                      setSelectedShiftId(shiftId);
                      const shift = todayShifts.find(s => s.id === shiftId);
                      if (!shift) return;

                      if (actionType === 'check-in') {
                        setScheduledShiftTime(shift.startTime);
                        const now = new Date();
                        const nowStr = format(now, 'HH:mm');
                        const [schH, schM] = shift.startTime.split(':').map(Number);
                        const schTotal = schH * 60 + schM;
                        const nowTotal = now.getHours() * 60 + now.getMinutes();
                        if (nowTotal > schTotal) {
                          setSelectedShiftTime(nowStr);
                        } else {
                          setSelectedShiftTime(shift.startTime);
                        }
                      } else {
                        setScheduledShiftTime(shift.endTime);
                      }
                    }}
                    className={`w-full ${actionType === 'check-in' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500' : 'bg-red-50 text-red-800 border-red-200 focus:ring-red-500'} p-4 pl-12 pr-12 rounded-2xl text-lg border-2 font-black appearance-none cursor-pointer focus:outline-none focus:ring-4 shadow-sm`}
                  >
                    {todayShifts.map((shift, idx) => (
                      <option key={idx} value={shift.id}>
                        Lịch: {shift.startTime} - {shift.endTime}
                      </option>
                    ))}
                  </select>
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${actionType === 'check-in' ? 'text-emerald-600' : 'text-red-600'} pointer-events-none`}>
                    <ChevronDown className="w-6 h-6" />
                  </div>
                </div>
              ) : (
                <div className={`${theme.bg} ${theme.text} p-4 rounded-2xl text-sm border-2 ${theme.border} flex items-start gap-3 shadow-sm`}>
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <span className="font-black uppercase tracking-tight">⚠️ Ca phát sinh (Chưa có lịch).</span>
                </div>
              )
            )}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <label className={`inline-block px-4 py-1.5 rounded-lg font-black text-white text-sm uppercase tracking-wider ${actionType === 'check-in' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                Giờ {actionType === 'check-in' ? 'vào' : 'ra'} ca:
              </label>
            </div>
            <div className="relative">
              {actionType === 'check-out' ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="time" 
                      value={selectedShiftTime}
                      max={format(new Date(), 'HH:mm')}
                      onChange={(e) => {
                        const currentTime = format(new Date(), 'HH:mm');
                        if (e.target.value > currentTime) {
                          setSelectedShiftTime(currentTime);
                        } else {
                          setSelectedShiftTime(e.target.value);
                        }
                      }}
                      className="w-full p-4 pr-12 rounded-xl border border-red-200 bg-white text-xl font-black transition-all focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-red-600 bg-red-50 pointer-events-none">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="time" 
                      value={selectedShiftTime}
                      readOnly
                      className={`w-full p-4 pr-12 rounded-xl border ${theme.border} bg-stone-50 text-xl font-black transition-all outline-none cursor-not-allowed`}
                    />
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg ${theme.text} ${theme.bg} pointer-events-none`}>
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        <div>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full p-4 rounded-2xl border-2 border-stone-200 text-base font-medium focus:ring-4 ${theme.ring} transition-all outline-none`}
            placeholder="Ghi chú (nếu có)..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 bg-stone-100 text-stone-600 py-4 rounded-2xl font-bold text-base shadow-sm active:scale-95 transition-all"
        >
          Hủy
        </button>
        <button 
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className={`flex-[2] ${actionType === 'check-in' ? 'bg-emerald-600' : 'bg-red-600'} text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-lg active:scale-95 transition-all`}
        >
          {actionType === 'check-in' ? 'Vào ca' : 'Ra ca'}
        </button>
      </div>

      {isSubmitting && (
        <div className={`text-center p-4 ${theme.text} font-medium flex items-center justify-center`}>
          <div className={`w-5 h-5 border-2 ${theme.text.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin mr-3`}></div>
          Đang xử lý dữ liệu...
        </div>
      )}
    </div>
  );
};
