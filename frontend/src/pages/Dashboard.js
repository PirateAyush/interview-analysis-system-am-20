import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardHome from './dashboard/DashboardHome';
import TeamMembers from './dashboard/TeamMembers';
import Assessment from './dashboard/Assessment';
import Settings from './dashboard/Settings';

const Dashboard = () => {
  const [user, setUser]             = useState(null);
  const [organization, setOrg]      = useState(null);
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.success) {
        setUser(response.data.user);
        setOrg(response.data.organization || null);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg animate-pulse">
            AI
          </div>
          <p className="text-slate-400 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // ── Dashboard with nested routing ──────────────────────────────────────────
  return (
    <DashboardLayout user={user}>
      <Routes>
        <Route index element={<DashboardHome user={user} organization={organization} />} />
        <Route path="team"       element={<TeamMembers user={user} organization={organization} />} />
        <Route path="assessment" element={<Assessment user={user} />} />
        <Route path="settings"   element={<Settings user={user} />} />
      </Routes>
    </DashboardLayout>
  );
};

export default Dashboard;