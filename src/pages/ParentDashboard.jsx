import { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Tabs, Tab, Table, Badge, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';
import { parentDashboardAPI } from '../api/parent-dashboard';
import { getLeaveRequests, createLeaveRequest, getVisitRequests, createVisitRequest } from '../api/requests';
import { useAuth } from '../store/auth';
import AcademicYearFilter from '../components/AcademicYearFilter';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Student Info
  const [studentInfo, setStudentInfo] = useState(null);
  
  // Exam Marks
  const [examMarks, setExamMarks] = useState([]);
  const [examFilters, setExamFilters] = useState({ academicYear: '', term: '', examType: '' });
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  
  // Transactions
  const [transactions, setTransactions] = useState([]);
  
  // Notes
  const [notes, setNotes] = useState([]);
  
  // Requests
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    isFullDay: true,
    startTime: '',
    endTime: '',
    reason: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });
  
  const [visitForm, setVisitForm] = useState({
    visitType: '',
    preferredDate: '',
    preferredStartTime: '',
    preferredEndTime: '',
    purpose: '',
    numberOfVisitors: 1
  });

  useEffect(() => {
    loadData();
  }, [activeTab, examFilters, academicYearFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'info':
          const infoRes = await parentDashboardAPI.getStudentInfo();
          if (infoRes.success) setStudentInfo(infoRes.data);
          break;
        case 'marks':
          const marksRes = await parentDashboardAPI.getExamMarks(examFilters);
          if (marksRes.success) setExamMarks(marksRes.data);
          break;
        case 'transactions':
          const transRes = await parentDashboardAPI.getTransactions();
          if (transRes.success) setTransactions(transRes.data);
          break;
        case 'notes':
          const notesRes = await parentDashboardAPI.getNotes();
          if (notesRes.success) setNotes(notesRes.data);
          break;
        case 'requests':
          const leaveRes = await getLeaveRequests();
          if (leaveRes.success) {
            const leaveData = leaveRes.data || leaveRes.leaveRequests || [];
            console.log('Leave requests loaded:', leaveData);
            setLeaveRequests(leaveData);
          }
          const visitRes = await getVisitRequests();
          if (visitRes.success) {
            const visitData = visitRes.data || visitRes.visitRequests || [];
            console.log('Visit requests loaded:', visitData);
            setVisitRequests(visitData);
          }
          break;
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await createLeaveRequest(leaveForm);
      if (response.success) {
        setShowLeaveModal(false);
        setLeaveForm({
          leaveType: '', startDate: '', endDate: '', isFullDay: true,
          startTime: '', endTime: '', reason: '', emergencyContact: { name: '', phone: '', relationship: '' }
        });
        loadData();
      } else {
        setError(response.message || 'Failed to create leave request');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create leave request');
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await createVisitRequest(visitForm);
      if (response.success) {
        setShowVisitModal(false);
        setVisitForm({
          visitType: '', preferredDate: '', preferredStartTime: '', preferredEndTime: '', purpose: '', numberOfVisitors: 1
        });
        loadData();
      } else {
        setError(response.message || 'Failed to create visit request');
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create visit request');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Parent Dashboard</h2>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="info" title="📋 Basic Info">
          {loading ? <div className="text-center py-4"><Spinner /></div> : studentInfo && (
            <Card>
              <Card.Header><h5>Student Information</h5></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p><strong>Name:</strong> {studentInfo.fullName}</p>
                    <p><strong>Admission No:</strong> {studentInfo.admissionNo}</p>
                    <p><strong>Date of Birth:</strong> {new Date(studentInfo.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> {studentInfo.age} years</p>
                    <p><strong>Gender:</strong> {studentInfo.gender}</p>
                    <p><strong>Blood Group:</strong> {studentInfo.bloodGroup || 'N/A'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Department:</strong> {studentInfo.department?.name || 'N/A'}</p>
                    <p><strong>Current Standard:</strong> {studentInfo.currentStandard || 'N/A'}</p>
                    <p><strong>Date of Admission:</strong> {studentInfo.dateOfAdmission ? new Date(studentInfo.dateOfAdmission).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Shaakha:</strong> {studentInfo.shaakha || 'N/A'}</p>
                    <p><strong>Gothra:</strong> {studentInfo.gothra || 'N/A'}</p>
                    <p><strong>Status:</strong> <Badge bg={studentInfo.status === 'active' ? 'success' : 'secondary'}>{studentInfo.status}</Badge></p>
                  </Col>
                </Row>
                <hr />
                <Row>
                  <Col md={6}>
                    <h6>Contact Information</h6>
                    <p><strong>Phone:</strong> {studentInfo.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> {studentInfo.email || 'N/A'}</p>
                    <p><strong>Address:</strong> {studentInfo.address || 'N/A'}</p>
                  </Col>
                  <Col md={6}>
                    <h6>Family Information</h6>
                    <p><strong>Father:</strong> {studentInfo.fatherName}</p>
                    <p><strong>Mother:</strong> {studentInfo.motherName}</p>
                    <p><strong>Guardian Phone:</strong> {studentInfo.guardianPhone}</p>
                    <p><strong>Guardian Email:</strong> {studentInfo.guardianEmail || 'N/A'}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab eventKey="marks" title="📊 Exam Marks">
          {loading ? <div className="text-center py-4"><Spinner /></div> : (
            <>
              <Card className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="Academic Year"
                        value={examFilters.academicYear}
                        onChange={(e) => setExamFilters({ ...examFilters, academicYear: e.target.value })}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="Term/Semester"
                        value={examFilters.term}
                        onChange={(e) => setExamFilters({ ...examFilters, term: e.target.value })}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Select
                        value={examFilters.examType}
                        onChange={(e) => setExamFilters({ ...examFilters, examType: e.target.value })}
                      >
                        <option value="">All Exam Types</option>
                        <option value="unit">Unit Test</option>
                        <option value="midterm">Midterm</option>
                        <option value="final">Final</option>
                        <option value="assignment">Assignment</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
              {examMarks.length === 0 ? (
                <Alert variant="info">No exam marks found</Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Subjects</th>
                        <th>Total Marks</th>
                        <th>Percentage</th>
                        <th>Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examMarks.map((exam, idx) => (
                        <tr key={idx}>
                          <td>{exam.examName}</td>
                          <td>{exam.examType}</td>
                          <td>{exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            {exam.subjectMarks?.length > 0 ? (
                              <div className="small">
                                {exam.subjectMarks.map((sm, i) => (
                                  <div key={i}>
                                    {sm.subject?.name || sm.name || 'Subject'}: {sm.marksObtained || sm.obtainedMarks || 0}/{sm.maxMarks || 0}
                                  </div>
                                ))}
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td>{exam.totalMarksObtained}/{exam.totalMaxMarks}</td>
                          <td>{exam.overallPercentage?.toFixed(2) || 0}%</td>
                          <td><Badge bg="info">{exam.overallGrade || 'N/A'}</Badge></td>
                          <td><Badge bg={exam.isPassed ? 'success' : 'danger'}>{exam.isPassed ? 'Pass' : 'Fail'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Tab>

        <Tab eventKey="transactions" title="💰 Transactions">
          {loading ? <div className="text-center py-4"><Spinner /></div> : (
            <Alert variant="info">
              {transactions.length === 0 ? 'No transactions found. Transaction system coming soon.' : 'Transactions will be displayed here.'}
            </Alert>
          )}
        </Tab>

        <Tab eventKey="notes" title="📝 Notes">
          {loading ? <div className="text-center py-4"><Spinner /></div> : (
            notes.length === 0 ? (
              <Alert variant="info">No notes available</Alert>
            ) : (
              <div>
                {notes.map((note, idx) => (
                  <Card key={idx} className="mb-3">
                    <Card.Body>
                      <p>{note.content}</p>
                      <small className="text-muted">
                        {note.createdBy} • {new Date(note.createdAt).toLocaleString()}
                      </small>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )
          )}
        </Tab>

        <Tab eventKey="requests" title="📋 Requests">
          <div className="mb-3">
            <Button variant="primary" onClick={() => setShowLeaveModal(true)} className="me-2">Apply for Leave</Button>
            <Button variant="success" onClick={() => setShowVisitModal(true)}>Request Visit</Button>
          </div>

          <Tabs defaultActiveKey="leave" className="mb-3">
            <Tab eventKey="leave" title="Leave Requests">
              {loading ? <div className="text-center py-4"><Spinner /></div> : (
                leaveRequests.length === 0 ? (
                  <Alert variant="info">No leave requests</Alert>
                ) : (
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((req) => (
                        <tr key={req.id || req._id}>
                          <td>{req.leaveType}</td>
                          <td>{new Date(req.startDate).toLocaleDateString()}</td>
                          <td>{new Date(req.endDate).toLocaleDateString()}</td>
                          <td>{req.reason}</td>
                          <td>{getStatusBadge(req.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )
              )}
            </Tab>
            <Tab eventKey="visit" title="Visit Requests">
              {loading ? <div className="text-center py-4"><Spinner /></div> : (
                visitRequests.length === 0 ? (
                  <Alert variant="info">No visit requests</Alert>
                ) : (
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Preferred Date</th>
                        <th>Time</th>
                        <th>Purpose</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitRequests.map((req) => (
                        <tr key={req.id || req._id}>
                          <td>{req.visitType}</td>
                          <td>{new Date(req.preferredDate).toLocaleDateString()}</td>
                          <td>{req.preferredStartTime} - {req.preferredEndTime}</td>
                          <td>{req.purpose}</td>
                          <td>{getStatusBadge(req.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )
              )}
            </Tab>
          </Tabs>
        </Tab>
      </Tabs>

      {/* Leave Request Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply for Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleLeaveSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type</Form.Label>
              <Form.Select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} required>
                <option value="">Select type</option>
                <option value="sick_leave">Sick Leave</option>
                <option value="family_emergency">Family Emergency</option>
                <option value="personal">Personal</option>
                <option value="medical_appointment">Medical Appointment</option>
                <option value="family_function">Family Function</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" label="Full Day" checked={leaveForm.isFullDay} onChange={(e) => setLeaveForm({ ...leaveForm, isFullDay: e.target.checked })} />
            </Form.Group>
            {!leaveForm.isFullDay && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control type="time" value={leaveForm.startTime} onChange={(e) => setLeaveForm({ ...leaveForm, startTime: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Control type="time" value={leaveForm.endTime} onChange={(e) => setLeaveForm({ ...leaveForm, endTime: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Control as="textarea" rows={3} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Emergency Contact Name</Form.Label>
              <Form.Control type="text" value={leaveForm.emergencyContact.name} onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: { ...leaveForm.emergencyContact, name: e.target.value } })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Emergency Contact Phone</Form.Label>
              <Form.Control type="text" value={leaveForm.emergencyContact.phone} onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: { ...leaveForm.emergencyContact, phone: e.target.value } })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Request</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Visit Request Modal */}
      <Modal show={showVisitModal} onHide={() => setShowVisitModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request Visit</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleVisitSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Visit Type</Form.Label>
              <Form.Select value={visitForm.visitType} onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })} required>
                <option value="">Select type</option>
                <option value="meet_student">Meet Student</option>
                <option value="academic_discussion">Academic Discussion</option>
                <option value="general_inquiry">General Inquiry</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Preferred Date</Form.Label>
              <Form.Control type="date" value={visitForm.preferredDate} onChange={(e) => setVisitForm({ ...visitForm, preferredDate: e.target.value })} required />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Start Time</Form.Label>
                  <Form.Control type="time" value={visitForm.preferredStartTime} onChange={(e) => setVisitForm({ ...visitForm, preferredStartTime: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preferred End Time</Form.Label>
                  <Form.Control type="time" value={visitForm.preferredEndTime} onChange={(e) => setVisitForm({ ...visitForm, preferredEndTime: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Purpose</Form.Label>
              <Form.Control as="textarea" rows={3} value={visitForm.purpose} onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number of Visitors</Form.Label>
              <Form.Control type="number" min="1" value={visitForm.numberOfVisitors} onChange={(e) => setVisitForm({ ...visitForm, numberOfVisitors: parseInt(e.target.value) })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Request</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ParentDashboard;
