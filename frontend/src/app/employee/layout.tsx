'use client';
import "./employee.css";
import Link from "next/link";
import { AlertsProvider, useAlerts } from "@/lib/alerts/alerts-context";
import AlertsModal from "@/components/alerts/alert_modal";

function AlertsNavItem() {
  const { openWith, flaggedItems } = useAlerts();

  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          // Use the flagged items from context so client-side flags show immediately
          openWith(flaggedItems);
        }}
      >
        Alerts
      </a>
    </li>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlertsProvider>
    <div className="employee-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <img 
            src="/logo.png" 
            alt="OFS Logo" 
            style={{ width: '100%', height: 'auto', maxWidth: '180px' }}
          />
        </div>

        {/* Main Section */}
        <div className="menu">
          <p className="menu-title">MAIN</p>
          <ul>
            <li><Link href="/employee/dashboard">Dashboard</Link></li>
            <li><Link href="/employee/inventory">Inventory</Link></li>
            <li><Link href="/employee/stock-management">Stock Management</Link></li>
            <AlertsNavItem />
          </ul>

          <p className="menu-title">SETTINGS</p>
          <ul>
            <li><Link href="/employee/notification">Notification</Link></li>
            <li><Link href="/employee/settings">Settings</Link></li>
          </ul>
        </div>

        {/* Sign Out Button */}
        <div className="signout-container">
          <button className="signout-btn">Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
    <AlertsModal />
    </AlertsProvider>
  );
}
