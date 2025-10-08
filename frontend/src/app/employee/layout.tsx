import "./employee.css";
import Link from "next/link";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="employee-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">Logo</div>

        {/* Main Section */}
        <div className="menu">
          <p className="menu-title">MAIN</p>
          <ul>
            <li><Link href="/employee/dashboard">Dashboard</Link></li>
            <li><Link href="/employee/inventory">Inventory</Link></li>
            <li><Link href="/employee/stock-management">Stock Management</Link></li>
            <li><Link href="/employee/alerts">Alerts</Link></li>
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
  );
}
