import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Row, Col, Badge, Modal, Form, Alert, Spinner, ButtonGroup, Dropdown } from 'react-bootstrap';
import api from '../../api/client';
import { examMarksAPI } from '../../api/exams';

const ExamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [form, setForm] = useState({
    groupName: '',
    selectionType: 'by-department',
    departments: []
  });
  const [entities, setEntities] = useState({ departments: [] });

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/exams/${id}`);
      if (data?.success) {
        setExam(data.data.exam);
        setGroups(data.data.groups || []);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      const { data } = await api.get('/exams/helpers/academic-entities');
      if (data?.success) setEntities(data.data);
    } catch {}
  };

  useEffect(() => { loadDetails(); loadEntities(); }, [id]);

  const createGroup = async () => {
    if (!form.groupName) { setError('Group name required'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        groupName: form.groupName,
        studentSelection: {
          selectionType: form.selectionType,
          academicFilters: { departments: form.departments }
        }
      };
      const { data } = await api.post(`/exams/${id}/groups`, payload);
      if (data?.success) {
        setMessage('Group created');
        setShowCreateGroup(false);
        setForm({ groupName: '', selectionType: 'by-department', departments: [] });
        loadDetails();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const badgeFor = (status) => {
    const map = { draft: 'secondary', scheduled: 'primary', active: 'primary', completed: 'success', finalized: 'info' };
    return <Badge bg={map[status] || 'light'}>{status}</Badge>;
  };

  return (
    <>
      {loading && <div className="text-center"><Spinner /></div>}
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {exam && (
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 className="mb-1">{exam.examName}</h5>
                <div className="text-muted small">{exam.subject} • {exam.examType}</div>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {badgeFor(exam.status)}
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={() => navigate(`/reports/exam/${exam?._id || id || exam?.id || exam?.examId}`)}
                  title="View exam results"
                >
                  📋 View Results
                </Button>
                <Dropdown>
                  <Dropdown.Toggle variant="outline-primary" size="sm" id="pdf-dropdown">
                    📄 Download PDF
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {exam.subject?._id && (
                      <Dropdown.Item onClick={() => examMarksAPI.downloadSubjectMarksheet(id, exam.subject._id)}>
                        Subject-wise Marksheet
                      </Dropdown.Item>
                    )}
                    {exam.subjects && exam.subjects.length > 0 && exam.subjects.map((sub, idx) => (
                      <Dropdown.Item key={idx} onClick={() => examMarksAPI.downloadSubjectMarksheet(id, sub.subject?._id || sub.subject)}>
                        {sub.subject?.name || sub.subject} Marksheet
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
            <div className="text-muted small">
              Total Marks: {exam.marksConfig?.totalMarks} • Passing: {exam.marksConfig?.passingMarks}
            </div>
          </Card.Body>
        </Card>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Groups</h6>
        <Button size="sm" onClick={() => setShowCreateGroup(true)}>Create Group</Button>
      </div>

      <Row>
        {groups.map(group => (
          <Col md={6} key={group._id} className="mb-3">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <strong>{group.groupName}</strong>
                  {badgeFor(group.status)}
                </div>
                <div className="text-muted small mb-2">
                  Students: {group.statistics?.activeStudents} • Teachers: {group.statistics?.assignedTeachers}
                </div>
                <ButtonGroup className="w-100">
                  <Button variant="outline-primary" size="sm" onClick={() => navigate(`/exams/${id}/groups/${group.groupId}/marks`)}>Marks Entry</Button>
                </ButtonGroup>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showCreateGroup} onHide={() => setShowCreateGroup(false)}>
        <Modal.Header closeButton><Modal.Title>Create Group</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Group Name</Form.Label>
              <Form.Control value={form.groupName} onChange={(e)=>setForm({ ...form, groupName: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Selection Type</Form.Label>
              <Form.Select value={form.selectionType} onChange={(e)=>setForm({ ...form, selectionType: e.target.value })}>
                <option value="by-department">By Department</option>
                <option value="manual" disabled>Manual (soon)</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Departments</Form.Label>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {(entities.departments||[]).map(d => (
                  <Form.Check
                    key={d._id}
                    type="checkbox"
                    label={d.name}
                    checked={form.departments.includes(d._id)}
                    onChange={(e)=>{
                      if (e.target.checked) setForm({ ...form, departments: [...form.departments, d._id] });
                      else setForm({ ...form, departments: form.departments.filter(x=>x!==d._id) });
                    }}
                  />
                ))}
              </div>
            </Form.Group>
          </Form>
          {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowCreateGroup(false)}>Cancel</Button>
          <Button onClick={createGroup}>Create</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ExamDetails;
