import { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Badge, Modal, Form, Alert, Spinner, ButtonGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const ExamsList = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    examName: '',
    examType: 'midterm',
    subject: '',
    academicYear: '2024-2025',
    startDate: '',
    endDate: '',
    totalMarks: 100,
    passingMarks: 40
  });

  const loadExams = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/exams', { params: { myExams: 'true' } });
      if (data?.success) setExams(data.data.exams || []);
      else setError(data?.message || 'Failed to load exams');
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExams(); }, []);

  const approveExam = async (id) => {
    try {
      await api.put(`/exams/${id}/approve`, { comments: 'Approved' });
      setMessage('Exam approved');
      loadExams();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const createExam = async () => {
    if (!form.examName || !form.subject || !form.startDate || !form.endDate) {
      setError('Fill required fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        examName: form.examName,
        examType: form.examType,
        subject: form.subject,
        academicInfo: { academicYear: form.academicYear },
        schedule: { startDate: form.startDate, endDate: form.endDate },
        marksConfig: { totalMarks: Number(form.totalMarks), passingMarks: Number(form.passingMarks) }
      };
      const { data } = await api.post('/exams', payload);
      if (data?.success) {
        setShowCreate(false);
        setForm({ examName: '', examType: 'midterm', subject: '', academicYear: '2024-2025', startDate: '', endDate: '', totalMarks: 100, passingMarks: 40 });
        setMessage('Exam created');
        loadExams();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const badgeFor = (status) => {
    const map = {
      draft: 'secondary',
      scheduled: 'primary',
      ongoing: 'warning',
      completed: 'success',
      'results-published': 'info',
      cancelled: 'danger'
    };
    return <Badge bg={map[status] || 'light'}>{status}</Badge>;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Exams</h5>
        <Button onClick={() => setShowCreate(true)}>Create Exam</Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {loading ? (
        <div className="text-center"><Spinner /></div>
      ) : (
        <Row>
          {exams.map(exam => (
            <Col md={6} lg={4} key={exam._id} className="mb-3">
              <Card>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <strong>{exam.examName}</strong>
                    {badgeFor(exam.status)}
                  </div>
                  <div className="text-muted small mb-2">
                    {exam.subject} • {exam.examType}
                  </div>
                  <div className="text-muted small mb-3">
                    {exam.schedule?.startDate ? new Date(exam.schedule.startDate).toLocaleDateString() : ''}
                  </div>
                  <ButtonGroup className="w-100">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate(`/exams/${exam._id}`)}>View</Button>
                    {exam.status === 'draft' && (
                      <Button variant="outline-success" size="sm" onClick={() => approveExam(exam._id)}>Approve</Button>
                    )}
                  </ButtonGroup>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton><Modal.Title>Create Exam</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Exam Name</Form.Label>
              <Form.Control value={form.examName} onChange={(e)=>setForm({ ...form, examName: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Subject</Form.Label>
              <Form.Control value={form.subject} onChange={(e)=>setForm({ ...form, subject: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Type</Form.Label>
              <Form.Select value={form.examType} onChange={(e)=>setForm({ ...form, examType: e.target.value })}>
                <option value="midterm">Mid-term</option>
                <option value="final">Final</option>
                <option value="monthly">Monthly</option>
                <option value="unit-test">Unit Test</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Academic Year</Form.Label>
              <Form.Control value={form.academicYear} onChange={(e)=>setForm({ ...form, academicYear: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="date" value={form.startDate} onChange={(e)=>setForm({ ...form, startDate: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" value={form.endDate} onChange={(e)=>setForm({ ...form, endDate: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Total Marks</Form.Label>
              <Form.Control type="number" value={form.totalMarks} onChange={(e)=>setForm({ ...form, totalMarks: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Passing Marks</Form.Label>
              <Form.Control type="number" value={form.passingMarks} onChange={(e)=>setForm({ ...form, passingMarks: e.target.value })} />
            </Form.Group>
          </Form>
          {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowCreate(false)}>Cancel</Button>
          <Button onClick={createExam}>Create</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ExamsList;
