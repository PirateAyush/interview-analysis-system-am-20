import React, { useState, useRef, useCallback, useEffect } from 'react';
import { assessmentAPI } from '../../utils/api';

// ── SVG Icon Helper ────────────────────────────────────────────────────────────
const Icon = ({ path, size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    {Array.isArray(path)
      ? path.map((d, i) => <path key={i} d={d} />)
      : <path d={path} />}
  </svg>
);

const ICONS = {
  upload:  ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  file:    ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6'],
  check:   'M20 6L9 17l-5-5',
  x:       'M18 6L6 18M6 6l12 12',
  spark:   ['M13 2L3 14h9l-1 8 10-12h-9l1-8'],
  user:    ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  info:    ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 8v4', 'M12 16h.01'],
  refresh: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15'],
  chevron: 'M6 9l6 6 6-6',
  mic:     ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2', 'M12 19v4', 'M8 23h8'],
  history: ['M12 8v4l3 3', 'M3.05 11a9 9 0 1 0 .5-4'],
  trash:   ['M3 6h18', 'M19 6l-1 14H6L5 6', 'M9 6V4h6v2'],
  eye:     ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'],
  plus:    'M12 5v14M5 12h14',
  alert:   ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'],
};

// ── Circular Score Ring ────────────────────────────────────────────────────────
const ScoreRing = ({ score, size = 110, strokeWidth = 9, color, label, sublabel }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-slate-800">{Math.round(score)}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{sublabel}</p>
      </div>
    </div>
  );
};

// ── Hire Badge ─────────────────────────────────────────────────────────────────
const HireBadge = ({ recommendation }) => {
  const config = {
    'Hire':     { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', emoji: '✅' },
    'Maybe':    { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   emoji: '🤔' },
    'No Hire':  { bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     emoji: '❌' },
    'Inconclusive (Unfair Interview)': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', emoji: '⚠️' },
  };
  const c = config[recommendation] || config['Maybe'];
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.emoji} {recommendation}
    </span>
  );
};

// ── Domain Badge ──────────────────────────────────────────────────────────────
const DomainBadge = ({ domain }) => {
  const colors = {
    'Software Engineering': 'bg-blue-100 text-blue-700',
    'DevOps':               'bg-orange-100 text-orange-700',
    'Data Science':         'bg-purple-100 text-purple-700',
    'HR':                   'bg-pink-100 text-pink-700',
    'General':              'bg-slate-100 text-slate-600',
    'Unknown':              'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colors[domain] || colors['Unknown']}`}>
      {domain}
    </span>
  );
};

// ── Score Bar ─────────────────────────────────────────────────────────────────
const ScoreBar = ({ score, max = 10 }) => {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-right">{score}/10</span>
    </div>
  );
};

// ── Question Card ─────────────────────────────────────────────────────────────
const QuestionCard = ({ qa, index }) => {
  const [open, setOpen] = useState(false);
  const score = qa.answer_score;
  const scoreColor = score >= 7 ? 'text-emerald-600' : score >= 4 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${open ? 'border-indigo-200 shadow-md' : 'border-slate-200 hover:border-indigo-100 hover:shadow-sm'}`}>
      <button className="w-full text-left px-5 py-4" onClick={() => setOpen(!open)}>
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 leading-snug mb-2">{qa.question}</p>
            <div className="flex flex-wrap gap-2 items-center">
              <DomainBadge domain={qa.domain} />
              <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">{qa.seniority_level}</span>
              {!qa.is_relevant && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">⚠ Off-role</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-lg font-bold ${scoreColor}`}>{score}<span className="text-xs text-slate-400 font-normal">/10</span></span>
            <Icon path={ICONS.chevron} size={16} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 mt-1 pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Candidate's Answer</p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">{qa.answer}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Answer Score</p>
            <ScoreBar score={score} />
          </div>
          {qa.feedback && (
            <div className="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <Icon path={ICONS.info} size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 leading-relaxed">{qa.feedback}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Answer level assessed at:</span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{qa.answer_level}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Loading Steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Parsing transcript',    sub: 'Extracting Q&A pairs from the conversation' },
  { label: 'Classifying questions', sub: 'Checking domain, seniority & role relevance' },
  { label: 'Evaluating answers',    sub: 'AI scoring each candidate response' },
  { label: 'Calculating scores',    sub: 'Applying asymmetric scoring rules' },
  { label: 'Generating report',     sub: 'Writing your hiring summary' },
];

const LoadingView = ({ currentStep }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 animate-pulse">
      <Icon path={ICONS.spark} size={36} className="text-white" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-1">Analysing Interview…</h3>
    <p className="text-sm text-slate-400 mb-10">This may take 30–120 seconds. Please don't close this tab.</p>
    <div className="w-full max-w-md space-y-3">
      {STEPS.map((step, i) => {
        const done = i < currentStep, active = i === currentStep, pending = i > currentStep;
        return (
          <div key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300
            ${active ? 'bg-indigo-50 border border-indigo-200' : ''}
            ${done ? 'opacity-60' : ''} ${pending ? 'opacity-30' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
              ${done ? 'bg-emerald-500 text-white' : ''} ${active ? 'bg-indigo-600 text-white animate-pulse' : ''} ${pending ? 'bg-slate-200 text-slate-400' : ''}`}>
              {done ? <Icon path={ICONS.check} size={13} /> : i + 1}
            </div>
            <div>
              <p className={`text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>{step.label}</p>
              {active && <p className="text-xs text-indigo-400 mt-0.5">{step.sub}</p>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Report View ────────────────────────────────────────────────────────────────
const ReportView = ({ report, onReset }) => {
  const { candidate_name, applied_role, candidate_level, candidate_score,
          interviewer_score, fairness_score, hire_recommendation, summary,
          question_analyses = [] } = report;
  const technicalQAs = question_analyses.filter(q => q.is_technical);
  const offRoleCount = technicalQAs.filter(q => !q.is_relevant).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Interview Analysis Report</p>
            <h2 className="text-2xl font-bold mb-1">{candidate_name}</h2>
            <p className="text-indigo-200 text-sm capitalize">{applied_role} · {candidate_level} level</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <HireBadge recommendation={hire_recommendation} />
            <button onClick={onReset} className="flex items-center gap-2 text-xs text-indigo-200 hover:text-white transition-colors">
              <Icon path={ICONS.plus} size={13} /> New Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Score rings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Score Breakdown</h3>
        <div className="flex flex-wrap justify-around gap-8">
          <ScoreRing score={candidate_score}   color="#6366f1" label="Candidate"   sublabel="Performance score" />
          <ScoreRing score={interviewer_score} color="#8b5cf6" label="Interviewer" sublabel="Question quality"  />
          <ScoreRing score={fairness_score}    color="#06b6d4" label="Fairness"    sublabel="Interview balance"  />
        </div>
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Technical Qs', value: technicalQAs.length },
            { label: 'Off-role Qs',  value: offRoleCount, warn: offRoleCount > 0 },
            { label: 'Avg Score',    value: technicalQAs.length ? (technicalQAs.reduce((s,q) => s + q.answer_score, 0) / technicalQAs.length).toFixed(1) + '/10' : '—' },
            { label: 'Verdict',      value: hire_recommendation },
          ].map(({ label, value, warn }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-sm font-bold ${warn ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Icon path={ICONS.spark} size={14} className="text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">AI Summary</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Questions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Question-by-Question Breakdown</h3>
          <span className="text-xs text-slate-400">{technicalQAs.length} technical questions</span>
        </div>
        <div className="space-y-3">
          {technicalQAs.map((qa, i) => <QuestionCard key={i} qa={qa} index={i} />)}
        </div>
      </div>
    </div>
  );
};

// ── History View ──────────────────────────────────────────────────────────────
const HistoryView = ({ onViewReport }) => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState(null);
  const [deleting, setDeleting]       = useState(null);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentAPI.history(p, 10);
      setAssessments(res.data.assessments);
      setPagination(res.data.pagination);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(1); }, []);

  const handleView = async (id) => {
    try {
      const res = await assessmentAPI.get(id);
      onViewReport(res.data);
    } catch (err) {
      alert('Failed to load assessment details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await assessmentAPI.delete(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeleting(null);
    }
  };

  const recommendationColor = (rec) => ({
    'Hire':     'text-emerald-600 bg-emerald-50 border-emerald-200',
    'Maybe':    'text-amber-600  bg-amber-50  border-amber-200',
    'No Hire':  'text-red-600    bg-red-50    border-red-200',
  }[rec] || 'text-slate-500 bg-slate-50 border-slate-200');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
      <Icon path={ICONS.alert} size={16} className="text-red-500" />
      <p className="text-sm text-red-700">{error}</p>
    </div>
  );

  if (!assessments.length) return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">No assessments yet</h3>
      <p className="text-slate-400 text-sm">Run your first interview analysis and it will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Past Assessments
        </h3>
        <span className="text-xs text-slate-400">{pagination?.total} total</span>
      </div>

      <div className="space-y-3">
        {assessments.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-indigo-100 hover:shadow-sm transition-all">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow">
              {a.candidate_name?.[0]}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{a.candidate_name}</p>
              <p className="text-xs text-slate-400 truncate">{a.applied_role} · {a.candidate_level}</p>
            </div>

            {/* Scores */}
            <div className="hidden sm:flex items-center gap-4 text-center flex-shrink-0">
              <div>
                <p className="text-xs text-slate-400">Candidate</p>
                <p className="text-sm font-bold text-slate-700">{a.candidate_score?.toFixed(0) ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fairness</p>
                <p className="text-sm font-bold text-slate-700">{a.fairness_score?.toFixed(0) ?? '—'}</p>
              </div>
            </div>

            {/* Recommendation */}
            {a.hire_recommendation && (
              <span className={`hidden md:inline text-xs font-semibold px-2 py-1 rounded-lg border flex-shrink-0 ${recommendationColor(a.hire_recommendation)}`}>
                {a.hire_recommendation}
              </span>
            )}

            {/* Date */}
            <span className="hidden lg:block text-xs text-slate-400 flex-shrink-0">
              {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleView(a.id)}
                className="p-2 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors" title="View report">
                <Icon path={ICONS.eye} size={16} />
              </button>
              <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                {deleting === a.id
                  ? <div className="w-4 h-4 rounded-full border-2 border-red-300 border-t-transparent animate-spin" />
                  : <Icon path={ICONS.trash} size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={!pagination.has_prev} onClick={() => fetchHistory(page - 1)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {pagination.pages}</span>
          <button disabled={!pagination.has_next} onClick={() => fetchHistory(page + 1)}
            className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// ── Upload Form ────────────────────────────────────────────────────────────────
const LEVELS = ['Junior', 'Mid', 'Senior'];

const UploadForm = ({ onSubmit, loading }) => {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState({ interviewer_name: '', candidate_name: '', applied_role: '', candidate_level: 'Mid' });
  const fileRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.txt')) setFile(f);
  }, []);

  const valid = file && form.interviewer_name && form.candidate_name && form.applied_role;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon path={ICONS.mic} size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Interview Assessment Analyzer</h2>
            <p className="text-indigo-200 text-sm">Upload a transcript and get an AI-powered hiring report</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          {['Candidate Scoring', 'Interviewer Quality', 'Fairness Analysis', 'Hire Recommendation'].map(tag => (
            <span key={tag} className="text-xs bg-white/15 border border-white/20 rounded-full px-3 py-1 font-medium">{tag}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* File drop */}
        <div className="lg:col-span-2">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[220px] flex flex-col items-center justify-center
              ${drag ? 'border-indigo-400 bg-indigo-50' : ''} ${file ? 'border-emerald-300 bg-emerald-50' : ''} ${!drag && !file ? 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40' : ''}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            {file ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                  <Icon path={ICONS.file} size={28} className="text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-emerald-700 mb-1">{file.name}</p>
                <p className="text-xs text-emerald-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button className="mt-3 text-xs text-slate-400 hover:text-red-500 underline"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove file</button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Icon path={ICONS.upload} size={28} className="text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Drop your transcript here</p>
                <p className="text-xs text-slate-400 mb-3">or click to browse</p>
                <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">.txt files only</span>
              </>
            )}
          </div>
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">📋 Expected format</p>
            <div className="font-mono text-xs text-slate-400 space-y-0.5">
              <p>Rahul Mehta: Good morning...</p>
              <p>Vardman Sidhu: I am an iOS...</p>
              <p>Rahul Mehta: Can you explain...</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Interview Details</h3>

          {[
            { key: 'interviewer_name', label: 'Interviewer Name', placeholder: 'e.g. Rahul Mehta' },
            { key: 'candidate_name',   label: 'Candidate Name',   placeholder: 'e.g. Vardman Sidhu' },
            { key: 'applied_role',     label: 'Applied Role',     placeholder: 'e.g. iOS Software Engineer' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">{label} <span className="text-red-400">*</span></label>
              <div className="relative">
                {key !== 'applied_role' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"><Icon path={ICONS.user} size={15} /></span>
                )}
                <input type="text" placeholder={placeholder} value={form[key]}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className={`w-full ${key !== 'applied_role' ? 'pl-9' : 'px-3'} pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all`} />
              </div>
              {key !== 'applied_role' && <p className="text-xs text-slate-400 mt-1">Must match the name in the transcript exactly</p>}
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Candidate Level <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              {LEVELS.map(level => (
                <button key={level} onClick={() => setForm(prev => ({ ...prev, candidate_level: level }))}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all
                    ${form.candidate_level === level ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => onSubmit({ file, ...form })} disabled={!valid || loading}
            className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
              ${valid && !loading ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.01] active:scale-[0.99]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            <Icon path={ICONS.spark} size={16} />
            {loading ? 'Analysing…' : 'Analyse Interview'}
          </button>
          {!valid && <p className="text-xs text-center text-slate-400">Fill all fields and upload a .txt transcript to proceed</p>}
        </div>
      </div>
    </div>
  );
};

// ── Main Assessment Component ──────────────────────────────────────────────────
const Assessment = ({ user }) => {
  const [tab,          setTab]         = useState('new');       // 'new' | 'history'
  const [view,         setView]        = useState('upload');    // 'upload' | 'loading' | 'report'
  const [currentStep,  setCurrentStep] = useState(0);
  const [report,       setReport]      = useState(null);
  const [error,        setError]       = useState(null);
  const stepTimerRef = useRef(null);

  const startStepTimer = () => {
    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= STEPS.length - 1) clearInterval(stepTimerRef.current);
    }, 20000); // advance a step every ~20s
  };

  const handleSubmit = async ({ file, interviewer_name, candidate_name, applied_role, candidate_level }) => {
    setError(null);
    setView('loading');
    setCurrentStep(0);
    startStepTimer();

    try {
      const res = await assessmentAPI.analyze(file, interviewer_name, candidate_name, applied_role, candidate_level);
      clearInterval(stepTimerRef.current);
      setReport(res.data);
      setView('report');
    } catch (err) {
      clearInterval(stepTimerRef.current);
      const msg = err.response?.data?.error || err.message || 'Something went wrong. Please try again.';
      setError(msg);
      setView('upload');
    }
  };

  const handleReset = () => {
    setView('upload');
    setReport(null);
    setError(null);
    setCurrentStep(0);
  };

  const handleViewFromHistory = (reportData) => {
    setReport(reportData);
    setView('report');
    setTab('new');
  };

  return (
    <div className="space-y-5">

      {/* ── Tab switcher (only on upload screen) ── */}
      {view !== 'loading' && view !== 'report' && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { id: 'new',     label: 'New Analysis', icon: ICONS.plus    },
            { id: 'history', label: 'History',      icon: ICONS.history },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon path={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <Icon path={ICONS.alert} size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Content ── */}
      {view === 'loading' && <LoadingView currentStep={currentStep} />}
      {view === 'report'  && report && <ReportView report={report} onReset={handleReset} />}
      {view === 'upload'  && tab === 'new'     && <UploadForm onSubmit={handleSubmit} loading={false} />}
      {view === 'upload'  && tab === 'history' && <HistoryView onViewReport={handleViewFromHistory} />}
    </div>
  );
};

export default Assessment;