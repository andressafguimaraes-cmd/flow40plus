import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Planejamento from "@/pages/Planejamento";
import Jornada from "@/pages/Jornada";
import Perfil from "@/pages/Perfil";

export const TAB_ORDER = ["/dashboard", "/tasks", "/planejamento", "/jornada", "/perfil"] as const;

interface SwipeableTabsProps {
  location: string;
  onNavigate: (path: string) => void;
  onOpenCheckIn: () => void;
}

export default function SwipeableTabs({ location, onNavigate, onOpenCheckIn }: SwipeableTabsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });

  // Arrastar (swipe) -> atualiza a URL
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const path = TAB_ORDER[emblaApi.selectedScrollSnap()];
      if (path) onNavigate(path);
    };
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onNavigate]);

  // Clique na navbar (ou navegação externa) -> desliza o carrossel
  useEffect(() => {
    if (!emblaApi) return;
    const idx = TAB_ORDER.indexOf(location as (typeof TAB_ORDER)[number]);
    if (idx !== -1 && emblaApi.selectedScrollSnap() !== idx) {
      emblaApi.scrollTo(idx);
    }
  }, [location, emblaApi]);

  return (
    <div className="overflow-hidden" style={{ height: "calc(100dvh - 64px)" }} ref={emblaRef}>
      <div className="flex h-full">
        <div className="min-w-0 h-full overflow-y-auto flex-[0_0_100%]">
          <Dashboard onOpenCheckIn={onOpenCheckIn} />
        </div>
        <div className="min-w-0 h-full overflow-y-auto flex-[0_0_100%]">
          <Tasks />
        </div>
        <div className="min-w-0 h-full overflow-y-auto flex-[0_0_100%]">
          <Planejamento />
        </div>
        <div className="min-w-0 h-full overflow-y-auto flex-[0_0_100%]">
          <Jornada />
        </div>
        <div className="min-w-0 h-full overflow-y-auto flex-[0_0_100%]">
          <Perfil />
        </div>
      </div>
    </div>
  );
}
