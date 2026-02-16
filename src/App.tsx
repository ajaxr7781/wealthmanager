import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Portfolio from "./pages/Portfolio";
import AddAsset from "./pages/AddAsset";
import EditAsset from "./pages/EditAsset";
import AssetDetail from "./pages/AssetDetail";
import Transactions from "./pages/Transactions";
import Holdings from "./pages/Holdings";
import HoldingsByCategory from "./pages/HoldingsByCategory";
import Prices from "./pages/Prices";
import Reports from "./pages/Reports";
import AssetTypesSettings from "./pages/settings/AssetTypes";
import PreferencesSettings from "./pages/settings/Preferences";
import MfSchemesSettings from "./pages/settings/MfSchemes";
import MfHoldingsPage from "./pages/mf/MfHoldings";
import AddMfHolding from "./pages/mf/AddMfHolding";
import MfHoldingDetail from "./pages/mf/MfHoldingDetail";
import EditMfHolding from "./pages/mf/EditMfHolding";
import SipListPage from "./pages/mf/SipList";
import AddSipPage from "./pages/mf/AddSip";
import EditSipPage from "./pages/mf/EditSip";
import NotFound from "./pages/NotFound";
import LiabilitiesPage from "./pages/Liabilities";
import GoalsPage from "./pages/Goals";
import RebalancingPage from "./pages/Rebalancing";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Main Routes */}
              <Route path="/" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
              <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
              
              {/* Asset Routes */}
              <Route path="/assets/new" element={<ProtectedRoute><AddAsset /></ProtectedRoute>} />
              <Route path="/asset/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
              <Route path="/asset/:id/edit" element={<ProtectedRoute><EditAsset /></ProtectedRoute>} />
              
              {/* Holdings Routes */}
              <Route path="/holdings" element={<ProtectedRoute><Holdings /></ProtectedRoute>} />
              <Route path="/holdings/:categoryCode" element={<ProtectedRoute><HoldingsByCategory /></ProtectedRoute>} />
              
              {/* Other Routes */}
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/prices" element={<ProtectedRoute><Prices /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/liabilities" element={<ProtectedRoute><LiabilitiesPage /></ProtectedRoute>} />
              <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
              <Route path="/rebalancing" element={<ProtectedRoute><RebalancingPage /></ProtectedRoute>} />
              
              {/* Settings Routes */}
              <Route path="/settings/asset-types" element={<ProtectedRoute><AssetTypesSettings /></ProtectedRoute>} />
              <Route path="/settings/preferences" element={<ProtectedRoute><PreferencesSettings /></ProtectedRoute>} />
              <Route path="/settings/mf-schemes" element={<ProtectedRoute><MfSchemesSettings /></ProtectedRoute>} />
              
              {/* Mutual Fund Routes */}
              <Route path="/mf/holdings" element={<ProtectedRoute><MfHoldingsPage /></ProtectedRoute>} />
              <Route path="/mf/holdings/new" element={<ProtectedRoute><AddMfHolding /></ProtectedRoute>} />
              <Route path="/mf/holdings/:id" element={<ProtectedRoute><MfHoldingDetail /></ProtectedRoute>} />
              <Route path="/mf/holdings/:id/edit" element={<ProtectedRoute><EditMfHolding /></ProtectedRoute>} />
              <Route path="/mf/sips" element={<ProtectedRoute><SipListPage /></ProtectedRoute>} />
              <Route path="/mf/sips/new" element={<ProtectedRoute><AddSipPage /></ProtectedRoute>} />
              <Route path="/mf/sips/:id/edit" element={<ProtectedRoute><EditSipPage /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
