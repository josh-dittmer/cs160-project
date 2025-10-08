"use client";

import "./dashboard.css";

export default function DashboardPage() {
    // TODO: 1) navigate to the selected page, based on the pages exit
    //       2) Add employee's information(when employees/managers login)
    //       3) Implement functionality: search, left side bar(dashboard, inventory) and buttons to the right page
  const quickActions = [
    "Query Inventory",
    "Update Quantity",
    "Mark Out of Stock",
    "View Low-Stock Alerts",
    "Flag Damaged Item",
  ];

  return (
    <div className="dashboard">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search..."
          className="search-bar"
        />
      </div>

      <h1 className="welcome-text">Welcome, name</h1>
      <h2 className="subheading">Quick Actions:</h2>

      <div className="actions-container">
        {quickActions.map((action) => (
          <button key={action} className="action-btn">
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
