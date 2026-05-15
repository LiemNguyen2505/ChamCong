import React from 'react';
import { ShieldAlert, Phone, Clock, Info, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface RegulationsTabProps {
  activeTab: string;
  adminTheme: any;
}

export const RegulationsTab = ({ activeTab, adminTheme }: RegulationsTabProps) => {
  if (activeTab !== 'quydinh') return null;

  const regulations = [
    {
      id: 'phone',
      title: 'Quy định về sử dụng điện thoại',
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      rules: [
        'Không sử dụng điện thoại trong giờ làm việc trừ trường hợp khẩn cấp.',
        'Điện thoại phải để chế độ rung hoặc im lặng.',
        'Nếu có việc cần liên lạc gấp, vui lòng báo cáo với quản lý trực tiếp.',
        'Việc sử dụng điện thoại quá mức sẽ bị nhắc nhở và có thể bị trừ điểm chuyên cần.'
      ]
    },
    {
      id: 'late',
      title: 'Quy định về đi trễ & Giờ giấc',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      rules: [
        'Nhân viên phải có mặt tại nơi làm việc ít nhất 5-10 phút trước giờ vào ca.',
        'Đi trễ dưới 15 phút: Nhắc nhở và ghi nhận vào hệ thống.',
        'Đi trễ trên 15 phút: Có thể bị xếp lại ca hoặc trừ lương theo quy định (nếu không có lý do chính đáng).',
        'Nghỉ phép phải báo trước ít nhất 24h (trừ trường hợp đột xuất có giấy tờ minh chứng).'
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
            <ShieldAlert className={`w-8 h-8 ${adminTheme.textPrimary}`} />
            Nội Quy & Quy Định Cửa Hàng
          </h2>
          <p className="text-slate-500 font-medium mt-1">Hệ thống ghi nhớ các quy định vận hành quán</p>
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
                {reg.rules.map((rule, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-600 font-medium leading-relaxed">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
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
