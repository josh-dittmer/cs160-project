"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import {
  listReferrals,
  listMyReferrals,
  approveReferral,
  rejectReferral,
  cancelReferral,
  createReferral,
  listUsers,
  type ReferralOut,
  type UserAdmin,
} from '@/lib/api/admin';

export default function ReferralsPage() {
  const { token, user } = useAuth();
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // For manager - create referral
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employees, setEmployees] = useState<UserAdmin[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [referralReason, setReferralReason] = useState('');
  
  // For admin - review notes
  const [reviewingReferralId, setReviewingReferralId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!token) return;
    fetchReferrals();
  }, [token, user?.role]);

  const fetchReferrals = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (isAdmin) {
        // Admin sees all pending referrals
        const data = await listReferrals(token, { status_filter: 'pending' });
        setReferrals(data);
      } else if (isManager) {
        // Manager sees their own referrals
        const data = await listMyReferrals(token);
        setReferrals(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    
    try {
      const users = await listUsers(token);
      const employeeUsers = users.filter(u => u.role === 'employee' && u.is_active);
      setEmployees(employeeUsers);
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleApprove = async (referralId: number) => {
    if (!token) return;
    
    try {
      setActionLoading(referralId);
      await approveReferral(token, referralId, adminNotes || undefined);
      await fetchReferrals();
      setReviewingReferralId(null);
      setAdminNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to approve referral');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (referralId: number) => {
    if (!token) return;
    
    try {
      setActionLoading(referralId);
      await rejectReferral(token, referralId, adminNotes || undefined);
      await fetchReferrals();
      setReviewingReferralId(null);
      setAdminNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to reject referral');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (referralId: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to cancel this referral?')) return;
    
    try {
      setActionLoading(referralId);
      await cancelReferral(token, referralId);
      await fetchReferrals();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel referral');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateReferral = async () => {
    if (!token || !selectedEmployee || !referralReason.trim()) {
      alert('Please select an employee and provide a reason (minimum 20 characters)');
      return;
    }

    if (referralReason.length < 20) {
      alert('Reason must be at least 20 characters long');
      return;
    }
    
    try {
      setActionLoading(-1);
      await createReferral(token, selectedEmployee, referralReason);
      await fetchReferrals();
      setShowCreateModal(false);
      setSelectedEmployee(null);
      setReferralReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to create referral');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    fetchEmployees();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading referrals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Review Promotion Referrals' : 'My Referrals'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin 
              ? 'Review and approve employee-to-manager promotion requests' 
              : 'Refer employees for promotion to manager'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Referral
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {referrals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">
            {isAdmin ? 'No pending referrals to review' : 'You haven\'t created any referrals yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {referrals.map((referral) => (
            <div key={referral.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {referral.referred_user_name || referral.referred_user_email}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      referral.status === 'approved' ? 'bg-green-100 text-green-800' :
                      referral.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {referral.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {referral.referred_user_email}
                  </p>
                  
                  {isAdmin && (
                    <p className="text-sm text-gray-600 mb-2">
                      Referred by: <span className="font-medium">{referral.referring_manager_email}</span>
                    </p>
                  )}
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Reason for promotion:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{referral.reason}</p>
                  </div>
                  
                  {referral.admin_notes && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{referral.admin_notes}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    Created: {new Date(referral.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="ml-4 flex flex-col gap-2">
                  {isAdmin && referral.status === 'pending' && (
                    <>
                      {reviewingReferralId === referral.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Optional notes..."
                            className="w-64 px-3 py-2 border rounded-md text-sm"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(referral.id)}
                              disabled={actionLoading === referral.id}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                            >
                              {actionLoading === referral.id ? 'Approving...' : 'Confirm Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(referral.id)}
                              disabled={actionLoading === referral.id}
                              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                              {actionLoading === referral.id ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setReviewingReferralId(null);
                              setAdminNotes('');
                            }}
                            className="w-full px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setReviewingReferralId(referral.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setReviewingReferralId(referral.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </>
                  )}
                  
                  {isManager && referral.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(referral.id)}
                      disabled={actionLoading === referral.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === referral.id ? 'Cancelling...' : 'Cancel Referral'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Referral Modal (Manager only) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Promotion Referral</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee || ''}
                  onChange={(e) => setSelectedEmployee(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.email} ({emp.email})
                    </option>
                  ))}
                </select>
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
                onClick={handleCreateReferral}
                disabled={actionLoading === -1 || !selectedEmployee || referralReason.length < 20}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === -1 ? 'Creating...' : 'Create Referral'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedEmployee(null);
                  setReferralReason('');
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

