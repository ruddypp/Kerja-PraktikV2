import DashboardLayout from '@/components/DashboardLayout';

export default function UserNotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 