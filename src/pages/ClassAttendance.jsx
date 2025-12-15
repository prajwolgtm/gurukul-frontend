import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal, Badge,
  Alert, Spinner, Tabs, Tab, InputGroup, ListGroup, ButtonGroup
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import {
  getClasses, startAttendanceSession,
  getClassAttendanceSessions, getAttendanceSession, finalizeAttendanceSession
} from '../api/classes';
import api from '../api/client';

const ClassAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('classes');

  // Modals
  const [showStartSession, setShowStartSession] = useState(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);

  // Form data
  const [sessionForm, setSessionForm] = useState({
    sessionDate: new Date().toISOString().split('T')[0],
    sessionStartTime: '',
    sessionEndTime: '',
    sessionInfo: {
      topic: '',
      description: '',
      sessionType: 'lecture'
    },
    venue: {
      location: '',
      room: '',
      building: ''
    },
    isLeaveDay: false,
    leaveType: 'holiday', // 'holiday', 'teacher-leave', 'institutional-holiday', 'emergency-closure'
    leaveReason: '',
    holidayName: '',
    substituteTeacher: null
  });
  
  const [teachers, setTeachers] = useState([]);

  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, []);
  
  const loadTeachers = async () => {
    try {
      const response = await api.get('/teachers', { params: { status: 'active' } });
      if (response.data.success) {
        setTeachers(response.data.data?.teachers || response.data.teachers || []);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadAttendanceSessions(selectedClass._id);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await getClasses({
        myClasses: user?.role === ROLES.TEACHER ? 'true' : 'false',
        status: 'active'
      });
      if (response.success) {
        setClasses(response.data.classes);
        if (response.data.classes.length > 0 && !selectedClass) {
          setSelectedClass(response.data.classes[0]);
        }
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to load classes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceSessions = async (classId) => {
    setLoading(true);
    try {
      const response = await getClassAttendanceSessions(classId, {
        limit: 20,
        sort: '-sessionDate'
      });
      if (response.success) {
        setAttendanceSessions(response.data.sessions || []);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to load attendance sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sessionData = {
        subjectClassId: selectedClass._id,
        sessionDate: sessionForm.sessionDate,
        sessionStartTime: sessionForm.sessionStartTime,
        sessionEndTime: sessionForm.sessionEndTime,
        sessionInfo: sessionForm.sessionInfo,
        venue: sessionForm.venue,
        isLeaveDay: sessionForm.isLeaveDay,
        leaveType: sessionForm.leaveType,
        leaveReason: sessionForm.leaveReason,
        holidayName: sessionForm.holidayName,
        substituteTeacher: sessionForm.substituteTeacher || null
      };
      
      const response = await startAttendanceSession(sessionData);
      
      if (response.success) {
        setSuccess('Attendance session started successfully!');
        setShowStartSession(false);
        resetSessionForm();
        loadAttendanceSessions(selectedClass._id);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to start session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    setLoading(true);
    try {
      // Prepare bulk attendance data
      const attendanceDataArray = Object.entries(attendanceData).map(([studentId, data]) => ({
        studentId,
        status: data.status || 'present',
        details: {
          arrivalTime: data.arrivalTime,
          lateReason: data.lateReason,
          absenceReason: data.absenceReason,
          absenceNote: data.absenceNote,
          participation: data.participation || 'average',
          behaviorNotes: data.notes || ''
        }
      }));
      
      const response = await api.put('/class-attendance/mark-bulk', {
        sessionId: selectedSession.sessionId || selectedSession._id,
        attendanceData: attendanceDataArray
      });
      
      if (response.data.success) {
        setSuccess('Attendance marked successfully!');
        setShowMarkAttendance(false);
        loadAttendanceSessions(selectedClass._id);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to mark attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to finalize this session? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await finalizeAttendanceSession(sessionId);
      if (response.success) {
        setSuccess('Session finalized successfully!');
        loadAttendanceSessions(selectedClass._id);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to finalize session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetSessionForm = () => {
    setSessionForm({
      sessionDate: new Date().toISOString().split('T')[0],
      sessionStartTime: '',
      sessionEndTime: '',
      sessionInfo: {
        topic: '',
        description: '',
        sessionType: 'lecture'
      },
      venue: {
        location: '',
        room: '',
        building: ''
      },
      isLeaveDay: false,
      leaveType: 'holiday',
      leaveReason: '',
      holidayName: '',
      substituteTeacher: null
    });
  };

  const openMarkAttendanceModal = async (session) => {
    setSelectedSession(session);
    setLoading(true);
    try {
      const response = await api.get(`/class-attendance/session/${session.sessionId || session._id}`);
      if (response.data.success) {
        const sessionData = response.data.data.session;
        // Initialize attendance data for all students in the class
        const initialAttendance = {};
        selectedClass.students?.forEach(studentInfo => {
          const student = studentInfo.student;
          const studentId = student._id || student;
          // Find existing attendance record if any
          const existingRecord = sessionData.attendance?.find(a => 
            (a.student._id || a.student).toString() === studentId.toString()
          );
          initialAttendance[studentId] = {
            status: existingRecord?.status || 'present', // Default to present
            notes: existingRecord?.behaviorNotes || '',
            arrivalTime: existingRecord?.arrivalTime || '',
            lateReason: existingRecord?.lateReason || '',
            absenceReason: existingRecord?.absenceReason || '',
            absenceNote: existingRecord?.absenceNote || '',
            participation: existingRecord?.participation || 'average'
          };
        });
        setAttendanceData(initialAttendance);
        setShowMarkAttendance(true);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to load session details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceStatus = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      excused: 'info'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getSessionStatusBadge = (status) => {
    const variants = {
      active: 'primary',
      completed: 'success',
      cancelled: 'danger',
      holiday: 'warning',
      'teacher-leave': 'info',
      postponed: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading && classes.length === 0) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Class Attendance</h2>
          <p className="text-muted">Manage attendance for class sessions</p>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="classes" title="Select Class">
          <Card>
            <Card.Header>
              <h5>My Classes</h5>
            </Card.Header>
            <Card.Body>
              {classes.length === 0 ? (
                <div className="text-center text-muted">
                  <p>No classes found</p>
                </div>
              ) : (
                <Row>
                  {classes.map((classItem) => (
                    <Col md={4} key={classItem._id} className="mb-3">
                      <Card 
                        className={`h-100 ${selectedClass?._id === classItem._id ? 'border-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedClass(classItem)}
                      >
                        <Card.Body>
                          <Card.Title>{classItem.className}</Card.Title>
                          <Card.Text>
                            <strong>Subject:</strong> {classItem.subject}<br />
                            <strong>Students:</strong> {classItem.students?.length || 0}<br />
                            <strong>Status:</strong> {getStatusBadge(classItem.status)}
                          </Card.Text>
                          {selectedClass?._id === classItem._id && (
                            <Badge bg="primary">Selected</Badge>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="sessions" title="Attendance Sessions" disabled={!selectedClass}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5>Attendance Sessions - {selectedClass?.className}</h5>
              <Button 
                variant="primary" 
                onClick={() => setShowStartSession(true)}
                disabled={!selectedClass}
              >
                Start New Session
              </Button>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" /> Loading sessions...
                </div>
              ) : attendanceSessions.length === 0 ? (
                <div className="text-center text-muted">
                  <p>No attendance sessions found</p>
                  <p>Start a new session to begin taking attendance</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Topic</th>
                      <th>Present/Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSessions.map((session) => (
                      <tr key={session._id}>
                        <td>{new Date(session.sessionDate).toLocaleDateString()}</td>
                        <td>
                          {session.sessionStartTime} - {session.sessionEndTime}
                        </td>
                        <td>
                          {session.leaveInfo?.isHoliday || session.leaveInfo?.isTeacherLeave ? (
                            <div>
                              <Badge bg={session.leaveInfo.isHoliday ? 'warning' : 'info'} className="mb-1">
                                {session.leaveInfo.isHoliday ? '🏛️ Holiday' : '👨‍🏫 Teacher Leave'}
                              </Badge>
                              {session.leaveInfo.holidayName && (
                                <div><strong>{session.leaveInfo.holidayName}</strong></div>
                              )}
                              {session.leaveInfo.leaveReason && (
                                <div className="text-muted small">{session.leaveInfo.leaveReason}</div>
                              )}
                            </div>
                          ) : (
                            <>
                              {session.sessionInfo?.topic || 'Regular Class'}
                              {session.sessionInfo?.description && (
                                <div className="text-muted small">{session.sessionInfo.description}</div>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {session.leaveInfo?.isHoliday || session.leaveInfo?.isTeacherLeave ? (
                            <Badge bg="secondary">N/A</Badge>
                          ) : (
                            <>
                              <Badge bg="info">
                                {session.statistics?.present || 0}/{session.statistics?.total || 0}
                              </Badge>
                              {session.statistics?.total > 0 && (
                                <div className="text-muted small">
                                  {Math.round((session.statistics.present / session.statistics.total) * 100)}% present
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td>{getSessionStatusBadge(session.sessionStatus)}</td>
                        <td>
                          {session.leaveInfo?.isHoliday || session.leaveInfo?.isTeacherLeave ? (
                            <Badge bg="secondary">No Attendance</Badge>
                          ) : (
                            <ButtonGroup size="sm">
                              <Button 
                                variant="outline-primary"
                                onClick={() => openMarkAttendanceModal(session)}
                                disabled={session.sessionStatus === 'completed' || session.sessionStatus === 'holiday' || session.sessionStatus === 'teacher-leave'}
                              >
                                {session.sessionStatus === 'active' ? 'Mark Attendance' : 'View'}
                              </Button>
                              {session.sessionStatus === 'active' && (
                                <Button 
                                  variant="outline-success"
                                  onClick={() => handleFinalizeSession(session._id)}
                                >
                                  Finalize
                                </Button>
                              )}
                            </ButtonGroup>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Start Session Modal */}
      <Modal show={showStartSession} onHide={() => setShowStartSession(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Start Attendance Session - {selectedClass?.className}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStartSession}>
          <Modal.Body>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Session Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={sessionForm.sessionDate}
                    onChange={(e) => setSessionForm({...sessionForm, sessionDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={sessionForm.sessionStartTime}
                    onChange={(e) => setSessionForm({...sessionForm, sessionStartTime: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={sessionForm.sessionEndTime}
                    onChange={(e) => setSessionForm({...sessionForm, sessionEndTime: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Topic</Form.Label>
              <Form.Control
                type="text"
                value={sessionForm.sessionInfo.topic}
                onChange={(e) => setSessionForm({
                  ...sessionForm,
                  sessionInfo: {...sessionForm.sessionInfo, topic: e.target.value}
                })}
                placeholder="Enter class topic"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={sessionForm.sessionInfo.description}
                onChange={(e) => setSessionForm({
                  ...sessionForm,
                  sessionInfo: {...sessionForm.sessionInfo, description: e.target.value}
                })}
                placeholder="Enter session description"
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Session Type</Form.Label>
                  <Form.Select
                    value={sessionForm.sessionInfo.sessionType}
                    onChange={(e) => setSessionForm({
                      ...sessionForm,
                      sessionInfo: {...sessionForm.sessionInfo, sessionType: e.target.value}
                    })}
                  >
                    <option value="lecture">Lecture</option>
                    <option value="practical">Practical</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="exam">Exam</option>
                    <option value="assignment">Assignment</option>
                    <option value="discussion">Discussion</option>
                    <option value="field-work">Field Work</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Venue</Form.Label>
                  <Form.Control
                    type="text"
                    value={sessionForm.venue.location}
                    onChange={(e) => setSessionForm({
                      ...sessionForm,
                      venue: {...sessionForm.venue, location: e.target.value}
                    })}
                    placeholder="Enter venue/room"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="isLeaveDay"
                label={
                  <span>
                    <strong>📅 Mark this day as Leave / Holiday</strong>
                    <br />
                    <small className="text-muted">No class will be held. No attendance will be taken.</small>
                  </span>
                }
                checked={sessionForm.isLeaveDay}
                onChange={(e) => setSessionForm({
                  ...sessionForm,
                  isLeaveDay: e.target.checked,
                  leaveType: e.target.checked ? sessionForm.leaveType : 'holiday'
                })}
              />
            </Form.Group>
            {sessionForm.isLeaveDay && (
              <Alert variant="info" className="mb-3">
                <strong>Leave / Holiday Information</strong>
                <Row className="mt-3">
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Leave Type *</Form.Label>
                      <Form.Select
                        value={sessionForm.leaveType}
                        onChange={(e) => setSessionForm({
                          ...sessionForm,
                          leaveType: e.target.value
                        })}
                        required
                      >
                        <option value="holiday">Holiday</option>
                        <option value="teacher-leave">Teacher Leave</option>
                        <option value="institutional-holiday">Institutional Holiday</option>
                        <option value="emergency-closure">Emergency Closure</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  {sessionForm.leaveType === 'holiday' || sessionForm.leaveType === 'institutional-holiday' ? (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Holiday Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={sessionForm.holidayName}
                          onChange={(e) => setSessionForm({
                            ...sessionForm,
                            holidayName: e.target.value
                          })}
                          placeholder="e.g. Diwali, Christmas, New Year"
                        />
                      </Form.Group>
                    </Col>
                  ) : sessionForm.leaveType === 'teacher-leave' ? (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Substitute Teacher (Optional)</Form.Label>
                        <Form.Select
                          value={sessionForm.substituteTeacher || ''}
                          onChange={(e) => setSessionForm({
                            ...sessionForm,
                            substituteTeacher: e.target.value || null
                          })}
                        >
                          <option value="">No substitute</option>
                          {teachers.map(teacher => (
                            <option key={teacher._id || teacher.user?._id} value={teacher._id || teacher.user?._id}>
                              {teacher.user?.fullName || teacher.fullName || teacher.email}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  ) : null}
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Reason / Notes *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={sessionForm.leaveReason}
                    onChange={(e) => setSessionForm({
                      ...sessionForm,
                      leaveReason: e.target.value
                    })}
                    placeholder={
                      sessionForm.leaveType === 'teacher-leave' 
                        ? "e.g. Personal leave, medical appointment, family emergency"
                        : sessionForm.leaveType === 'holiday' || sessionForm.leaveType === 'institutional-holiday'
                        ? "e.g. Festival holiday, national holiday, campus event"
                        : "e.g. Weather conditions, power outage, emergency situation"
                    }
                    required
                  />
                </Form.Group>
                <div className="text-muted small">
                  <strong>Note:</strong> This session will be marked as {sessionForm.leaveType === 'teacher-leave' ? 'teacher-leave' : 'holiday'}. 
                  No student attendance records will be created.
                </div>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowStartSession(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Starting...' : 'Start Session'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Mark Attendance Modal */}
      <Modal show={showMarkAttendance} onHide={() => setShowMarkAttendance(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            📋 Mark Attendance - {selectedSession?.sessionInfo?.topic || 'Class Session'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSession && (
            <div>
              <Alert variant="info" className="mb-3">
                <Row>
                  <Col md={4}>
                    <strong>📅 Date:</strong> {new Date(selectedSession.sessionDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </Col>
                  <Col md={4}>
                    <strong>⏰ Time:</strong> {selectedSession.sessionStartTime} - {selectedSession.sessionEndTime}
                  </Col>
                  <Col md={4}>
                    <strong>👥 Students:</strong> {selectedClass?.students?.length || 0}
                  </Col>
                </Row>
                {selectedSession.sessionInfo?.venue?.room && (
                  <div className="mt-2">
                    <strong>📍 Venue:</strong> {selectedSession.sessionInfo.venue.room}
                    {selectedSession.sessionInfo.venue.building && `, ${selectedSession.sessionInfo.venue.building}`}
                  </div>
                )}
              </Alert>

              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table responsive hover>
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: '30%' }}>Student</th>
                      <th style={{ width: '40%' }}>Status</th>
                      <th style={{ width: '30%' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass?.students?.map((studentInfo) => {
                      const student = studentInfo.student;
                      const studentId = student._id || student;
                      const currentStatus = attendanceData[studentId]?.status || 'present';
                      
                      return (
                        <tr key={studentId}>
                          <td>
                            <strong>{student.personalInfo?.fullName || student.fullName}</strong>
                            <div className="text-muted small">
                              {student.studentId || student.admissionNo}
                            </div>
                          </td>
                          <td>
                            <ButtonGroup size="sm" className="d-flex flex-wrap">
                              {['present', 'absent', 'late', 'excused'].map((status) => {
                                const isActive = currentStatus === status;
                                const variants = {
                                  present: isActive ? 'success' : 'outline-success',
                                  absent: isActive ? 'danger' : 'outline-danger',
                                  late: isActive ? 'warning' : 'outline-warning',
                                  excused: isActive ? 'info' : 'outline-info'
                                };
                                return (
                                  <Button
                                    key={status}
                                    variant={variants[status]}
                                    onClick={() => updateAttendanceStatus(studentId, status)}
                                    className="mb-1"
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                );
                              })}
                            </ButtonGroup>
                            {currentStatus === 'late' && (
                              <Form.Control
                                type="text"
                                size="sm"
                                className="mt-1"
                                placeholder="Late reason (optional)"
                                value={attendanceData[studentId]?.lateReason || ''}
                                onChange={(e) => setAttendanceData(prev => ({
                                  ...prev,
                                  [studentId]: {
                                    ...prev[studentId],
                                    lateReason: e.target.value
                                  }
                                }))}
                              />
                            )}
                            {currentStatus === 'absent' && (
                              <Form.Control
                                type="text"
                                size="sm"
                                className="mt-1"
                                placeholder="Absence reason (optional)"
                                value={attendanceData[studentId]?.absenceNote || ''}
                                onChange={(e) => setAttendanceData(prev => ({
                                  ...prev,
                                  [studentId]: {
                                    ...prev[studentId],
                                    absenceNote: e.target.value
                                  }
                                }))}
                              />
                            )}
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              size="sm"
                              value={attendanceData[studentId]?.notes || ''}
                              onChange={(e) => setAttendanceData(prev => ({
                                ...prev,
                                [studentId]: {
                                  ...prev[studentId],
                                  notes: e.target.value
                                }
                              }))}
                              placeholder="Additional notes"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              
              <div className="mt-3 p-2 bg-light rounded">
                <strong>Quick Actions:</strong>
                <div className="d-flex gap-2 mt-2">
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => {
                      const newData = {};
                      selectedClass.students?.forEach(studentInfo => {
                        const studentId = studentInfo.student._id || studentInfo.student;
                        newData[studentId] = { ...attendanceData[studentId], status: 'present' };
                      });
                      setAttendanceData(newData);
                    }}
                  >
                    Mark All Present
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => {
                      const newData = {};
                      selectedClass.students?.forEach(studentInfo => {
                        const studentId = studentInfo.student._id || studentInfo.student;
                        newData[studentId] = { ...attendanceData[studentId], status: 'absent' };
                      });
                      setAttendanceData(newData);
                    }}
                  >
                    Mark All Absent
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarkAttendance(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleMarkAttendance} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              '💾 Save Attendance'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ClassAttendance;
