import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import studentProfileAPI from '../../api/studentProfile';
import AcademicYearFilter from '../../components/AcademicYearFilter';

const STATUSES = ['Present', 'Absent', 'Sick', 'Leave'];

const formatDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

const StudentAttendanceReport = () => {
  const { studentId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', academicYear: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.academicYear) params.academicYear = filters.academicYear;
      const { data } = await studentProfileAPI.getAttendanceReport(studentId, params);
      if (data?.success) {
        setReport(data.data);
        if (!filters.from || !filters.to) {
          // Pre-fill filters with returned range for convenience
          setFilters({
            from: formatDate(data.data?.dateRange?.from),
            to: formatDate(data.data?.dateRange?.to)
          });
        }
      } else {
        setError(data?.message || 'Failed to load attendance report');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable react-hooks/exhaustive-deps */ }, [studentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const months = useMemo(() => report?.months || [], [report]);

  const renderCell = (sessionKey, monthKey, status) => {
    const value = report?.perSession?.[sessionKey]?.monthly?.[monthKey]?.[status] ?? 0;
    return value || '—';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  if (error) return <Alert variant="danger" className="mt-3">{error}</Alert>;
  if (!report) return null;

  const student = report.student || {};

  return (
    <div className="mt-3">
      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-1">Student Attendance Report</h4>
          <div className="text-muted small">
            <strong>{student.name}</strong>{' '}
            {student.admissionNo && <Badge bg="secondary">Adm: {student.admissionNo}</Badge>}{' '}
            {student.rollNo && <Badge bg="info">Roll: {student.rollNo}</Badge>}
          </div>
          <div className="text-muted small">
            Dept: {student.department?.name || '-'} • Batches: {student.batches?.map(b => b.name).join(', ') || '-'}
          </div>
        </Col>
        <Col className="text-end">
          <Link to={`/reports/student/${studentId}`}>
            <Button variant="outline-secondary" size="sm" className="me-2">Exam Report</Button>
          </Link>
          <Link to={`/students/${studentId}/profile`}>
            <Button variant="outline-primary" size="sm">Back to Profile</Button>
          </Link>
        </Col>
      </Row>

      <Card className="mb-3">
        <Card.Header>Filters</Card.Header>
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); load(); }}>
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <AcademicYearFilter
                  value={filters.academicYear}
                  onChange={(year) => setFilters({...filters, academicYear: year})}
                  size="sm"
                  label="Academic Year"
                />
              </Col>
              <Col md={3}>
                <Form.Label>From</Form.Label>
                <Form.Control type="date" name="from" value={filters.from} onChange={handleChange} />
              </Col>
              <Col md={3}>
                <Form.Label>To</Form.Label>
                <Form.Control type="date" name="to" value={filters.to} onChange={handleChange} />
              </Col>
              <Col md={3} className="text-md-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Loading…' : 'Apply'}
                </Button>
              </Col>
            </Row>
            <div className="text-muted small mt-2">
              Default range: current academic year (Apr 1 - Today).
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Monthly Attendance (sessions x status)</Card.Header>
        <Card.Body className="table-responsive">
          <Table bordered hover size="sm">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Session</th>
                <th style={{ minWidth: 80 }}>Status</th>
                <th>Total</th>
                {months.map(m => (
                  <th key={m.key}>{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.sessions.map(session => {
                const totals = report.perSession?.[session.key]?.totals || {};
                return STATUSES.map((status, idx) => (
                  <tr key={`${session.key}-${status}`}>
                    {idx === 0 && (
                      <td rowSpan={STATUSES.length}>
                        <div className="fw-semibold">{session.name}</div>
                        <div className="text-muted small text-uppercase">{session.category}</div>
                      </td>
                    )}
                    <td>{status}</td>
                    <td>{totals[status] ?? 0}</td>
                    {months.map(m => (
                      <td key={m.key}>{renderCell(session.key, m.key, status)}</td>
                    ))}
                  </tr>
                ));
              })}

              <tr className="table-secondary">
                <td colSpan={2} className="fw-semibold">Overall Monthly Totals</td>
                <td />
                {months.map(m => {
                  const monthTotals = report.overallMonthly?.[m.key] || {};
                  const total = STATUSES.map(s => monthTotals[s] || 0).reduce((a, b) => a + b, 0);
                  return <td key={m.key} className="fw-semibold">{total}</td>;
                })}
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default StudentAttendanceReport;
