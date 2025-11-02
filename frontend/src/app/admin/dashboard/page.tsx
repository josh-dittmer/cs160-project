"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { listUsers, listItems, listOrders, getAuditLogStats } from '@/lib/api/admin';
import Link from 'next/link';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
    lowStockItems: 0,
    adminCount: 0,
    employeeCount: 0,
    managerCount: 0,
    customerCount: 0,
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    auditLogsLast24h: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const users = await listUsers(token);
        
        // Fetch all items (active and inactive)
        const items = await listItems(token, { status: 'all', limit: 200 });
        
        // Fetch orders
        const orders = await listOrders(token, { limit: 200 });
        
        // Fetch audit log stats
        const auditStats = await getAuditLogStats(token);
        
        // Calculate stats
        const roleCount = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setStats({
          totalUsers: users.length,
          totalItems: items.length,
          activeItems: items.filter(item => item.is_active).length,
          inactiveItems: items.filter(item => !item.is_active).length,
          lowStockItems: items.filter(item => item.stock_qty <= 10 && item.is_active).length,
          adminCount: roleCount['admin'] || 0,
          employeeCount: roleCount['employee'] || 0,
          managerCount: roleCount['manager'] || 0,
          customerCount: roleCount['customer'] || 0,
          totalOrders: orders.length,
          pendingOrders: orders.filter(order => !order.is_delivered).length,
          deliveredOrders: orders.filter(order => order.is_delivered).length,
          auditLogsLast24h: auditStats.logs_last_24h,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { text: string; border: string }> = {
      black: { text: 'text-gray-900', border: 'border-gray-900' },
      yellow: { text: 'text-yellow-600', border: 'border-yellow-500' },
      red: { text: 'text-red-600', border: 'border-red-500' },
      green: { text: 'text-green-600', border: 'border-green-500' },
      blue: { text: 'text-blue-600', border: 'border-blue-500' },
    };
    return colorMap[color] || colorMap.black;
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'black', link: '/admin/users' },
    { label: 'Total Orders', value: stats.totalOrders, color: 'black', link: '/admin/orders' },
    { label: 'Total Items', value: stats.totalItems, color: 'black', link: '/admin/inventory?status=all' },
    { label: 'Active Items', value: stats.activeItems, color: 'black', link: '/admin/inventory?status=active' },
    { label: 'Low Stock Items', value: stats.lowStockItems, color: stats.lowStockItems >= 1 ? 'yellow' : 'black', link: '/admin/inventory?lowStock=true' },
  ];

  const orderCards = [
    { label: 'Total Orders', value: stats.totalOrders, color: 'black', link: '/admin/orders' },
    { label: 'Pending Delivery', value: stats.pendingOrders, color: 'black', link: '/admin/orders?status=pending' },
    { label: 'Delivered', value: stats.deliveredOrders, color: 'black', link: '/admin/orders?status=delivered' },
  ];

  const userRoleCards = [
    { label: 'Admins', value: stats.adminCount, color: 'black', role: 'admin' },
    { label: 'Employees', value: stats.employeeCount, color: 'black', role: 'employee' },
    { label: 'Managers', value: stats.managerCount, color: 'black', role: 'manager' },
    { label: 'Customers', value: stats.customerCount, color: 'black', role: 'customer' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard Overview
        </h2>
        <p className="text-gray-600">
          Welcome to the admin dashboard. Manage users and inventory from here.
        </p>
      </div>

      {/* Main Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          System Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => {
            const colors = getColorClasses(stat.color);
            return (
              <Link
                key={stat.label}
                href={stat.link}
                className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 ${colors.border}`}
              >
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${colors.text}`}>
                  {stat.value}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Order Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Order Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orderCards.map((stat) => {
            const colors = getColorClasses(stat.color);
            return (
              <Link
                key={stat.label}
                href={stat.link}
                className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105 border-l-4 ${colors.border} cursor-pointer`}
              >
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${colors.text}`}>
                  {stat.value}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Roles Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          User Roles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userRoleCards.map((stat) => {
            const colors = getColorClasses(stat.color);
            return (
              <Link
                key={stat.label}
                href={`/admin/users?role=${stat.role}`}
                className={`bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105 border-l-4 ${colors.border} cursor-pointer`}
              >
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${colors.text}`}>
                  {stat.value}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/users"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              Manage Users
            </h4>
            <p className="text-sm text-gray-600">
              View, promote, demote, and block users
            </p>
          </Link>
          <Link
            href="/admin/orders"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              Manage Orders
            </h4>
            <p className="text-sm text-gray-600">
              View and update order delivery status
            </p>
          </Link>
          <Link
            href="/admin/inventory"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              Manage Inventory
            </h4>
            <p className="text-sm text-gray-600">
              Add, edit, or remove items from the catalog
            </p>
          </Link>
          <Link
            href="/home/dashboard"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
          >
            <h4 className="font-semibold text-gray-900 mb-2">
              Customer View
            </h4>
            <p className="text-sm text-gray-600">
              Preview the customer experience
            </p>
          </Link>
          <Link
            href="/admin/audit-logs"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all hover:scale-105"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">
                Audit Logs
              </h4>
              <span className="text-xl font-bold text-blue-600">
                {stats.auditLogsLast24h}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {stats.auditLogsLast24h} actions in last 24 hours
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

