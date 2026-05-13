import React from 'react';
import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { Alert } from '../types/admin';
import { safeFormat } from '../utils/dateUtils';

interface AlertsProps {
  activeTab: string;
  canhBaos: Alert[];
}

export const Alerts: React.FC<AlertsProps> = ({
  activeTab,
  canhBaos,
}) => {
  if (activeTab !== 'canhbao') return null;

  return (
    <div className="p-4 px-0 md:p-6">
      <div className="flex justify-between items-center mb-6 px-4 md:px-0">
        <h2 className="text-lg font-bold text-gray-900">Cảnh báo khẩn</h2>
      </div>
      {canhBaos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Không có cảnh báo nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {canhBaos.map(cb => (
            <div key={cb.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-4 items-start">
              <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-red-900">{cb.fullName} ({cb.empId})</h3>
                  <span className="text-sm text-red-600 font-medium">
                    {safeFormat(cb.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                  </span>
                </div>
                <p className="text-red-800 mb-2">{cb.message}</p>
                <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md font-medium">
                  Chi nhánh: {cb.locationId}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
