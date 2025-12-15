import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Table, Badge, Alert, Spinner, ButtonGroup, Form } from 'react-bootstrap';
import api from '../../api/client';

const MarksEntry = () => {
  const { id, groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/exam-marks/group/${groupId}`);
      if (data?.success) {
        setGroup(data.data.group);
        setResults(data.data.results || []);
      } else setError(data?.message || 'Failed to load results');
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, [groupId]);

  const initialize = async () => {
    try {
      await api.post('/exam-marks/initialize', { examId: id, groupId });
      setMessage('Initialized');
      loadResults();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const markAttendance = async (resultId, status) => {
    try {
      await api.put('/exam-marks/attendance', { resultId, status });
      setResults(prev => prev.map(r => r.resultId === resultId ? { ...r, attendance: { ...r.attendance, status } } : r));
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const enterMarks = async (resultId, componentName, obtainedMarks) => {
    try {
      await api.put('/exam-marks/enter', { resultId, componentName, obtainedMarks: Number(obtainedMarks) });
      setMessage('Marks saved');
      loadResults();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const badgeFor = (status) => {
    const map = { present: 'success', absent: 'danger', late: 'warning', exempted: 'secondary' };
    return <Badge bg={map[status] || 'light'}>{status}</Badge>;
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Marks Entry - {group?.groupName}</h6>
        <div>
          <Button size="sm" variant="outline-success" onClick={initialize}>Initialize</Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {loading ? (
        <div className="text-center"><Spinner /></div>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  <th>Components</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.resultId}>
                    <td>
                      <div><strong>{r.student.personalInfo.fullName}</strong></div>
                      <div className="text-muted small">{r.student.studentId}</div>
                    </td>
                    <td>
                      {badgeFor(r.attendance.status)}
                      <div className="mt-1">
                        <ButtonGroup size="sm">
                          <Button variant={r.attendance.status==='present'?'success':'outline-success'} onClick={()=>markAttendance(r.resultId, 'present')}>Present</Button>
                          <Button variant={r.attendance.status==='absent'?'danger':'outline-danger'} onClick={()=>markAttendance(r.resultId, 'absent')}>Absent</Button>
                        </ButtonGroup>
                      </div>
                    </td>
                    <td>
                      {r.marks.components.map(comp => (
                        <div key={comp.name} className="d-flex align-items-center gap-2 mb-1">
                          <span className="small" style={{ width: 90 }}>{comp.name}</span>
                          <Form.Control
                            size="sm"
                            type="number"
                            defaultValue={comp.obtainedMarks || ''}
                            placeholder={`0-${comp.maxMarks}`}
                            style={{ maxWidth: 120 }}
                            onKeyDown={(e)=>{
                              if (e.key==='Enter') enterMarks(r.resultId, comp.name, e.currentTarget.value);
                            }}
                          />
                          <Button size="sm" variant="outline-primary" onClick={()=>{
                            const v = prompt(`Enter marks for ${comp.name} (max ${comp.maxMarks})`, comp.obtainedMarks || '');
                            if (v!==null) enterMarks(r.resultId, comp.name, v);
                          }}>Save</Button>
                        </div>
                      ))}
                    </td>
                    <td>
                      <div>{r.result.finalMarks}/{r.marks.totalMaxMarks}</div>
                      <Badge bg={r.result.finalPercentage>=60?'success':'warning'}>{Math.round(r.result.finalPercentage||0)}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default MarksEntry;
