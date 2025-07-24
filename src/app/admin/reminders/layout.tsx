import DashboardLayout from '@/components/DashboardLayout';

export default function AdminRemindersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 