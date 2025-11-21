"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'admin' && user?.role !== 'manager') {
      // Redirect non-admin/non-manager users to customer dashboard
      router.push('/home/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'manager')) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Determine panel title and path prefix based on role
  const panelTitle = user?.role === 'admin' ? 'Admin Panel' : 'Manager Panel';
  const pathPrefix = user?.role === 'admin' ? '/admin' : '/manager';

  // Navigation items with dynamic path prefix
  const navItems = [
    { name: 'Dashboard', href: `${pathPrefix}/dashboard` },
    { name: 'Users', href: `${pathPrefix}/users` },
    { name: 'Inventory', href: `${pathPrefix}/inventory` },
    { name: 'Orders', href: `${pathPrefix}/orders` },
    { name: 'Audit Logs', href: `${pathPrefix}/audit-logs` },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-white">
      <Toaster position="top-right" />
      {/* Admin Header */}
      <header className="bg-white dark:bg-white shadow border-b">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-6">
              {/* OFS Logo */}
              <Link href={`${pathPrefix}/dashboard`} className="flex items-center">
                <img
                  src="/logo.png"
                  alt="OFS Logo"
                  className="h-14 w-auto cursor-pointer"
                />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-900">
                {panelTitle}
              </h1>
              <nav className="flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-blue-100 dark:bg-blue-100 text-blue-700 dark:text-blue-700'
                        : 'text-gray-700 dark:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/home/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                View as Customer
              </Link>
              <div className="text-sm text-gray-700 dark:text-gray-700">
                {user?.email}
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

