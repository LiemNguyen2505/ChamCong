import React from 'react';
import { FileCheck, Phone, Clock, Info, Check, AlertTriangle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface RegulationsTabProps {
  activeTab: string;
  adminTheme: any;
}

export const RegulationsTab = ({ activeTab, adminTheme }: RegulationsTabProps) => {
  if (activeTab !== 'quydinh') return null;

  const regulations = [
    {
      id: 'lateness_rules',
      title: 'Quy tắc về Đi trễ (Lateness)',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      rules: [
        'Hệ thống tính toán dựa trên số phút trễ và số lần trễ trong tháng:',
        'Trừ vào Tiền lương: Tiền phạt trễ = Số phút trễ × 3 × (Lương giờ / 60) (khi trễ >= 10p).',
        'Lưu ý: Chỉ những phút trễ không được quản lý xác nhận mới bị tính phạt.',
        'Ảnh hưởng đến Thưởng Trách Nhiệm (TTN):',
        '  . Giảm 50% TTN nếu tổng số lần đi trễ trong tháng từ 5 đến 9 lần.',
        '  . Mất 100% TTN nếu tổng số lần đi trễ trong tháng từ 10 lần trở lên.',
        '  . Mất 100% TTN ngay lập tức nếu có hành vi Bỏ ca (trễ > 300p không lý do).'
      ]
    },
    {
      id: 'phone_rules',
      title: 'QUY TẮC SỬ DỤNG ĐIỆN THOẠI & RỜI APP',
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      rules: [
        'Hệ thống tự động ghi nhận việc rời khỏi ứng dụng hoặc tắt màn hình trong giờ làm việc (tính theo từng ca).',
        'Ca làm việc bị tính là VI PHẠM lỗi điện thoại nếu: (TẠM NGƯNG ÁP DỤNG DO HỆ THỐNG ĐANG NÂNG CẤP)',
        '  . Rời app quá 3 lần / ca.',
        '  . HOẶC có 1 lần rời app liên tục quá 5 phút.',
        '1. Trừ thẳng vào Lương (Phạt vi phạm):',
        '  . Khi phát sinh vi phạm trên, hệ thống sẽ phạt tiền với công thức: Tổng số phút rời app × 3 × (Lương cơ bản / 60 phút).',
        '2. Ảnh hưởng đến Thưởng Trách Nhiệm (TTN):',
        '  . Mỗi ca làm việc vi phạm lỗi điện thoại sẽ bị tính là 1 gạch vi phạm (tương đương trừ 10% Thưởng Trách Nhiệm của tháng).'
      ]
    },
    {
      id: 'general',
      title: 'Quy tắc ứng xử & Phục vụ',
      icon: MessageSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      rules: [
        'Luôn giữ thái độ niềm nở, lịch sự với khách hàng.',
        'Đồng phục sạch sẽ, gọn gàng đúng quy định quán.',
        'Giữ gìn vệ sinh khu vực làm việc và công cụ dụng cụ.',
        'Phối hợp tốt với đồng nghiệp trong ca làm việc.'
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-3">
            <FileCheck className={`w-8 h-8 ${adminTheme.text}`} />
            Quy Định Quán
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {regulations.map((reg) => (
          <div 
            key={reg.id}
            className={`bg-white rounded-2xl border-2 ${reg.borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className={`${reg.bgColor} p-4 border-b ${reg.borderColor} flex items-center gap-4`}>
              <div className={`${reg.color} p-2 bg-white rounded-lg shadow-sm`}>
                <reg.icon className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${reg.color}`}>{reg.title}</h3>
            </div>
            <div className="p-6 space-y-4">
              <ul className="space-y-3">
                {reg.rules.map((rule, idx) => {
                  const isSubRule = rule.startsWith('  ');
                  return (
                    <li key={idx} className="flex gap-3 text-slate-600 font-medium leading-relaxed">
                      {!isSubRule && <Check className="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" />}
                      {isSubRule && <div className="w-5 flex-shrink-0" />}
                      <span>{rule}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}

        <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-white p-4 rounded-full shadow-sm">
            <AlertTriangle className="w-10 h-10 text-slate-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-700">Lưu ý cho Quản lý</h4>
            <p className="text-slate-500 max-w-sm mt-2 font-medium">
              Sử dụng các quy định này để giải thích và hướng dẫn nhân viên trong quá trình làm việc, đảm bảo sự công bằng và minh bạch.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
