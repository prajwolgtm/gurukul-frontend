import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import AcademicYearFilter from '../components/AcademicYearFilter';
import api from '../api/client';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const StatCard = ({ label, value, detail, tone = 'blue' }) => (
  <section className={`dashboard-stat dashboard-stat-${tone}`}>
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  </section>
);

const StatusPill = ({ label, value, tone }) => (
  <span className={`dashboard-pill dashboard-pill-${tone}`}>
    <strong>{formatNumber(value)}</strong>
    {label}
  </span>
);

const Panel = ({ title, action, children }) => (
  <section className="dashboard-panel">
    <header>
      <h2>{title}</h2>
      {action}
    </header>
    {children}
  </section>
);

const EmptyState = ({ label }) => (
  <div className="dashboard-empty">{label}</div>
);

const QuickAction = ({ item }) => (
  <Link to={item.href} className="dashboard-action">
    <strong>{item.label}</strong>
    <span>{item.description}</span>
  </Link>
);

const getMenuForRole = (role) => {
  const adminMenu = [
    { label: 'Attendance', href: '/attendance', description: 'Mark daily attendance' },
    { label: 'Create Staff Account', href: '/register-staff', description: 'Add teacher, staff, or security login' },
    { label: 'Departments', href: '/departments', description: 'Manage Veda and departments' },
    { label: 'Students', href: '/students', description: 'Admissions and records' },
    { label: 'Teachers', href: '/teachers', description: 'Staff profiles' },
    { label: 'Exams', href: '/exams', description: 'Create and manage exams' },
    { label: 'Requests', href: '/requests', description: 'Leave and visit requests' },
    { label: 'Classes', href: '/classes', description: 'Class assignments' },
    { label: 'Reports', href: '/reports', description: 'Attendance and academics' },
    { label: 'Results', href: '/exam-results', description: 'Published results' }
  ];

  const teacherMenu = [
    { label: 'Attendance', href: '/attendance', description: 'Mark daily attendance' },
    { label: 'Classes', href: '/classes', description: 'Your classes' },
    { label: 'Exams', href: '/exams', description: 'Manage exams' },
    { label: 'Results', href: '/exam-results', description: 'View results' },
    { label: 'Reports', href: '/reports', description: 'Reports' }
  ];

  const caretakerMenu = [
    { label: 'Attendance', href: '/attendance', description: 'Mark daily attendance' },
    { label: 'Students', href: '/students', description: 'View students' },
    { label: 'Reports', href: '/reports', description: 'View reports' }
  ];

  switch (role) {
    case ROLES.ADMIN:
    case ROLES.PRINCIPAL:
    case ROLES.COORDINATOR:
      return adminMenu;
    case ROLES.TEACHER:
      return teacherMenu;
    case ROLES.CARETAKER:
      return caretakerMenu;
    default:
      return adminMenu;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canTakeAttendance = user?.role && user.role !== ROLES.PARENT;

  useEffect(() => {
    if (academicYear !== null) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  useEffect(() => {
    if (user?.role === ROLES.PARENT) {
      navigate('/parent-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (academicYear && academicYear !== 'all') params.academicYear = academicYear;

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

  if (user?.role === ROLES.PARENT) {
    return (
      <div className="dashboard-center-state">
        <p>Redirecting to your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-alert">
        Please log in to view your dashboard.
      </div>
    );
  }

  const menu = getMenuForRole(user.role);
  const stats = dashboardData?.statistics || {};
  const academicYearLabel = dashboardData?.academicYear || academicYear || 'Current year';
  const attendanceRate = stats?.attendance?.rate || 0;

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">School overview</span>
          <h1>Welcome back, {user.fullName || 'User'}</h1>
          <p>Monitor students, exams, attendance, and requests for the selected academic year.</p>
        </div>

        <div className="dashboard-hero-actions">
          {canTakeAttendance && (
            <Link to="/attendance" className="dashboard-primary-action">
              Take Attendance
            </Link>
          )}
          <AcademicYearFilter value={academicYear} onChange={setAcademicYear} size="sm" />
        </div>
      </section>

      {error && <div className="dashboard-alert">{error}</div>}

      {loading && (
        <div className="dashboard-loading">
          <span />
          Loading dashboard
        </div>
      )}

      {dashboardData && !loading && (
        <>
          <section className="dashboard-stats-grid">
            <StatCard
              label="Total Exams"
              value={formatNumber(stats?.exams?.total)}
              detail={`${formatNumber(stats?.exams?.completed)} completed, ${formatNumber(stats?.exams?.ongoing)} active`}
              tone="blue"
            />
            <StatCard
              label="Active Students"
              value={formatNumber(stats?.students?.active)}
              detail="Currently enrolled"
              tone="green"
            />
            <StatCard
              label="Graduated Students"
              value={formatNumber(stats?.students?.graduated)}
              detail="Completed studies"
              tone="slate"
            />
            <StatCard
              label="Active Classes"
              value={formatNumber(stats?.classes?.active)}
              detail={`of ${formatNumber(stats?.classes?.total)} total`}
              tone="amber"
            />
            <StatCard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              detail={`${formatNumber(stats?.attendance?.present)} / ${formatNumber(stats?.attendance?.totalSessions)} sessions`}
              tone="purple"
            />
          </section>

          <section className="dashboard-main-grid">
            <Panel title="Requests Summary">
              <div className="dashboard-request-grid">
                <div className="dashboard-request-box">
                  <h3>Leave Requests</h3>
                  <div>
                    <StatusPill label="Pending" value={stats?.requests?.leave?.pending} tone="amber" />
                    <StatusPill label="Approved" value={stats?.requests?.leave?.approved} tone="green" />
                    <StatusPill label="Rejected" value={stats?.requests?.leave?.rejected} tone="red" />
                  </div>
                </div>
                <div className="dashboard-request-box">
                  <h3>Visit Requests</h3>
                  <div>
                    <StatusPill label="Pending" value={stats?.requests?.visit?.pending} tone="amber" />
                    <StatusPill label="Approved" value={stats?.requests?.visit?.approved} tone="green" />
                  </div>
                </div>
              </div>
            </Panel>

            <section className="dashboard-year-card">
              <span>Academic Year</span>
              <strong>{academicYearLabel}</strong>
              <p>Current selection</p>
              <dl>
                <div>
                  <dt>Total Teachers</dt>
                  <dd>{formatNumber(stats?.teachers?.total)}</dd>
                </div>
                <div>
                  <dt>Total Classes</dt>
                  <dd>{formatNumber(stats?.classes?.total)}</dd>
                </div>
              </dl>
            </section>
          </section>

          <section className="dashboard-activity-grid">
            <Panel
              title="Recent Exams"
              action={<Link to="/exams">View all</Link>}
            >
              <div className="dashboard-list">
                {dashboardData.recentActivity?.exams?.length > 0 ? (
                  dashboardData.recentActivity.exams.slice(0, 4).map((exam, idx) => (
                    <div key={idx} className="dashboard-list-row">
                      <div>
                        <strong>{exam.name}</strong>
                        <span>{exam.subject || 'No subject'}</span>
                      </div>
                      <em>{exam.status}</em>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No recent exams" />
                )}
              </div>
            </Panel>

            <Panel
              title="Recent Results"
              action={<Link to="/exam-results">View all</Link>}
            >
              <div className="dashboard-list">
                {dashboardData.recentActivity?.results?.length > 0 ? (
                  dashboardData.recentActivity.results.slice(0, 4).map((result, idx) => (
                    <div key={idx} className="dashboard-list-row">
                      <div>
                        <strong>{result.studentName}</strong>
                        <span>{result.examName}</span>
                      </div>
                      <em>{Math.round(result.percentage || 0)}%</em>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No recent results" />
                )}
              </div>
            </Panel>
          </section>
        </>
      )}

      <Panel title="Quick Access">
        <div className="dashboard-actions-grid">
          {menu.map((item) => (
            <QuickAction key={item.href} item={item} />
          ))}
        </div>
      </Panel>
    </main>
  );
};

export default Dashboard;
