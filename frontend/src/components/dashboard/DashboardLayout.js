import React, { useState } from 'react';
import Sidebar from './Sidebar';

// ── Icon ──────────────────────────────────────────────────────────────────────
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

// ── Breadcrumb map ────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/dashboard':            { title: 'Dashboard',     subtitle: 'Overview of your organization and account' },
  '/dashboard/team':       { title: 'Team Members',  subtitle: 'Everyone in your organization' },
  '/dashboard/assessment': { title: 'Assessment',    subtitle: 'Upload interviews and view analysis history' },
  '/dashboard/settings':   { title: 'Settings',      subtitle: 'Manage your profile and organization' },
};

// ── Layout ─────────────────────────────────────────────────────────────────────
const DashboardLayout = ({ user, children }) => {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Derive page title from current path
  const path = window.location.pathname;
  const page = PAGE_TITLES[path] || PAGE_TITLES['/dashboard'];

  const sidebarWidth = collapsed ? 70 : 240;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sidebar ── */}
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main content ── */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: window.innerWidth >= 768 ? sidebarWidth : 0 }}
      >
        {/* ── Top bar ── */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
          {/* Left */}
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">{page.title}</h1>
              <p className="text-xs text-slate-400 hidden sm:block">{page.subtitle}</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Org ID badge */}
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-indigo-600 tracking-wide">
                {user?.organization_id || '—'}
              </span>
            </div>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shadow cursor-pointer">
              {user?.firstname?.[0]}{user?.lastname?.[0]}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;