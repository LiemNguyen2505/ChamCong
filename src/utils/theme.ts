
export const getBranchTheme = (branchId: string | null) => {
  const woodTheme = {
    bg: 'bg-[#FDFBF7]',
    accent: 'bg-[#764333]',
    text: 'text-[#764333]',
    header: 'bg-[#764333] text-white',
    border: 'border-[#764333]/20',
    gradient: 'from-[#764333] to-[#4A2A20]',
    button: 'bg-[#764333] hover:bg-[#5D3428]',
    card: 'bg-white border-[#764333]/10',
    shadow: 'shadow-[#764333]/10',
    ring: 'focus:ring-[#764333]',
    badge: 'bg-[#764333] text-white'
  };

  const forestTheme = {
    bg: 'bg-[#F8FAF8]',
    accent: 'bg-[#4F6F52]',
    text: 'text-[#4F6F52]',
    header: 'bg-[#4F6F52] text-white',
    border: 'border-[#4F6F52]/10',
    gradient: 'from-[#4F6F52] to-[#3D5640]',
    button: 'bg-[#4F6F52] hover:bg-[#3D5640]',
    card: 'bg-white border-[#4F6F52]/5',
    shadow: 'shadow-[#4F6F52]/10',
    ring: 'focus:ring-[#4F6F52]',
    badge: 'bg-[#4F6F52] text-white'
  };

  if (branchId === 'Phố Xanh') return forestTheme;
  return woodTheme;
};
