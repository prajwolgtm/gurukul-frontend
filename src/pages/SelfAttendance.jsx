import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import api from '../api/client';

const SelfAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [todayAttendance, setTodayAttendance] = useState(null);
  
  // Form state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Present');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    loadTodayAttendance();
  }, [attendanceDate]);

  const loadTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/staff-attendance/${attendanceDate}`);
      if (response.data.success) {
        setTodayAttendance(response.data.attendance);
        if (response.data.attendance) {
          setStatus(response.data.attendance.status);
          setRemarks(response.data.attendance.remarks || '');
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading attendance:', error);
      }
      setTodayAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!status) {
      setMessage({ type: 'danger', text: 'Please select your attendance status' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const attendanceData = {
        date: attendanceDate,
        status,
        remarks: remarks.trim() || undefined
      };

      const response = await api.post('/staff-attendance', attendanceData);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: '✅ Your attendance has been saved successfully!' 
        });
        await loadTodayAttendance();
      } else {
        setMessage({ 
          type: 'danger', 
          text: response.data.message || 'Failed to save attendance' 
        });
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Error saving attendance. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = attendanceDate === new Date().toISOString().split('T')[0];
  const isPastDate = new Date(attendanceDate) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white text-center">
              <h4 className="mb-0">📅 Daily Attendance</h4>
              <p className="mb-0 mt-2" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                Mark your daily attendance by selecting the date, choosing Present/Absent/Leave, and submitting your remark if needed.
              </p>
            </Card.Header>
            <Card.Body>
              {/* Welcome Message */}
              <Alert variant="info" className="text-center mb-4">
                <h5 className="mb-2">👋 Hello! Please complete your attendance for today.</h5>
                <p className="mb-0">
                  Choose your status (Present, Absent, or Leave) and add a short note if required.
                  <br />
                  <strong>Click submit to confirm.</strong>
                </p>
              </Alert>

              {message.text && (
                <Alert 
                  variant={message.type} 
                  onClose={() => setMessage({ type: '', text: '' })} 
                  dismissible
                >
                  {message.text}
                </Alert>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : (
                <Form onSubmit={handleSubmit}>
                  {/* Date Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <strong>Date:</strong> Auto-filled: Today
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </Form.Group>

                  {/* Status Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <strong>Status:</strong> Present / Absent / Leave
                    </Form.Label>
                    <Form.Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      required
                      disabled={isPastDate && todayAttendance}
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Leave">Leave</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Remarks */}
                  <Form.Group className="mb-4">
                    <Form.Label>
                      <strong>Work Summary / Remarks:</strong> Optional
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Submit your remark if needed..."
                      disabled={isPastDate && todayAttendance}
                    />
                  </Form.Group>

                  {/* Show existing attendance info */}
                  {todayAttendance && (
                    <Alert variant="secondary" className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Current Status:</strong>{' '}
                          <Badge 
                            bg={
                              todayAttendance.status === 'Present' ? 'success' :
                              todayAttendance.status === 'Absent' ? 'danger' :
                              'warning'
                            }
                          >
                            {todayAttendance.status}
                          </Badge>
                          {todayAttendance.remarks && (
                            <div className="mt-2">
                              <small><strong>Remarks:</strong> {todayAttendance.remarks}</small>
                            </div>
                          )}
                          <div className="mt-1">
                            <small className="text-muted">
                              Marked at: {new Date(todayAttendance.markedAt).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <div className="d-grid">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={submitting || (isPastDate && todayAttendance)}
                    >
                      {submitting ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : todayAttendance ? (
                        'Update Attendance'
                      ) : (
                        'Submit to save attendance'
                      )}
                    </Button>
                  </div>

                  {isPastDate && todayAttendance && (
                    <Alert variant="warning" className="mt-3 mb-0">
                      <small>
                        ⚠️ This date is in the past and attendance has already been marked. 
                        Contact administrator to modify.
                      </small>
                    </Alert>
                  )}
                </Form>
              )}
            </Card.Body>
          </Card>

          {/* Instructions Card */}
          <Card className="mt-4 shadow-sm">
            <Card.Header className="bg-light">
              <h6 className="mb-0">ℹ️ Daily Attendance</h6>
            </Card.Header>
            <Card.Body>
              <p className="mb-2"><strong>Please fill the following:</strong></p>
              <ul className="mb-0">
                <li><strong>Date:</strong> Auto-filled: Today</li>
                <li><strong>Status:</strong> Present / Absent / Leave</li>
                <li><strong>Work Summary / Remarks:</strong> Optional</li>
                <li><strong>Submit</strong> to save attendance.</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SelfAttendance;

