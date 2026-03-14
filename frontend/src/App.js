// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import ScrollToTop from './components/common/ScrollToTop';
import AdminProfile from './components/admin/AdminProfile';
import ClientPackagesDashboard from './components/clients/ClientPackagesDashboard';
import ClientJobs from './components/clients/ClientJobs';
import './App.css';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Auth
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Pages
import HomePage from './pages/HomePage';
import JobsPage from './pages/JobsPage';

// Jobs
import JobForm from './components/jobs/JobForm';
import JobDetails from './components/jobs/JobDetails';

// Workers
import WorkerProfile from './components/workers/WorkerProfile';
import WorkerDashboard from './components/workers/WorkerDashboard';
import ApplicationsPage from './pages/ApplicationsPage';

// Clients
import ClientDashboard from './components/clients/ClientDashboard';
import ClientPackages from './components/clients/ClientPackages';
import ClientProfile from './components/clients/ClientProfile';

// Vouchers (repurposed for passes/packages)
import WorkerPassPurchase from './components/vouchers/WorkerPassPurchase';

// Admin
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import JobManagement from './components/admin/JobManagement';
import PackageManagement from './components/admin/PackageManagement';
import PrivateRoute from './components/common/PrivateRoute';
import ReportsAnalytics from './components/admin/ReportsAnalytics';

// Loading Spinner
const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="loading-spinner-large"></div>
        <p>Loading your dashboard...</p>
    </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedTypes = [] }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(user?.user_type)) {
        return <Navigate to="/" />;
    }

    return children;
};

function AppContent() {
    const { user, loading } = useAuth();
    
    if (loading) {
        return <LoadingSpinner />;
    }
    
    return (
        <div className="app">
            <ScrollToTop />
            <Navbar />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobDetails />} />
                <Route path="/workers/:id" element={<WorkerProfile />} />

                {/* Protected Routes - Workers */}
                <Route path="/worker/pass" element={
                    <ProtectedRoute allowedTypes={['worker']}>
                        <WorkerPassPurchase />
                    </ProtectedRoute>
                } />
                <Route path="/applications" element={
                    <ProtectedRoute allowedTypes={['worker']}>
                        <ApplicationsPage />
                    </ProtectedRoute>
                } />  
                {/* Protected Routes - Clients */}
                <Route path="/client/packages" element={
                    <ProtectedRoute allowedTypes={['client']}>
                        <ClientPackages />
                    </ProtectedRoute>
                } />               

                <Route path="/jobs/post" element={
                    <ProtectedRoute allowedTypes={['client']}>
                        <JobForm />
                    </ProtectedRoute>
                } />

                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        {user?.user_type === 'worker' ? <WorkerDashboard /> : 
                         user?.user_type === 'client' ? <ClientDashboard /> : 
                         user?.user_type === 'admin' ? <AdminDashboard /> : 
                         <Navigate to="/jobs" />}
                    </ProtectedRoute>
                } />

                <Route path="/client/my-packages" element={
                    <ProtectedRoute allowedTypes={['client']}>
                        <ClientPackagesDashboard />
                    </ProtectedRoute>
                } />                

                <Route path="/client/profile" element={
                    <ProtectedRoute allowedTypes={['client']}>
                        <ClientProfile />
                    </ProtectedRoute>
                } />
                <Route path="/client/jobs" element={
                    <PrivateRoute>
                        <ClientJobs />
                    </PrivateRoute>
                } />                              

                {/* Admin Routes */}
                <Route path="/admin/users" element={
                    <ProtectedRoute allowedTypes={['admin']}>
                        <UserManagement />
                    </ProtectedRoute>
                } />

                <Route path="/admin/jobs" element={
                    <ProtectedRoute allowedTypes={['admin']}>
                        <JobManagement />
                    </ProtectedRoute>
                } />

                <Route path="/admin/packages" element={
                    <ProtectedRoute allowedTypes={['admin']}>
                        <PackageManagement />
                    </ProtectedRoute>
                } />

                <Route path="/admin/profile" element={
                    <ProtectedRoute allowedTypes={['admin']}>
                        <AdminProfile />
                    </ProtectedRoute>
                } />              

                {/* 404 - Redirect to Home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Footer />
        </div>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AlertProvider>
                    <AppContent />
                </AlertProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;