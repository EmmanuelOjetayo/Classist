import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { account, databases, Config } from './backend/appwrite';
import { Loader2 } from 'lucide-react';
import { Query } from "appwrite";

// Page Imports
import Home from './components/Home';
import StudentDashboard from './components/studentDashboard';
import Login from './Auth/Login';
import SignUp from './Auth/SignUp';
import ResetPassword from './Auth/ResetPassword';
import SuperAdmins from './components/superAdmin';
import Admins from './components/admins';

// Global Warning Filter
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.("Appwrite is using localStorage")) return;
    originalWarn(...args);
  };
}

// Fixed Protected Component with loop prevention
const Protected = ({ children, user, allowedRole }) => {
  if (!user) return <Navigate to="/login" replace />;

  // Normalize roles to avoid "Student" vs "student" mismatches
  const userRole = user.role?.toString().toLowerCase().trim();
  const targetRole = allowedRole?.toLowerCase().trim();

  if (targetRole && userRole !== targetRole) {
    // Redirect to home if role doesn't match to break the /user -> /student loop
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserSession = async () => {
    try {
      const session = await account.get();
      const profileResponse = await databases.listDocuments(
        Config.dbId,
        Config.profilesCol,
        [Query.equal('email', session.email)]
      );

      if (profileResponse.documents.length > 0) {
        const profile = profileResponse.documents[0];
        // Combine Appwrite account session with custom profile data (role, etc.)
        const fullUser = { ...session, ...profile };
        setUser(fullUser);
        return fullUser;
      }
      setUser(session);
      return session;
    } catch (error) {
      if (error.code !== 401) console.error("Auth sync failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUserSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-teal-600" size={40} />
          <p className="text-xs font-black uppercase tracking-widest opacity-40">Synchronizing Session</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/login' element={<Login onAuthSuccess={syncUserSession} />} />
        <Route path='/reset-password' element={<ResetPassword />} />

        {/* The Dispatcher: Initial landing logic after login */}
        <Route path='/user' element={
          !user ? <Navigate to="/login" replace /> :
            user.role?.toString().toLowerCase().trim() === 'superadmin' ? <Navigate to="/superAdmin" replace /> :
              user.role?.toString().toLowerCase().trim() === 'admin' ? <Navigate to="/admin" replace /> :
                <Navigate to="/student" replace />
        } />

        {/* Protected Routes */}
        <Route path='/student' element={
          <Protected user={user} allowedRole="student">
            <StudentDashboard user={user} />
          </Protected>
        } />

        <Route path='/admin' element={
          <Protected user={user} allowedRole="admin">
            <Admins user={user} />
          </Protected>
        } />

        <Route path='/superAdmin' element={
          <Protected user={user} allowedRole="superAdmin">
            <SuperAdmins user={user} />
          </Protected>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;