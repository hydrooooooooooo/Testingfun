import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { ScrapeProvider } from "./contexts/ScrapeContext";
import { DashboardProvider } from "./context/DashboardContext";
import { LocaleProvider } from "./i18n/LocaleProvider";

// Pages - Public
import Index from "./pages/Index";
import AboutPage from "./pages/AboutPage";
import UseCasePage from "./pages/UseCasePage";
import Pricing from "./pages/Pricing";
import Support from "./pages/Support";
import ExemplesPage from "./pages/ExemplesPage";
// Models page removed
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterSuccessPage from "./pages/RegisterSuccessPage";
import RequestPasswordResetPage from "./pages/RequestPasswordResetPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import VerifyEmailSuccess from './pages/VerifyEmailSuccess';
import VerifyEmailError from './pages/VerifyEmailError';

// Pages - Payment flow
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentError from "./pages/PaymentError";
import DownloadPage from "./pages/DownloadPage";

// Pages - Dashboard
import DashboardPage from './pages/DashboardPage';
import SettingsTab from './components/dashboard/SettingsTab';
import CreditsPage from './pages/CreditsPage';
import ExtractionsPage from './pages/ExtractionsPage';
import AiAnalysesPage from './pages/AiAnalysesPage';
import BenchmarkPage from './pages/BenchmarkPage';
import AutomationsPage from './pages/AutomationsPage';
import MentionsPage from './pages/MentionsPage';
import MentionSettingsPage from './pages/MentionSettingsPage';
import PaymentsPage from './pages/PaymentsPage';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceFilesPage from './pages/MarketplaceFilesPage';
import FacebookPagesPage from './pages/FacebookPagesPage';
import FacebookPagesFilesPage from './pages/FacebookPagesFilesPage';

// Pages - Admin
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminSessionsPage from './pages/AdminSessionsPage';
import NotFound from './pages/NotFound';

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
              <LocaleProvider>
              <ScrapeProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/exemples" element={<ExemplesPage />} />
                  {/* /models route removed */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/register/success" element={<RegisterSuccessPage />} />
                  <Route path="/resend-verification" element={<ResendVerificationPage />} />
                  <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
                  <Route path="/verify-email/success" element={<VerifyEmailSuccess />} />
                  <Route path="/verify-email/error" element={<VerifyEmailError />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/use-cases/:slug" element={<UseCasePage />} />

                  {/* EN routes */}
                  <Route path="/en" element={<Index />} />
                  <Route path="/en/pricing" element={<Pricing />} />
                  <Route path="/en/support" element={<Support />} />
                  <Route path="/en/examples" element={<ExemplesPage />} />
                  <Route path="/en/about" element={<AboutPage />} />
                  <Route path="/en/use-cases/:slug" element={<UseCasePage />} />
                  <Route path="/en/login" element={<LoginPage />} />
                  <Route path="/en/register" element={<RegisterPage />} />
                </Route>

                {/* Payment flow routes (accessible without full dashboard layout) */}
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/error" element={<PaymentError />} />
                <Route path="/download" element={<DownloadPage />} />

                {/* Protected Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="credits" element={<CreditsPage />} />
                    <Route path="extractions" element={<ExtractionsPage />} />
                    <Route path="ai-analyses" element={<AiAnalysesPage />} />
                    <Route path="benchmark" element={<BenchmarkPage />} />
                    <Route path="automations" element={<AutomationsPage />} />
                    <Route path="mentions" element={<MentionsPage />} />
                    <Route path="mention-settings" element={<MentionSettingsPage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="marketplace" element={<MarketplacePage />} />
                    <Route path="marketplace-files" element={<MarketplaceFilesPage />} />
                    <Route path="facebook-pages" element={<FacebookPagesPage />} />
                    <Route path="facebook-pages-files" element={<FacebookPagesFilesPage />} />
                    <Route path="settings" element={<SettingsTab />} />
                  </Route>
                  <Route path="/profile" element={<DashboardLayout />}>
                    <Route index element={<SettingsTab />} />
                  </Route>
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="sessions" element={<AdminSessionsPage />} />
                      <Route path="reporting" element={<AdminDashboard />} />
                    </Route>
                  </Route>
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </ScrapeProvider>
              </LocaleProvider>
            </BrowserRouter>
        </DashboardProvider>
      </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
