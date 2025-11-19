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
    
    // Managers cannot change any user roles (new requirement)
    if (isManager) {
      alert('Managers do not have permission to change user roles');
      return;
    }
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    let managerId: number | undefined = undefined;
    
    // Check if demoting a manager (to employee OR customer)
    if (targetUser.role === 'manager' && (newRole === 'employee' || newRole === 'customer') && isAdmin) {
      const availableManagers = users.filter(u => u.role === 'manager' && u.id !== userId);
      
      // Check if this manager has subordinates
      const subordinates = users.filter(u => u.reports_to === userId);
      
      // If no other managers exist, check what we can do
      if (availableManagers.length === 0) {
        if (subordinates.length > 0) {
          // Has subordinates - cannot demote at all (neither to employee nor customer)
          alert(
            'WARNING: Cannot Demote Last Manager\n\n' +
            'This is the only manager in the system and they have ' + subordinates.length + ' subordinate(s). ' +
            'You cannot demote them until:\n\n' +
            '• Promote another user to manager first (so subordinates can be reassigned)'
          );
          return;
        } else if (newRole === 'employee') {
          // No subordinates - can become customer but not employee
          alert(
            'WARNING: Cannot Demote Last Manager to Employee\n\n' +
            'This is the only manager in the system. You cannot demote them to employee ' +
            '(employees need a manager to report to).\n\n' +
            'To proceed, either:\n' +
            '• Promote another user to manager first, or\n' +
            '• Change their role to customer instead (customers don\'t need a manager)'
          );
          return;
        }
        // If becoming customer with no subordinates, allow it (continue to normal flow)
      }
      
      if (subordinates.length > 0) {
        // Manager has subordinates and there ARE other managers - need to reassign them
        
        // Initialize subordinate assignments with first available manager as default
        const initialAssignments: Record<number, number> = {};
        subordinates.forEach(sub => {
          initialAssignments[sub.id] = availableManagers[0].id;
        });
        
        console.log('=== Setting up Manager Demotion Modal ===');
        console.log('Target Role:', newRole);
        console.log('Subordinates found:', subordinates.length);
        console.log('Subordinates:', subordinates.map(s => ({ id: s.id, email: s.email })));
        console.log('Initial Assignments:', initialAssignments);
        console.log('Available Managers:', availableManagers.map(m => ({ id: m.id, email: m.email })));
        
        // Show modal to select manager for ex-manager (if becoming employee) and reassign subordinates
        setManagerSelectData({
          userId,
          oldRole: targetUser.role,
          newRole,
          availableManagers,
          subordinates: subordinates.length > 0 ? subordinates : undefined,
          initialAssignments
        });
        setSubordinateAssignments(initialAssignments);
        // For employee demotion, we need to select where the demoted manager will report to
        // For customer demotion, we don't need this, but we still need to set it for the modal
        setSelectedManagerId(newRole === 'employee' ? availableManagers[0].id : null);
        setShowManagerSelectModal(true);
        return; // Exit here, will continue in handleManagerSelectConfirm
      } else if (newRole === 'employee' && availableManagers.length > 0) {
        // No subordinates, but demoting to employee still needs manager assignment
        setManagerSelectData({
          userId,
          oldRole: targetUser.role,
          newRole,
          availableManagers
        });
        setSelectedManagerId(availableManagers[0].id);
        setShowManagerSelectModal(true);
        return;
      }
      // If demoting to customer with no subordinates, continue to normal flow
    }
    
    // Check if trying to promote to employee when no managers exist
    if (newRole === 'employee' && targetUser.role !== 'manager' && isAdmin) {
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
      // Only admins should reach this point due to earlier checks
      await updateUserRole(token, userId, newRole, managerId);
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
    if (!token || !managerSelectData) return;
    
    // For employee role, we need a manager selected
    if (managerSelectData.newRole === 'employee' && selectedManagerId === null) {
      alert('Please select a manager');
      return;
    }
    
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
      
      console.log('=== FRONTEND: Role Change ===');
      console.log('User ID:', managerSelectData.userId);
      console.log('Old Role:', managerSelectData.oldRole);
      console.log('New Role:', managerSelectData.newRole);
      console.log('Selected Manager ID:', selectedManagerId);
      console.log('Initial Assignments:', managerSelectData.initialAssignments);
      console.log('User Changed Assignments:', subordinateAssignments);
      console.log('Final Subordinate Reassignments to send:', subordinateReassignments);
      
      // For customer demotion, don't pass manager_id (undefined)
      // For employee, pass the selected manager (convert null to undefined if needed)
      const managerIdToSend = managerSelectData.newRole === 'employee' 
        ? (selectedManagerId !== null ? selectedManagerId : undefined)
        : undefined;
      
      await updateUserRole(
        token, 
        managerSelectData.userId, 
        managerSelectData.newRole, 
        managerIdToSend,
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
                    {isManager || user.role === 'admin' || user.id === currentUser?.id ? (
                      // Managers cannot change roles (new requirement)
                      // Display all roles as badge (non-editable for managers or when viewing admin/self)
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    ) : (
                      // Admin can change roles freely (except to admin, except for themselves)
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)} cursor-pointer`}
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
              {managerSelectData.oldRole === 'manager' && managerSelectData.newRole === 'employee' 
                ? 'Demote Manager to Employee'
                : managerSelectData.oldRole === 'manager' && managerSelectData.newRole === 'customer'
                ? 'Demote Manager to Customer'
                : 'Select Manager for Employee'
              }
            </h3>
            
            <div className="space-y-6">
              {/* Subordinates Section (only shown when demoting manager with subordinates) */}
              {managerSelectData.subordinates && managerSelectData.subordinates.length > 0 && (
                <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    Reassign Subordinates
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
              
              {/* Manager Selection for the demoted user or new employee (NOT for customer demotion) */}
              {managerSelectData.newRole === 'employee' && (
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
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleManagerSelectConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {managerSelectData.oldRole === 'manager' 
                  ? `Confirm Demotion to ${managerSelectData.newRole.charAt(0).toUpperCase() + managerSelectData.newRole.slice(1)}`
                  : 'Confirm'
                }
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

