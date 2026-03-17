import React, { useState, useEffect, useCallback } from 'react';
import { assessmentAPI } from '../../utils/api';

// ── Icon helper ────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    {Array.isArray(path)
      ? path.map((d, i) => <path key={i} d={d} />)
      : <path d={path} />}
  </svg>
);

const ICONS = {
  briefcase: ['M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z', 'M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16'],
  map:       ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', 'M12 7a3 3 0 100 6 3 3 0 000-6z'],
  calendar:  ['M3 4h18v18H3V4z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  users:     ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75', 'M9 7a4 4 0 100 8 4 4 0 000-8z'],
  copy:      ['M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2', 'M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z'],
  check:     'M20 6L9 17l-5-5',
  chart:     ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  target:    ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 18a6 6 0 100-12 6 6 0 000 12z', 'M12 14a2 2 0 100-4 2 2 0 000 4z'],
  trending:  ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  spark:     ['M13 2L3 14h9l-1 8 10-12h-9l1-8'],
  alert:     ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  refresh:   ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'],
  chevron:   'M6 9l6 6 6-6',
};

// ── Color helpers ──────────────────────────────────────────────────────────────
const scoreColor  = (s) => s >= 70 ? 'text-emerald-600' : s >= 45 ? 'text-amber-600' : 'text-red-500';
const scoreBarClr = (s) => s >= 70 ? '#10b981'          : s >= 45 ? '#f59e0b'         : '#ef4444';
const fmt         = (v, d = 1) => v != null ? Number(v).toFixed(d) : '—';

const HIRE_CFG = {
  'Hire':         { color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Maybe':        { color: '#f59e0b', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  'No Hire':      { color: '#ef4444', bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  'Inconclusive': { color: '#94a3b8', bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
};

const DOMAIN_CLR = {
  'Software Engineering': '#6366f1',
  'DevOps':               '#f97316',
  'Data Science':         '#8b5cf6',
  'HR':                   '#ec4899',
  'General':              '#64748b',
  'Unknown':              '#94a3b8',
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const Sk = ({ h = 'h-24' }) => (
  <div className={`bg-slate-200 animate-pulse rounded-2xl ${h}`} />
);

// ── Donut Chart ────────────────────────────────────────────────────────────────
const DonutChart = ({ data, size = 148 }) => {
  const cx = size / 2, cy = size / 2, r = 50, sw = 20;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) return (
    <div style={{ width: size, height: size }}
      className="rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center flex-shrink-0">
      <span className="text-xs text-slate-400">No data</span>
    </div>
  );

  let rot = -90;
  const segs = data.map(d => {
    const dash = (d.value / total) * circ;
    const s = { ...d, dash, rot };
    rot += (d.value / total) * 360;
    return s;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
      {segs.map((seg, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={seg.color} strokeWidth={sw}
          strokeDasharray={`${seg.dash} ${circ}`}
          transform={`rotate(${seg.rot} ${cx} ${cy})`} />
      ))}
      <text x={cx} y={cy - 6}  textAnchor="middle" fontSize="18" fontWeight="700" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
    </svg>
  );
};

// ── Horizontal bar ─────────────────────────────────────────────────────────────
const HBar = ({ label, value, max, color, count }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs text-slate-500 w-36 truncate flex-shrink-0">{label}</span>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: max ? `${(value / max) * 100}%` : 0, backgroundColor: color }} />
    </div>
    <span className="text-xs font-semibold text-slate-600 w-5 text-right flex-shrink-0">{count}</span>
  </div>
);

// ── Mini score ring ────────────────────────────────────────────────────────────
const MiniRing = ({ score, color, label }) => {
  const sz = 52, r = 19, sw = 5, circ = 2 * Math.PI * r;
  if (score == null) return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: sz, height: sz }}
        className="rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center">
        <span className="text-xs text-slate-300">—</span>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: sz, height: sz }}>
        <svg width={sz} height={sz} className="-rotate-90">
          <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
          <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-700">{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ iconPath, label, value, sub, accentBg, accentText }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentBg}`}>
      <Icon path={iconPath} size={18} className={accentText} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
    </div>
  </div>
);

// ── Org Banner ─────────────────────────────────────────────────────────────────
const OrgBanner = ({ org }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(org?.organization_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const initials = org?.name
    ? org.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '??';

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-inner">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h2 className="text-2xl font-bold">{org?.name || 'Your Organization'}</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              org?.status === 'active' ? 'bg-emerald-400/25 text-emerald-100' : 'bg-red-400/25 text-red-100'
            }`}>
              ● {org?.status || 'unknown'}
            </span>
          </div>
          {org?.description && (
            <p className="text-indigo-200 text-sm mb-2 leading-relaxed line-clamp-1">{org.description}</p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-1">
            {org?.industry && (
              <span className="flex items-center gap-1.5 text-indigo-200 text-sm">
                <Icon path={ICONS.briefcase} size={13} className="opacity-70" />{org.industry}
              </span>
            )}
            {org?.location && (
              <span className="flex items-center gap-1.5 text-indigo-200 text-sm">
                <Icon path={ICONS.map} size={13} className="opacity-70" />{org.location}
              </span>
            )}
            {org?.created_at && (
              <span className="flex items-center gap-1.5 text-indigo-200 text-sm">
                <Icon path={ICONS.calendar} size={13} className="opacity-70" />
                Since {new Date(org.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
            {org?.member_count != null && (
              <span className="flex items-center gap-1.5 text-indigo-200 text-sm">
                <Icon path={ICONS.users} size={13} className="opacity-70" />
                {org.member_count} member{org.member_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button onClick={copy}
          className="flex-shrink-0 flex items-center gap-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-4 py-3 transition-all group text-left">
          <div>
            <p className="text-xs text-indigo-200 font-medium mb-0.5">Organization ID</p>
            <p className="font-mono text-sm font-bold tracking-wider">{org?.organization_id || '—'}</p>
          </div>
          <span className="text-indigo-200 group-hover:text-white transition-colors">
            <Icon path={copied ? ICONS.check : ICONS.copy} size={15} />
          </span>
        </button>
      </div>
    </div>
  );
};

// ── Hire Distribution Panel ────────────────────────────────────────────────────
const HirePanel = ({ dist, total }) => {
  const rows = Object.entries(HIRE_CFG).map(([label, cfg]) => ({
    label, ...cfg, value: dist?.[label] || 0,
  }));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Hire Distribution</h3>
      <div className="flex items-center gap-6">
        <DonutChart data={rows.map(r => ({ value: r.value, color: r.color }))} size={148} />
        <div className="flex-1 space-y-3.5">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.dot}`} />
                <span className="text-sm text-slate-600 truncate">{r.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: total ? `${(r.value / total) * 100}%` : 0, backgroundColor: r.color }} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-5 text-right">{r.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Domain Panel ───────────────────────────────────────────────────────────────
const DomainPanel = ({ domainDist }) => {
  const entries = Object.entries(domainDist || {}).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;
  if (!entries.length) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-slate-400">No domain data yet</p>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Domain Breakdown</h3>
      <div className="space-y-3.5">
        {entries.map(([domain, count]) => (
          <HBar key={domain} label={domain} value={count} max={max}
            color={DOMAIN_CLR[domain] || '#94a3b8'} count={count} />
        ))}
      </div>
    </div>
  );
};

// ── Level Panel ────────────────────────────────────────────────────────────────
const LevelPanel = ({ levelDist, total }) => {
  const levels = [
    { key: 'Junior', color: '#a5b4fc', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { key: 'Mid',    color: '#6366f1', bg: 'bg-violet-100', text: 'text-violet-600' },
    { key: 'Senior', color: '#4338ca', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  ];
  const max = Math.max(...levels.map(l => levelDist?.[l.key] || 0), 1);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Candidate Levels</h3>
      <div className="space-y-4">
        {levels.map(({ key, color, bg, text }) => {
          const count = levelDist?.[key] || 0;
          const pct   = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${bg} ${text}`}>{key}</span>
                <span className="text-xs text-slate-400">{count} · {pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(count / max) * 100}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        {levels.map(({ key, bg, text }) => (
          <div key={key} className={`rounded-xl py-2.5 ${bg}`}>
            <p className={`text-xl font-bold ${text}`}>{levelDist?.[key] || 0}</p>
            <p className={`text-xs font-medium ${text} opacity-70`}>{key}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Expanded Interviewer Detail ────────────────────────────────────────────────
const InterviewerDetail = ({ iv }) => (
  <tr className="bg-indigo-50/30">
    <td colSpan={9} className="px-6 py-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Score rings */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Scores</p>
          <div className="flex justify-around">
            <MiniRing score={iv.avg_candidate_score}   color="#6366f1" label="Candidate"   />
            <MiniRing score={iv.avg_interviewer_score} color="#8b5cf6" label="Interviewer" />
            <MiniRing score={iv.avg_fairness_score}    color="#06b6d4" label="Fairness"    />
          </div>
        </div>
        {/* Hire breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Hire Outcomes</p>
          <div className="space-y-2.5">
            {Object.entries(HIRE_CFG).map(([label, cfg]) => {
              const count = iv.hire_distribution?.[label] || 0;
              const pct   = iv.total_assessments ? Math.round((count / iv.total_assessments) * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <span className="text-xs text-slate-600">{label}</span>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                    {count} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Domain focus */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Domain Focus</p>
          {Object.keys(iv.domain_distribution || {}).length ? (
            <div className="space-y-2.5">
              {Object.entries(iv.domain_distribution)
                .sort((a, b) => b[1] - a[1]).slice(0, 4)
                .map(([domain, count]) => {
                  const max = Math.max(...Object.values(iv.domain_distribution));
                  return (
                    <HBar key={domain} label={domain} value={count} max={max}
                      color={DOMAIN_CLR[domain] || '#94a3b8'} count={count} />
                  );
                })}
            </div>
          ) : <p className="text-xs text-slate-400">No data</p>}
        </div>
        {/* Question stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Question Stats</p>
          <div className="space-y-2.5">
            {[
              { label: 'Technical Qs',     value: iv.total_tech_questions,                                  warn: false },
              { label: 'Off-role Qs',      value: iv.off_role_questions,                                    warn: iv.off_role_questions > 0 },
              { label: 'Off-role %',       value: iv.off_role_pct != null ? `${iv.off_role_pct}%` : '—',   warn: iv.off_role_pct > 15 },
              { label: 'Avg Qs/interview', value: iv.avg_questions_per_interview,                           warn: false },
              { label: 'Levels (J/M/S)',   value: `${iv.level_distribution?.Junior||0} / ${iv.level_distribution?.Mid||0} / ${iv.level_distribution?.Senior||0}`, warn: false },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-xs font-bold ${warn ? 'text-amber-600' : 'text-slate-700'}`}>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </td>
  </tr>
);

// ── Interviewer Row ────────────────────────────────────────────────────────────
const InterviewerRow = ({ iv, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={`border-b border-slate-100 cursor-pointer transition-colors ${open ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
        onClick={() => setOpen(o => !o)}>
        <td className="px-4 py-3.5">
          <span className="text-xs font-bold text-slate-300">{index + 1}</span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {iv.interviewer_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-semibold text-slate-800">{iv.interviewer_name}</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className="text-sm font-bold text-slate-700">{iv.total_assessments}</span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${iv.avg_candidate_score || 0}%`, backgroundColor: scoreBarClr(iv.avg_candidate_score) }} />
            </div>
            <span className={`text-sm font-bold ${scoreColor(iv.avg_candidate_score)}`}>{fmt(iv.avg_candidate_score)}</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${iv.avg_interviewer_score || 0}%`, backgroundColor: scoreBarClr(iv.avg_interviewer_score) }} />
            </div>
            <span className={`text-sm font-bold ${scoreColor(iv.avg_interviewer_score)}`}>{fmt(iv.avg_interviewer_score)}</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${iv.avg_fairness_score || 0}%`, backgroundColor: scoreBarClr(iv.avg_fairness_score) }} />
            </div>
            <span className={`text-sm font-bold ${scoreColor(iv.avg_fairness_score)}`}>{fmt(iv.avg_fairness_score)}</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
            iv.hire_rate_pct >= 60 ? 'bg-emerald-100 text-emerald-700' :
            iv.hire_rate_pct >= 30 ? 'bg-amber-100 text-amber-700'     :
            iv.hire_rate_pct != null ? 'bg-red-100 text-red-700'       :
            'bg-slate-100 text-slate-500'
          }`}>
            {iv.hire_rate_pct != null ? `${iv.hire_rate_pct}%` : '—'}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <span className={`text-sm font-bold ${
            iv.off_role_pct > 20 ? 'text-red-500' :
            iv.off_role_pct > 10 ? 'text-amber-600' :
            iv.off_role_pct != null ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            {iv.off_role_pct != null ? `${iv.off_role_pct}%` : '—'}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <Icon path={ICONS.chevron} size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {open && <InterviewerDetail iv={iv} />}
    </>
  );
};

// ── Interviewer Table ──────────────────────────────────────────────────────────
const InterviewerTable = ({ interviewers }) => {
  const [sortKey, setSortKey] = useState('total_assessments');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...(interviewers || [])].sort((a, b) => {
    const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
    const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const ColHead = ({ label, k }) => (
    <th className="px-4 py-3 text-left cursor-pointer select-none group" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
        {label}
        <span className={`transition-opacity ${sortKey === k ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {sortKey === k && sortDir === 'asc' ? '↑' : '↓'}
        </span>
      </span>
    </th>
  );

  if (!interviewers?.length) return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
      <div className="text-5xl mb-4">👤</div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">No interviewer data yet</h3>
      <p className="text-slate-400 text-sm">Complete some assessments and per-interviewer stats will appear here.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Interviewer Performance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Click any row to expand the detailed breakdown</p>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1 rounded-full">
          {sorted.length} interviewer{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-8" />
              <ColHead label="Interviewer"    k="interviewer_name"      />
              <ColHead label="Interviews"     k="total_assessments"     />
              <ColHead label="Avg Candidate"  k="avg_candidate_score"   />
              <ColHead label="Avg IV Score"   k="avg_interviewer_score" />
              <ColHead label="Avg Fairness"   k="avg_fairness_score"    />
              <ColHead label="Hire Rate"      k="hire_rate_pct"         />
              <ColHead label="Off-role %"     k="off_role_pct"          />
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((iv, i) => (
              <InterviewerRow key={iv.interviewer_name} iv={iv} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main DashboardHome ─────────────────────────────────────────────────────────
const DashboardHome = ({ user, organization }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentAPI.analytics();
      setAnalytics(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const org_stats = analytics?.organization || null;
  const hasData   = (org_stats?.total_assessments || 0) > 0;

  return (
    <div className="space-y-6">

      {/* 1 ── Org Banner */}
      <OrgBanner org={organization} user={user} />

      {/* 2 ── Primary stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Sk key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard iconPath={ICONS.chart}    label="Total Interviews"    accentBg="bg-indigo-100"  accentText="text-indigo-600"
            value={org_stats?.total_assessments ?? 0}
            sub="Completed assessments" />
          <StatCard iconPath={ICONS.target}   label="Avg Candidate Score" accentBg="bg-violet-100"  accentText="text-violet-600"
            value={org_stats?.avg_candidate_score != null ? `${fmt(org_stats.avg_candidate_score)}/100` : '—'}
            sub="Across all interviews" />
          <StatCard iconPath={ICONS.spark}    label="Avg Fairness Score"  accentBg="bg-cyan-100"    accentText="text-cyan-600"
            value={org_stats?.avg_fairness_score != null ? `${fmt(org_stats.avg_fairness_score)}/100` : '—'}
            sub="Interview quality metric" />
          <StatCard iconPath={ICONS.trending} label="Hire Rate"           accentBg="bg-emerald-100" accentText="text-emerald-600"
            value={org_stats?.hire_rate_pct != null ? `${org_stats.hire_rate_pct}%` : '—'}
            sub={hasData
              ? `${org_stats.hire_distribution?.Hire ?? 0} hired · ${org_stats.hire_distribution?.['No Hire'] ?? 0} rejected`
              : 'No assessments yet'} />
        </div>
      )}

      {/* 3 ── Secondary stat row */}
      {!loading && hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Technical Questions',   value: org_stats.total_tech_questions ?? 0,     note: `${fmt(org_stats.avg_questions_per_interview)} avg per interview`, warn: false },
            { label: 'Off-role Questions',    value: org_stats.off_role_questions ?? 0,       note: `${org_stats.off_role_pct ?? '—'}% of technical Qs`,             warn: (org_stats.off_role_pct || 0) > 15 },
            { label: '"Maybe" Decisions',     value: org_stats.hire_distribution?.Maybe ?? 0, note: 'Undecided outcomes',                                            warn: false },
            { label: 'Avg Interviewer Score', value: org_stats.avg_interviewer_score != null ? `${fmt(org_stats.avg_interviewer_score)}/100` : '—', note: 'Question relevance & balance', warn: (org_stats.avg_interviewer_score || 100) < 50 },
          ].map(({ label, value, note, warn }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-400 mb-1 truncate">{label}</p>
              <p className={`text-xl font-bold ${warn ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1 truncate">{note}</p>
            </div>
          ))}
        </div>
      )}

      {/* 4 ── Charts row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Sk key={i} h="h-56" />)}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HirePanel   dist={org_stats.hire_distribution}        total={org_stats.total_assessments} />
          <DomainPanel domainDist={org_stats.domain_distribution} />
          <LevelPanel  levelDist={org_stats.level_distribution}   total={org_stats.total_assessments} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Analytics will appear here</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Run your first assessment and the dashboard will populate with hire distribution, domain breakdown, and candidate level charts.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <Icon path={ICONS.alert} size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={fetchAnalytics}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold flex-shrink-0">
            <Icon path={ICONS.refresh} size={13} /> Retry
          </button>
        </div>
      )}

      {/* 5 ── Interviewer table */}
      {loading
        ? <Sk h="h-52" />
        : <InterviewerTable interviewers={analytics?.interviewers} />
      }

    </div>
  );
};

export default DashboardHome;