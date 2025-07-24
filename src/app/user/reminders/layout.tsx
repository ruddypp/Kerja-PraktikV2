import DashboardLayout from '@/components/DashboardLayout';

export default function UserRemindersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 