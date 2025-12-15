import { useEffect, useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Badge, Button, Form, Table } from 'react-bootstrap';
import api from '../../api/client';

const DailyAttendanceReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const loadAttendance = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/attendance/daily/${selectedDate}`);
      if (data?.success) {
        setAttendanceData(data.data);
      } else {
        setError(data?.message || 'Failed to load attendance data');
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load attendance');
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      loadAttendance();
    }
  }, [selectedDate]);

  const handleDownloadPDF = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setDownloading(true);
    try {
      const response = await api.get(`/attendance/report/daily/${selectedDate}/pdf`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_attendance_${selectedDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setDownloading(true);
    try {
      const response = await api.get(`/attendance/report/daily/${selectedDate}/excel`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `daily_attendance_${selectedDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Present': { bg: 'success', text: 'Present' },
      'Absent': { bg: 'danger', text: 'Absent' },
      'Sick': { bg: 'warning', text: 'Sick' },
      'Leave': { bg: 'info', text: 'Leave' }
    };
    const statusInfo = statusMap[status] || { bg: 'secondary', text: status || 'N/A' };
    return <Badge bg={statusInfo.bg}>{statusInfo.text}</Badge>;
  };

  const getOverallStatusBadge = (status) => {
    const statusMap = {
      'Excellent': { bg: 'success' },
      'Good': { bg: 'info' },
      'Average': { bg: 'warning' },
      'Poor': { bg: 'danger' }
    };
    const statusInfo = statusMap[status] || { bg: 'secondary' };
    return <Badge bg={statusInfo.bg}>{status || 'N/A'}</Badge>;
  };

  return (
    <div style={{ background: 'linear-gradient(180deg, #f6f8fc 0%, #ffffff 55%)', padding: '12px', borderRadius: '12px' }}>
      <Card className="mb-3 border-0" style={{ boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
        <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">📊 Daily Attendance Report</h5>
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={!attendanceData || downloading}
            >
              {downloading ? <Spinner size="sm" /> : '📄 Download PDF'}
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={!attendanceData || downloading}
            >
              {downloading ? <Spinner size="sm" /> : '📊 Download Excel'}
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">Select Date</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Col>
            <Col md={8}>
              <Button variant="primary" onClick={loadAttendance} disabled={loading}>
                {loading ? <><Spinner size="sm" className="me-2" />Loading...</> : '🔄 Refresh'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center my-4">
          <Spinner animation="border" />
          <p className="mt-2 text-muted">Loading attendance data...</p>
        </div>
      )}

      {attendanceData && !loading && (
        <>
          {/* Summary Cards */}
          <Row className="mb-3">
            <Col md={3}>
              <Card style={{ border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Card.Body>
                  <div className="text-muted small">Total Students</div>
                  <h4 className="mb-0">{attendanceData.totalStudents || 0}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card style={{ border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Card.Body>
                  <div className="text-muted small">Date</div>
                  <h6 className="mb-0">
                    {new Date(attendanceData.date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h6>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card style={{ border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Card.Body>
                  <div className="text-muted small">Total Sessions</div>
                  <h4 className="mb-0">
                    {attendanceData.sessions?.length || 0}
                  </h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card style={{ border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Card.Body>
                  <div className="text-muted small">Average Attendance</div>
                  <h4 className="mb-0">
                    {attendanceData.attendanceRecords?.length > 0
                      ? Math.round(
                          attendanceData.attendanceRecords.reduce(
                            (sum, record) => sum + (record.statistics?.attendancePercentage || 0),
                            0
                          ) / attendanceData.attendanceRecords.length
                        )
                      : 0}%
                  </h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Attendance Table */}
          <Card className="border-0" style={{ boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }}>
            <Card.Header className="bg-white border-0">
              <h6 className="mb-0">Attendance Details</h6>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <Table striped hover className="mb-0">
                  <thead className="table-dark sticky-top">
                    <tr>
                      <th>S.No</th>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      {attendanceData.sessions?.map((session, idx) => (
                        <th key={idx} className="text-center" style={{ minWidth: '80px' }}>
                          {session.name}
                        </th>
                      ))}
                      <th className="text-center">Present</th>
                      <th className="text-center">Absent</th>
                      <th className="text-center">Sick</th>
                      <th className="text-center">Leave</th>
                      <th className="text-center">%</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.attendanceRecords?.length === 0 ? (
                      <tr>
                        <td colSpan={10 + (attendanceData.sessions?.length || 0)} className="text-center py-4">
                          <div className="text-muted">No attendance records found for this date</div>
                        </td>
                      </tr>
                    ) : (
                      attendanceData.attendanceRecords?.map((record, idx) => (
                        <tr key={record._id || idx}>
                          <td>{idx + 1}</td>
                          <td>{record.student?.admissionNo || 'N/A'}</td>
                          <td>{record.student?.fullName || 'Unknown Student'}</td>
                          {attendanceData.sessions?.map((session, sidx) => {
                            const sessionStatus = record.sessions?.[session.key]?.status || 'Present';
                            return (
                              <td key={sidx} className="text-center">
                                {getStatusBadge(sessionStatus)}
                              </td>
                            );
                          })}
                          <td className="text-center">
                            <Badge bg="success">
                              {record.statistics?.presentCount || 0}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="danger">
                              {record.statistics?.absentCount || 0}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="warning">
                              {record.statistics?.sickCount || 0}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="info">
                              {record.statistics?.leaveCount || 0}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <strong>{record.statistics?.attendancePercentage?.toFixed(1) || 0}%</strong>
                          </td>
                          <td className="text-center">
                            {getOverallStatusBadge(record.overallStatus)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default DailyAttendanceReport;
