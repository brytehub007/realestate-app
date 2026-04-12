import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import Layout              from "./components/layout/Layout";
import HomePage            from "./pages/HomePage";
import ListingsPage        from "./pages/ListingsPage";
import PropertyDetailPage  from "./pages/PropertyDetailPage";
import CreateListingPage   from "./pages/CreateListingPage";
import LoginPage           from "./pages/login/LoginPage";
import SignupPage          from "./pages/signup/SignupPage";
import OnboardingPage      from "./pages/onboarding/OnboardingPage";
import DashboardPage       from "./pages/step7-dashboard/DashboardPage";
import AdminPage           from "./pages/step8-admin/AdminPage";
import EscrowPage          from "./pages/step5-escrow/EscrowPage";
import AreaReportPage      from "./pages/step6-area-report/AreaReportPage";
import ServicesPage        from "./pages/step9-services/ServicesPage";
import MessagingPage       from "./pages/messaging/MessagingPage";
import AlertsPage          from "./pages/alerts/AlertsPage";
import ComparisonPage      from "./pages/comparison/ComparisonPage";
import DocumentVaultPage   from "./pages/document-vault/DocumentVaultPage";
import OwnerProfilePage    from "./pages/owner-profile/OwnerProfilePage";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/signup"     element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<Layout />}>
            <Route index                 element={<HomePage />} />
            <Route path="listings"       element={<ListingsPage />} />
            <Route path="listings/:slug" element={<PropertyDetailPage />} />
            <Route path="create-listing" element={<CreateListingPage />} />
            <Route path="escrow/:id"     element={<EscrowPage />} />
            <Route path="area-report"    element={<AreaReportPage />} />
            <Route path="dashboard"      element={<DashboardPage />} />
            <Route path="admin"          element={<AdminPage />} />
            <Route path="services"       element={<ServicesPage />} />
            <Route path="messages"       element={<MessagingPage />} />
            <Route path="messages/:id"   element={<MessagingPage />} />
            <Route path="alerts"         element={<AlertsPage />} />
            <Route path="compare"        element={<ComparisonPage />} />
            <Route path="vault"          element={<DocumentVaultPage />} />
            <Route path="profile/:userId" element={<OwnerProfilePage />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" toastOptions={{ style: { background: "#1a2e1a", color: "#d4af37", border: "1px solid #d4af37", fontFamily: "'Cormorant Garamond', serif" } }} />
    </QueryClientProvider>
  );
}
