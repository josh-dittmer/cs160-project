"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { 
  listUsers, 
  updateUserRole, 
  blockUser,
  updateEmployeeManager,
  managerUpdateUserRole,
  managerBlockUser,
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
  
  // Manager selection modal state
  const [showManagerSelectModal, setShowManagerSelectModal] = useState(false);
  const [managerSelectData, setManagerSelectData] = useState<{
    userId: number;
    oldRole: string;
    newRole: string;
    availableManagers: UserAdmin[];
    subordinates?: UserAdmin[];
    initialAssignments?: Record<number, number>;
  } | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [subordinateAssignments, setSubordinateAssignments] = useState<Record<number, number>>({});

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  useEffect(() => {
    // Set filter from URL parameter if present
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setFilter(roleParam);
    }
  }, [searchParams]);

  // Debug: Log when subordinateAssignments changes
  useEffect(() => {
    if (Object.keys(subordinateAssignments).length > 0) {
      console.log('Subordinate Assignments State Updated:', subordinateAssignments);
    }
  }, [subordinateAssignments]);

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
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    let managerId: number | undefined = undefined;
    
    // Check if trying to promote to employee when no managers exist
    if (newRole === 'employee' && isAdmin) {
      const hasManagers = users.some(u => u.role === 'manager');
      
      if (!hasManagers) {
        // Show informational popup and offer to promote to manager instead
        const shouldPromoteToManager = confirm(
          '📋 First Hire Guideline\n\n' +
          'You\'re about to hire your first team member! Since no managers exist yet, ' +
          'the first hire should be a manager who can later supervise employees.\n\n' +
          '👉 Would you like to promote this user to "Manager" instead?\n\n' +
          'Click OK to promote to Manager, or Cancel to abort.'
        );
        
        if (shouldPromoteToManager) {
          // Change the role to manager instead
          newRole = 'manager';
        } else {
          return; // User cancelled
        }
      } else if (targetUser.role === 'manager') {
        // Demoting a manager to employee - need to check for subordinates
        const availableManagers = users.filter(u => u.role === 'manager' && u.id !== userId);
        
        if (availableManagers.length === 0) {
          alert(
            '⚠️ Cannot Demote Last Manager\n\n' +
            'This is the only manager in the system. You cannot demote them to employee.\n\n' +
            'To proceed, either:\n' +
            '• Promote another user to manager first, or\n' +
            '• Change their role to customer instead'
          );
          return;
        }
        
        // Check if this manager has subordinates
        const subordinates = users.filter(u => u.reports_to === userId);
        
        // Initialize subordinate assignments with first available manager as default
        const initialAssignments: Record<number, number> = {};
        subordinates.forEach(sub => {
          initialAssignments[sub.id] = availableManagers[0].id;
        });
        
        console.log('=== Setting up Manager Demotion Modal ===');
        console.log('Subordinates found:', subordinates.length);
        console.log('Subordinates:', subordinates.map(s => ({ id: s.id, email: s.email })));
        console.log('Initial Assignments:', initialAssignments);
        console.log('Available Managers:', availableManagers.map(m => ({ id: m.id, email: m.email })));
        
        // Show modal to select manager and reassign subordinates
        // Store initialAssignments in modal data so it's always available
        setManagerSelectData({
          userId,
          oldRole: targetUser.role,
          newRole,
          availableManagers,
          subordinates: subordinates.length > 0 ? subordinates : undefined,
          initialAssignments
        });
        setSubordinateAssignments(initialAssignments);
        setSelectedManagerId(availableManagers[0].id); // Default to first manager
        setShowManagerSelectModal(true);
        return; // Exit here, will continue in handleManagerSelectConfirm
      } else {
        // Promoting customer to employee - need to select which manager they'll report to
        const availableManagers = users.filter(u => u.role === 'manager' && u.is_active);
        
        // Show modal to select manager
        setManagerSelectData({
          userId,
          oldRole: targetUser.role,
          newRole,
          availableManagers
        });
        setSelectedManagerId(availableManagers[0].id); // Default to first manager
        setShowManagerSelectModal(true);
        return; // Exit here, will continue in handleManagerSelectConfirm
      }
    }
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      if (isManager) {
        await managerUpdateUserRole(token, userId, newRole);
      } else {
        await updateUserRole(token, userId, newRole, managerId);
      }
      alert('User role updated successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      
      // Extract the user-friendly part after the colon for other errors
      const errorMessage = error.message || 'Failed to update user role';
      const friendlyMessage = errorMessage.includes(':') 
        ? errorMessage.split(':').slice(1).join(':').trim()
        : errorMessage;
      alert(friendlyMessage);
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

  const handleManagerSelectConfirm = async () => {
    if (!token || !managerSelectData || selectedManagerId === null) return;
    
    try {
      // If there are subordinates, merge user changes with initial assignments
      let subordinateReassignments: Record<number, number> | undefined = undefined;
      
      if (managerSelectData.subordinates && managerSelectData.subordinates.length > 0) {
        // Start with initial assignments, then apply any user changes
        subordinateReassignments = {
          ...managerSelectData.initialAssignments,
          ...subordinateAssignments
        };
      }
      
      console.log('=== FRONTEND: Demoting Manager ===');
      console.log('User ID:', managerSelectData.userId);
      console.log('New Role:', managerSelectData.newRole);
      console.log('Selected Manager ID:', selectedManagerId);
      console.log('Initial Assignments:', managerSelectData.initialAssignments);
      console.log('User Changed Assignments:', subordinateAssignments);
      console.log('Final Subordinate Reassignments to send:', subordinateReassignments);
      
      await updateUserRole(
        token, 
        managerSelectData.userId, 
        managerSelectData.newRole, 
        selectedManagerId,
        subordinateReassignments
      );
      alert('User role updated successfully');
      setShowManagerSelectModal(false);
      setManagerSelectData(null);
      setSelectedManagerId(null);
      setSubordinateAssignments({});
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      const errorMessage = error.message || 'Failed to update user role';
      const friendlyMessage = errorMessage.includes(':') 
        ? errorMessage.split(':').slice(1).join(':').trim()
        : errorMessage;
      alert(friendlyMessage);
    }
  };

  const handleManagerChange = async (userId: number, newManagerId: number) => {
    if (!token) return;
    
    try {
      await updateEmployeeManager(token, userId, newManagerId);
      await fetchUsers(); // Refresh the user list
    } catch (error: any) {
      console.error('Failed to update employee manager:', error);
      alert(error.message || 'Failed to update employee manager');
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
                Reports To
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
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' || (isManager && (user.role === 'manager' || user.id === currentUser?.id)) ? (
                      // Display admin/manager role as badge (non-editable for managers)
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    ) : isManager ? (
                      // Manager can change between customer and employee
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)} cursor-pointer`}
                      >
                        <option value="customer">Customer</option>
                        <option value="employee">Employee</option>
                      </select>
                    ) : (
                      // Admin can change roles freely (except to admin)
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
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.role === 'employee' && isAdmin ? (
                      // Editable dropdown for employees (admin only)
                      <select
                        value={user.reports_to || ''}
                        onChange={(e) => handleManagerChange(user.id, Number(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                      >
                        {!user.reports_to && <option value="">Select Manager</option>}
                        {users
                          .filter(u => u.role === 'manager' && u.is_active)
                          .map(manager => (
                            <option key={manager.id} value={manager.id}>
                              {manager.full_name || manager.email}
                            </option>
                          ))
                        }
                      </select>
                    ) : user.reports_to ? (
                      // Display only for non-employees or managers
                      (() => {
                        const manager = users.find(u => u.id === user.reports_to);
                        return manager ? (
                          <span className="text-gray-700">
                            {manager.full_name || manager.email}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unknown</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
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

      {/* Manager Selection Modal */}
      {showManagerSelectModal && managerSelectData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {managerSelectData.oldRole === 'manager' ? 'Demote Manager to Employee' : 'Select Manager for Employee'}
            </h3>
            
            <div className="space-y-6">
              {/* Subordinates Section (only shown when demoting manager with subordinates) */}
              {managerSelectData.subordinates && managerSelectData.subordinates.length > 0 && (
                <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    ⚠️ Reassign Subordinates
                  </h4>
                  <p className="text-sm text-gray-700 mb-4">
                    This manager currently has {managerSelectData.subordinates.length} subordinate(s). 
                    Please assign each employee to a new manager before proceeding:
                  </p>
                  
                  <div className="space-y-3">
                    {managerSelectData.subordinates.map((subordinate) => (
                      <div key={subordinate.id} className="bg-white rounded-md p-3 border border-gray-200">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {subordinate.full_name || subordinate.email}
                            </p>
                            <p className="text-xs text-gray-500">{subordinate.email}</p>
                          </div>
                          <div className="flex-1">
                            <select
                              value={subordinateAssignments[subordinate.id] || managerSelectData.initialAssignments?.[subordinate.id] || ''}
                              onChange={(e) => setSubordinateAssignments({
                                ...subordinateAssignments,
                                [subordinate.id]: Number(e.target.value)
                              })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {managerSelectData.availableManagers.map((mgr) => (
                                <option key={mgr.id} value={mgr.id}>
                                  {mgr.full_name || mgr.email}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Manager Selection for the demoted user or new employee */}
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {managerSelectData.oldRole === 'manager' 
                    ? 'Select which manager this user will report to as an employee:'
                    : 'Select which manager this new employee will report to:'
                  }
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reporting Manager:
                  </label>
                  <select
                    value={selectedManagerId || ''}
                    onChange={(e) => setSelectedManagerId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {managerSelectData.availableManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name || mgr.email} ({mgr.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleManagerSelectConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowManagerSelectModal(false);
                  setManagerSelectData(null);
                  setSelectedManagerId(null);
                  setSubordinateAssignments({});
                }}
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

