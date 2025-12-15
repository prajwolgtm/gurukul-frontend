import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Table, 
  Modal, Badge, Alert, Spinner, ButtonGroup, InputGroup 
} from 'react-bootstrap';
import { useAuth } from '../../store/auth';
import { ROLES } from '../../utils/roles';
import api from '../../api/client';

const DailyAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showInitializeModal, setShowInitializeModal] = useState(false);
  const [showBulkMarkModal, setShowBulkMarkModal] = useState(false);
  const [bulkMarkData, setBulkMarkData] = useState({
    sessionKey: '',
    status: 'Present',
    notes: ''
  });
  
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentAttendanceForm, setStudentAttendanceForm] = useState({});
  const [selectedSession, setSelectedSession] = useState('');
  const [showSessionMarkingModal, setShowSessionMarkingModal] = useState(false);
  const [sessionMarkingData, setSessionMarkingData] = useState({});

  useEffect(() => {
    if (selectedDate) {
      loadAttendanceData();
    }
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    setLoading(true);
    setError('');
    try {
      // Get daily attendance for the selected date
      const response = await api.get(`/attendance/daily/${selectedDate}`);
      if (response.data.success) {
        setAttendanceData(response.data.data);
        setStudents(response.data.data.attendanceRecords || []);
        const loadedSessions = response.data.data.sessions || [];
        setSessions(loadedSessions);
        
        // Initialize session statuses
        const statuses = {};
        loadedSessions.forEach(session => {
          statuses[session.key] = 'Present'; // Default to Present for bulk marking
        });
        setSessionStatuses(statuses);
        
        // If no sessions loaded, show warning
        if (loadedSessions.length === 0) {
          setError('No attendance sessions found. Sessions will be initialized automatically on next load.');
        }
      } else {
        setError(response.data.message || 'Failed to load attendance data');
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      if (error.response?.status === 404) {
        setAttendanceData(null);
        setStudents([]);
        setSessions([]);
      } else {
        setError('Failed to load attendance data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeDailyAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/attendance/bulk-initialize', {
        date: selectedDate
      });
      
      if (response.data.success) {
        setSuccess('Daily attendance initialized successfully!');
        setShowInitializeModal(false);
        await loadAttendanceData(); // Reload data
      } else {
        setError(response.data.message || 'Failed to initialize attendance');
      }
    } catch (error) {
      console.error('Error initializing attendance:', error);
      setError('Failed to initialize attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bulkMarkSession = async () => {
    if (!bulkMarkData.sessionKey) {
      setError('Please select a session');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/attendance/bulk-mark-session', {
        date: selectedDate,
        sessionKey: bulkMarkData.sessionKey,
        status: bulkMarkData.status,
        notes: bulkMarkData.notes
      });
      
      if (response.data.success) {
        setSuccess(`Successfully marked ${bulkMarkData.status} for all students in ${bulkMarkData.sessionKey}`);
        setShowBulkMarkModal(false);
        await loadAttendanceData(); // Reload data
      } else {
        setError(response.data.message || 'Failed to mark session attendance');
      }
    } catch (error) {
      console.error('Error marking session attendance:', error);
      setError('Failed to mark session attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markIndividualSession = async (student, sessionKey, status, notes = '') => {
    try {
      const studentId = getStudentId(student);
      const response = await api.post('/attendance/mark-session', {
        studentId,
        date: selectedDate,
        sessionKey,
        status,
        notes
      });
      
      if (response.data.success) {
        setSuccess(`Attendance marked successfully!`);
        await loadAttendanceData(); // Reload data
      } else {
        setError(response.data.message || 'Failed to mark individual session');
      }
    } catch (error) {
      console.error('Error marking individual session:', error);
      setError('Failed to mark individual session. Please try again.');
    }
  };

  const handleOpenStudentModal = (student) => {
    setSelectedStudent(student);
    
    // Initialize form with current attendance data
    const formData = {};
    sessions.forEach(session => {
      const sessionData = student.sessions?.[session.key];
      formData[session.key] = {
        status: sessionData?.status || 'Present',
        notes: sessionData?.notes || ''
      };
    });
    
    setStudentAttendanceForm(formData);
    setShowStudentModal(true);
  };

  const getStudentId = (student) => {
    // Prioritize student document ID (for marking attendance)
    // student.student._id is the actual student document ID
    // student._id is the attendance record ID (if exists)
    return student.student?._id || student.student || student._id;
  };

  const handleStudentFormChange = (sessionKey, field, value) => {
    setStudentAttendanceForm(prev => ({
      ...prev,
      [sessionKey]: {
        ...prev[sessionKey],
        [field]: value
      }
    }));
  };

  const handleSaveStudentAttendance = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      setError('');
      
      // Mark all sessions for this student
      const studentId = getStudentId(selectedStudent);
      const promises = Object.entries(studentAttendanceForm).map(([sessionKey, data]) => 
        api.post('/attendance/mark-session', {
          studentId: studentId,
          date: selectedDate,
          sessionKey,
          status: data.status,
          notes: data.notes
        })
      );

      await Promise.all(promises);
      
      setSuccess('Student attendance updated successfully!');
      setShowStudentModal(false);
      await loadAttendanceData();
    } catch (error) {
      console.error('Error saving student attendance:', error);
      setError('Failed to save attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Present': 'success',
      'Absent': 'danger',
      'Sick': 'warning',
      'Leave': 'info'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const canManageAttendance = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.CARETAKER;

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Daily Hostel Attendance</h2>
          <p className="text-muted">Manage 14 daily attendance sessions for all students</p>
        </Col>
        {canManageAttendance && (
          <Col xs="auto">
            <Button 
              variant="primary" 
              onClick={() => setShowInitializeModal(true)}
              disabled={attendanceData !== null}
            >
              Initialize Daily Attendance
            </Button>
            <Button 
              variant="success" 
              onClick={() => setShowBulkMarkModal(true)}
              disabled={!attendanceData}
              className="ms-2"
            >
              Bulk Mark Session
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}

      {/* Date Selection Card */}
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">📅 Select Attendance Date</h5>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <Form.Group>
                <Form.Label><strong>Select Date</strong></Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="form-control-lg"
                />
                <Form.Text className="text-muted">
                  Choose the date for attendance period (14 sessions)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={8}>
              {attendanceData ? (
                <div className="d-flex gap-3 align-items-center">
                  <div>
                    <Badge bg="success" className="p-2 fs-6">
                      👥 {attendanceData.totalStudents || students.length} Students
                    </Badge>
                  </div>
                  <div>
                    <Badge bg="info" className="p-2 fs-6">
                      📋 {sessions.length} Sessions
                    </Badge>
                  </div>
                  <div>
                    <Badge bg="primary" className="p-2 fs-6">
                      📅 {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert variant="warning" className="mb-0">
                  <strong>⚠️ No attendance data for this date.</strong>
                  {canManageAttendance && (
                    <div className="mt-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setShowInitializeModal(true)}
                      >
                        Initialize Attendance for This Date
                      </Button>
                    </div>
                  )}
                </Alert>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Sessions Info Card with Selection */}
      {sessions.length > 0 ? (
        <Card className="mb-4 border-info">
          <Card.Header className="bg-info text-white">
            <Row className="align-items-center">
              <Col>
                <h6 className="mb-0">📋 Select Session to Mark Attendance</h6>
                <small>Choose a session and mark attendance for all students</small>
              </Col>
              {canManageAttendance && (
                <Col xs="auto">
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => {
                      if (selectedSession) {
                        setShowSessionMarkingModal(true);
                      } else {
                        setError('Please select a session first');
                      }
                    }}
                    disabled={!selectedSession}
                  >
                    📝 Mark Selected Session
                  </Button>
                </Col>
              )}
            </Row>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label><strong>Select Session:</strong></Form.Label>
                  <Form.Select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    size="lg"
                  >
                    <option value="">-- Choose a session to mark attendance --</option>
                    {sessions.map((session, index) => (
                      <option key={session.key} value={session.key}>
                        {index + 1}. {session.time} - {session.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            {selectedSession && (
              <Alert variant="info" className="mb-0">
                <strong>Selected:</strong> {
                  sessions.find(s => s.key === selectedSession)?.time
                } - {
                  sessions.find(s => s.key === selectedSession)?.name
                }
                <br />
                <small>Click "Mark Selected Session" button above to mark attendance for all students</small>
              </Alert>
            )}
            <hr />
            <div className="d-flex flex-wrap gap-2">
              {sessions.map((session, index) => (
                <Badge 
                  key={session.key} 
                  bg={selectedSession === session.key ? 'primary' : 'secondary'}
                  className="p-2"
                  style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                  onClick={() => setSelectedSession(session.key)}
                >
                  {index + 1}. {session.time} - {session.name}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      ) : attendanceData && (
        <Card className="mb-4 border-warning">
          <Card.Header className="bg-warning text-dark">
            <h6 className="mb-0">⚠️ Sessions Not Loaded</h6>
          </Card.Header>
          <Card.Body>
            <Alert variant="warning">
              <p><strong>No attendance sessions found.</strong></p>
              <p>Sessions are being initialized automatically. Please refresh the page in a moment.</p>
              <Button 
                variant="primary" 
                onClick={loadAttendanceData}
                className="mt-2"
              >
                🔄 Refresh Page
              </Button>
            </Alert>
          </Card.Body>
        </Card>
      )}

      {/* Students List with Session Attendance */}
      {attendanceData && students.length > 0 && sessions.length > 0 && (
        <Card>
          <Card.Header className="bg-light">
            <Row className="align-items-center">
              <Col>
                <h5 className="mb-0">
                  👥 Students Attendance - {new Date(selectedDate).toLocaleDateString()}
                </h5>
                <small className="text-muted">
                  Mark attendance for each session. Click on P/A/S/L buttons or use "Mark/Update" for full details.
                </small>
              </Col>
              {canManageAttendance && (
                <Col xs="auto">
                  <Button 
                    variant="success" 
                    size="sm"
                    onClick={() => setShowBulkMarkModal(true)}
                    className="me-2"
                  >
                    📋 Bulk Mark Session
                  </Button>
                </Col>
              )}
            </Row>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead className="table-light sticky-top" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '3%' }} className="text-center">#</th>
                    <th style={{ width: '15%' }}>Student Name</th>
                    <th style={{ width: '10%' }}>Admission No</th>
                    {sessions.map((session, index) => (
                      <th key={session.key} className="text-center" style={{ width: '5%', fontSize: '0.75rem' }}>
                        <div className="d-flex flex-column align-items-center">
                          <small className="text-muted">{index + 1}</small>
                          <small className="text-muted">{session.time}</small>
                          <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{session.name}</div>
                        </div>
                      </th>
                    ))}
                    <th style={{ width: '8%' }} className="text-center">Overall</th>
                    <th style={{ width: '8%' }} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const presentCount = student.statistics?.presentCount || 0;
                    const totalSessions = student.statistics?.totalSessions || 14;
                    const percentage = student.statistics?.attendancePercentage || 0;
                    const studentId = getStudentId(student);
                    const rowKey = student.student?._id || student._id || `student-${index}`;
                    
                    return (
                      <tr key={rowKey}>
                        <td className="text-center">{index + 1}</td>
                        <td>
                          <strong>{student.student?.fullName || 'Unknown'}</strong>
                        </td>
                        <td>
                          <Badge bg="primary">{student.student?.admissionNo || 'N/A'}</Badge>
                        </td>
                        {sessions.map(session => {
                          const sessionData = student.sessions?.[session.key];
                          const status = sessionData?.status || 'Present';
                          
                          return (
                            <td key={session.key} className="text-center">
                              {canManageAttendance ? (
                                <ButtonGroup size="sm" vertical>
                                  <Button
                                    variant={status === 'Present' ? 'success' : 'outline-success'}
                                    size="sm"
                                    onClick={() => markIndividualSession(student, session.key, 'Present')}
                                    title="Mark Present"
                                    style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                                  >
                                    P
                                  </Button>
                                  <Button
                                    variant={status === 'Absent' ? 'danger' : 'outline-danger'}
                                    size="sm"
                                    onClick={() => markIndividualSession(student, session.key, 'Absent')}
                                    title="Mark Absent"
                                    style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                                  >
                                    A
                                  </Button>
                                  <Button
                                    variant={status === 'Sick' ? 'warning' : 'outline-warning'}
                                    size="sm"
                                    onClick={() => markIndividualSession(student, session.key, 'Sick')}
                                    title="Mark Sick"
                                    style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                                  >
                                    S
                                  </Button>
                                  <Button
                                    variant={status === 'Leave' ? 'info' : 'outline-info'}
                                    size="sm"
                                    onClick={() => markIndividualSession(student, session.key, 'Leave')}
                                    title="Mark Leave"
                                    style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                                  >
                                    L
                                  </Button>
                                </ButtonGroup>
                              ) : (
                                <Badge bg={
                                  status === 'Present' ? 'success' :
                                  status === 'Absent' ? 'danger' :
                                  status === 'Sick' ? 'warning' : 'info'
                                }>
                                  {status.charAt(0)}
                                </Badge>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center">
                          <Badge 
                            bg={
                              student.overallStatus === 'Excellent' ? 'success' : 
                              student.overallStatus === 'Good' ? 'info' :
                              student.overallStatus === 'Average' ? 'warning' :
                              student.overallStatus === 'Poor' ? 'danger' : 
                              'secondary'
                            }
                          >
                            {percentage}%
                          </Badge>
                          <br />
                          <small className="text-muted">
                            {presentCount}/{totalSessions}
                          </small>
                        </td>
                        <td className="text-center">
                          {canManageAttendance ? (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleOpenStudentModal(student)}
                              title="Edit all sessions"
                            >
                              ✏️
                            </Button>
                          ) : (
                            <Button 
                              variant="outline-info" 
                              size="sm"
                              onClick={() => handleOpenStudentModal(student)}
                            >
                              👁️
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* No Students Message */}
      {attendanceData && students.length === 0 && (
        <Card>
          <Card.Body className="text-center py-5">
            <Alert variant="info">
              <h5>No students found for this date</h5>
              <p>Please initialize attendance for this date first.</p>
              {canManageAttendance && (
                <Button 
                  variant="primary" 
                  className="mt-3"
                  onClick={() => setShowInitializeModal(true)}
                >
                  Initialize Attendance
                </Button>
              )}
            </Alert>
          </Card.Body>
        </Card>
      )}

      {/* No Attendance Data Message */}
      {!attendanceData && !loading && (
        <Card>
          <Card.Body className="text-center py-5">
            <Alert variant="warning">
              <h5>No attendance data for {new Date(selectedDate).toLocaleDateString()}</h5>
              <p>Please initialize attendance for this date to start marking.</p>
              {canManageAttendance && (
                <Button 
                  variant="primary" 
                  className="mt-3"
                  onClick={() => setShowInitializeModal(true)}
                >
                  Initialize Attendance for This Date
                </Button>
              )}
            </Alert>
          </Card.Body>
        </Card>
      )}

      {/* Initialize Daily Attendance Modal */}
      <Modal show={showInitializeModal} onHide={() => setShowInitializeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Initialize Daily Attendance</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This will create attendance records for all active students for <strong>{selectedDate}</strong>.</p>
          <p>All sessions will be marked as "Absent" initially and can be updated later.</p>
          <Alert variant="info">
            <strong>Note:</strong> This action cannot be undone. If attendance already exists for this date, it will not be overwritten.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInitializeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={initializeDailyAttendance}>
            Initialize Attendance
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Student Attendance Modal - Edit Form */}
      <Modal show={showStudentModal} onHide={() => setShowStudentModal(false)} size="xl">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            📝 Mark/Update Attendance - {selectedStudent?.student?.fullName || 'Student'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedStudent && (
            <>
              <Card className="mb-3 border-info">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <div>
                        <strong>📅 Date:</strong>{' '}
                        {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div>
                        <strong>🎓 Admission No:</strong>{' '}
                        <Badge bg="primary">{selectedStudent.student?.admissionNo || 'N/A'}</Badge>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Alert variant="info" className="mb-3">
                <strong>ℹ️ Instructions:</strong> Select status for each of the 14 daily sessions. 
                You can add optional notes for any session. Click "Save Attendance" when done.
              </Alert>

              <h6 className="mb-3">
                <strong>14 Daily Sessions:</strong>
              </h6>
              <div className="table-responsive">
                <Table striped bordered hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '5%' }} className="text-center">#</th>
                      <th style={{ width: '15%' }}>Time</th>
                      <th style={{ width: '25%' }}>Session Name</th>
                      <th style={{ width: '25%' }}>Status</th>
                      <th style={{ width: '30%' }}>Notes (Optional)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => {
                      const formData = studentAttendanceForm[session.key] || { status: 'Present', notes: '' };
                      const currentStatus = selectedStudent.sessions?.[session.key]?.status || 'Present';
                      
                      return (
                        <tr key={session.key}>
                          <td className="text-center">
                            <Badge bg="secondary">{index + 1}</Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              <strong>{session.time}</strong>
                            </small>
                          </td>
                          <td>
                            <strong>{session.name}</strong>
                          </td>
                          <td>
                            <Form.Select
                              size="sm"
                              value={formData.status}
                              onChange={(e) => handleStudentFormChange(session.key, 'status', e.target.value)}
                              disabled={!canManageAttendance}
                              className={
                                formData.status === 'Present' ? 'border-success' :
                                formData.status === 'Absent' ? 'border-danger' :
                                formData.status === 'Sick' ? 'border-warning' :
                                'border-info'
                              }
                            >
                              <option value="Present">✅ Present</option>
                              <option value="Absent">❌ Absent</option>
                              <option value="Sick">🤒 Sick</option>
                              <option value="Leave">🏖️ Leave</option>
                            </Form.Select>
                            {currentStatus !== formData.status && (
                              <small className="text-muted d-block mt-1">
                                Changed from: {currentStatus}
                              </small>
                            )}
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              size="sm"
                              placeholder="Add notes if needed..."
                              value={formData.notes}
                              onChange={(e) => handleStudentFormChange(session.key, 'notes', e.target.value)}
                              disabled={!canManageAttendance}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Summary */}
              <Card className="mt-3 border-success">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <div>
                        <strong>✅ Present:</strong>{' '}
                        <Badge bg="success">
                          {Object.values(studentAttendanceForm).filter(f => f.status === 'Present').length}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div>
                        <strong>❌ Absent:</strong>{' '}
                        <Badge bg="danger">
                          {Object.values(studentAttendanceForm).filter(f => f.status === 'Absent').length}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div>
                        <strong>📊 Total Sessions:</strong>{' '}
                        <Badge bg="info">{sessions.length}</Badge>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStudentModal(false)}>
            ❌ Cancel
          </Button>
          {canManageAttendance && (
            <Button 
              variant="primary" 
              onClick={handleSaveStudentAttendance}
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                '💾 Save Attendance'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Session Marking Modal - Mark selected session for all students */}
      <Modal show={showSessionMarkingModal} onHide={() => setShowSessionMarkingModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            📝 Mark Session Attendance
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSession && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>Session:</strong> {
                  sessions.find(s => s.key === selectedSession)?.time
                } - {
                  sessions.find(s => s.key === selectedSession)?.name
                }
                <br />
                <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                <br />
                <strong>Total Students:</strong> {students.length}
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label><strong>Status for All Students:</strong></Form.Label>
                <Form.Select
                  value={sessionMarkingData.status || 'Present'}
                  onChange={(e) => setSessionMarkingData({...sessionMarkingData, status: e.target.value})}
                  size="lg"
                >
                  <option value="Present">✅ Present</option>
                  <option value="Absent">❌ Absent</option>
                  <option value="Sick">🤒 Sick</option>
                  <option value="Leave">🏖️ Leave</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label><strong>Notes (Optional):</strong></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={sessionMarkingData.notes || ''}
                  onChange={(e) => setSessionMarkingData({...sessionMarkingData, notes: e.target.value})}
                  placeholder="Add notes for this session (applies to all students)..."
                />
              </Form.Group>

              <Alert variant="warning">
                <strong>⚠️ Warning:</strong> This will mark <strong>{sessionMarkingData.status || 'Present'}</strong> for 
                all <strong>{students.length} students</strong> in the session: {
                  sessions.find(s => s.key === selectedSession)?.name
                }
              </Alert>

              <div className="table-responsive mt-3">
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th>Current Status</th>
                      <th>Will Be Marked As</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const currentStatus = student.sessions?.[selectedSession]?.status || 'Present';
                      const rowKey = student.student?._id || student._id || `student-${index}`;
                      return (
                        <tr key={rowKey}>
                          <td>{index + 1}</td>
                          <td><strong>{student.student?.fullName || 'Unknown'}</strong></td>
                          <td><Badge bg="primary">{student.student?.admissionNo || 'N/A'}</Badge></td>
                          <td>
                            <Badge bg={
                              currentStatus === 'Present' ? 'success' :
                              currentStatus === 'Absent' ? 'danger' :
                              currentStatus === 'Sick' ? 'warning' : 'info'
                            }>
                              {currentStatus}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={
                              sessionMarkingData.status === 'Present' ? 'success' :
                              sessionMarkingData.status === 'Absent' ? 'danger' :
                              sessionMarkingData.status === 'Sick' ? 'warning' : 'info'
                            }>
                              {sessionMarkingData.status || 'Present'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSessionMarkingModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                
                const response = await api.post('/attendance/bulk-mark-session', {
                  date: selectedDate,
                  sessionKey: selectedSession,
                  status: sessionMarkingData.status || 'Present',
                  notes: sessionMarkingData.notes || ''
                });
                
                if (response.data.success) {
                  setSuccess(`Successfully marked ${sessionMarkingData.status || 'Present'} for all students in ${sessions.find(s => s.key === selectedSession)?.name}`);
                  setShowSessionMarkingModal(false);
                  setSessionMarkingData({});
                  await loadAttendanceData();
                } else {
                  setError(response.data.message || 'Failed to mark session attendance');
                }
              } catch (error) {
                console.error('Error marking session attendance:', error);
                setError('Failed to mark session attendance. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Marking...
              </>
            ) : (
              `✅ Mark All Students as ${sessionMarkingData.status || 'Present'}`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Mark Session Modal */}
      <Modal show={showBulkMarkModal} onHide={() => setShowBulkMarkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>📋 Bulk Mark Session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Session</Form.Label>
              <Form.Select
                value={bulkMarkData.sessionKey}
                onChange={(e) => setBulkMarkData({...bulkMarkData, sessionKey: e.target.value})}
              >
                <option value="">Choose a session...</option>
                {sessions.map(session => (
                  <option key={session.key} value={session.key}>
                    {session.time} - {session.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Status for All Students</Form.Label>
              <Form.Select
                value={bulkMarkData.status}
                onChange={(e) => setBulkMarkData({...bulkMarkData, status: e.target.value})}
              >
                <option value="Present">✅ Present</option>
                <option value="Absent">❌ Absent</option>
                <option value="Sick">🤒 Sick</option>
                <option value="Leave">🏖️ Leave</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Notes (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={bulkMarkData.notes}
                onChange={(e) => setBulkMarkData({...bulkMarkData, notes: e.target.value})}
                placeholder="Add any notes for this session..."
              />
            </Form.Group>
          </Form>
          
          <Alert variant="warning">
            <strong>⚠️ Warning:</strong> This will mark <strong>{bulkMarkData.status}</strong> for ALL {students.length} students in the selected session.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkMarkModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={bulkMarkSession}
            disabled={!bulkMarkData.sessionKey}
          >
            Mark All Students
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DailyAttendance;
