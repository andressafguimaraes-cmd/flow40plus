import { ReactNode } from "react";
import Logo from "./Logo";

interface AppHeaderProps {
  rightSlot?: ReactNode;
}

export default function AppHeader({ rightSlot }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2 bg-background">
      <Logo size="sm" showWaves={false} showManifesto={false} />
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
