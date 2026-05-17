import React from 'react';
import { Clock, X } from 'lucide-react';
import { Employee, Timesheet } from '../types/admin';

interface ManualAttendanceModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  nhanViens: Employee[];
  manualAttendance: {
    empId: string;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    locationId: string;
  };
  setManualAttendance: (data: any) => void;
  adminTheme: any;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  show,
  onClose,
  onSubmit,
  nhanViens,
  manualAttendance,
  setManualAttendance,
  adminTheme,
}) => {
  const handleClose = () => {
    if (manualAttendance.empId || manualAttendance.date || manualAttendance.checkInTime) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className={`p-6 border-b border-white/10 flex justify-between items-center ${adminTheme.header} mb-6`}>
           <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-white" />
            Chấm công hộ
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhân viên</label>
            <select
              value={manualAttendance.empId}
              onChange={e => setManualAttendance({ ...manualAttendance, empId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">-- Chọn nhân viên --</option>
              {nhanViens.map(nv => (
                <option key={nv.id} value={nv.empId}>{nv.fullName} ({nv.phone})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
              <input
                type="date"
                required
                value={manualAttendance.date}
                onChange={e => setManualAttendance({ ...manualAttendance, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
              <div className="flex gap-4 p-2 border border-gray-300 rounded-lg">
                {['Góc Phố', 'Phố Xanh'].map(branch => (
                  <label key={branch} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="manualAttendanceLocation"
                      checked={manualAttendance.locationId === branch}
                      onChange={() => setManualAttendance({ ...manualAttendance, locationId: branch })}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">{branch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
              <input
                type="time"
                required
                value={manualAttendance.checkInTime}
                onChange={e => setManualAttendance({ ...manualAttendance, checkInTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra (Tùy chọn)</label>
              <input
                type="time"
                value={manualAttendance.checkOutTime}
                onChange={e => setManualAttendance({ ...manualAttendance, checkOutTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-700 italic">
              * Chấm công hộ sẽ không yêu cầu ảnh chụp và GPS. Dữ liệu sẽ được đánh dấu là "MANUAL_BY_ADMIN".
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${adminTheme.button} text-white rounded-lg font-medium shadow-md`}
            >
              Xác nhận chấm công
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditAttendanceModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  nhanViens: Employee[];
  editingAttendance: any;
  setEditingAttendance: (data: any) => void;
  getAllowedBranches: () => string[];
  adminTheme: any;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  show,
  onClose,
  onSubmit,
  nhanViens,
  editingAttendance,
  setEditingAttendance,
  getAllowedBranches,
  adminTheme,
}) => {
  const [isDirty, setIsDirty] = React.useState(false);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form?')) {
        onClose();
        setIsDirty(false);
      }
    } else {
      onClose();
    }
  };

  if (!show || !editingAttendance) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onChange={() => setIsDirty(true)}>
        <div className={`p-6 border-b border-white/10 flex justify-between items-center ${adminTheme.header} mb-6`}>
           <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-white" />
            Sửa chấm công
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
            <input
              type="text"
              readOnly
              value={nhanViens.find(nv => nv.empId === editingAttendance.empId)?.fullName || editingAttendance.empId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
              <input
                type="date"
                required
                value={editingAttendance.date}
                onChange={e => { setEditingAttendance({ ...editingAttendance, date: e.target.value }); setIsDirty(true); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
              <select
                value={editingAttendance.locationId}
                onChange={e => { setEditingAttendance({ ...editingAttendance, locationId: e.target.value }); setIsDirty(true); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {getAllowedBranches().map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
              <input
                type="time"
                required
                value={editingAttendance.checkInTime || ''}
                onChange={e => { setEditingAttendance({ ...editingAttendance, checkInTime: e.target.value }); setIsDirty(true); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra</label>
              <input
                type="time"
                value={editingAttendance.checkOutTime || ''}
                onChange={e => { setEditingAttendance({ ...editingAttendance, checkOutTime: e.target.value }); setIsDirty(true); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${adminTheme.button} text-white rounded-lg font-medium`}
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
