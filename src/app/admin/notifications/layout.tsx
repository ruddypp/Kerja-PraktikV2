import DashboardLayout from '@/components/DashboardLayout';

export default function AdminNotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 