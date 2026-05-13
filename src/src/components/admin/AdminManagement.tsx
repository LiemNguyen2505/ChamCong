import React, { useState } from 'react';
import { Plus, ShieldCheck, Trash2, Eye, EyeOff, X, RefreshCw } from 'lucide-react';
import { AdminAccount } from '../../types/admin';
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';

interface AdminManagementProps {
  activeTab: string;
  currentAdmin: AdminAccount | null;
  adminTheme: any;
  admins: AdminAccount[];
  SUPER_ADMIN: AdminAccount;
  fetchInitialData: (month?: string, skipLoading?: boolean) => Promise<any>;
  logAction: (action: string, target: string, details: string) => Promise<void>;
  getAllowedBranches: () => string[];
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({
  activeTab,
  currentAdmin,
  adminTheme,
  admins,
  SUPER_ADMIN,
  fetchInitialData,
  logAction,
  getAllowedBranches,
  openConfirmModal,
}) => {
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [showAddAdminPin, setShowAddAdminPin] = useState(false);
  
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    pin: '',
    role: 'BranchAdmin' as 'BranchAdmin' | 'SuperAdmin',
    locationIds: ['Góc Phố']
  });

  if (activeTab !== 'admins' || currentAdmin?.role !== 'SuperAdmin') return null;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Đang thêm Admin...');
    try {
      await addDoc(collection(db, 'Admins'), {
        ...newAdmin,
        createdAt: serverTimestamp()
      });
      await logAction('Thêm', 'Admin', `Thêm admin mới: ${newAdmin.email} (${newAdmin.role})`);
      toast.success('Thêm Admin thành công', { id: loadingToast });
      setShowAddAdminModal(false);
      setNewAdmin({ email: '', pin: '', role: 'BranchAdmin', locationIds: ['Góc Phố'] });
      await fetchInitialData();
    } catch (error) {
      toast.error('Lỗi khi thêm Admin', { id: loadingToast });
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    const loadingToast = toast.loading('Đang cập nhật Admin...');
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...updateData } = editingAdmin;
      await updateDoc(doc(db, 'Admins', editingAdmin.id), updateData);
      await logAction('Sửa', 'Admin', `Sửa thông tin admin: ${editingAdmin.email}`);
      toast.success('Cập nhật Admin thành công', { id: loadingToast });
      setShowEditAdminModal(false);
      setEditingAdmin(null);
      await fetchInitialData();
    } catch (error) {
      toast.error('Lỗi khi cập nhật Admin', { id: loadingToast });
    }
  };

  const onDeleteAdmin = (id: string) => {
    if (id === 'super') {
      toast.error('Không thể xóa Super Admin mặc định');
      return;
    }

    openConfirmModal(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa Admin này?',
      async () => {
        const loadingToast = toast.loading('Đang xóa Admin...');
        try {
          await deleteDoc(doc(db, 'Admins', id));
          await logAction('Xóa', 'Admin', `Xóa Admin ID: ${id}`);
          toast.success('Xóa Admin thành công', { id: loadingToast });
          await fetchInitialData();
        } catch (error) {
          toast.error('Lỗi khi xóa Admin', { id: loadingToast });
        }
      }
    );
  };

  return (
    <div className="p-4 px-0 md:p-6">
      <div className="flex justify-between items-center mb-6 px-4 md:px-0">
        <h2 className="text-lg font-bold text-gray-900">Quản lý Admin</h2>
        <button
          onClick={() => setShowAddAdminModal(true)}
          className={`flex items-center gap-2 px-4 py-2 ${adminTheme.button} text-white rounded-lg text-sm font-medium`}
        >
          <Plus className="w-4 h-4" />
          Thêm Admin
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Default Super Admin */}
        <div className={`border ${adminTheme.border} ${adminTheme.bg} rounded-xl p-4 flex flex-col gap-2 relative`}>
          <div className="flex justify-between items-start">
            <h3 className={`font-bold ${adminTheme.text}`}>{SUPER_ADMIN.email}</h3>
            <span className={`px-2 py-1 ${adminTheme.badge} text-xs rounded-full`}>Mặc định</span>
          </div>
          <p className={`text-sm ${adminTheme.text} opacity-80`}>Vai trò: {SUPER_ADMIN.role}</p>
          <p className={`text-sm ${adminTheme.text} opacity-80`}>Chi nhánh quản lý: {SUPER_ADMIN.locationIds.join(', ')}</p>
          <div className="absolute top-4 right-4">
            <ShieldCheck className={`w-5 h-5 ${adminTheme.text}`} />
          </div>
        </div>

        {admins.filter(ad => ad.id !== 'super').map(ad => (
          <div key={ad.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 relative group">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900">{ad.email}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                ad.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
              }`}>
                {ad.role}
              </span>
            </div>
            <p className="text-sm text-gray-600">Chi nhánh: {Array.isArray(ad.locationIds) ? ad.locationIds.join(', ') : ad.locationId}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setEditingAdmin(ad);
                  setShowEditAdminModal(true);
                }}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
              >
                Sửa
              </button>
              <button
                onClick={() => onDeleteAdmin(ad.id)}
                className="p-1.5 bg-red-100 text-red-600 rounded-lg transition-colors hover:bg-red-200"
                title="Xóa Admin"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddAdminModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-white/10 shadow-2xl">
            <div className={`flex items-center justify-between p-6 border-b border-white/10 ${adminTheme.header}`}>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Thêm Admin mới</h2>
              <button 
                onClick={() => setShowAddAdminModal(false)}
                className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên quản lý (Dùng để đăng nhập)</label>
                <input
                  type="text"
                  required
                  value={newAdmin.email}
                  onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Ví dụ: QuanLyA, Khoa..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN Đăng nhập</label>
                <div className="relative">
                  <input
                    type={showAddAdminPin ? "text" : "password"}
                    required
                    minLength={4}
                    maxLength={4}
                    value={newAdmin.pin}
                    onChange={e => setNewAdmin({ ...newAdmin, pin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-xl tracking-widest"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddAdminPin(!showAddAdminPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showAddAdminPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="BranchAdmin"
                      checked={newAdmin.role === 'BranchAdmin'}
                      onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value as 'BranchAdmin', locationIds: ['Góc Phố'] })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Quản lý chi nhánh (Branch Admin)</span>
                  </label>
                  
                  {newAdmin.role === 'BranchAdmin' && (
                    <div className="ml-7 flex flex-col gap-2">
                      {getAllowedBranches().map(branch => (
                        <label key={branch} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="branch"
                            value={branch}
                            checked={newAdmin.locationIds.includes(branch)}
                            onChange={e => setNewAdmin({ ...newAdmin, locationIds: [e.target.value] })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{branch}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="SuperAdmin"
                      checked={newAdmin.role === 'SuperAdmin'}
                      onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value as 'SuperAdmin', locationIds: ['Góc Phố', 'Phố Xanh'] })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Quản lý tổng (Super Admin)</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 ${adminTheme.button} text-white rounded-lg font-medium shadow-lg`}
                >
                  Tạo Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdminModal && editingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowEditAdminModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-white/10 shadow-2xl">
            <div className={`flex items-center justify-between p-6 border-b border-white/10 ${adminTheme.header}`}>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Sửa thông tin Admin</h2>
              <button 
                onClick={() => {
                  setShowEditAdminModal(false);
                  setEditingAdmin(null);
                }}
                className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleUpdateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên quản lý</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.email || ''}
                  onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN Đăng nhập</label>
                <div className="relative">
                  <input
                    type={showAddAdminPin ? "text" : "password"}
                    required
                    minLength={4}
                    maxLength={4}
                    value={editingAdmin.pin || ''}
                    onChange={e => setEditingAdmin({ ...editingAdmin, pin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-xl tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddAdminPin(!showAddAdminPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showAddAdminPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="edit-role"
                      value="BranchAdmin"
                      checked={editingAdmin.role === 'BranchAdmin'}
                      onChange={e => setEditingAdmin({ ...editingAdmin, role: e.target.value as 'BranchAdmin', locationIds: ['Góc Phố'] })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Quản lý chi nhánh (Branch Admin)</span>
                  </label>
                  
                  {editingAdmin.role === 'BranchAdmin' && (
                    <div className="ml-7 flex flex-col gap-2">
                      {getAllowedBranches().map(branch => (
                        <label key={branch} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="edit-branch"
                            value={branch}
                            checked={editingAdmin.locationIds?.includes(branch)}
                            onChange={e => setEditingAdmin({ ...editingAdmin, locationIds: [e.target.value] })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{branch}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="edit-role"
                      value="SuperAdmin"
                      checked={editingAdmin.role === 'SuperAdmin'}
                      onChange={e => setEditingAdmin({ ...editingAdmin, role: e.target.value as 'SuperAdmin', locationIds: ['Góc Phố', 'Phố Xanh'] })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">Quản lý tổng (Super Admin)</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAdminModal(false);
                    setEditingAdmin(null);
                  }}
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
      )}
    </div>
  );
};
