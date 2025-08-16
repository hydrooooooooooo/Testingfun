import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { ScrapeProvider } from "./contexts/ScrapeContext"; // Importer le nouveau provider
import { DashboardProvider } from "./context/DashboardContext";

// Pages
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import PaymentSuccess from "./pages/PaymentSuccess";
import DownloadPage from "./pages/DownloadPage";
import Models from "./pages/Models";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RequestPasswordResetPage from "./pages/RequestPasswordResetPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Components
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <DashboardProvider>
            <BrowserRouter>
              <ScrapeProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/models" element={<Models />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
                </Route>

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />
                  </Route>
                  <Route path="/profile" element={<DashboardLayout />}>
                    <Route index element={<ProfilePage />} />
                  </Route>
                </Route>
                <Route path="/download" element={<DownloadPage />} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </ScrapeProvider>
            </BrowserRouter>
        </DashboardProvider>
      </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
