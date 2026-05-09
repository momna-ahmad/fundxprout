import OwnerRouteGuard from '@/components/Owner/RouteGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <OwnerRouteGuard>{children}</OwnerRouteGuard>;
}
