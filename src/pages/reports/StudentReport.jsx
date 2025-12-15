import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spinner, Alert, Table, Badge, Button, Row, Col, Form } from 'react-bootstrap';
import api from '../../api/client';
import { examMarksAPI } from '../../api/exams';

const StudentReport = () => {
  const { studentId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfFilters, setPdfFilters] = useState({
    academicYear: '',
    term: '',
    examType: ''
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/exam-reports/student/${studentId}`, { params: { includeUnpublished: false } });
      if (data?.success) setReport(data.data);
      else setError(data?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  if (loading) return <div className="text-center"><Spinner /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!report) return null;

  const o = report.overview;

  const handleDownloadPDF = async () => {
    try {
      const params = {};
      if (pdfFilters.academicYear) params.academicYear = pdfFilters.academicYear;
      if (pdfFilters.term) params.term = pdfFilters.term;
      if (pdfFilters.examType) params.examType = pdfFilters.examType;
      await examMarksAPI.downloadStudentMarksheet(studentId, params);
    } catch (error) {
      setError(error?.response?.data?.message || 'Failed to download PDF');
    }
  };

  return (
    <>
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col>
          <h5 className="mb-1">{report.student.name} <Badge bg="secondary">{report.student.studentId}</Badge></h5>
          <div className="text-muted small">Dept: {report.student.department || '-'} • AY: {report.student.academicYear || '-'}</div>
          <div className="text-muted small mt-2">
            Exams: {o.totalExams} • Pass: {o.passedExams} • Fail: {o.failedExams} • Avg: {o.averagePercentage}% • Best: {o.highestPercentage}%
          </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex gap-2 align-items-end">
                <Form.Select
                  size="sm"
                  style={{ width: '150px' }}
                  value={pdfFilters.academicYear}
                  onChange={(e) => setPdfFilters({ ...pdfFilters, academicYear: e.target.value })}
                >
                  <option value="">All Years</option>
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                </Form.Select>
                <Form.Select
                  size="sm"
                  style={{ width: '120px' }}
                  value={pdfFilters.term}
                  onChange={(e) => setPdfFilters({ ...pdfFilters, term: e.target.value })}
                >
                  <option value="">All Terms</option>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="annual">Annual</option>
                </Form.Select>
                <Button variant="primary" size="sm" onClick={handleDownloadPDF}>
                  📄 Download Marksheet PDF
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header>Subject Performance</Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Total Exams</th>
                <th>Pass</th>
                <th>Avg %</th>
                <th>Pass %</th>
              </tr>
            </thead>
            <tbody>
              {report.subjectPerformance.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.subject}</td>
                  <td>{s.totalExams}</td>
                  <td>{s.passedExams}</td>
                  <td>{s.averagePercentage}%</td>
                  <td>{s.passPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>Recent Exams</Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Attendance</th>
                <th>Obtained</th>
                <th>%</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.examResults.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.examName}</td>
                  <td>{r.subject}</td>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.attendance}</td>
                  <td>{r.marks.obtained}/{r.marks.total}</td>
                  <td>{Math.round(r.marks.percentage)}%</td>
                  <td>{r.grade || '-'}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
};

export default StudentReport;
