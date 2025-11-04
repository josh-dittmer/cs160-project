"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { 
  listUsers, 
  updateUserRole, 
  blockUser, 
  managerUpdateUserRole,
  managerBlockUser,
  createReferral,
  type UserAdmin 
} from '@/lib/api/admin';
import { useSearchParams, useRouter } from 'next/navigation';

export default function UsersManagement() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralUser, setReferralUser] = useState<UserAdmin | null>(null);
  const [referralReason, setReferralReason] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  useEffect(() => {
    // Set filter from URL parameter if present
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setFilter(roleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await listUsers(token);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!token) return;
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      if (isManager) {
        await managerUpdateUserRole(token, userId, newRole);
      } else {
        await updateUserRole(token, userId, newRole);
      }
      alert('User role updated successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      alert(error.message || 'Failed to update user role');
    }
  };

  const handleBlockToggle = async (userId: number, currentStatus: boolean) => {
    if (!token) return;
    
    const action = currentStatus ? 'block' : 'unblock';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      if (isManager) {
        await managerBlockUser(token, userId, !currentStatus);
      } else {
        await blockUser(token, userId, !currentStatus);
      }
      alert(`User ${action}ed successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      alert(error.message || `Failed to ${action} user`);
    }
  };

  const handleReferForManager = (user: UserAdmin) => {
    setReferralUser(user);
    setShowReferralModal(true);
  };

  const handleSubmitReferral = async () => {
    if (!token || !referralUser || !referralReason.trim() || referralReason.length < 20) {
      alert('Please provide a reason (minimum 20 characters)');
      return;
    }

    try {
      setSubmittingReferral(true);
      await createReferral(token, referralUser.id, referralReason);
      alert('Referral created successfully!');
      setShowReferralModal(false);
      setReferralUser(null);
      setReferralReason('');
      router.push('/admin/referrals');
    } catch (error: any) {
      console.error('Failed to create referral:', error);
      alert(error.message || 'Failed to create referral');
    } finally {
      setSubmittingReferral(false);
    }
  };

  // Helper to check if manager can modify this user
  const canManagerModifyUser = (user: UserAdmin): boolean => {
    if (!isManager) return true; // Admin can modify anyone
    // Manager cannot modify admins, managers, or themselves
    return user.role !== 'admin' && user.role !== 'manager' && user.id !== currentUser?.id;
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    if (filter === 'active') return user.is_active;
    if (filter === 'blocked') return !user.is_active;
    return user.role === filter;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-indigo-100 text-indigo-800';
      case 'customer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            User Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage user roles and access
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Total: {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by:
        </label>
        <div className="flex flex-wrap gap-2">
          {['all', 'admin', 'manager', 'employee', 'customer', 'active', 'blocked'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || 'No name'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.role === 'admin' || (isManager && user.role === 'manager') ? (
                    // Display admin/manager role as badge (non-editable)
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  ) : (isManager && user.role === 'customer') ? (
                    // Manager can only promote customers to employees
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        Customer
                      </span>
                      <button
                        onClick={() => handleRoleChange(user.id, 'employee')}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Promote to Employee
                      </button>
                    </div>
                  ) : (isManager && user.role === 'employee') ? (
                    // Show employee badge with "Refer for Manager" button
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor('employee')}`}>
                        Employee
                      </span>
                      <button
                        onClick={() => handleReferForManager(user)}
                        className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Refer for Manager
                      </button>
                    </div>
                  ) : (
                    // Admin can change roles freely
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.id === currentUser?.id}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)} ${
                        user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <option value="manager">Manager</option>
                      <option value="employee">Employee</option>
                      <option value="customer">Customer</option>
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {canManagerModifyUser(user) ? (
                    <button
                      onClick={() => handleBlockToggle(user.id, user.is_active)}
                      disabled={user.id === currentUser?.id}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        user.is_active
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      } ${
                        user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {user.is_active ? 'Block' : 'Unblock'}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">No access</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Referral Modal */}
      {showReferralModal && referralUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Refer {referralUser.full_name || referralUser.email} for Manager
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Employee: <span className="font-medium">{referralUser.email}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Promotion (minimum 20 characters)
                </label>
                <textarea
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="Explain why this employee should be promoted to manager..."
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {referralReason.length} / 20 characters minimum
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitReferral}
                disabled={submittingReferral || referralReason.length < 20}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submittingReferral ? 'Submitting...' : 'Submit Referral'}
              </button>
              <button
                onClick={() => {
                  setShowReferralModal(false);
                  setReferralUser(null);
                  setReferralReason('');
                }}
                disabled={submittingReferral}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

