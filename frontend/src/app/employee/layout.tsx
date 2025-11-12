'use client';
import "./employee.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";

function EmployeeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  return (
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
            <li><Link href="/employee/orders">Orders</Link></li>
            <li><Link href="/employee/alerts">Alerts</Link></li>
          </ul>

          {user && (
            <div className="user-info" style={{ padding: '1rem', marginTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Logged in as</p>
              <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user.full_name || user.email}</p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{user.role}</p>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="signout-container">
          <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeLayoutContent>{children}</EmployeeLayoutContent>;
}
