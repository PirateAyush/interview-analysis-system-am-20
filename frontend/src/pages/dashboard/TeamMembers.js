import React, { useState, useEffect, useCallback, useRef } from 'react';
import { organizationAPI } from '../../utils/api';

// ── Icon ───────────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    {Array.isArray(path)
      ? path.map((d, i) => <path key={i} d={d} />)
      : <path d={path} />}
  </svg>
);

const ICONS = {
  search:    'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',
  users:     ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2','M23 21v-2a4 4 0 00-3-3.87','M16 3.13a4 4 0 010 7.75','M9 7a4 4 0 100 8 4 4 0 000-8z'],
  shield:    ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  user:      ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2','M12 11a4 4 0 100-8 4 4 0 000 8z'],
  mail:      ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z','M22 6l-10 7L2 6'],
  phone:     ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z'],
  calendar:  ['M3 4h18v18H3V4z','M16 2v4','M8 2v4','M3 10h18'],
  chart:     ['M18 20V10','M12 20V4','M6 20v-6'],
  refresh:   ['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'],
  alert:     ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z','M12 9v4','M12 17h.01'],
  x:         'M18 6L6 18M6 6l12 12',
  copy:      ['M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2','M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z'],
  check:     'M20 6L9 17l-5-5',
  briefcase: ['M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z','M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16'],
};

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CFG = {
  admin:       { label: 'Admin',       bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   avatar: 'from-amber-400 to-orange-500'  },
  hr:          { label: 'HR',          bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', avatar: 'from-emerald-400 to-teal-500'  },
  interviewer: { label: 'Interviewer', bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    avatar: 'from-blue-400 to-indigo-500'   },
};

const STATUS_CFG = {
  active:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  inactive:  { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  suspended: { bg: 'bg-red-100',     text: 'text-red-600',     dot: 'bg-red-500'     },
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const CardSk = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 rounded w-2/3" />
        <div className="h-2.5 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
    <div className="h-2 bg-slate-100 rounded w-full" />
    <div className="h-2 bg-slate-100 rounded w-4/5" />
  </div>
);

// ── Stat Chip ──────────────────────────────────────────────────────────────────
const StatChip = ({ icon, label, value, bg, text }) => (
  <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${bg}`}>
    <Icon path={icon} size={16} className={text} />
    <div>
      <p className={`text-xl font-bold leading-none ${text}`}>{value}</p>
      <p className={`text-xs font-medium mt-0.5 ${text} opacity-70`}>{label}</p>
    </div>
  </div>
);

// ── Copy button ────────────────────────────────────────────────────────────────
const CopyBtn = ({ value }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0" title="Copy">
      <Icon path={copied ? ICONS.check : ICONS.copy} size={12} />
    </button>
  );
};

// ── Member Card ────────────────────────────────────────────────────────────────
const MemberCard = ({ member, isCurrentUser }) => {
  const role   = ROLE_CFG[member.type]   || ROLE_CFG.hr;
  const status = STATUS_CFG[member.status] || STATUS_CFG.inactive;

  const joinedDate = member.created_at
    ? new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const initials = `${member.firstname?.[0] || ''}${member.lastname?.[0] || ''}`.toUpperCase();

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden
      ${isCurrentUser ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-slate-200 shadow-sm'}`}>

      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${role.avatar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.avatar} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
            {initials}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-slate-800 truncate">{member.fullname}</span>
              {isCurrentUser && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 flex-shrink-0">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${role.bg} ${role.text} ${role.border}`}>
                {role.label}
              </span>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {member.status}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 group">
            <Icon path={ICONS.mail} size={13} className="text-slate-300 flex-shrink-0" />
            <span className="truncate">{member.email}</span>
            <CopyBtn value={member.email} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon path={ICONS.phone} size={13} className="text-slate-300 flex-shrink-0" />
            <span>+91 {member.mobile}</span>
            <CopyBtn value={member.mobile} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon path={ICONS.calendar} size={13} className="text-slate-300 flex-shrink-0" />
            <span>Joined {joinedDate}</span>
          </div>
        </div>

        {/* Footer — assessments count */}
        <div className={`flex items-center justify-between pt-3 border-t ${isCurrentUser ? 'border-indigo-100' : 'border-slate-100'}`}>
          <div className="flex items-center gap-1.5">
            <Icon path={ICONS.chart} size={13} className="text-slate-300" />
            <span className="text-xs text-slate-400">Assessments submitted</span>
          </div>
          <span className={`text-sm font-bold ${
            member.assessment_count > 0 ? 'text-indigo-600' : 'text-slate-300'
          }`}>
            {member.assessment_count}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────────
const EmptyState = ({ search, role }) => (
  <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 p-14 text-center">
    <div className="text-5xl mb-4">🔍</div>
    <h3 className="text-lg font-bold text-slate-700 mb-2">No members found</h3>
    <p className="text-slate-400 text-sm max-w-xs mx-auto">
      {search
        ? `No members match "${search}"${role !== 'all' ? ` with role "${role}"` : ''}.`
        : `No ${role !== 'all' ? role + ' ' : ''}members in your organization yet.`
      }
    </p>
  </div>
);

// ── Main TeamMembers Page ──────────────────────────────────────────────────────
const ROLE_FILTERS = [
  { key: 'all',         label: 'All'          },
  { key: 'admin',       label: 'Admins'       },
  { key: 'hr',          label: 'HR'           },
  { key: 'interviewer', label: 'Interviewers' },
];

const TeamMembers = ({ user, organization }) => {
  const [members,  setMembers]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [roleTab,  setRoleTab]  = useState('all');
  const [status,   setStatus]   = useState('all');
  const searchRef = useRef(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (roleTab !== 'all') params.role   = roleTab;
      if (status  !== 'all') params.status = status;
      if (search.trim())     params.search = search.trim();

      const res = await organizationAPI.members(params);
      setMembers(res.data.members || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, [roleTab, status, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchMembers(), 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const clearSearch = () => { setSearch(''); searchRef.current?.focus(); };

  return (
    <div className="space-y-6">

      {/* ── 1. Header banner ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon path={ICONS.users} size={18} className="text-white" />
              </div>
              <h2 className="text-xl font-bold">Team Members</h2>
            </div>
            <p className="text-indigo-200 text-sm">
              {organization?.name || user?.organization_id} · All members of your workspace
            </p>
          </div>

          {/* Summary chips */}
          {summary && (
            <div className="flex flex-wrap gap-2">
              <StatChip icon={ICONS.users}     label="Total"        value={summary.total}       bg="bg-white/15" text="text-white" />
              <StatChip icon={ICONS.shield}    label="Admins"       value={summary.admin}       bg="bg-white/10" text="text-white" />
              <StatChip icon={ICONS.briefcase} label="HR"           value={summary.hr}          bg="bg-white/10" text="text-white" />
              <StatChip icon={ICONS.user}      label="Interviewers" value={summary.interviewer} bg="bg-white/10" text="text-white" />
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Filters bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            <Icon path={ICONS.search} size={15} />
          </span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
          />
          {search && (
            <button onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
              <Icon path={ICONS.x} size={13} />
            </button>
          )}
        </div>

        {/* Role filter tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          {ROLE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setRoleTab(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                ${roleTab === f.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
              {summary && f.key !== 'all' && (
                <span className={`ml-1.5 text-xs font-bold ${roleTab === f.key ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {summary[f.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-slate-600 flex-shrink-0">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ── 3. Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <Icon path={ICONS.alert} size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={fetchMembers}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold flex-shrink-0">
            <Icon path={ICONS.refresh} size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── 4. Result count ──────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{members.length}</span> member{members.length !== 1 ? 's' : ''}
            {(search || roleTab !== 'all' || status !== 'all') && (
              <span className="text-slate-400"> (filtered)</span>
            )}
          </p>
          {(search || roleTab !== 'all' || status !== 'all') && (
            <button onClick={() => { setSearch(''); setRoleTab('all'); setStatus('all'); }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors">
              <Icon path={ICONS.x} size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── 5. Cards grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? [...Array(6)].map((_, i) => <CardSk key={i} />)
          : members.length === 0
            ? <EmptyState search={search} role={roleTab} />
            : members.map(m => (
                <MemberCard
                  key={m.id}
                  member={m}
                  isCurrentUser={m.is_current_user}
                />
              ))
        }
      </div>

      {/* ── 6. Legend footer ─────────────────────────────────────────────── */}
      {!loading && members.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
          <span className="text-xs text-slate-400 font-medium">Roles:</span>
          {Object.entries(ROLE_CFG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          ))}
          <span className="text-slate-200 hidden sm:block">|</span>
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
          ))}
        </div>
      )}

    </div>
  );
};

export default TeamMembers;