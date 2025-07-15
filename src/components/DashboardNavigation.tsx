'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';
import { 
  MdDashboard, 
  MdInventory, 
  MdSettings,
  MdPerson,
  MdCalendarToday,
  MdBuild,
  MdHistory,
  MdStore,
  MdAssessment,
  MdMenu,
  MdClose,
  MdNotifications,
  MdAdminPanelSettings,
  MdAnalytics
} from 'react-icons/md';

export default function DashboardNavigation() {
  const { user } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: MdDashboard },
    { name: 'Inventory', href: '/inventory', icon: MdInventory },
    { name: 'Kalibrasi', href: '/calibrations', icon: MdCalendarToday },
    { name: 'Maintenance', href: '/maintenance', icon: MdBuild },
    { name: 'Rental', href: '/rentals', icon: MdStore },
    { name: 'Notifikasi', href: '/notifications', icon: MdNotifications },
    ...(isAdmin ? [{ name: 'Reports', href: '/reports', icon: MdAssessment }] : []),
    ...(isAdmin ? [{ name: 'Users', href: '/users', icon: MdPerson }] : []),
    ...(isAdmin ? [{ name: 'Vendors', href: '/vendors', icon: MdStore }] : []),
    { name: 'Activity Log', href: '/activity', icon: MdHistory },
    { name: 'Settings', href: '/settings', icon: MdSettings },
  ];

  // Admin-specific navigation items
  const adminNavigation = isAdmin ? [
    { name: 'Admin Panel', href: '/admin', icon: MdAdminPanelSettings },
    { name: 'Analytics', href: '/admin/analytics', icon: MdAnalytics },
  ] : [];

  return (
    <nav className="bg-white border-r border-gray-200 w-64 h-screen hidden md:block">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2 font-medium">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center p-2 rounded-lg group ${
                  pathname === item.href
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 transition duration-75" />
                <span className="ml-3">{item.name}</span>
              </Link>
            </li>
          ))}
          
          {/* Admin Section */}
          {isAdmin && adminNavigation.length > 0 && (
            <>
              <li className="pt-4 mt-4 border-t border-gray-200">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                  Admin Panel
                </div>
              </li>
              {adminNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-2 rounded-lg group ${
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5 transition duration-75" />
                    <span className="ml-3">{item.name}</span>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
      
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-40 w-full bg-white border-b border-gray-200 p-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          {mobileMenuOpen ? (
            <MdClose className="w-6 h-6" />
          ) : (
            <MdMenu className="w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 z-30 w-full h-screen bg-white">
          <div className="px-3 py-4 overflow-y-auto">
            <ul className="space-y-2 font-medium">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center p-2 rounded-lg group ${
                      pathname === item.href
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5 transition duration-75" />
                    <span className="ml-3">{item.name}</span>
                  </Link>
                </li>
              ))}
              
              {/* Admin Section for Mobile */}
              {isAdmin && adminNavigation.length > 0 && (
                <>
                  <li className="pt-4 mt-4 border-t border-gray-200">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                      Admin Panel
                    </div>
                  </li>
                  {adminNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`flex items-center p-2 rounded-lg group ${
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                            ? 'bg-green-50 text-green-700'
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="w-5 h-5 transition duration-75" />
                        <span className="ml-3">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
} 