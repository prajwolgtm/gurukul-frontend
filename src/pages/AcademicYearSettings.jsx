import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import api from '../api/client';

const AcademicYearSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Check if user has permission (Admin or Principal only)
  const hasPermission = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL;
  
  if (!hasPermission) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You do not have permission to access this page. Only Administrators and Principals can configure academic year settings.</p>
        </Alert>
      </Container>
    );
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({
    startMonth: 3, // April (0-indexed)
    startDay: 1
  });
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/system-settings/academic-year-config');
      if (data.success) {
        setConfig({
          startMonth: data.data.startMonth,
          startDay: data.data.startDay
        });
        setCurrentYear(data.data.currentAcademicYear);
      }
    } catch (error) {
      setError(error?.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const { data } = await api.put('/system-settings/academic-year-config', {
        startMonth: parseInt(config.startMonth),
        startDay: parseInt(config.startDay)
      });
      
      if (data.success) {
        setSuccess(data.message);
        setCurrentYear(data.data.currentAcademicYear);
        // Reload config to get updated values
        await loadConfig();
      } else {
        setError(data.message || 'Failed to update configuration');
      }
    } catch (error) {
      setError(error?.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get days in selected month
  const getDaysInMonth = (month) => {
    const year = new Date().getFullYear();
    return new Date(year, month + 1, 0).getDate();
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h2>Academic Year Settings</h2>
          <p className="text-muted">Configure when the academic year starts</p>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card>
        <Card.Header>
          <h5>Academic Year Start Date</h5>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Month *</Form.Label>
                  <Form.Select
                    value={config.startMonth}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      setConfig({ ...config, startMonth: newMonth });
                      // Adjust day if it's invalid for the new month
                      const maxDays = getDaysInMonth(newMonth);
                      if (config.startDay > maxDays) {
                        setConfig({ ...config, startMonth: newMonth, startDay: maxDays });
                      }
                    }}
                    required
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select the month when the academic year starts
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Day *</Form.Label>
                  <Form.Select
                    value={config.startDay}
                    onChange={(e) => setConfig({ ...config, startDay: parseInt(e.target.value) })}
                    required
                  >
                    {Array.from({ length: getDaysInMonth(config.startMonth) }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select the day of the month when the academic year starts
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Alert variant="info" className="mt-3">
              <strong>Current Configuration:</strong><br />
              Academic year starts on: <strong>{config.startDay} {monthNames[config.startMonth]}</strong><br />
              Current academic year: <strong>{currentYear}</strong><br />
              <small className="text-muted">
                Example: If set to "5 April", then April 5, 2026 will start the 2026-2027 academic year.
              </small>
            </Alert>

            <div className="mt-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline-secondary" 
                className="ms-2"
                onClick={loadConfig}
                disabled={saving}
              >
                Reset
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5>How It Works</h5>
        </Card.Header>
        <Card.Body>
          <ul>
            <li>The academic year automatically switches on the configured start date</li>
            <li>For example, if set to "5 April":
              <ul>
                <li>Before April 5: Previous academic year is current</li>
                <li>On/After April 5: New academic year becomes current</li>
              </ul>
            </li>
            <li>Changes take effect immediately</li>
            <li>All new exams, classes, and records will use the current academic year</li>
            <li>Previous years' data remains accessible via "Show All Years" filter</li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AcademicYearSettings;
