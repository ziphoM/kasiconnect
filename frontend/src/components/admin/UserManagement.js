// frontend/src/components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import './Admin.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const alert = useAlert();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users');
            if (response.data.success) {
                setUsers(response.data.data);
            } else {
                setError('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendUser = async (userId) => {
        alert.confirm(
            'Are you sure you want to suspend this user? They will not be able to access the platform.',
            async () => {
                setActionLoading(true);
                try {
                    await api.post(`/admin/users/${userId}/suspend`);
                    alert.success('User suspended successfully');
                    loadUsers();
                    setShowModal(false);
                } catch (error) {
                    console.error('Error suspending user:', error);
                    alert.error('Failed to suspend user');
                } finally {
                    setActionLoading(false);
                }
            },
            null,
            'Suspend User',
            'Yes, Suspend',
            'Cancel'
        );
    };

    const handleActivateUser = async (userId) => {
        alert.confirm(
            'Are you sure you want to activate this user?',
            async () => {
                setActionLoading(true);
                try {
                    await api.post(`/admin/users/${userId}/activate`);
                    alert.success('User activated successfully');
                    loadUsers();
                    setShowModal(false);
                } catch (error) {
                    console.error('Error activating user:', error);
                    alert.error('Failed to activate user');
                } finally {
                    setActionLoading(false);
                }
            },
            null,
            'Activate User',
            'Yes, Activate',
            'Cancel'
        );
    };

    const handleDeleteUser = async (userId) => {
        alert.confirm(
            '⚠️ Are you sure you want to permanently delete this user? This action cannot be undone.',
            async () => {
                setActionLoading(true);
                try {
                    await api.delete(`/admin/users/${userId}`);
                    alert.success('User deleted successfully');
                    loadUsers();
                    setShowModal(false);
                } catch (error) {
                    console.error('Error deleting user:', error);
                    alert.error('Failed to delete user');
                } finally {
                    setActionLoading(false);
                }
            },
            null,
            'Delete User',
            'Yes, Delete',
            'Cancel'
        );
    };

    const handleMakeAdmin = async (userId) => {
        alert.confirm(
            'Are you sure you want to make this user an admin?',
            async () => {
                setActionLoading(true);
                try {
                    await api.post(`/admin/users/${userId}/make-admin`);
                    alert.success('User is now an admin');
                    loadUsers();
                    setShowModal(false);
                } catch (error) {
                    console.error('Error making user admin:', error);
                    alert.error('Failed to make user admin');
                } finally {
                    setActionLoading(false);
                }
            },
            null,
            'Make Admin',
            'Yes, Make Admin',
            'Cancel'
        );
    };

    const filteredUsers = users.filter(user => {
        if (filter !== 'all' && user.user_type !== filter) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return user.name?.toLowerCase().includes(term) || 
                   user.phone?.includes(term) ||
                   user.email?.toLowerCase().includes(term);
        }
        return true;
    });

    const getStatusBadge = (status) => {
        switch(status) {
            case 'active': return <span className="badge active">Active</span>;
            case 'inactive': return <span className="badge inactive">Inactive</span>;
            case 'suspended': return <span className="badge suspended">Suspended</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading users...</div>;
    }

    return (
        <div className="management-tab">
            <div className="management-header">
                <h1>👥 User Management</h1>
                <button className="btn-refresh" onClick={loadUsers}>
                    🔄 Refresh
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filters-bar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search users by name, phone, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    <button 
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All ({users.length})
                    </button>
                    <button 
                        className={filter === 'worker' ? 'active' : ''}
                        onClick={() => setFilter('worker')}
                    >
                        Workers ({users.filter(u => u.user_type === 'worker').length})
                    </button>
                    <button 
                        className={filter === 'client' ? 'active' : ''}
                        onClick={() => setFilter('client')}
                    >
                        Clients ({users.filter(u => u.user_type === 'client').length})
                    </button>
                    <button 
                        className={filter === 'admin' ? 'active' : ''}
                        onClick={() => setFilter('admin')}
                    >
                        Admins ({users.filter(u => u.user_type === 'admin').length})
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Type</th>
                            <th>Township</th>
                            <th>Verified</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="no-data">No users found</td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.name}</td>
                                    <td>{user.phone}</td>
                                    <td>
                                        <span className={`user-type ${user.user_type}`}>
                                            {user.user_type}
                                        </span>
                                    </td>
                                    <td>{user.township || '-'}</td>
                                    <td>
                                        {user.is_verified ? (
                                            <span className="verified-badge">✓ Verified</span>
                                        ) : (
                                            <span className="unverified-badge">Not Verified</span>
                                        )}
                                    </td>
                                    <td>{getStatusBadge(user.status)}</td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <button 
                                            className="btn-action"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowModal(true);
                                            }}
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Manage User: {selectedUser.name}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="user-details">
                                <p><strong>ID:</strong> {selectedUser.id}</p>
                                <p><strong>Phone:</strong> {selectedUser.phone}</p>
                                <p><strong>Type:</strong> {selectedUser.user_type}</p>
                                <p><strong>Status:</strong> {selectedUser.status}</p>
                                <p><strong>Verified:</strong> {selectedUser.is_verified ? 'Yes' : 'No'}</p>
                                <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
                            </div>

                            <div className="action-buttons">
                                {selectedUser.status === 'active' ? (
                                    <button 
                                        className="btn-suspend"
                                        onClick={() => handleSuspendUser(selectedUser.id)}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Processing...' : '🚫 Suspend User'}
                                    </button>
                                ) : (
                                    <button 
                                        className="btn-activate"
                                        onClick={() => handleActivateUser(selectedUser.id)}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Processing...' : '✅ Activate User'}
                                    </button>
                                )}
                                
                                {selectedUser.user_type !== 'admin' && (
                                    <button 
                                        className="btn-make-admin"
                                        onClick={() => handleMakeAdmin(selectedUser.id)}
                                        disabled={actionLoading}
                                    >
                                        👑 Make Admin
                                    </button>
                                )}
                                
                                <button 
                                    className="btn-delete"
                                    onClick={() => handleDeleteUser(selectedUser.id)}
                                    disabled={actionLoading}
                                >
                                    🗑️ Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;