import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Play, CheckCircle2, History, Settings, HelpCircle, Activity, Shield, Layout, Zap,
  ArrowRight, LayoutDashboard, Edit2, Code, Trash2, PieChart as PieChartIcon,
  Loader2, Check, LogOut, Moon, Sun, Bell, Search, ChevronDown, ChevronRight,
  User, Globe, Database, Monitor, Eye, RefreshCw, Layers, FileText, BookOpen,
  Keyboard, Mail, MessageSquare, ExternalLink, Clock, Hash, AlertTriangle,
  Cpu, Wifi, TestTubes, BarChart2, Info, TrendingUp
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import './index.css';

const API_BASE = 'http://localhost:5000/api';

// ──────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ──────────────────────────────────────────────
const LS = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set: (key, val) => { localStorage.setItem(key, JSON.stringify(val)); },
  remove: (key) => { localStorage.removeItem(key); }
};

const CHART_COLORS = { positive: '#10b981', negative: '#ef4444', edge: '#f59e0b', high: '#ef4444', med: '#f59e0b', low: '#6b7280' };

// ──────────────────────────────────────────────
// TEST INSIGHTS PANEL
// ──────────────────────────────────────────────
function TestInsightsPanel({ cases }) {
  if (!cases || cases.length === 0) return null;

  // Compute distributions
  const typeCounts = { POSITIVE: 0, NEGATIVE: 0, EDGE: 0 };
  const priorityCounts = { HIGH: 0, MED: 0, LOW: 0 };
  const categorySet = {};
  const stepCounts = [];

  cases.forEach(tc => {
    const t = (tc.typeBadge || 'POSITIVE').toUpperCase();
    if (typeCounts[t] !== undefined) typeCounts[t]++;
    const u = (tc.urgency || 'HIGH').toUpperCase();
    if (priorityCounts[u] !== undefined) priorityCounts[u]++;
    const cat = tc.category || 'Functional';
    categorySet[cat] = (categorySet[cat] || 0) + 1;
    stepCounts.push({ name: tc.tcId || 'TC', steps: tc.steps?.length || 0 });
  });

  const typeData = [
    { name: 'Positive', value: typeCounts.POSITIVE, color: CHART_COLORS.positive },
    { name: 'Negative', value: typeCounts.NEGATIVE, color: CHART_COLORS.negative },
    { name: 'Edge', value: typeCounts.EDGE, color: CHART_COLORS.edge },
  ].filter(d => d.value > 0);

  const priorityData = [
    { name: 'High', count: priorityCounts.HIGH, fill: CHART_COLORS.high },
    { name: 'Medium', count: priorityCounts.MED, fill: CHART_COLORS.med },
    { name: 'Low', count: priorityCounts.LOW, fill: CHART_COLORS.low },
  ].filter(d => d.count > 0);

  const allCats = ['Functional','Security','UI / UX','Performance','API','Regression','Integration','Accessibility','Database','CrossBrowser'];
  const radarData = allCats.map(c => ({ subject: c.replace('CrossBrowser','X-Browser').substring(0,8), count: categorySet[c] || 0, fullMark: cases.length }));

  const summaryParts = [];
  if (typeCounts.POSITIVE) summaryParts.push(`${typeCounts.POSITIVE} positive`);
  if (typeCounts.NEGATIVE) summaryParts.push(`${typeCounts.NEGATIVE} negative`);
  if (typeCounts.EDGE) summaryParts.push(`${typeCounts.EDGE} edge-case`);
  const topPriority = priorityCounts.HIGH >= priorityCounts.MED ? 'HIGH' : 'MEDIUM';

  return (
    <div className="insights-panel">
      {/* Summary Bar */}
      <div className="insights-summary-bar">
        <div className="summary-icon"><TrendingUp size={20} /></div>
        <div className="summary-text">
          <h3>Test Suite Analysis — {cases.length} Test Cases Generated</h3>
          <p>Your suite contains {summaryParts.join(', ')} test{cases.length > 1 ? 's' : ''}. Most are <strong>{topPriority}</strong> priority. Review the charts below for a detailed breakdown.</p>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="insight-mini-stats">
        <div className="mini-stat" style={{ background: 'var(--success-bg)' }}>
          <div className="mini-stat-value" style={{ color: 'var(--success)' }}>{typeCounts.POSITIVE}</div>
          <div className="mini-stat-label" style={{ color: 'var(--success)' }}>Positive</div>
        </div>
        <div className="mini-stat" style={{ background: 'var(--error-bg)' }}>
          <div className="mini-stat-value" style={{ color: 'var(--error)' }}>{typeCounts.NEGATIVE}</div>
          <div className="mini-stat-label" style={{ color: 'var(--error)' }}>Negative</div>
        </div>
        <div className="mini-stat" style={{ background: 'var(--warning-bg)' }}>
          <div className="mini-stat-value" style={{ color: 'var(--warning)' }}>{typeCounts.EDGE}</div>
          <div className="mini-stat-label" style={{ color: 'var(--warning)' }}>Edge Cases</div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="color-legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: CHART_COLORS.positive }}></div> Positive = Happy-path tests that should pass</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: CHART_COLORS.negative }}></div> Negative = Tests for error handling & invalid inputs</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: CHART_COLORS.edge }}></div> Edge = Boundary conditions & unusual scenarios</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: CHART_COLORS.high }}></div> High Priority = Must-fix before release</div>
      </div>

      {/* Charts Grid */}
      <div className="insights-grid">
        {/* Donut: Type Distribution */}
        <div className="insight-card">
          <div className="insight-card-header">
            <h4>Type Distribution</h4>
            <div className="help-tip" data-tip="Shows how test cases are split between positive, negative, and edge scenarios">?</div>
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={typeData} innerRadius={50} outerRadius={75} dataKey="value" stroke="none" paddingAngle={3}>
                  {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} tests`, n]} contentStyle={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 8, fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {typeData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }}></div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{d.name}: <strong style={{ color: 'var(--on-surface)' }}>{d.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar: Priority Breakdown */}
        <div className="insight-card">
          <div className="insight-card-header">
            <h4>Priority Breakdown</h4>
            <div className="help-tip" data-tip="Shows urgency levels — HIGH items should be addressed first">?</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--on-surface-variant)' }} width={60} />
                <Tooltip formatter={(v) => [`${v} tests`]} contentStyle={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar: Category Coverage */}
        <div className="insight-card">
          <div className="insight-card-header">
            <h4>Category Coverage</h4>
            <div className="help-tip" data-tip="Shows which testing areas have coverage. A fuller shape means broader coverage">?</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--outline-variant)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'var(--on-surface-variant)' }} />
                <Radar name="Tests" dataKey="count" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 8, fontSize: '0.8rem' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar: Step Complexity */}
        <div className="insight-card">
          <div className="insight-card-header">
            <h4>Step Complexity</h4>
            <div className="help-tip" data-tip="Number of steps per test case — taller bars mean more complex tests">?</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepCounts} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--on-surface-variant)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} steps`]} contentStyle={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="steps" radius={[4, 4, 0, 0]} barSize={20} fill="var(--accent, #8b5cf6)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// LOGIN PAGE COMPONENT
// ──────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    if (mode === 'forgot') {
      if (email) {
        setSuccess('Password reset link sent to ' + email);
      } else {
        setError('Please enter your email.');
      }
    } else if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
      } else if (!email) {
        setError('Please enter a valid email');
      } else {
        const user = { name: 'New User', email: email, role: 'Administrator', initials: email.charAt(0).toUpperCase() };
        if (remember) LS.set('auth_user', user);
        else sessionStorage.setItem('auth_user', JSON.stringify(user));
        onLogin(user);
      }
    } else {
      if ((email === 'admin@testgen.ai' && password === 'admin123') || (email && password && email !== 'admin@testgen.ai')) {
        const user = { name: email === 'admin@testgen.ai' ? 'Admin User' : 'Test User', email: email, role: 'Administrator', initials: email.charAt(0).toUpperCase() };
        if (remember) LS.set('auth_user', user);
        else sessionStorage.setItem('auth_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Invalid credentials.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo"><TestTubes size={28} /></div>
        <h1>{mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Account' : 'Reset Password'}</h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'Sign in to AI TestGen — your intelligent test case engine' :
           mode === 'register' ? 'Join AI TestGen today' : 'Enter your email to receive a password reset link'}
        </p>

        {error && <div className="login-error"><AlertTriangle size={14} /> {error}</div>}
        {success && <div className="login-error" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-bg)' }}><CheckCircle2 size={14} /> {success}</div>}

        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input id="login-email" className="form-input" type="email" placeholder="admin@testgen.ai" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>

        {mode !== 'forgot' && (
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        )}

        {mode === 'register' && (
          <div className="form-group">
            <label htmlFor="login-confirm-password">Confirm Password</label>
            <input id="login-confirm-password" className="form-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
        )}

        {mode === 'login' && (
          <div className="login-remember">
            <label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
            <a href="#" onClick={(e) => { e.preventDefault(); setMode('forgot'); setError(''); setSuccess(''); }}>Forgot password?</a>
          </div>
        )}

        <button className="btn-login" type="submit" disabled={loading}>
          {loading ? <><Loader2 size={16} className="spin-animation" /> Please wait...</> : 
           <>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Sign Up' : 'Send Reset Link'} <ArrowRight size={16} /></>}
        </button>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); setSuccess(''); }} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign Up</a>
          </p>
        )}
        {(mode === 'register' || mode === 'forgot') && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Back to <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); setSuccess(''); }} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign In</a>
          </p>
        )}
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// MAIN APP COMPONENT
// ──────────────────────────────────────────────
function App() {
  // Auth
  const [user, setUser] = useState(() => LS.get('auth_user', null) || (sessionStorage.getItem('auth_user') ? JSON.parse(sessionStorage.getItem('auth_user')) : null));

  // Theme
  const [darkMode, setDarkMode] = useState(() => LS.get('theme', 'light') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    LS.set('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Generator state
  const [requirements, setRequirements] = useState('');
  const [testType, setTestType] = useState('Functional');
  const [generatedCases, setGeneratedCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generationPhase, setGenerationPhase] = useState(0);

  // History state (localStorage + API combo)
  const [history, setHistory] = useState([]);

  // Settings
  const [settingsTab, setSettingsTab] = useState('general');
  const [settings, setSettings] = useState(() => LS.get('app_settings', {
    apiEndpoint: API_BASE,
    releaseDate: '2026-04-20',
    defaultStrategy: 'Functional',
    exportFormat: 'JSON',
    emailNotifications: true,
    autoSaveHistory: true,
    darkMode: false
  }));

  // Help accordion
  const [openFaq, setOpenFaq] = useState(null);

  // User dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Notifications dropdown
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowUserMenu(false); 
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false); 
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ──────────────────────────────────────────────

  // ──── History helpers ────
  const getLocalHistory = () => LS.get('test_history', []);

  const saveToLocalHistory = (entry) => {
    const hist = getLocalHistory();
    hist.unshift(entry);
    if (hist.length > 50) hist.pop();
    LS.set('test_history', hist);
  };

  const fetchHistory = async () => {
    const localHist = getLocalHistory();
    try {
      const res = await axios.get(`${settings.apiEndpoint}/generate-history`);
      const apiHist = (res.data || []).map(h => ({
        id: h._id,
        date: h.createdAt,
        input: h.inputRequirements,
        type: h.testType || 'Functional',
        count: h.generatedTestCases?.length || 0,
        source: 'server'
      }));
      // Merge: API entries first, then local that aren't duplicated
      const apiIds = new Set(apiHist.map(h => h.id));
      const merged = [...apiHist, ...localHist.filter(h => !apiIds.has(h.id))];
      setHistory(merged);
    } catch {
      setHistory(localHist);
    }
  };

  const deleteHistoryEntry = (id) => {
    const updated = getLocalHistory().filter(h => h.id !== id);
    LS.set('test_history', updated);
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  // ──── Generate handler ────
  const handleGenerate = async () => {
    if (!requirements.trim()) return;
    setLoading(true);
    setGenerationPhase(1);
    setGeneratedCases([]);

    const phaseInterval = setInterval(() => {
      setGenerationPhase(prev => prev < 3 ? prev + 1 : prev);
    }, 1500);

    try {
      const res = await axios.post(`${settings.apiEndpoint}/generate`, { requirements, testType });
      const data = res.data.testCases || res.data;

      clearInterval(phaseInterval);
      setGenerationPhase(4);

      setTimeout(() => {
        const cases = Array.isArray(data) ? data : [];
        setGeneratedCases(cases);
        setLoading(false);
        setGenerationPhase(0);

        // Save to local history
        if (settings.autoSaveHistory) {
          saveToLocalHistory({
            id: `local_${Date.now()}`,
            date: new Date().toISOString(),
            input: requirements,
            type: testType,
            count: cases.length,
            source: 'local'
          });
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      clearInterval(phaseInterval);
      setLoading(false);
      setGenerationPhase(0);
    }
  };

  // ──── Logout ────
  const handleLogout = () => {
    LS.remove('auth_user');
    sessionStorage.removeItem('auth_user');
    setUser(null);
    setShowUserMenu(false);
  };

  // ──── Save settings ────
  const saveSettings = (patch) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    LS.set('app_settings', updated);
  };

  // ──── Compute dynamic days left ────
  const getDaysLeft = () => {
    const target = new Date(settings.releaseDate);
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // ──── Load history when tab opens ────
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  // ──────────────────────────────────────────────
  // DATA CONSTANTS
  // ──────────────────────────────────────────────
  const STRATEGIES = [
    { id: 'Functional', icon: <Activity size={18} color="var(--primary)" />, title: 'Functional', desc: 'Business logic, flows & rules' },
    { id: 'Security', icon: <Shield size={18} color="var(--error)" />, title: 'Security', desc: 'SQLi, XSS, auth bypass' },
    { id: 'UI / UX', icon: <Layout size={18} color="#a855f7" />, title: 'UI / UX', desc: 'Responsive, a11y, consistency' },
    { id: 'Performance', icon: <Zap size={18} color="var(--warning)" />, title: 'Performance', desc: 'Load, stress & scalability' },
    { id: 'API', icon: <Globe size={18} color="var(--info)" />, title: 'API Testing', desc: 'REST/GraphQL endpoints' },
    { id: 'Regression', icon: <RefreshCw size={18} color="#ec4899" />, title: 'Regression', desc: 'Change impact analysis' },
    { id: 'Integration', icon: <Layers size={18} color="#14b8a6" />, title: 'Integration', desc: 'Cross-module data flow' },
    { id: 'Accessibility', icon: <Eye size={18} color="#8b5cf6" />, title: 'Accessibility', desc: 'WCAG 2.1 compliance' },
    { id: 'Database', icon: <Database size={18} color="#f97316" />, title: 'Database', desc: 'CRUD & data integrity' },
    { id: 'CrossBrowser', icon: <Monitor size={18} color="#06b6d4" />, title: 'Cross-Browser', desc: 'Multi-browser compat' },
  ];

  const PIPELINE_STEPS = [
    { id: 1, label: 'Parsing Requirements' },
    { id: 2, label: 'Analyzing Logic Paths' },
    { id: 3, label: 'Generating Scenarios' },
    { id: 4, label: 'Compiling Suite' }
  ];

  const TREND_DATA = [
    { name: 'MON', passed: 10, failed: 2 },
    { name: 'TUE', passed: 15, failed: 4 },
    { name: 'WED', passed: 8, failed: 1 },
    { name: 'THU', passed: 18, failed: 5 },
    { name: 'FRI', passed: 12, failed: 0 }
  ];

  const DISTRIBUTION_DATA = [
    { name: 'Positive', value: 50, color: 'var(--success)' },
    { name: 'Negative', value: 25, color: 'var(--error)' },
    { name: 'Edge', value: 25, color: 'var(--secondary)' }
  ];

  const daysLeft = getDaysLeft();
  const releaseFormatted = new Date(settings.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  const totalGenerated = getLocalHistory().reduce((sum, h) => sum + (h.count || 0), 0);

  const NAV_ITEMS = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'history', icon: <History size={18} />, label: 'History', badge: getLocalHistory().length || null },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
    { id: 'help', icon: <HelpCircle size={18} />, label: 'Help & Docs' }
  ];

  const TAB_TITLES = {
    dashboard: 'Dashboard',
    history: 'History',
    settings: 'Settings',
    help: 'Help & Documentation'
  };

  // FAQ data
  const FAQ_DATA = [
    { q: 'How does the AI test generation work?', a: 'Our NLP engine parses your requirements text, extracts key subjects, verbs, and nouns, then cross-references them against test strategy templates (Functional, Security, API, etc.) to produce comprehensive test scenarios. Each scenario includes preconditions, steps, and expected results.' },
    { q: 'What test strategies are supported?', a: 'We support 10 test strategies: Functional, Security, UI/UX, Performance, API Testing, Regression, Integration, Accessibility, Database, and Cross-Browser. Each generates type-specific test cases tailored to that domain.' },
    { q: 'Is a database required to use this app?', a: 'No. While MongoDB is supported for persistent server-side storage, the app automatically falls back to localStorage for history tracking. All core features work without a database connection.' },
    { q: 'Can I export generated test cases?', a: 'Yes. Use the "Quick Export" button on any generated test suite. Export formats include JSON, CSV, and (coming soon) PDF. You can configure the default format in Settings.' },
    { q: 'How do I change the release date on the dashboard?', a: 'Navigate to Settings → General, and update the "Release Target Date" field. The dashboard countdown and progress bars will automatically update to reflect the new date.' },
    { q: 'What are the login credentials?', a: 'The default admin credentials are: Email: admin@testgen.ai, Password: admin123. These can be updated in a production deployment by modifying the backend auth configuration.' },
  ];

  // If not logged in, show login page
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div className="app-shell">
      {/* ═══════ SIDEBAR ═══════ */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><TestTubes size={20} /></div>
          <div>
            <h2>AI TestGen</h2>
            <span>v2.0 — Professional</span>
          </div>
        </div>

        <div className="sidebar-section-label">Main Menu</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`nav-item ${activeTab === item.id ? 'active' : ''}`}>
              {item.icon} {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: 'var(--spacing-4) var(--spacing-3)' }}>
          <button className="btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => { setActiveTab('dashboard'); setGeneratedCases([]); setRequirements(''); setGenerationPhase(0); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
            <Zap size={16} /> New Generation
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">{user.initials}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <ChevronDown size={14} color="var(--on-surface-variant)" />
          </div>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <div className="breadcrumb">
              <span>AI TestGen</span>
              <span className="separator">/</span>
              <span className="current">{TAB_TITLES[activeTab]}</span>
            </div>
          </div>
          <div className="top-header-right">
            <div className="search-box">
              <Search size={14} color="var(--on-surface-variant)" />
              <input type="text" placeholder="Search test suites..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button className="icon-btn" title="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell size={16} />
                <span className="notification-dot"></span>
              </button>
              {showNotifications && (
                <div className="user-dropdown" style={{ right: '-10px', minWidth: '300px' }}>
                  <div className="dropdown-header">
                    <div className="name">Notifications</div>
                  </div>
                  <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface)' }}>Test Run Completed</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>E-Commerce Checkout flow successfully generated 14 test cases.</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: 4 }}>10 minutes ago</div>
                  </div>
                  <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--outline-variant)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface)' }}>System Update</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>AI TestGen v2.0 update installed successfully.</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: 4 }}>2 hours ago</div>
                  </div>
                  <button style={{ justifyContent: 'center', color: 'var(--primary)' }}>Mark all as read</button>
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div className="header-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                {user.initials}
              </div>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="name">{user.name}</div>
                    <div className="email">{user.email}</div>
                  </div>
                  <button onClick={() => { setActiveTab('settings'); setShowUserMenu(false); }}><User size={14} /> Profile & Settings</button>
                  <button onClick={() => { setActiveTab('help'); setShowUserMenu(false); }}><HelpCircle size={14} /> Help Center</button>
                  <button className="danger" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content" key={activeTab}>

          {/* ═══════════════════════════════
              DASHBOARD TAB
              ═══════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Stats Row */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--primary-transparent)', color: 'var(--primary)' }}><FileText size={20} /></div>
                  <div className="stat-value">{totalGenerated}</div>
                  <div className="stat-label">Total Tests Generated</div>
                  <div className="stat-change up">↑ 12% this week</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><CheckCircle2 size={20} /></div>
                  <div className="stat-value">{Math.round(totalGenerated * 0.78)}</div>
                  <div className="stat-label">Tests Passed</div>
                  <div className="stat-change up">↑ 5% from last run</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}><AlertTriangle size={20} /></div>
                  <div className="stat-value">{Math.round(totalGenerated * 0.08)}</div>
                  <div className="stat-label">Defects Found</div>
                  <div className="stat-change down">↓ 3% regression</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><Clock size={20} /></div>
                  <div className="stat-value">{daysLeft}</div>
                  <div className="stat-label">Days to Release</div>
                  <div className="stat-change" style={{ color: daysLeft < 7 ? 'var(--error)' : 'var(--success)' }}>{daysLeft < 7 ? '⚠ Urgent' : '✓ On Track'}</div>
                </div>
              </div>

              {/* Hero Input Area */}
              <div className="card mb-8">
                <div className="flex-col items-center mb-6" style={{ textAlign: 'center' }}>
                  <h1 className="display-lg">Transform Requirements into Precision Tests</h1>
                  <p className="body-md" style={{ maxWidth: '600px' }}>Paste your functional requirements or user stories below. Our AI engine will analyze logic paths and generate comprehensive test scenarios.</p>
                </div>

                <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-5)', minHeight: '140px', marginBottom: 'var(--spacing-6)', border: '1.5px solid var(--outline-variant)', transition: 'all var(--transition-fast)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}>
                  <textarea
                    style={{ width: '100%', height: '100px', border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'var(--on-surface)', lineHeight: '1.6' }}
                    placeholder="Enter your requirement (e.g., User should be able to reset password via email OTP...)"
                    value={requirements}
                    onChange={e => setRequirements(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="label-sm" style={{ color: 'var(--outline)' }}>( Markdown supported )</span>
                    <span className="label-sm">{requirements.length} characters</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="label-md mb-4 flex items-center gap-2"><PieChartIcon size={14} /> TEST STRATEGY SELECTION</h3>
                  <div className="strategy-grid">
                    {STRATEGIES.map(s => (
                      <div key={s.id} onClick={() => setTestType(s.id)} className={`strategy-card ${testType === s.id ? 'selected' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div style={{ padding: '0.4rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>{s.icon}</div>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid ${testType === s.id ? 'var(--primary)' : 'var(--outline-variant)'}`, background: testType === s.id ? 'var(--primary-transparent)' : 'transparent' }}></div>
                        </div>
                        <h4>{s.title}</h4>
                        <p>{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {generationPhase > 0 && (
                  <div className="pipeline-container">
                    <div className="pipeline-line">
                      <div className="pipeline-line-fill" style={{ width: `${(generationPhase - 1) * 33.3}%` }}></div>
                    </div>
                    {PIPELINE_STEPS.map(step => {
                      const isActive = generationPhase === step.id;
                      const isCompleted = generationPhase > step.id;
                      return (
                        <div key={step.id} className={`pipeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                          <div className="pipeline-icon-container">
                            {isCompleted ? <Check size={18} strokeWidth={3} /> : isActive ? <Loader2 size={18} className="spin-animation" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--outline-variant)' }}></div>}
                          </div>
                          <span className="pipeline-label">{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {generationPhase === 0 && (
                  <div className="flex justify-center mt-4">
                    <button className="btn-primary" onClick={handleGenerate} disabled={loading || !requirements.trim()} style={{ padding: '0.75rem 2rem' }}>
                      <Zap size={16} /> Generate Test Cases <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Dashboard Grid: Release Readiness */}
              <div className="mb-8">
                <h3 className="label-md mb-2">PORTFOLIO INSIGHTS</h3>
                <h2 className="headline-sm mb-4" style={{ marginTop: 0 }}>Release Readiness</h2>

                <div className="dashboard-grid">
                  <div className="card flex justify-between items-start">
                    <div style={{ flex: 1 }}>
                      <h3 className="title-md" style={{ color: 'var(--primary)' }}>Version 2.0</h3>
                      <p className="label-sm mb-6">RELEASE: {releaseFormatted}</p>

                      <div className="mb-4">
                        <div className="flex justify-between label-sm mb-1">
                          <span>DAYS TO DELIVERY</span>
                          <span style={{ color: daysLeft < 7 ? 'var(--error)' : 'var(--warning)' }}>{daysLeft} DAYS LEFT</span>
                        </div>
                        <div className="progress-container"><div className="progress-fill" style={{ width: `${Math.min(100, Math.max(5, 100 - (daysLeft / 30 * 100)))}%`, background: 'var(--secondary)' }}></div></div>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between label-sm mb-1">
                          <span>DEVELOPMENT</span>
                          <span style={{ color: 'var(--primary)' }}>85%</span>
                        </div>
                        <div className="progress-container"><div className="progress-fill" style={{ width: '85%' }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between label-sm mb-1">
                          <span>TEST COVERAGE</span>
                          <span style={{ color: 'var(--success)' }}>75%</span>
                        </div>
                        <div className="progress-container"><div className="progress-fill success" style={{ width: '75%' }}></div></div>
                      </div>
                    </div>
                    <div className="flex-col gap-4 items-center" style={{ width: '120px', borderLeft: '1px dashed var(--outline-variant)', marginLeft: 'var(--spacing-4)', paddingLeft: 'var(--spacing-4)' }}>
                      <div className="flex-col items-center">
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>23</div>
                        <span className="label-sm mt-1">TOTAL DEFECTS</span>
                      </div>
                      <div className="flex-col items-center">
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid var(--error)', borderTopColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>04</div>
                        <span className="label-sm mt-1">MAJOR</span>
                      </div>
                    </div>
                  </div>

                  <div className="card flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="title-md">Test Activities Trend</h3>
                      <span className="label-sm" style={{ padding: '0.2rem 0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>Last 7 days</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: '60%', height: '100px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={TREND_DATA}>
                            <Line type="monotone" dataKey="passed" stroke="var(--primary)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="failed" stroke="var(--success)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-col items-center justify-center" style={{ width: '40%' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid var(--success)', borderTopColor: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}>21</div>
                        <span className="label-sm text-center mt-1">TOTAL RUNS</span>
                        <div className="flex-col gap-1 mt-2 label-sm">
                          <span style={{ color: 'var(--success)' }}>● Passed: 14</span>
                          <span style={{ color: 'var(--error)' }}>● Failed: 07</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Insights */}
              <div className="mb-8">
                <h3 className="label-md mb-2">PERFORMANCE ANALYTICS</h3>
                <h2 className="headline-sm mb-4" style={{ marginTop: 0 }}>Execution Insights</h2>

                <div className="dashboard-grid">
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="title-md">Test Case Distribution</h3>
                      <span className="label-sm" style={{ background: 'var(--surface)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>TOTAL {generatedCases.length || 4}</span>
                    </div>
                    <div className="flex-col gap-6">
                      {DISTRIBUTION_DATA.map(d => (
                        <div key={d.name}>
                          <div className="flex justify-between label-sm mb-2">
                            <span style={{ color: d.color, fontWeight: 600 }}>{d.name} Paths</span>
                            <span>{d.value}%</span>
                          </div>
                          <div className="progress-container" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${d.value}%`, background: d.color }}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <h3 className="title-md">Live Execution Status</h3>
                      <span className="label-sm" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'pulse-ring 2s infinite' }}></span> LIVE
                      </span>
                    </div>
                    <div className="flex justify-center my-6">
                      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={[{ value: 75 }, { value: 25 }]} innerRadius={35} outerRadius={45} dataKey="value" stroke="none">
                              <Cell fill="var(--primary)" />
                              <Cell fill="var(--surface-container-highest)" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>75%</span>
                          <span className="label-sm">PROGRESS</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div style={{ flex: 1, background: 'var(--success-bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>2</div>
                        <div className="label-sm" style={{ color: 'var(--success)', fontSize: '0.6rem' }}>PASSED</div>
                      </div>
                      <div style={{ flex: 1, background: 'var(--error-bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--error)', fontWeight: 'bold' }}>1</div>
                        <div className="label-sm" style={{ color: 'var(--error)', fontSize: '0.6rem' }}>FAILED</div>
                      </div>
                      <div style={{ flex: 1, background: 'var(--primary-transparent)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                        <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>1</div>
                        <div className="label-sm" style={{ color: 'var(--primary)', fontSize: '0.6rem' }}>RUNNING</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Test Suite with Insights */}
              {generatedCases.length > 0 && (
                <div>
                  <h3 className="label-md mb-2">EXECUTION OUTPUT</h3>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="headline-sm" style={{ marginTop: 0 }}>Generated Test Suite <span className="label-sm" style={{ background: 'var(--primary-transparent)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{generatedCases.length} RESULTS</span></h2>
                    <button className="btn-secondary"><FileText size={14} /> Quick Export</button>
                  </div>

                  {/* Graphical Insights Panel */}
                  <TestInsightsPanel cases={generatedCases} />

                  {/* Data Table */}
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>DESCRIPTION</th>
                          <th>STEPS</th>
                          <th>EXPECTED RESULT</th>
                          <th>TYPE</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedCases.map(tc => (
                          <tr key={tc.tcId || tc._id || tc.title} className={`type-${(tc.typeBadge || 'positive').toLowerCase()}`}>
                            <td><span className="tc-id">{tc.tcId || 'TC-00X'}</span></td>
                            <td style={{ fontWeight: 500 }}>{tc.title}</td>
                            <td>
                              <ul className="steps-list">
                                {tc.steps?.map((step, i) => (<li key={i}>{typeof step === 'string' ? step : step.action}</li>))}
                              </ul>
                            </td>
                            <td className="body-md">{tc.expectedResult || 'System behaves as expected.'}</td>
                            <td>
                              <div className="flex-col gap-1 items-start">
                                <span className={`badge ${tc.typeBadge?.toLowerCase() || 'positive'}`}>{tc.typeBadge || 'POSITIVE'}</span>
                                <span className="badge-outline">
                                  <span className={`dot ${tc.urgency?.toLowerCase() || 'high'}`}></span> {tc.urgency || 'HIGH'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-2"><Edit2 size={14} className="action-icon" /><Code size={14} className="action-icon" /><Trash2 size={14} className="action-icon" /></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════
              HISTORY TAB
              ═══════════════════════════════ */}
          {activeTab === 'history' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="display-lg" style={{ marginBottom: 0 }}>Generation History</h1>
                  <p className="body-md">Track all your past test generations and revisit results.</p>
                </div>
                <button className="btn-secondary" onClick={fetchHistory}><RefreshCw size={14} /> Refresh</button>
              </div>

              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><History size={32} /></div>
                  <h3>No history yet</h3>
                  <p>Generate your first test suite from the Dashboard and it will appear here.</p>
                  <button className="btn-primary mt-4" onClick={() => setActiveTab('dashboard')}><Zap size={14} /> Go to Dashboard</button>
                </div>
              ) : (
                <div className="flex-col gap-3">
                  {history.map((h, i) => (
                    <div key={h.id || i} className="history-card">
                      <div className="history-icon"><FileText size={20} /></div>
                      <div className="history-meta">
                        <div className="history-title">{h.input?.substring(0, 80) || 'Untitled generation'}...</div>
                        <div className="history-detail">
                          <span><Clock size={12} /> {new Date(h.date).toLocaleString()}</span>
                          <span><Hash size={12} /> {h.count} cases</span>
                          <span className="badge positive" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{h.type}</span>
                          <span className="label-sm" style={{ color: h.source === 'server' ? 'var(--info)' : 'var(--on-surface-variant)' }}>{h.source === 'server' ? '☁ Server' : '💾 Local'}</span>
                        </div>
                      </div>
                      <div className="history-actions">
                        {h.source === 'local' && (
                          <button className="icon-btn" onClick={() => deleteHistoryEntry(h.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════
              SETTINGS TAB
              ═══════════════════════════════ */}
          {activeTab === 'settings' && (
            <div>
              <h1 className="display-lg" style={{ marginBottom: 0 }}>Settings</h1>
              <p className="body-md mb-6">Manage your application preferences, integrations, and account.</p>

              <div className="settings-grid">
                <div className="card" style={{ padding: 'var(--spacing-3)' }}>
                  <nav className="settings-nav">
                    {[
                      { id: 'general', icon: <Settings size={16} />, label: 'General' },
                      { id: 'appearance', icon: <Monitor size={16} />, label: 'Appearance' },
                      { id: 'notifications', icon: <Bell size={16} />, label: 'Notifications' },
                      { id: 'api', icon: <Globe size={16} />, label: 'API & Integrations' },
                      { id: 'account', icon: <User size={16} />, label: 'Account' },
                    ].map(item => (
                      <button key={item.id} onClick={() => setSettingsTab(item.id)} className={`settings-nav-item ${settingsTab === item.id ? 'active' : ''}`}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="card settings-section">
                  {settingsTab === 'general' && (
                    <>
                      <h2>General Settings</h2>
                      <p className="section-desc">Configure core application behavior.</p>

                      <div className="form-group">
                        <label>Release Target Date</label>
                        <input className="form-input" type="date" value={settings.releaseDate} onChange={e => saveSettings({ releaseDate: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Default Test Strategy</label>
                        <select className="select-field" value={settings.defaultStrategy} onChange={e => saveSettings({ defaultStrategy: e.target.value })}>
                          {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Export Format</label>
                        <select className="select-field" value={settings.exportFormat} onChange={e => saveSettings({ exportFormat: e.target.value })}>
                          <option value="JSON">JSON</option>
                          <option value="CSV">CSV</option>
                          <option value="PDF">PDF (coming soon)</option>
                        </select>
                      </div>
                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Auto-save History</span>
                          <span className="toggle-desc">Automatically save every generation to local history.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={settings.autoSaveHistory} onChange={e => saveSettings({ autoSaveHistory: e.target.checked })} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </>
                  )}

                  {settingsTab === 'appearance' && (
                    <>
                      <h2>Appearance</h2>
                      <p className="section-desc">Customize how AI TestGen looks and feels.</p>

                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Dark Mode</span>
                          <span className="toggle-desc">Switch between light and dark theme.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Compact View</span>
                          <span className="toggle-desc">Reduce padding and spacing for denser information.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Animations</span>
                          <span className="toggle-desc">Enable smooth transitions and micro-animations.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" defaultChecked />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </>
                  )}

                  {settingsTab === 'notifications' && (
                    <>
                      <h2>Notifications</h2>
                      <p className="section-desc">Control how and when you receive alerts.</p>

                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Email Notifications</span>
                          <span className="toggle-desc">Receive generation reports via email.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={settings.emailNotifications} onChange={e => saveSettings({ emailNotifications: e.target.checked })} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Browser Push Notifications</span>
                          <span className="toggle-desc">Get notified when long-running generations complete.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" defaultChecked />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="toggle-wrapper">
                        <div className="toggle-info">
                          <span className="toggle-label">Weekly Summary</span>
                          <span className="toggle-desc">Receive a weekly digest of test generation activity.</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </>
                  )}

                  {settingsTab === 'api' && (
                    <>
                      <h2>API & Integrations</h2>
                      <p className="section-desc">Manage API endpoints and third-party connections.</p>

                      <div className="form-group">
                        <label>API Base URL</label>
                        <input className="form-input" type="text" value={settings.apiEndpoint} onChange={e => saveSettings({ apiEndpoint: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>API Key (optional)</label>
                        <input className="form-input" type="password" placeholder="sk-xxxx-xxxx-xxxx" />
                      </div>

                      <div style={{ marginTop: 'var(--spacing-6)', padding: 'var(--spacing-4)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--success)' }}>Backend Connected</div>
                          <div className="label-sm">Last ping: {new Date().toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </>
                  )}

                  {settingsTab === 'account' && (
                    <>
                      <h2>Account</h2>
                      <p className="section-desc">Manage your admin profile and session.</p>

                      <div className="flex items-center gap-4 mb-6" style={{ padding: 'var(--spacing-4)', background: 'var(--surface-container-high)', borderRadius: 'var(--radius-lg)' }}>
                        <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>{user.initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{user.name}</div>
                          <div className="body-md">{user.email}</div>
                          <span className="badge positive mt-1">{user.role}</span>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Display Name</label>
                        <input className="form-input" type="text" defaultValue={user.name} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" defaultValue={user.email} readOnly style={{ opacity: 0.6 }} />
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button className="btn-primary"><Check size={14} /> Save Changes</button>
                        <button className="btn-danger" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════
              HELP TAB
              ═══════════════════════════════ */}
          {activeTab === 'help' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="display-lg" style={{ marginBottom: 0 }}>Help & Documentation</h1>
                  <p className="body-md">Everything you need to get started and make the most of AI TestGen.</p>
                </div>
              </div>

              {/* Quick Start Features */}
              <h3 className="label-md mb-4">QUICK START GUIDE</h3>
              <div className="help-grid mb-8">
                <div className="help-feature-card">
                  <div className="help-feature-icon" style={{ background: 'var(--primary-transparent)', color: 'var(--primary)' }}><FileText size={22} /></div>
                  <div>
                    <h3>1. Enter Requirements</h3>
                    <p>Paste or type your functional requirements, user stories, or acceptance criteria into the input area on the Dashboard.</p>
                  </div>
                </div>
                <div className="help-feature-card">
                  <div className="help-feature-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><PieChartIcon size={22} /></div>
                  <div>
                    <h3>2. Choose Strategy</h3>
                    <p>Select from 10 test strategies (Functional, Security, API, Performance, etc.) to get domain-specific test cases.</p>
                  </div>
                </div>
                <div className="help-feature-card">
                  <div className="help-feature-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Zap size={22} /></div>
                  <div>
                    <h3>3. Generate & Review</h3>
                    <p>Click Generate and watch the AI pipeline parse, analyze, and compile your test suite in real-time.</p>
                  </div>
                </div>
                <div className="help-feature-card">
                  <div className="help-feature-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><ExternalLink size={22} /></div>
                  <div>
                    <h3>4. Export & Integrate</h3>
                    <p>Export results as JSON or CSV. History is auto-saved locally so you never lose your work.</p>
                  </div>
                </div>
              </div>

              {/* FAQ Accordion */}
              <h3 className="label-md mb-4">FREQUENTLY ASKED QUESTIONS</h3>
              <div className="accordion mb-8">
                {FAQ_DATA.map((faq, i) => (
                  <div key={i} className={`accordion-item ${openFaq === i ? 'open' : ''}`}>
                    <button className="accordion-trigger" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      {faq.q}
                      <ChevronDown size={16} className="chevron" />
                    </button>
                    {openFaq === i && <div className="accordion-body">{faq.a}</div>}
                  </div>
                ))}
              </div>

              {/* Keyboard Shortcuts */}
              <h3 className="label-md mb-4">KEYBOARD SHORTCUTS</h3>
              <div className="card mb-8">
                <table className="shortcuts-table">
                  <tbody>
                    <tr><td>New Generation</td><td><span className="kbd">Ctrl</span> + <span className="kbd">N</span></td></tr>
                    <tr><td>Search</td><td><span className="kbd">Ctrl</span> + <span className="kbd">K</span></td></tr>
                    <tr><td>Toggle Dark Mode</td><td><span className="kbd">Ctrl</span> + <span className="kbd">D</span></td></tr>
                    <tr><td>Go to Dashboard</td><td><span className="kbd">Ctrl</span> + <span className="kbd">1</span></td></tr>
                    <tr><td>Go to History</td><td><span className="kbd">Ctrl</span> + <span className="kbd">2</span></td></tr>
                    <tr><td>Go to Settings</td><td><span className="kbd">Ctrl</span> + <span className="kbd">3</span></td></tr>
                  </tbody>
                </table>
              </div>

              {/* Support Footer */}
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
                <div className="help-feature-icon" style={{ background: 'var(--primary-transparent)', color: 'var(--primary)', width: '56px', height: '56px' }}><MessageSquare size={24} /></div>
                <div style={{ flex: 1 }}>
                  <h3 className="title-md">Need more help?</h3>
                  <p className="body-md">Reach out to our support team or check the full documentation for advanced features and API reference.</p>
                </div>
                <div className="flex gap-3">
                  <button className="btn-secondary"><Mail size={14} /> Email Support</button>
                  <button className="btn-primary"><BookOpen size={14} /> Full Docs</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
