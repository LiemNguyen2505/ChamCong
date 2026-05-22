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
  filterBranch?: string;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  show,
  onClose,
  onSubmit,
  nhanViens,
  manualAttendance,
  setManualAttendance,
  adminTheme,
  filterBranch = 'All',
}) => {
  const handleClose = () => {
    onClose();
  };

  const filteredNhanViens = filterBranch === 'All' 
    ? nhanViens 
    : nhanViens.filter(nv => nv.locationId === filterBranch || (nv.locationIds && nv.locationIds.includes(filterBranch)));

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
              onChange={e => {
                const selectedEmp = nhanViens.find(nv => nv.empId === e.target.value);
                setManualAttendance({
                  ...manualAttendance,
                  empId: e.target.value,
                  locationId: filterBranch !== 'All' ? filterBranch : (selectedEmp?.locationId || 'Góc Phố')
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">-- Chọn nhân viên --</option>
              {filteredNhanViens.map(nv => (
                <option key={nv.id} value={nv.empId}>{nv.fullName}</option>
              ))}
            </select>
          </div>
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
    onClose();
    setIsDirty(false);
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
