import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RoleGuard } from "@/components/auth/role-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import PricingPage from "@/pages/PricingPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductAnalysisPage from "@/pages/ProductAnalysisPage";
import SocialPage from "@/pages/SocialPage";
import StudioPage from "@/pages/StudioPage";
import PostsPage from "@/pages/PostsPage";
import OrdersPage from "@/pages/OrdersPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PublicProductPage from "@/pages/PublicProductPage";

const queryClient = new QueryClient();

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/products",
  "/product-analysis",
  "/social",
  "/studio",
  "/posts",
  "/orders",
  "/payments",
  "/analytics",
  "/notifications",
  "/settings",
];

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-64">
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/checkout/:sessionId" component={CheckoutPage} />
      <Route path="/p/:slug" component={PublicProductPage} />

      <Route path="/dashboard">
        <DashboardLayout><DashboardPage /></DashboardLayout>
      </Route>
      <Route path="/products">
        <DashboardLayout><ProductsPage /></DashboardLayout>
      </Route>
      <Route path="/product-analysis">
        <DashboardLayout><ProductAnalysisPage /></DashboardLayout>
      </Route>
      <Route path="/social">
        <DashboardLayout><SocialPage /></DashboardLayout>
      </Route>
      <Route path="/studio">
        <DashboardLayout><StudioPage /></DashboardLayout>
      </Route>
      <Route path="/posts">
        <DashboardLayout><PostsPage /></DashboardLayout>
      </Route>
      <Route path="/orders">
        <DashboardLayout><OrdersPage /></DashboardLayout>
      </Route>
      <Route path="/payments">
        <DashboardLayout><PaymentsPage /></DashboardLayout>
      </Route>
      <Route path="/analytics">
        <DashboardLayout><AnalyticsPage /></DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout><NotificationsPage /></DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout><SettingsPage /></DashboardLayout>
      </Route>

      <Route>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">404 — Page not found</h1>
            <a href="/" className="mt-4 block text-violet-400 hover:underline">Go home</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
