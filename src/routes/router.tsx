import { Navigate, createBrowserRouter } from 'react-router-dom';
import { SiteChrome } from '../components/layout/SiteChrome';
import { LoginPage, RegisterPage } from '../features/auth/AuthPages';
import { CustomerHome } from '../features/customer/CustomerHome';
import { LandingPage } from '../features/customer/LandingPage';
import {
  AdminBranches,
  AdminCommission,
  AdminLayout,
  AdminList,
  AdminOverview,
  AdminPayouts,
  AdminPlans,
  AdminRefunds,
  AdminSalons,
  AdminTickets,
} from '../features/admin-dashboard/pages';
import { AdminMiddlemen } from '../features/admin-dashboard/MiddlemenPage';
import {
  ComparePage,
  CheckoutPage,
  PaymentResultPage,
  PlanDetailPage,
} from '../features/memberships/PlanPages';
import {
  MembershipsPage,
  PassPage,
  ProfilePage,
  RedemptionHistoryPage,
  SupportPage,
} from '../features/memberships/PassPages';
import { DiscoverPage } from '../features/salons/DiscoverPage';
import { SalonDetailPage, ServicesPage } from '../features/salons/SalonDetailPage';
import {
  ActiveMembershipsPage,
  BranchesPage,
  PayoutsPage,
  PlansPage,
  ReportsPage,
  SalonGate,
  SalonLayout,
  SalonOverview,
  SalonProfilePage,
  SalonRedemptionsPage,
  SalesPage,
  ServicesPage as ManageServicesPage,
  SettingsPage,
  StaffPage,
} from '../features/salon-dashboard/pages';
import { useAuth } from '../hooks/useAuth';

function Guard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="p-8">Loading…</main>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="p-8">Loading…</main>;
  if (user?.role === 'PLATFORM_ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'SALON_OWNER' || user?.role === 'SALON_STAFF') return <Navigate to="/salon" replace />;
  if (user) return <CustomerHome />;
  return <LandingPage />;
}

export const router = createBrowserRouter([
  {
    element: <SiteChrome />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/salons', element: <DiscoverPage /> },
      { path: '/salons/:id', element: <SalonDetailPage /> },
      { path: '/salons/:id/services', element: <ServicesPage /> },
      { path: '/plans/:id', element: <PlanDetailPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/checkout/:planId', element: <CheckoutPage /> },
      { path: '/payments/:paymentId/result', element: <Guard><PaymentResultPage /></Guard> },
      { path: '/memberships', element: <Guard roles={['CUSTOMER']}><MembershipsPage /></Guard> },
      { path: '/memberships/:id', element: <Guard><PassPage /></Guard> },
      { path: '/memberships/:id/history', element: <Guard><RedemptionHistoryPage /></Guard> },
      { path: '/profile', element: <Guard><ProfilePage /></Guard> },
      { path: '/support', element: <Guard><SupportPage /></Guard> },
      { path: '/salon', element: <Guard roles={['SALON_OWNER', 'SALON_STAFF']}><SalonGate /></Guard> },
      {
        path: '/salon/:salonId',
        element: <Guard roles={['SALON_OWNER', 'SALON_STAFF']}><SalonLayout /></Guard>,
        children: [
          { index: true, element: <SalonOverview /> },
          { path: 'profile', element: <SalonProfilePage /> },
          { path: 'branches', element: <BranchesPage /> },
          { path: 'services', element: <ManageServicesPage /> },
          { path: 'plans', element: <PlansPage source="STYLIO_CREATED" /> },
          { path: 'existing', element: <PlansPage source="EXISTING" /> },
          { path: 'memberships', element: <ActiveMembershipsPage /> },
          { path: 'redemptions', element: <SalonRedemptionsPage /> },
          { path: 'sales', element: <SalesPage /> },
          { path: 'payouts', element: <PayoutsPage /> },
          { path: 'staff', element: <StaffPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      {
        path: '/admin',
        element: <Guard roles={['PLATFORM_ADMIN']}><AdminLayout /></Guard>,
        children: [
          { index: true, element: <AdminOverview /> },
          { path: 'salons', element: <AdminSalons /> },
          { path: 'branches', element: <AdminBranches /> },
          { path: 'plans', element: <AdminPlans /> },
          { path: 'customers', element: <AdminList title="Customers" path="/admin/users?status=CUSTOMER" /> },
          { path: 'memberships', element: <AdminList title="Memberships" path="/admin/memberships" /> },
          { path: 'payments', element: <AdminList title="Payments" path="/admin/payments" /> },
          { path: 'refunds', element: <AdminRefunds /> },
          { path: 'commission', element: <AdminCommission /> },
          { path: 'middlemen', element: <AdminMiddlemen /> },
          { path: 'payouts', element: <AdminPayouts /> },
          { path: 'reserves', element: <AdminList title="Reserves" path="/admin/reserves" /> },
          { path: 'redemptions', element: <AdminList title="Redemptions" path="/admin/redemptions" /> },
          { path: 'tickets', element: <AdminTickets /> },
        ],
      },
    ],
  },
]);
