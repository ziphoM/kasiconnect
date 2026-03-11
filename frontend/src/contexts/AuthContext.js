// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState(null);

    const loadUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        console.log('AuthContext - Loading user from storage:', { token: !!token, storedUser: !!storedUser });

        if (token && storedUser) {
            try {
                // Parse stored user first to show immediately
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log('AuthContext - Restored user from storage:', parsedUser);

                // Verify token with backend (optional - you can skip if you trust local storage)
                try {
                    const response = await api.get('/auth/me');
                    if (response.data.success) {
                        setUser(response.data.data);
                        console.log('AuthContext - Verified user with backend:', response.data.data);
                    } else {
                        // Token invalid, clear storage
                        console.log('AuthContext - Token invalid, clearing storage');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                } catch (verifyError) {
                    console.error('AuthContext - Error verifying token:', verifyError);
                    // Don't clear on network error, keep the stored user
                }
            } catch (error) {
                console.error('AuthContext - Error parsing stored user:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        } else {
            console.log('AuthContext - No stored user found');
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (phone, password) => {
        setError(null);
        setLoading(true);
        try {
            console.log('AuthContext - Login attempt for:', phone);
            const response = await api.post('/auth/login', { phone, password });
            
            console.log('AuthContext - Login response:', response.data);
            
            if (response.data.success) {
                const { token, ...userData } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                console.log('AuthContext - Login successful, user set:', userData);
                return { success: true };
            } else {
                setError(response.data.message);
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('AuthContext - Login error:', error);
            const message = error.response?.data?.message || 'Network error. Please try again.';
            setError(message);
            return { success: false, message };
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        setError(null);
        setLoading(true);
        try {
            console.log('AuthContext - Register attempt for:', userData.phone);
            const response = await api.post('/auth/register', userData);
            
            console.log('AuthContext - Register response:', response.data);
            
            if (response.data.success) {
                const { token, ...userData } = response.data.data;
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                console.log('AuthContext - Registration successful, user set:', userData);
                return { success: true };
            } else {
                setError(response.data.message);
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('AuthContext - Register error:', error);
            const message = error.response?.data?.message || 'Network error. Please try again.';
            setError(message);
            return { success: false, message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        console.log('AuthContext - Logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateUser = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isWorker: user?.user_type === 'worker',
        isClient: user?.user_type === 'client',
        isAdmin: user?.user_type === 'admin'
    };

    console.log('AuthContext - Current state:', { 
        isAuthenticated: !!user, 
        userType: user?.user_type,
        loading,
        hasToken: !!localStorage.getItem('token')
    });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};