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
import ResendVerificationPage from "./pages/ResendVerificationPage";
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmailSuccess from './pages/VerifyEmailSuccess';
import VerifyEmailError from './pages/VerifyEmailError';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

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
                  <Route path="/resend-verification" element={<ResendVerificationPage />} />
                  <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
                  <Route path="/verify-email/success" element={<VerifyEmailSuccess />} />
                  <Route path="/verify-email/error" element={<VerifyEmailError />} />
                </Route>

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />
                  </Route>
                  <Route path="/profile" element={<DashboardLayout />}>
                    <Route index element={<ProfilePage />} />
                  </Route>
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                    </Route>
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
