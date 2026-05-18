import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  Plus,
  MoreVertical,
  Mail,
  Shield,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
  adminApi,
  AdminUser,
  PaginatedUsers,
} from '../../api/adminApi';

type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

interface CreateUserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  companyName?: string;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // State for users data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [perPage] = useState(10);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state for new user
  const [newUserForm, setNewUserForm] = useState<CreateUserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'CUSTOMER',
    companyName: '',
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: {
        page: number;
        per_page: number;
        search?: string;
        role?: UserRole;
        isActive?: boolean;
      } = {
        page: currentPage,
        per_page: perPage,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (roleFilter) {
        params.role = roleFilter;
      }

      if (statusFilter === 'active') {
        params.isActive = true;
      } else if (statusFilter === 'inactive') {
        params.isActive = false;
      }

      const response: PaginatedUsers = await adminApi.getUsers(params);
      setUsers(response.items);
      setTotalPages(response.total_pages);
      setTotalUsers(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery, roleFilter, statusFilter]);

  // Fetch users on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // Handle search input with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle role filter
  const handleRoleFilter = (role: UserRole | '') => {
    setRoleFilter(role);
    setShowRoleDropdown(false);
  };

  // Handle status filter
  const handleStatusFilter = (status: 'active' | 'inactive' | '') => {
    setStatusFilter(status);
    setShowStatusDropdown(false);
  };

  // Handle create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userData = {
        ...newUserForm,
        companyName: newUserForm.role === 'VENDOR' ? newUserForm.companyName : undefined,
      };

      await adminApi.createUser(userData);
      setShowAddModal(false);
      setNewUserForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'CUSTOMER',
        companyName: '',
      });
      fetchUsers();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle toggle user status
  const handleToggleStatus = async (user: AdminUser) => {
    try {
      await adminApi.updateUserStatus(user.id, !user.isActive);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
    setActionMenuOpen(null);
  };

  // Handle change user role
  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
    setActionMenuOpen(null);
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
    setActionMenuOpen(null);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get role badge styling
  const getRoleBadge = (role: UserRole) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      VENDOR: 'bg-blue-100 text-blue-800',
      CUSTOMER: 'bg-green-100 text-green-800',
    };
    return styles[role] || 'bg-gray-100 text-gray-800';
  };

  // Get status badge styling
  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="text-sm text-gray-500">Manage all users in the system</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleDropdown(!showRoleDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Shield className="w-5 h-5 text-gray-500" />
              <span>{roleFilter || 'All Roles'}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showRoleDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleRoleFilter('')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  All Roles
                </button>
                <button
                  onClick={() => handleRoleFilter('ADMIN')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  Admin
                </button>
                <button
                  onClick={() => handleRoleFilter('VENDOR')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  Vendor
                </button>
                <button
                  onClick={() => handleRoleFilter('CUSTOMER')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  Customer
                </button>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowRoleDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5 text-gray-500" />
              <span>
                {statusFilter === 'active'
                  ? 'Active'
                  : statusFilter === 'inactive'
                    ? 'Inactive'
                    : 'All Status'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleStatusFilter('')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  All Status
                </button>
                <button
                  onClick={() => handleStatusFilter('active')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  Active
                </button>
                <button
                  onClick={() => handleStatusFilter('inactive')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50"
                >
                  Inactive
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-gray-500">Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
            <p className="text-gray-500">
              {searchQuery || roleFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding a new user'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
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
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user, index) => {
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {user.firstName.charAt(0)}
                              {user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Mail className="w-4 h-4 mr-1" />
                              {user.email}
                            </div>
                            {user.companyName && (
                              <div className="text-xs text-gray-400">
                                {user.companyName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            user.isActive
                          )}`}
                        >
                          {user.isActive ? (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          {actionMenuOpen === user.id && (
                            <div className={`absolute right-0 ${index >= users.length - 2 ? 'bottom-full mb-1' : 'top-full mt-1'} w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20`}>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX className="w-4 h-4 text-red-500" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 text-green-500" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                              <div className="border-t border-gray-100">
                                <div className="px-4 py-2 text-xs text-gray-500 uppercase">
                                  Change Role
                                </div>
                                {(['CUSTOMER', 'VENDOR', 'ADMIN'] as UserRole[]).map(
                                  (role) =>
                                    role !== user.role && (
                                      <button
                                        key={role}
                                        onClick={() => handleChangeRole(user.id, role)}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                        <span>Make {role}</span>
                                      </button>
                                    )
                                )}
                              </div>
                              <div className="border-t border-gray-100">
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  disabled={user.id === currentUser?.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete User</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * perPage + 1} to{' '}
                {Math.min(currentPage * perPage, totalUsers)} of {totalUsers} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSubmitError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="p-6 space-y-4">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newUserForm.firstName}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, firstName: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newUserForm.lastName}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, lastName: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, email: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, password: e.target.value })
                    }
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {newUserForm.role === 'VENDOR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={newUserForm.companyName}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, companyName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showRoleDropdown || showStatusDropdown || actionMenuOpen) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowRoleDropdown(false);
            setShowStatusDropdown(false);
            setActionMenuOpen(null);
          }}
        />
      )}
    </div>
  );
};

export default UsersPage;
