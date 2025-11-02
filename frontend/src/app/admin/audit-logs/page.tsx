"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { listAuditLogs, type AuditLog, type AuditLogFilters } from '@/lib/api/admin';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [actorEmailFilter, setActorEmailFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const filters: AuditLogFilters = {
          limit: logsPerPage,
          offset: (currentPage - 1) * logsPerPage,
        };

        if (actionTypeFilter) filters.action_type = actionTypeFilter;
        if (actorEmailFilter) filters.actor_email = actorEmailFilter;
        if (targetTypeFilter) filters.target_type = targetTypeFilter;
        
        // For from_date: start of selected day in local timezone, then convert to UTC
        if (fromDateFilter) {
          const fromDate = new Date(fromDateFilter);
          fromDate.setHours(0, 0, 0, 0); // Start of day
          filters.from_date = fromDate.toISOString();
        }
        
        // For to_date: END of selected day in local timezone, then convert to UTC
        if (toDateFilter) {
          const toDate = new Date(toDateFilter);
          toDate.setHours(23, 59, 59, 999); // End of day
          filters.to_date = toDate.toISOString();
        }

        const data = await listAuditLogs(token, filters);
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setError('Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, currentPage, actionTypeFilter, actorEmailFilter, targetTypeFilter, fromDateFilter, toDateFilter]);

  const formatDate = (dateString: string) => {
    // Ensure the timestamp is treated as UTC by appending 'Z' if missing
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(utcString);
    
    // Format in user's local timezone with timezone name
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short', // Shows PST, EST, etc.
    });
  };

  const parseDetails = (detailsJson: string | null) => {
    if (!detailsJson) return null;
    try {
      return JSON.parse(detailsJson);
    } catch {
      return detailsJson;
    }
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('created') || actionType.includes('registered')) {
      return 'text-green-600';
    }
    if (actionType.includes('deleted') || actionType.includes('removed') || actionType.includes('blocked')) {
      return 'text-red-600';
    }
    if (actionType.includes('updated') || actionType.includes('changed')) {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  const clearFilters = () => {
    setActionTypeFilter('');
    setActorEmailFilter('');
    setTargetTypeFilter('');
    setFromDateFilter('');
    setToDateFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h1>
        <p className="text-gray-600">
          Complete audit trail of all database modifications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor Email
            </label>
            <input
              type="text"
              value={actorEmailFilter}
              onChange={(e) => setActorEmailFilter(e.target.value)}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Type
            </label>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            >
              <option value="">All</option>
              <option value="user">User</option>
              <option value="item">Item</option>
              <option value="order">Order</option>
              <option value="cart">Cart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <input
              type="text"
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
              placeholder="e.g., item_created"
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDateFilter}
              onChange={(e) => setFromDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-600">No audit logs found</div>
      ) : (
        <>
          {/* Logs table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => {
                    const details = parseDetails(log.details);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {log.actor_email || 'System'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${getActionColor(log.action_type)}`}>
                          {log.action_type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {log.target_type} #{log.target_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {details ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:underline">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Page {currentPage} • Showing {logs.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={logs.length < logsPerPage}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

