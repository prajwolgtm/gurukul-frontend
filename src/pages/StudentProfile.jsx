import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  ListGroup,
  Modal,
  ProgressBar,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import studentProfileAPI from '../api/studentProfile';
import { useAuth } from '../store/auth';
import { getLeaveRequests, getVisitRequests } from '../api/requests';

const CATEGORY_LABELS = {
  general: 'General',
  academic: 'Academic',
  attendance: 'Attendance',
  behaviour: 'Behaviour',
  health: 'Health / Wellness',
  hostel: 'Hostel / Lifestyle'
};

const VISIBILITY_LABELS = {
  staff: 'Staff',
  management: 'Management',
  all: 'All'
};

const INITIAL_NOTE_FORM = {
  title: '',
  category: 'general',
  visibility: 'staff',
  content: ''
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
}) : '—');

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteForm, setNoteForm] = useState(INITIAL_NOTE_FORM);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState('');
  const [walletForm, setWalletForm] = useState({
    type: 'credit',
    amount: '',
    source: '',
    remark: '',
    reference: ''
  });
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletMessage, setWalletMessage] = useState('');
  const [editingTx, setEditingTx] = useState(null);
  const [walletEditForm, setWalletEditForm] = useState({
    source: '',
    remark: '',
    reference: ''
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const canAddNotes = profile?.permissions?.canAddNotes;

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await studentProfileAPI.getProfile(studentId);
      if (data?.success) {
        setProfile(data.data);
      } else {
        setError(data?.message || 'Failed to load student profile');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  const loadRequests = async () => {
    if (!profile?.student) return;
    
    setRequestsLoading(true);
    try {
      const studentAdmissionNo = profile.student.admissionNo;
      const studentId = profile.student.id || profile.student._id;

      // Fetch all leave requests and filter by student
      const leaveRes = await getLeaveRequests();
      if (leaveRes.success) {
        const allLeaveRequests = leaveRes.data || leaveRes.leaveRequests || [];
        // Filter requests for this student
        const studentLeaveRequests = allLeaveRequests.filter(req => {
          const reqStudentId = req.student?.studentId || req.student?.admissionNo;
          const reqStudentObjId = req.student?.id || req.student?._id;
          return reqStudentId === studentAdmissionNo || reqStudentObjId === studentId;
        });
        setLeaveRequests(studentLeaveRequests);
      }

      // Fetch all visit requests and filter by student
      const visitRes = await getVisitRequests();
      if (visitRes.success) {
        const allVisitRequests = visitRes.data || visitRes.visitRequests || [];
        // Filter requests for this student
        const studentVisitRequests = allVisitRequests.filter(req => {
          const reqStudentId = req.student?.studentId || req.student?.admissionNo;
          const reqStudentObjId = req.student?.id || req.student?._id;
          return reqStudentId === studentAdmissionNo || reqStudentObjId === studentId;
        });
        setVisitRequests(studentVisitRequests);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Load requests when profile is loaded
  useEffect(() => {
    if (profile?.student) {
      loadRequests();
    }
  }, [profile?.student?.admissionNo, profile?.student?.id]);

  const handleNoteChange = (e) => {
    const { name, value } = e.target;
    setNoteForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteForm.content.trim()) {
      setNoteMessage('Please enter note details before saving.');
      return;
    }

    setNoteSaving(true);
    setNoteMessage('');
    try {
      await studentProfileAPI.addNote(studentId, noteForm);
      setNoteForm(INITIAL_NOTE_FORM);
      await loadProfile();
    } catch (err) {
      setNoteMessage(err?.response?.data?.message || 'Failed to add note');
    } finally {
      setNoteSaving(false);
    }
  };

  const attendanceRecent = useMemo(
    () => profile?.attendance?.recent?.slice(0, 7) || [],
    [profile]
  );

  const examsRecent = useMemo(
    () => profile?.exams?.recent?.slice(0, 8) || [],
    [profile]
  );

  const canEditWallet = user?.role === 'Admin' || user?.role === 'Coordinator' || user?.role === 'Principal';

  const handleWalletChange = (e) => {
    const { name, value } = e.target;
    setWalletForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    setWalletMessage('');

    const amountNumber = Number(walletForm.amount);
    if (!walletForm.amount || isNaN(amountNumber) || amountNumber <= 0) {
      setWalletMessage('Please enter a valid positive amount.');
      return;
    }

    setWalletSaving(true);
    try {
      await studentProfileAPI.addWalletTransaction(studentId, {
        type: walletForm.type,
        amount: amountNumber,
        source: walletForm.source,
        creditRemark: walletForm.type === 'credit' ? walletForm.remark : undefined,
        debitRemark: walletForm.type === 'debit' ? walletForm.remark : undefined,
        reference: walletForm.reference
      });
      setWalletForm({
        type: 'credit',
        amount: '',
        source: '',
        remark: '',
        reference: ''
      });
      await loadProfile();
    } catch (err) {
      setWalletMessage(err?.response?.data?.message || 'Failed to add transaction');
    } finally {
      setWalletSaving(false);
    }
  };

  const handleOpenEditTx = (tx) => {
    setEditingTx(tx);
    setWalletEditForm({
      source: tx.source || '',
      remark: tx.creditRemark || tx.debitRemark || '',
      reference: tx.reference || ''
    });
  };

  const handleWalletEditChange = (e) => {
    const { name, value } = e.target;
    setWalletEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWalletEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;

    setWalletMessage('');
    setWalletSaving(true);
    try {
      await studentProfileAPI.updateWalletTransaction(studentId, editingTx.id, {
        source: walletEditForm.source,
        remark: walletEditForm.remark,
        reference: walletEditForm.reference
      });
      setEditingTx(null);
      await loadProfile();
    } catch (err) {
      setWalletMessage(err?.response?.data?.message || 'Failed to update transaction');
    } finally {
      setWalletSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  if (!profile) return null;

  return (
    <div className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="link" onClick={() => navigate(-1)} className="px-0">
          ← Back
        </Button>
        <div className="text-muted small">
          Viewing as {user?.fullName} ({user?.role})
        </div>
      </div>

      <Row className="g-3">
        <Col md={8}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <h3 className="mb-0">
                    {profile.student.fullName}{' '}
                    <Badge bg="secondary">{profile.student.admissionNo}</Badge>
                  </h3>
                  <div className="text-muted small">
                    Age {profile.student.age || '—'} • {profile.student.gender} • Blood Group {profile.student.bloodGroup || '—'}
                  </div>
                </div>
                <div className="text-md-end">
                  <Badge bg={
                    profile.student.status === 'active' ? 'success' :
                    profile.student.status === 'graduated' ? 'primary' :
                    profile.student.status === 'leftout' ? 'warning' :
                    'secondary'
                  }>
                    {profile.student.status}
                  </Badge>
                  <div className="text-muted small mt-1">
                    Joined {formatDate(profile.student.academic?.dateOfAdmission)}
                  </div>
                </div>
              </div>

              <Row className="mt-3">
                <Col md={6}>
                  <h6>Academic Placement</h6>
                  <ListGroup variant="flush" className="small">
                    <ListGroup.Item className="px-0">
                      Department: <strong>{profile.student.academic?.department?.name || '—'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0">
                      Sub-Departments:{' '}
                      {profile.student.academic?.subDepartments?.length
                        ? profile.student.academic.subDepartments.map(sd => sd.name).join(', ')
                        : '—'}
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0">
                      Batches:{' '}
                      {profile.student.academic?.batches?.length
                        ? profile.student.academic.batches.map(batch => batch.name).join(', ')
                        : '—'}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <h6>Contact</h6>
                  <ListGroup variant="flush" className="small">
                    <ListGroup.Item className="px-0">
                      Phone: <strong>{profile.student.contact?.phone || '—'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0">
                      Guardian: <strong>{profile.student.contact?.guardianPhone || '—'}</strong>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0">
                      Address: <strong>{profile.student.contact?.address || '—'}</strong>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="mb-3">
            <Card.Body>
              <h5>Attendance Snapshot</h5>
              <ProgressBar
                now={profile.attendance.attendancePercentage}
                label={`${profile.attendance.attendancePercentage}%`}
                className="mb-2"
              />
              <div className="text-muted small mb-3">
                {profile.attendance.presentSessions} / {profile.attendance.totalSessions} sessions present
              </div>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="fw-bold">{profile.attendance.presentSessions}</div>
                  <div className="text-muted small">Present</div>
                </div>
                <div>
                  <div className="fw-bold">{profile.attendance.absentSessions}</div>
                  <div className="text-muted small">Absent</div>
                </div>
                <div>
                  <div className="fw-bold">{profile.attendance.totalRecords}</div>
                  <div className="text-muted small">Days Tracked</div>
                </div>
              </div>
              <div className="mt-3 text-end">
                <Link to={`/reports/student/${profile.student.id}/attendance`}>
                  <Button variant="outline-primary" size="sm">Full attendance report</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
          
          {profile.classAttendance && (
            <Card className="mb-3">
              <Card.Body>
                <h5>Class Attendance</h5>
                <ProgressBar
                  now={profile.classAttendance.statistics.attendancePercentage}
                  label={`${profile.classAttendance.statistics.attendancePercentage}%`}
                  className="mb-2"
                />
                <div className="text-muted small mb-3">
                  {profile.classAttendance.statistics.present} / {profile.classAttendance.statistics.totalClasses} classes present
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <div>
                    <div className="fw-bold">{profile.classAttendance.statistics.present}</div>
                    <div className="text-muted small">Present</div>
                  </div>
                  <div>
                    <div className="fw-bold">{profile.classAttendance.statistics.absent}</div>
                    <div className="text-muted small">Absent</div>
                  </div>
                  <div>
                    <div className="fw-bold">{profile.classAttendance.statistics.totalClasses}</div>
                    <div className="text-muted small">Total Classes</div>
                  </div>
                </div>
                {profile.classAttendance.records && profile.classAttendance.records.length > 0 && (
                  <div className="table-responsive small">
                    <Table size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.classAttendance.records.slice(0, 5).map((record) => (
                          <tr key={record._id}>
                            <td>{formatDate(record.date)}</td>
                            <td>
                              <div className="small">{record.className}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{record.subject}</div>
                            </td>
                            <td>
                              <Badge bg={
                                record.sessionStatus === 'teacher-leave' ? 'warning' :
                                record.sessionStatus === 'holiday' ? 'info' :
                                record.status === 'present' ? 'success' :
                                record.status === 'late' ? 'warning' : 'danger'
                              }>
                                {record.sessionStatus === 'teacher-leave' ? 'Teacher Leave' :
                                 record.sessionStatus === 'holiday' ? 'Holiday' :
                                 record.status === 'present' ? 'Present' :
                                 record.status === 'late' ? 'Late' : 'Absent'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    {profile.classAttendance.records.length > 5 && (
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          Showing 5 of {profile.classAttendance.records.length} records
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
          
          <Card>
            <Card.Body>
              <h5>Student Account / Wallet</h5>
              {profile.wallet ? (
                <>
                  <div className="mb-2">
                    <div className="fw-bold">
                      {profile.wallet.currentBalance ?? 0} {profile.wallet.currency || 'INR'}
                    </div>
                    <div className="text-muted small">
                      Current Balance (Office-held + Puja collections etc.)
                    </div>
                  </div>
                  <div className="text-muted small mb-2">
                    Total Credit: {profile.wallet.totalCredit ?? 0} • Total Debit: {profile.wallet.totalDebit ?? 0}
                  </div>
                  {Array.isArray(profile.wallet.recentTransactions) && profile.wallet.recentTransactions.length > 0 && (
                    <div className="table-responsive small">
                      <Table size="sm" className="mb-2">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amt</th>
                            <th>Bal</th>
                            <th>Remark</th>
                            {canEditWallet && <th />}
                          </tr>
                        </thead>
                        <tbody>
                          {profile.wallet.recentTransactions.map(tx => (
                            <tr key={tx.id}>
                              <td>{formatDate(tx.date)}</td>
                              <td>
                                <Badge bg={tx.type === 'credit' ? 'success' : 'danger'}>
                                  {tx.type}
                                </Badge>
                              </td>
                              <td>{tx.amount}</td>
                              <td>{tx.balanceAfter}</td>
                              <td>{tx.creditRemark || tx.debitRemark || '-'}</td>
                              {canEditWallet && (
                                <td>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => handleOpenEditTx(tx)}
                                  >
                                    ✏️
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted small">
                  No wallet data yet. Add a credit or debit transaction to initialize the balance.
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={7}>
          <Card className="h-100">
            <Card.Header>
              <strong>Recent Attendance (last {attendanceRecent.length} days)</strong>
            </Card.Header>
            <Card.Body className="p-0">
              {attendanceRecent.length === 0 ? (
                <div className="p-3 text-muted small">No attendance records found.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Sessions</th>
                        <th>Present</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecent.map(record => (
                        <tr key={record.id}>
                          <td>{formatDate(record.date)}</td>
                          <td>{record.totalSessions}</td>
                          <td>
                            <Badge bg="success">{record.presentCount}</Badge>
                          </td>
                          <td>{record.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card className="h-100">
            <Card.Header>
              <strong>Exam Performance</strong>
            </Card.Header>
            <Card.Body className="p-0">
              {examsRecent.length === 0 ? (
                <div className="p-3 text-muted small">No exam records yet.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Exam</th>
                        <th>Date</th>
                        <th>%</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examsRecent.map(mark => (
                        <tr key={mark.id}>
                          <td>
                            <div className="fw-semibold">{mark.examName}</div>
                            <small className="text-muted">{mark.examType}</small>
                          </td>
                          <td>{formatDate(mark.examDate)}</td>
                          <td>
                            <Badge bg={mark.isPassed ? 'success' : 'danger'}>
                              {mark.percentage ?? 0}%
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={mark.status === 'published' ? 'primary' : 'secondary'}>
                              {mark.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col md={6}>
          <Card>
            <Card.Header>
              <strong>Leave Requests History</strong>
            </Card.Header>
            <Card.Body className="p-0">
              {requestsLoading ? (
                <div className="p-3 text-center">
                  <Spinner size="sm" />
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="p-3 text-muted small">No leave requests found.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Request ID</th>
                        <th>Type</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map(req => (
                        <tr key={req.id || req._id}>
                          <td>
                            <Badge bg="primary">{req.requestId}</Badge>
                          </td>
                          <td>{req.leaveType}</td>
                          <td>{formatDate(req.startDate)}</td>
                          <td>{formatDate(req.endDate)}</td>
                          <td>
                            <Badge bg={
                              req.status === 'approved' ? 'success' : 
                              req.status === 'rejected' ? 'danger' : 'warning'
                            }>
                              {req.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <strong>Visit Requests History</strong>
            </Card.Header>
            <Card.Body className="p-0">
              {requestsLoading ? (
                <div className="p-3 text-center">
                  <Spinner size="sm" />
                </div>
              ) : visitRequests.length === 0 ? (
                <div className="p-3 text-muted small">No visit requests found.</div>
              ) : (
                <div className="table-responsive">
                  <Table hover size="sm" className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Request ID</th>
                        <th>Type</th>
                        <th>Preferred Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitRequests.map(req => (
                        <tr key={req.id || req._id}>
                          <td>
                            <Badge bg="success">{req.requestId}</Badge>
                          </td>
                          <td>{req.visitType}</td>
                          <td>{formatDate(req.preferredDate)}</td>
                          <td>
                            {req.preferredStartTime || 'N/A'}
                            {req.preferredEndTime && ` - ${req.preferredEndTime}`}
                          </td>
                          <td>
                            <Badge bg={
                              req.status === 'approved' ? 'success' : 
                              req.status === 'rejected' ? 'danger' : 'warning'
                            }>
                              {req.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {canEditWallet && editingTx && (
        <Modal show onHide={() => setEditingTx(null)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Transaction Remark</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleWalletEditSubmit}>
              <Form.Group className="mb-2">
                <Form.Label>Source</Form.Label>
                <Form.Control
                  name="source"
                  value={walletEditForm.source}
                  onChange={handleWalletEditChange}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Remark</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="remark"
                  value={walletEditForm.remark}
                  onChange={handleWalletEditChange}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Reference / Voucher</Form.Label>
                <Form.Control
                  name="reference"
                  value={walletEditForm.reference}
                  onChange={handleWalletEditChange}
                />
              </Form.Group>
              {walletMessage && (
                <Alert variant="warning" className="py-2">
                  {walletMessage}
                </Alert>
              )}
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setEditingTx(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={walletSaving}>
                  {walletSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      )}

      <Row className="g-3 mt-1">
        <Col md={7}>
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Updates & Notes</strong>
                <small className="text-muted">
                  {profile.notes.total} total entries
                </small>
              </div>
            </Card.Header>
            <Card.Body>
              {profile.notes.items.length === 0 ? (
                <Alert variant="light" className="mb-0">
                  No notes added yet. Teachers can add updates using the form on the right.
                </Alert>
              ) : (
                <ListGroup variant="flush">
                  {profile.notes.items.map(note => (
                    <ListGroup.Item key={note.id}>
                      <div className="d-flex justify-content-between flex-wrap gap-2">
                        <div>
                          <h6 className="mb-1">
                            {note.title}{' '}
                            <Badge bg="info" className="text-uppercase">
                              {CATEGORY_LABELS[note.category] || note.category}
                            </Badge>
                          </h6>
                          <p className="mb-1">{note.content}</p>
                          <div className="text-muted small">
                            {note.createdBy?.name || 'Staff'} · {note.createdBy?.role || 'Teacher'} · {formatDateTime(note.createdAt)}
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge bg="secondary">
                            Visible to {VISIBILITY_LABELS[note.visibility] || note.visibility}
                          </Badge>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card>
            <Card.Header>
              <strong>Add Note / Update</strong>
            </Card.Header>
            <Card.Body>
              {!canAddNotes ? (
                <Alert variant="warning" className="mb-0">
                  You do not have permission to add notes for this student.
                </Alert>
              ) : (
                <Form onSubmit={handleNoteSubmit}>
                  <Form.Group className="mb-2">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      name="title"
                      placeholder="Short headline (optional)"
                      value={noteForm.title}
                      onChange={handleNoteChange}
                    />
                  </Form.Group>
                  <Row>
                    <Col sm={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Category</Form.Label>
                        <Form.Select
                          name="category"
                          value={noteForm.category}
                          onChange={handleNoteChange}
                        >
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group className="mb-2">
                        <Form.Label>Visibility</Form.Label>
                        <Form.Select
                          name="visibility"
                          value={noteForm.visibility}
                          onChange={handleNoteChange}
                        >
                          {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Details</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      name="content"
                      placeholder="Add context, action items, or follow ups..."
                      value={noteForm.content}
                      onChange={handleNoteChange}
                    />
                  </Form.Group>
                  {noteMessage && (
                    <Alert variant="warning" className="py-2">
                      {noteMessage}
                    </Alert>
                  )}
                  <div className="d-flex justify-content-end">
                    <Button type="submit" disabled={noteSaving}>
                      {noteSaving ? 'Saving...' : 'Add Note'}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
          <Card className="mt-3">
            <Card.Header>
              <strong>Wallet Transaction (Credit / Debit)</strong>
            </Card.Header>
            <Card.Body>
              {!canAddNotes ? (
                <Alert variant="light" className="mb-0">
                  Only management/teachers can record wallet transactions.
                </Alert>
              ) : (
                <Form onSubmit={handleWalletSubmit}>
                  <Row className="mb-2">
                    <Col sm={4}>
                      <Form.Select
                        name="type"
                        value={walletForm.type}
                        onChange={handleWalletChange}
                      >
                        <option value="credit">Credit (Money received / kept)</option>
                        <option value="debit">Debit (Money used / given)</option>
                      </Form.Select>
                    </Col>
                    <Col sm={4}>
                      <Form.Control
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={walletForm.amount}
                        onChange={handleWalletChange}
                      />
                    </Col>
                    <Col sm={4}>
                      <Form.Control
                        name="source"
                        placeholder="Source (e.g. Puja, Deposit)"
                        value={walletForm.source}
                        onChange={handleWalletChange}
                      />
                    </Col>
                  </Row>
                  <Form.Group className="mb-2">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="remark"
                      placeholder="Remark (e.g. used for books / to be given on leaving)"
                      value={walletForm.remark}
                      onChange={handleWalletChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control
                      name="reference"
                      placeholder="Reference / Voucher (optional)"
                      value={walletForm.reference}
                      onChange={handleWalletChange}
                    />
                  </Form.Group>
                  {walletMessage && (
                    <Alert variant="warning" className="py-2">
                      {walletMessage}
                    </Alert>
                  )}
                  <div className="d-flex justify-content-end">
                    <Button type="submit" size="sm" disabled={walletSaving}>
                      {walletSaving ? 'Saving...' : 'Save Transaction'}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentProfile;

