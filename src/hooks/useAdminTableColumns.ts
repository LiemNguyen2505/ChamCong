import { useState, useCallback } from 'react';

export const useAdminTableColumns = () => {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    stt: true,
    name: true,
    bank: false,
    joinDate: false,
    hours: true,
    baseSalary: true,
    responsibility: true,
    holiday: true,
    latePenalty: true,
    phonePenalty: true,
    extraAdditions: true,
    otherDeductions: true,
    actual: true,
    note: true,
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    stt: 40,
    name: 160,
    bank: 110,
    joinDate: 90,
    hours: 80,
    baseSalary: 110,
    responsibility: 130,
    holiday: 90,
    latePenalty: 110,
    phonePenalty: 110,
    otherDeductions: 110,
    extraAdditions: 110,
    actual: 110,
    note: 300
  });

  const handleResize = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = columnWidths[column];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columnWidths]);

  return {
    visibleColumns,
    setVisibleColumns,
    showColumnConfig,
    setShowColumnConfig,
    columnWidths,
    setColumnWidths,
    handleResize
  };
};
