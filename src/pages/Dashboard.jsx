import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import AcademicYearFilter from '../components/AcademicYearFilter';
import api from '../api/client';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, subtitle, icon, color, badges }) => {
  const colorClasses = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-200',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-200',
    sky: 'from-sky-500 to-blue-600 shadow-sky-200',
    amber: 'from-amber-500 to-orange-600 shadow-amber-200',
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          {badges && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((badge, i) => (
                <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const QuickAccessCard = ({ item }) => (
  <Link
    to={item.href}
    className="group block bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all border-2 border-transparent hover:border-violet-200"
  >
    <div className="text-3xl mb-3">{item.icon}</div>
    <h4 className="font-semibold text-slate-800 group-hover:text-violet-600 transition-colors">
      {item.label}
    </h4>
    <p className="text-sm text-slate-500 mt-1">{item.description}</p>
  </Link>
);

const getMenuForRole = (role) => {
  const adminMenu = [
    { label: 'Departments', href: '/departments', description: 'Manage departments', icon: '🏛️' },
    { label: 'Students', href: '/students', description: 'Student management', icon: '👨‍🎓' },
    { label: 'Teachers', href: '/teachers', description: 'Teacher management', icon: '👨‍🏫' },
    { label: 'Exams', href: '/exams', description: 'Exam management', icon: '📝' },
    { label: 'Requests', href: '/requests', description: 'Leave & visit', icon: '📋' },
    { label: 'Classes', href: '/classes', description: 'Class management', icon: '🏫' },
    { label: 'Reports', href: '/reports', description: 'View reports', icon: '📈' },
    { label: 'Results', href: '/exam-results', description: 'Exam results', icon: '🏆' },
  ];

  const teacherMenu = [
    { label: 'Classes', href: '/classes', description: 'Your classes', icon: '🏫' },
    { label: 'Exams', href: '/exams', description: 'Manage exams', icon: '📝' },
    { label: 'Results', href: '/exam-results', description: 'View results', icon: '🏆' },
    { label: 'Reports', href: '/reports', description: 'Reports', icon: '📈' },
  ];

  switch (role) {
    case ROLES.ADMIN:
    case ROLES.PRINCIPAL:
    case ROLES.COORDINATOR:
      return adminMenu;
    case ROLES.TEACHER:
      return teacherMenu;
    default:
      return adminMenu;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [academicYear, setAcademicYear] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (academicYear !== null) {
      loadDashboardData();
    }
  }, [academicYear]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (academicYear && academicYear !== 'all') {
        params.academicYear = academicYear;
      }
      const { data } = await api.get('/dashboard/summary', { params });
      if (data?.success) {
        setDashboardData(data.data);
      } else {
        setError(data?.message || 'Failed to load dashboard');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-amber-100 text-amber-800 p-4 rounded-xl font-medium">
        Please log in to view your dashboard.
      </div>
    );
  }

  const menu = getMenuForRole(user.role);
  const stats = dashboardData?.statistics;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Welcome back, {user.fullName || 'User'} 👋
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening in your school today</p>
        </div>
        <AcademicYearFilter
          value={academicYear}
          onChange={setAcademicYear}
          size="sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        </div>
      )}

      {dashboardData && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Exams"
              value={stats?.exams?.total || 0}
              icon="📝"
              color="violet"
              badges={[
                { label: `${stats?.exams?.completed || 0} Done`, color: 'bg-emerald-100 text-emerald-700' },
                { label: `${stats?.exams?.ongoing || 0} Active`, color: 'bg-amber-100 text-amber-700' },
              ]}
            />
            <StatCard
              title="Total Students"
              value={stats?.students?.total || 0}
              subtitle="Across all departments"
              icon="👨‍🎓"
              color="emerald"
            />
            <StatCard
              title="Active Classes"
              value={stats?.classes?.active || 0}
              subtitle={`of ${stats?.classes?.total || 0} total`}
              icon="🏫"
              color="sky"
            />
            <StatCard
              title="Attendance Rate"
              value={`${stats?.attendance?.rate || 0}%`}
              subtitle={`${stats?.attendance?.present || 0} / ${stats?.attendance?.totalSessions || 0}`}
              icon="📊"
              color="amber"
            />
          </div>

          {/* Requests Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4">📋 Requests Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 mb-3 font-medium">Leave Requests</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                      {stats?.requests?.leave?.pending || 0} Pending
                    </span>
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                      {stats?.requests?.leave?.approved || 0} Approved
                    </span>
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-rose-100 text-rose-700">
                      {stats?.requests?.leave?.rejected || 0} Rejected
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 mb-3 font-medium">Visit Requests</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                      {stats?.requests?.visit?.pending || 0} Pending
                    </span>
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                      {stats?.requests?.visit?.approved || 0} Approved
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-violet-200">
              <p className="text-violet-200 text-sm font-medium">Academic Year</p>
              <h3 className="text-2xl font-bold mt-1">{dashboardData?.academicYear || 'N/A'}</h3>
              <p className="text-violet-200 text-sm mt-2">Current selection</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-violet-200 text-sm font-medium">Total Teachers</p>
                <h4 className="text-xl font-bold">{stats?.teachers?.total || 0}</h4>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData?.recentActivity && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">📝 Recent Exams</h3>
                  <Link to="/exams" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {dashboardData.recentActivity.exams?.length > 0 ? (
                    dashboardData.recentActivity.exams.slice(0, 4).map((exam, idx) => (
                      <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">{exam.name}</p>
                          <p className="text-sm text-slate-500">{exam.subject}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          exam.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {exam.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-12 text-center text-slate-400">No recent exams</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">🏆 Recent Results</h3>
                  <Link to="/exam-results" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                    View all →
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {dashboardData.recentActivity.results?.length > 0 ? (
                    dashboardData.recentActivity.results.slice(0, 4).map((result, idx) => (
                      <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-medium text-slate-800">{result.studentName}</p>
                          <p className="text-sm text-slate-500">{result.examName}</p>
                        </div>
                        <span className="text-lg font-bold text-violet-600">
                          {Math.round(result.percentage || 0)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-12 text-center text-slate-400">No recent results</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Access */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">⚡ Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {menu.map((item) => (
            <QuickAccessCard key={item.href} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
