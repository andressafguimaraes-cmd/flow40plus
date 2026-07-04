import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import MorningCheckIn from "./pages/MorningCheckIn";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Practices from "./pages/Practices";
import Jornada from "./pages/Jornada";
import Perfil from "./pages/Perfil";
import Calendar from "./pages/Calendar";
import { useState, useEffect } from "react";
import Login from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";

function AppShell() {
  const [location, setLocation] = useLocation();
  const [showCheckIn, setShowCheckIn] = useState(false);
  const { user, loading, isAuthenticated } = useAuth();

  // Mostra o check-in como pop-up na primeira visita do dia
  useEffect(() => {
    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem("flow40_last_checkin");
    if (lastCheckIn !== today) {
      setTimeout(() => setShowCheckIn(true), 800);
    }
  }, []);

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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF5E6] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E67E22] mx-auto mb-4"></div>
          <p className="text-[#003366] font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#FDF5E6]">
      <Switch>
        <Route path="/" component={() => { setLocation("/dashboard"); return null; }} />
        <Route path="/dashboard" component={() => <Dashboard onOpenCheckIn={() => setShowCheckIn(true)} />} />
        <Route path="/jornada" component={Jornada} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/practices" component={Practices} />
        <Route path="/perfil" component={Perfil} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>

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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
