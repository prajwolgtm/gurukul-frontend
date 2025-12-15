import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Table, 
  Modal, Badge, Alert, Spinner, Tabs, Tab 
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import { 
  getLeaveRequests, createLeaveRequest, reviewLeaveRequest,
  getVisitRequests, createVisitRequest, reviewVisitRequest,
  rescheduleLeaveRequest, rescheduleVisitRequest
} from '../api/requests';
import AcademicYearFilter from '../components/AcademicYearFilter';

const RequestManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [error, setError] = useState('');
  const [academicYear, setAcademicYear] = useState(null); // null initially, will be set by AcademicYearFilter
  
  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showRescheduleLeaveModal, setShowRescheduleLeaveModal] = useState(false);
  const [showRescheduleVisitModal, setShowRescheduleVisitModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Form states
  const [leaveForm, setLeaveForm] = useState({
    studentName: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContact: ''
  });

  const [visitForm, setVisitForm] = useState({
    studentName: '',
    visitType: '',
    preferredDate: '',
    preferredTime: '',
    purpose: '',
    personToMeet: '',
    visitors: ''
  });

  useEffect(() => {
    loadRequests();
  }, [academicYear]);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      // Build query params with academic year filter
      // Only filter if academicYear is explicitly set and not 'all'
      const params = {};
      if (academicYear && academicYear !== 'all' && academicYear !== '') {
        params.academicYear = academicYear;
      }
      
      // Load leave requests
      const leaveResponse = await getLeaveRequests(params);
      if (leaveResponse.success) {
        setLeaveRequests(leaveResponse.data || leaveResponse.leaveRequests || []);
      }

      // Load visit requests
      const visitResponse = await getVisitRequests(params);
      if (visitResponse.success) {
        setVisitRequests(visitResponse.data || visitResponse.visitRequests || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      setError('Failed to load requests. Please try again.');
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
        await loadRequests(); // Reload data
        setLeaveForm({
          studentName: '', leaveType: '', startDate: '', endDate: '', reason: '', emergencyContact: ''
        });
        setShowLeaveModal(false);
      } else {
        setError(response.message || 'Failed to create leave request');
      }
    } catch (error) {
      console.error('Error creating leave request:', error);
      setError('Failed to create leave request. Please try again.');
    }
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await createVisitRequest(visitForm);
      if (response.success) {
        await loadRequests(); // Reload data
        setVisitForm({
          studentName: '', visitType: '', preferredDate: '', preferredTime: '', purpose: '', personToMeet: '', visitors: ''
        });
        setShowVisitModal(false);
      } else {
        setError(response.message || 'Failed to create visit request');
      }
    } catch (error) {
      console.error('Error creating visit request:', error);
      setError('Failed to create visit request. Please try again.');
    }
  };

  const handleStatusUpdate = async (requestId, newStatus, requestType) => {
    try {
      if (requestType === 'leave') {
        const response = await reviewLeaveRequest(requestId, { action: newStatus === 'approved' ? 'approve' : 'reject' });
        if (response.success) {
          await loadRequests(); // Reload data
        }
      } else {
        const response = await reviewVisitRequest(requestId, { action: newStatus === 'approved' ? 'approve' : 'reject' });
        if (response.success) {
          await loadRequests(); // Reload data
        }
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      setError('Failed to update request status. Please try again.');
    }
  };

  const handleRescheduleLeave = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const formData = new FormData(e.target);
      const rescheduleData = {
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        isFullDay: formData.get('isFullDay') === 'true',
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        comments: formData.get('comments')
      };
      const response = await rescheduleLeaveRequest(selectedRequest._id || selectedRequest.id, rescheduleData);
      if (response.success) {
        setShowRescheduleLeaveModal(false);
        setSelectedRequest(null);
        await loadRequests();
      } else {
        setError(response.message || 'Failed to reschedule leave request');
      }
    } catch (error) {
      console.error('Error rescheduling leave:', error);
      setError('Failed to reschedule leave request. Please try again.');
    }
  };

  const handleRescheduleVisit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const formData = new FormData(e.target);
      const rescheduleData = {
        preferredDate: formData.get('preferredDate'),
        preferredStartTime: formData.get('preferredStartTime'),
        preferredEndTime: formData.get('preferredEndTime'),
        comments: formData.get('comments')
      };
      const response = await rescheduleVisitRequest(selectedRequest._id || selectedRequest.id, rescheduleData);
      if (response.success) {
        setShowRescheduleVisitModal(false);
        setSelectedRequest(null);
        await loadRequests();
      } else {
        setError(response.message || 'Failed to reschedule visit request');
      }
    } catch (error) {
      console.error('Error rescheduling visit:', error);
      setError('Failed to reschedule visit request. Please try again.');
    }
  };

  const canReviewRequests = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.HOD || user?.role === ROLES.COORDINATOR;
  const canReschedule = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.COORDINATOR;
  const isParent = user?.role === ROLES.PARENT;

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
          <h2>Request Management</h2>
          <p className="text-muted">Manage leave and visit requests</p>
        </Col>
        {isParent && (
          <Col xs="auto">
            <Button variant="primary" className="me-2" onClick={() => setShowLeaveModal(true)}>
              Request Leave
            </Button>
            <Button variant="success" onClick={() => setShowVisitModal(true)}>
              Schedule Visit
            </Button>
          </Col>
        )}
      </Row>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <Row className="mb-3">
        <Col md={4}>
          <AcademicYearFilter
            value={academicYear}
            onChange={setAcademicYear}
            size="sm"
            label="Filter by Academic Year"
          />
        </Col>
      </Row>

      <Tabs defaultActiveKey="leave" className="mb-4">
        <Tab eventKey="leave" title="Leave Requests">
          <Card>
            <Card.Header>
              <span>Leave Requests ({leaveRequests.length})</span>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Student</th>
                    <th>Leave Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Requested By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(request => (
                    <tr key={request._id || request.id}>
                      <td>
                        <Badge bg="primary">{request.requestId}</Badge>
                      </td>
                      <td>{request.student?.name || request.studentName || 'N/A'}</td>
                      <td>{request.leaveType}</td>
                      <td>
                        {request.startDate ? (typeof request.startDate === 'string' ? new Date(request.startDate).toLocaleDateString() : request.startDate) : 'N/A'} to {request.endDate ? (typeof request.endDate === 'string' ? new Date(request.endDate).toLocaleDateString() : request.endDate) : 'N/A'}
                      </td>
                      <td>{request.reason}</td>
                      <td>
                        <Badge bg={
                          request.status === 'approved' ? 'success' : 
                          request.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {request.status}
                        </Badge>
                      </td>
                      <td>{request.requestedBy?.fullName || request.requestedBy || 'N/A'}</td>
                      <td>
                        {canReviewRequests && request.status === 'pending' && (
                          <div className="btn-group btn-group-sm">
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => handleStatusUpdate(request._id || request.id, 'approved', 'leave')}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleStatusUpdate(request._id || request.id, 'rejected', 'leave')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {canReschedule && (request.status === 'approved' || request.status === 'pending') && (
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            className="ms-1"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRescheduleLeaveModal(true);
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                        {isParent && request.status === 'pending' && (
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            className="ms-1"
                            onClick={() => {
                              // Edit logic here
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="visit" title="Visit Requests">
          <Card>
            <Card.Header>
              <span>Visit Requests ({visitRequests.length})</span>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Student</th>
                    <th>Visit Type</th>
                    <th>Preferred Date/Time</th>
                    <th>Purpose</th>
                    <th>Person to Meet</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitRequests.map(request => (
                    <tr key={request._id || request.id}>
                      <td>
                        <Badge bg="success">{request.requestId}</Badge>
                      </td>
                      <td>{request.student?.name || request.studentName || 'N/A'}</td>
                      <td>{request.visitType}</td>
                      <td>
                        {request.preferredDate ? (typeof request.preferredDate === 'string' ? new Date(request.preferredDate).toLocaleDateString() : request.preferredDate) : 'N/A'} at {request.preferredStartTime || request.preferredTime || 'N/A'} - {request.preferredEndTime || 'N/A'}
                      </td>
                      <td>{request.purpose}</td>
                      <td>{request.personToMeet?.fullName || request.personToMeet || 'N/A'}</td>
                      <td>
                        <Badge bg={
                          request.status === 'approved' ? 'success' : 
                          request.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {request.status}
                        </Badge>
                      </td>
                      <td>
                        {canReviewRequests && request.status === 'pending' && (
                          <div className="btn-group btn-group-sm">
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => handleStatusUpdate(request._id || request.id, 'approved', 'visit')}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="outline-danger" 
                          size="sm"
                              onClick={() => handleStatusUpdate(request._id || request.id, 'rejected', 'visit')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {canReschedule && (request.status === 'approved' || request.status === 'pending') && (
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            className="ms-1"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRescheduleVisitModal(true);
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                        {isParent && request.status === 'pending' && (
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            className="ms-1"
                            onClick={() => {
                              // Edit logic here
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Leave Request Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Request Leave</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleLeaveSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Student Name *</Form.Label>
              <Form.Control
                type="text"
                value={leaveForm.studentName}
                onChange={(e) => setLeaveForm({...leaveForm, studentName: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Leave Type *</Form.Label>
              <Form.Select
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm({...leaveForm, leaveType: e.target.value})}
                required
              >
                <option value="">Select Leave Type</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Personal Leave">Personal Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Emergency Contact</Form.Label>
              <Form.Control
                type="tel"
                value={leaveForm.emergencyContact}
                onChange={(e) => setLeaveForm({...leaveForm, emergencyContact: e.target.value})}
                placeholder="Emergency contact number"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Request
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Visit Request Modal */}
      <Modal show={showVisitModal} onHide={() => setShowVisitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Schedule Visit</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleVisitSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Student Name *</Form.Label>
              <Form.Control
                type="text"
                value={visitForm.studentName}
                onChange={(e) => setVisitForm({...visitForm, studentName: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Visit Type *</Form.Label>
              <Form.Select
                value={visitForm.visitType}
                onChange={(e) => setVisitForm({...visitForm, visitType: e.target.value})}
                required
              >
                <option value="">Select Visit Type</option>
                <option value="Parent-Teacher Meeting">Parent-Teacher Meeting</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Student Pickup">Student Pickup</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={visitForm.preferredDate}
                    onChange={(e) => setVisitForm({...visitForm, preferredDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Time *</Form.Label>
                  <Form.Control
                    type="time"
                    value={visitForm.preferredTime}
                    onChange={(e) => setVisitForm({...visitForm, preferredTime: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Purpose *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={visitForm.purpose}
                onChange={(e) => setVisitForm({...visitForm, purpose: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Person to Meet</Form.Label>
              <Form.Control
                type="text"
                value={visitForm.personToMeet}
                onChange={(e) => setVisitForm({...visitForm, personToMeet: e.target.value})}
                placeholder="e.g., Class Teacher, HOD"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number of Visitors</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={visitForm.visitors}
                onChange={(e) => setVisitForm({...visitForm, visitors: e.target.value})}
                placeholder="Number of people visiting"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVisitModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Schedule Visit
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Reschedule Leave Modal */}
      <Modal show={showRescheduleLeaveModal} onHide={() => { setShowRescheduleLeaveModal(false); setSelectedRequest(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reschedule Leave Request</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRescheduleLeave}>
          <Modal.Body>
            {selectedRequest && (
              <>
                <Alert variant="info">
                  <strong>Current Schedule:</strong> {selectedRequest.startDate} to {selectedRequest.endDate}
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label>New Start Date</Form.Label>
                  <Form.Control type="date" name="startDate" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New End Date</Form.Label>
                  <Form.Control type="date" name="endDate" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check type="checkbox" label="Full Day" name="isFullDay" value="true" defaultChecked />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time (if partial day)</Form.Label>
                  <Form.Control type="time" name="startTime" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>End Time (if partial day)</Form.Label>
                  <Form.Control type="time" name="endTime" />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Comments</Form.Label>
                  <Form.Control as="textarea" rows={3} name="comments" placeholder="Reason for rescheduling..." />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowRescheduleLeaveModal(false); setSelectedRequest(null); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">Reschedule</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Reschedule Visit Modal */}
      <Modal show={showRescheduleVisitModal} onHide={() => { setShowRescheduleVisitModal(false); setSelectedRequest(null); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reschedule Visit Request</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRescheduleVisit}>
          <Modal.Body>
            {selectedRequest && (
              <>
                <Alert variant="info">
                  <strong>Current Schedule:</strong> {selectedRequest.preferredDate} at {selectedRequest.preferredTime}
                </Alert>
                <Form.Group className="mb-3">
                  <Form.Label>New Preferred Date</Form.Label>
                  <Form.Control type="date" name="preferredDate" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Preferred Start Time</Form.Label>
                  <Form.Control type="time" name="preferredStartTime" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>New Preferred End Time</Form.Label>
                  <Form.Control type="time" name="preferredEndTime" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Comments</Form.Label>
                  <Form.Control as="textarea" rows={3} name="comments" placeholder="Reason for rescheduling..." />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowRescheduleVisitModal(false); setSelectedRequest(null); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">Reschedule</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default RequestManagement;
