"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { listItems } from "@/lib/api/employee";
import "./dashboard.css";

export default function DashboardPage() {
  const { user, token, isReady } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    if (user && !['employee', 'manager', 'admin'].includes(user.role)) {
      router.push('/home/dashboard');
      return;
    }

    loadStats();
  }, [isReady, token, user, router]);

  const loadStats = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const items = await listItems(token, { status: 'all', limit: 200 });
      
      const lowStockItems = items.filter(item => item.stock_qty > 0 && item.stock_qty <= 10);
      const outOfStockItems = items.filter(item => item.stock_qty === 0);

      setStats({
        totalItems: items.length,
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Query Inventory", href: "/employee/inventory" },
    { label: "Update Stock Quantity", href: "/employee/stock-management" },
    { label: "View Orders", href: "/employee/orders" },
    { label: "View Stock Alerts", href: "/employee/alerts" },
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="welcome-text">
        Welcome, {user?.full_name || user?.email || 'Employee'}
      </h1>
      <p className="role-text">Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee'}</p>

      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Items</h3>
          <p className="stat-value">{stats.totalItems}</p>
        </div>
        <div className="stat-card stat-warning">
          <h3>Low Stock Items</h3>
          <p className="stat-value">{stats.lowStock}</p>
        </div>
        <div className="stat-card stat-danger">
          <h3>Out of Stock</h3>
          <p className="stat-value">{stats.outOfStock}</p>
        </div>
      </div>

      <h2 className="subheading">Quick Actions:</h2>

      <div className="actions-container">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="action-btn"
            onClick={() => router.push(action.href)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
