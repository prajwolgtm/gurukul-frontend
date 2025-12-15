import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import AcademicYearFilter from '../components/AcademicYearFilter';
import api from '../api/client';

const PAGE_STYLE = {
  minHeight: 'calc(100vh - 120px)',
  background: 'linear-gradient(180deg, #f6f8fc 0%, #ffffff 60%)',
  borderRadius: '12px',
  padding: '16px'
};

const CARD_STYLE = {
  height: '100%',
  border: '1px solid #eef1f7',
  borderRadius: '12px',
  background: '#ffffff',
  boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
  transition: 'transform 140ms ease, box-shadow 140ms ease'
};

const MenuGrid = ({ title, subtitle, items }) => (
  <div>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h4 className="mb-0">{title}</h4>
        {subtitle && <small className="text-muted">{subtitle}</small>}
      </div>
    </div>
    <Row xs={1} sm={2} md={3} lg={4} className="g-3">
      {items.map((item) => (
        <Col key={item.label}>
          <Card
            style={CARD_STYLE}
            className="h-100"
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.14)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.08)')}
          >
            <Card.Body className="d-flex flex-column">
              <div className="fw-bold mb-1" style={{ fontSize: '1.05rem' }}>{item.label}</div>
              <div className="text-muted small mb-3">{item.description}</div>
              <Button
                variant={item.variant || 'primary'}
                href={item.href}
                className="mt-auto w-100"
                size="sm"
                style={{ borderRadius: '10px', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.25)' }}
              >
                {item.cta || 'Open'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  </div>
);

const getMenuForRole = (role) => {
  // Cleaner, more consistent icon set
  const adminMenu = [
    { label: 'Departments', href: '/departments', description: 'Manage departments & batches' },
    { label: 'Students', href: '/students', description: 'Enroll & manage students' },
    { label: 'Teachers', href: '/teachers', description: 'Manage teachers & roles' },
    { label: 'Exams', href: '/exams', description: 'Create & schedule exams' },
    { label: 'Requests', href: '/requests', description: 'Leave & visit approvals' },
    { label: 'Classes', href: '/classes', description: 'Class management & attendance' },
    { label: 'Reports', href: '/reports', description: 'Academic & attendance reports' },
    { label: 'Exam Results', href: '/exam-results', description: 'View results & marksheets' },
    { label: 'Password Reset', href: '/password-reset', description: 'Admin password reset' },
    { label: 'Academic Year Settings', href: '/academic-year-settings', description: 'Configure academic year start date' }
  ];

  const teacherMenu = [
    { label: 'My Classes', href: '/classes', description: 'View & manage your classes' },
    { label: 'Mark Attendance', href: '/classes', description: 'Mark attendance from classes' },
    { label: 'Exams', href: '/exams', description: 'Manage exams & marks' },
    { label: 'Exam Results', href: '/exam-results', description: 'View student results' },
    { label: 'Requests', href: '/requests', description: 'Approve leave/visit requests' },
    { label: 'Reports', href: '/reports', description: 'Class & exam reports' }
  ];

  const hodMenu = [
    { label: 'Departments', href: '/departments', description: 'Manage sub-departments & batches' },
    { label: 'Teachers', href: '/teachers', description: 'Assign & verify teachers' },
    { label: 'Exams', href: '/exams', description: 'Create & schedule exams' },
    { label: 'Classes', href: '/classes', description: 'Class schedules & attendance' },
    { label: 'Reports', href: '/reports', description: 'Department performance' }
  ];

  const parentMenu = [
    { label: 'Student Profile', href: '/students', description: 'View your child profile' },
    { label: 'Attendance', href: '/attendance', description: 'Track attendance' },
    { label: 'Exam Results', href: '/exam-results', description: 'Results & marksheets' },
    { label: 'Requests', href: '/requests', description: 'Leave & visit requests' }
  ];

  switch (role) {
    case ROLES.ADMIN:
    case ROLES.PRINCIPAL:
      return adminMenu;
    case ROLES.HOD:
      return hodMenu;
    case ROLES.TEACHER:
      return teacherMenu;
    case ROLES.PARENT:
      return parentMenu;
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
      <Alert variant="warning">
        Please log in to view your dashboard.
      </Alert>
    );
  }

  const menu = getMenuForRole(user.role);
  const stats = dashboardData?.statistics;

  return (
    <div className="py-3" style={PAGE_STYLE}>
      <div className="mb-4">
        <Row className="align-items-center">
          <Col>
            <h2 className="mb-1">Welcome{user.fullName ? `, ${user.fullName}` : ''}</h2>
            <div className="text-muted">
              Overview of your academic year performance
            </div>
          </Col>
          <Col xs="auto">
            <AcademicYearFilter
              value={academicYear}
              onChange={setAcademicYear}
              size="sm"
              label="Academic Year"
            />
          </Col>
        </Row>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center my-4">
          <Spinner animation="border" />
        </div>
      )}

      {dashboardData && !loading && (
        <>
          {/* Statistics Cards */}
          <Row className="mb-4 g-3">
            <Col md={3} sm={6}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Exams</div>
                  <h3 className="mb-0">{stats?.exams?.total || 0}</h3>
                  <div className="mt-2">
                    <Badge bg="success" className="me-1">{stats?.exams?.completed || 0} Completed</Badge>
                    <Badge bg="warning">{stats?.exams?.ongoing || 0} Ongoing</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Students</div>
                  <h3 className="mb-0">{stats?.students?.total || 0}</h3>
                  <div className="text-muted small mt-2">
                    Across all departments
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Active Classes</div>
                  <h3 className="mb-0">{stats?.classes?.active || 0}</h3>
                  <div className="text-muted small mt-2">
                    of {stats?.classes?.total || 0} total classes
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Attendance Rate</div>
                  <h3 className="mb-0">{stats?.attendance?.rate || 0}%</h3>
                  <div className="text-muted small mt-2">
                    {stats?.attendance?.present || 0} present / {stats?.attendance?.totalSessions || 0} sessions
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Requests & Teachers */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Header className="bg-white border-0">
                  <div className="fw-bold">Requests Summary</div>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col>
                      <div className="text-muted small">Leave Requests</div>
                      <div className="d-flex gap-2 mt-1">
                        <Badge bg="warning">{stats?.requests?.leave?.pending || 0} Pending</Badge>
                        <Badge bg="success">{stats?.requests?.leave?.approved || 0} Approved</Badge>
                        <Badge bg="danger">{stats?.requests?.leave?.rejected || 0} Rejected</Badge>
                      </div>
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col>
                      <div className="text-muted small">Visit Requests</div>
                      <div className="d-flex gap-2 mt-1">
                        <Badge bg="warning">{stats?.requests?.visit?.pending || 0} Pending</Badge>
                        <Badge bg="success">{stats?.requests?.visit?.approved || 0} Approved</Badge>
                        <Badge bg="danger">{stats?.requests?.visit?.rejected || 0} Rejected</Badge>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Total Teachers</div>
                  <h3 className="mb-0">{stats?.teachers?.total || 0}</h3>
                  <div className="text-muted small mt-2">
                    Verified & Active
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card style={CARD_STYLE} className="h-100">
                <Card.Body>
                  <div className="text-muted small mb-1">Academic Year</div>
                  <h5 className="mb-0">{dashboardData?.academicYear || 'N/A'}</h5>
                  <div className="text-muted small mt-2">
                    Current selection
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Recent Activity */}
          {dashboardData?.recentActivity && (
            <Row className="mb-4 g-3">
              <Col md={6}>
                <Card style={CARD_STYLE} className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
                    <div className="fw-bold">Recent Exams</div>
                    <Button variant="outline-primary" size="sm" href="/exams">View All</Button>
                  </Card.Header>
                  <Card.Body>
                    {dashboardData.recentActivity.exams?.length > 0 ? (
                      dashboardData.recentActivity.exams.map((exam, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-2">
                          <div>
                            <div><strong>{exam.name}</strong> <Badge bg="secondary">{exam.status}</Badge></div>
                            <div className="text-muted small">{exam.subject}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small">No recent exams</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card style={CARD_STYLE} className="h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
                    <div className="fw-bold">Recent Results</div>
                    <Button variant="outline-primary" size="sm" href="/exam-results">View All</Button>
                  </Card.Header>
                  <Card.Body>
                    {dashboardData.recentActivity.results?.length > 0 ? (
                      dashboardData.recentActivity.results.map((result, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-2">
                          <div>
                            <div><strong>{result.studentName}</strong></div>
                            <div className="text-muted small">{result.examName} • {result.subject}</div>
                          </div>
                          <Badge bg="info">{Math.round(result.percentage || 0)}%</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small">No recent results</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Subject Performance */}
          {dashboardData?.subjectPerformance && dashboardData.subjectPerformance.length > 0 && (
            <Card style={CARD_STYLE} className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
                <div className="fw-bold">Top Performing Subjects</div>
                <Button variant="outline-primary" size="sm" href="/exam-results">View Details</Button>
              </Card.Header>
              <Card.Body>
                <Row>
                  {dashboardData.subjectPerformance.map((subject, idx) => (
                    <Col md={4} key={idx} className="mb-3">
                      <div className="border rounded p-3">
                        <div className="fw-bold mb-2">{subject.subject}</div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="text-muted small">Avg: {subject.averagePercentage}%</div>
                            <div className="text-muted small">Pass: {subject.passPercentage}%</div>
                          </div>
                          <Badge bg="success">{subject.totalStudents} students</Badge>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Quick Access Menu */}
      <div className="mt-4">
        <MenuGrid
          title="Quick Access"
          subtitle="Jump straight to the most used sections"
          items={menu}
        />
      </div>
    </div>
  );
};

export default Dashboard;
