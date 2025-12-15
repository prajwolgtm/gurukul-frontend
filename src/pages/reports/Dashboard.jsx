import { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, Button, Form } from 'react-bootstrap';
import api from '../../api/client';
import AcademicYearFilter from '../../components/AcademicYearFilter';

const CARD_STYLE = {
  height: '100%',
  border: '1px solid #eef1f7',
  borderRadius: '12px',
  background: '#ffffff',
  boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
  transition: 'transform 140ms ease, box-shadow 140ms ease'
};

const SectionCard = ({ title, actionLabel, actionHref, children }) => (
  <Card
    style={CARD_STYLE}
    className="h-100"
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.14)')}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.08)')}
  >
    <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
      <div className="fw-bold">{title}</div>
      {actionHref && (
        <Button variant="outline-primary" size="sm" href={actionHref}>
          {actionLabel || 'View'}
        </Button>
      )}
    </Card.Header>
    <Card.Body>{children}</Card.Body>
  </Card>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters (UI only; wire to endpoints when available)
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [academicYear, setAcademicYear] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (academicYear) {
        params.academicYear = academicYear;
      }
      const { data } = await api.get('/exam-reports/dashboard', { params });
      if (data?.success) setData(data.data);
      else setError(data?.message || 'Failed to load dashboard');
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [academicYear]);

  if (loading) return <div className="text-center my-4"><Spinner /></div>;
  if (error) return <Alert variant="danger" className="my-3">{error}</Alert>;
  if (!data) return null;

  return (
    <div style={{ background: 'linear-gradient(180deg, #f6f8fc 0%, #ffffff 55%)', padding: '12px', borderRadius: '12px' }}>
      {/* Filters */}
      <Card className="mb-3 border-0" style={{ boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <AcademicYearFilter
                value={academicYear}
                onChange={setAcademicYear}
                size="sm"
                label="Academic Year"
              />
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="text-muted small mb-1">Department</Form.Label>
                <Form.Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  size="sm"
                >
                  <option value="all">All Departments</option>
                  <option value="rig">Rig</option>
                  <option value="yajur">Yajur</option>
                  <option value="sama">Sama</option>
                  <option value="atharva">Atharva</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Label className="text-muted small mb-1">From</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={dateRange.from}
                onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="text-muted small mb-1">To</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={dateRange.to}
                onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <Form.Label className="text-muted small mb-1">Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Top metrics */}
      <Row className="mb-3">
        <Col md={3}>
          <Card style={CARD_STYLE} className="h-100">
            <Card.Body>
              <div className="text-muted small">Total Exams</div>
              <h4 className="mb-0">{data.examStatistics.totalExams}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={CARD_STYLE} className="h-100">
            <Card.Body>
              <div className="text-muted small">Completed</div>
              <h4 className="mb-0">{data.examStatistics.completedExams}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={CARD_STYLE} className="h-100">
            <Card.Body>
              <div className="text-muted small">Ongoing</div>
              <h4 className="mb-0">{data.examStatistics.ongoingExams}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card style={CARD_STYLE} className="h-100">
            <Card.Body>
              <div className="text-muted small">Scheduled</div>
              <h4 className="mb-0">{data.examStatistics.scheduledExams}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <SectionCard title="Upcoming Exams" actionHref="/exams" actionLabel="Open Exams">
            {(data.upcomingExams || []).length === 0 ? (
              <div className="text-muted small">None</div>
            ) : (
              (data.upcomingExams || []).map(e => (
                <div key={e.examId} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <div><strong>{e.examName}</strong> <Badge bg="secondary">{e.status}</Badge></div>
                    <div className="text-muted small">{e.subject} • {new Date(e.startDate).toLocaleDateString()}</div>
                  </div>
                  <div className="text-muted small">{e.daysUntil} days</div>
                </div>
              ))
            )}
          </SectionCard>
        </Col>
        <Col md={6}>
          <SectionCard title="Recent Published Results" actionHref="/exam-results" actionLabel="View Results">
            {(data.recentResults || []).length === 0 ? (
              <div className="text-muted small">None</div>
            ) : (
              (data.recentResults || []).map((r, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <div><strong>{r.studentName}</strong> • {r.examName}</div>
                    <div className="text-muted small">{r.subject}</div>
                  </div>
                  <Badge bg="info">{Math.round(r.percentage)}%</Badge>
                </div>
              ))
            )}
          </SectionCard>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <SectionCard title="Subject Performance" actionHref="/exam-results" actionLabel="Drill Down">
            {(data.subjectPerformance || []).length === 0 ? (
              <div className="text-muted small">No data</div>
            ) : (
              (data.subjectPerformance || []).map((s, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <div><strong>{s.subject}</strong></div>
                    <div className="text-muted small">Students: {s.totalStudents}</div>
                  </div>
                  <div className="d-flex gap-3">
                    <Badge bg="success">Avg {s.averagePercentage}%</Badge>
                    <Badge bg="primary">Pass {s.passPercentage}%</Badge>
                  </div>
                </div>
              ))
            )}
          </SectionCard>
        </Col>

        <Col md={6}>
          <SectionCard title="Class Attendance" actionHref="/classes" actionLabel="View Classes">
            <div className="text-muted small">
              Connect to class attendance API to show per-class attendance, filters by date and department.
            </div>
            <div className="mt-2">
              <Badge bg="secondary" className="me-2">Coming soon</Badge>
              <Badge bg="light" text="dark">Filters: date, department, class</Badge>
            </div>
          </SectionCard>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={12}>
          <Card style={CARD_STYLE} className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center bg-white border-0">
              <div className="fw-bold">📊 Daily Attendance Report</div>
              <Button variant="outline-primary" size="sm" href="/reports/daily-attendance">
                View Report
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="text-muted small">
                View and download daily attendance reports for any selected date. Includes all students with session-wise attendance details.
              </div>
              <div className="mt-2">
                <Badge bg="success" className="me-2">Available</Badge>
                <Badge bg="light" text="dark">PDF & Excel Export</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <SectionCard title="Daily Attendance Management" actionHref="/attendance" actionLabel="Open Attendance">
            <div className="text-muted small">
              Mark and manage daily attendance for all students across 14 sessions.
            </div>
            <div className="mt-2">
              <Badge bg="info" className="me-2">Active</Badge>
              <Badge bg="light" text="dark">14 Sessions</Badge>
            </div>
          </SectionCard>
        </Col>
        <Col md={4}>
          <SectionCard title="Student Count by Department">
            <div className="text-muted small">Show counts per department/sub-department with filters.</div>
            <div className="mt-2">
              <Badge bg="secondary" className="me-2">Planned</Badge>
              <Badge bg="light" text="dark">Filters: department, batch</Badge>
            </div>
          </SectionCard>
        </Col>
        <Col md={4}>
          <SectionCard title="Requests & Approvals" actionHref="/requests" actionLabel="Manage">
            <div className="text-muted small">
              Track leave/visit requests: pending vs approved/denied with quick filters.
            </div>
            <div className="mt-2">
              <Badge bg="secondary" className="me-2">Planned</Badge>
              <Badge bg="light" text="dark">Filters: status, date</Badge>
            </div>
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
