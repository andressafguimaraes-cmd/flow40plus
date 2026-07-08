import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import SwipeableTabs, { TAB_ORDER } from "./components/SwipeableTabs";
import MorningCheckIn from "./pages/MorningCheckIn";
import Practices from "./pages/Practices";
import Calendar from "./pages/Calendar";
import { useState, useEffect } from "react";
import Login from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import { useReminders } from "@/hooks/useReminders";
import Termos from "@/pages/Termos";
import Ajuda from "@/pages/Ajuda";

const LEGACY_ROUTES = ["/calendar", "/practices", "/ajuda"];

function AppShell() {
  const [location, setLocation] = useLocation();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const { user, loading, isAuthenticated } = useAuth();

  useReminders(isAuthenticated);

  // Mostra o check-in como pop-up na primeira visita do dia
  useEffect(() => {
    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem("flow40_last_checkin");
    if (lastCheckIn !== today) {
      setTimeout(() => setShowCheckIn(true), 800);
    }
  }, []);

  // Rota raiz sempre cai no Dashboard
  useEffect(() => {
    if (location === "/") setLocation("/dashboard");
  }, [location, setLocation]);

  const handleCheckInComplete = () => {
    const today = new Date().toDateString();
    localStorage.setItem("flow40_last_checkin", today);
    setShowCheckIn(false);
    setLocation("/dashboard");
  };

  const handleCheckInClose = () => {
    setShowCheckIn(false);
    setLocation("/dashboard");
  };

  // Termos & Privacidade são acessíveis mesmo sem autenticação (link no rodapé do Login)
  if (location === "/termos") {
    return <Termos />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Logo size="md" showManifesto={false} className="mb-6" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  const isTabRoute = location === "/" || (TAB_ORDER as readonly string[]).includes(location);
  const isLegacyRoute = LEGACY_ROUTES.includes(location);

  return (
    <div className="min-h-screen bg-[#FDF5E6]">
      {isTabRoute && (
        <SwipeableTabs
          location={location === "/" ? "/dashboard" : location}
          onNavigate={setLocation}
          onOpenCheckIn={() => setShowCheckIn(true)}
        />
      )}
      {location === "/calendar" && <Calendar />}
      {location === "/practices" && <Practices />}
      {location === "/ajuda" && <Ajuda />}
      {!isTabRoute && !isLegacyRoute && <NotFound />}

      <BottomNav />

      {showCheckIn && (
        <MorningCheckIn
          onComplete={handleCheckInComplete}
          onClose={handleCheckInClose}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
