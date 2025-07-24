import DashboardLayout from '@/components/DashboardLayout';

export default function UsersPerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 