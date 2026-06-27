import { ReactNode } from "react";

interface AppHeaderProps {
  rightSlot?: ReactNode;
}

export default function AppHeader({ rightSlot }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2 bg-[#FDF5E6]">
      <h1 className="text-xl font-black text-[#003366]">
        Flow40<sup className="text-[#E67E22] text-sm font-black">+</sup>
      </h1>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
