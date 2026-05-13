import React from 'react';
import { format } from 'date-fns';
import { AuditLog, AdminAccount } from '../types/admin';

interface SystemLogsProps {
  activeTab: string;
  currentAdmin: AdminAccount | null;
  auditLogs: AuditLog[];
}

export const SystemLogs: React.FC<SystemLogsProps> = ({
  activeTab,
  currentAdmin,
  auditLogs,
}) => {
  if (activeTab !== 'lichsu' || currentAdmin?.role !== 'SuperAdmin') return null;

  return (
    <div className="bg-white rounded-2xl p-4 px-0 md:p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-6 px-4 md:px-0">Lịch sử hệ thống</h2>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Thời gian</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Hành động</th>
              <th className="px-4 py-3">Đối tượng</th>
              <th className="px-4 py-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  {log.timestamp ? format(new Date(log.timestamp.toDate()), 'dd/MM/yyyy HH:mm:ss') : ''}
                </td>
                <td className="px-4 py-3">{log.adminEmail}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.target}</td>
                <td className="px-4 py-3">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
