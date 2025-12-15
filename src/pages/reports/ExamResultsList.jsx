import { useEffect, useState, useMemo } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Alert, Spinner, Badge, Dropdown, InputGroup } from 'react-bootstrap';
import examsAPI, { examMarksAPI } from '../../api/exams';
import api from '../../api/client';
import AcademicYearFilter from '../../components/AcademicYearFilter';

const ExamResultsList = () => {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    subjectId: '',
    studentQuery: '',
    academicYear: ''
  });

  // Load exams for dropdown
  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true);
        const params = { limit: 200 };
        
        // Filter by academic year if selected
        if (filters.academicYear) {
          params.academicYear = filters.academicYear;
        } else {
          // Default to current year if no filter
          params.showAllYears = 'false';
        }
        
        const res = await examsAPI.getExams(params);
        setExams(res.exams || res.data?.exams || []);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, [filters.academicYear]);

  const loadReport = async (examId) => {
    if (!examId) return;
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/exam-reports/exam/${examId}`, { params: { format: 'detailed' } });
      if (data?.success) {
        setReport(data.data);
      } else {
        setError(data?.message || 'Failed to load exam results');
        setReport(null);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load exam results');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const subjectOptions = useMemo(() => {
    if (!report) return [];
    const fromExam = report.exam?.subjects?.map(s => ({
      id: s.subject?._id || s.subject,
      name: s.subject?.name || s.subject || 'Subject'
    })) || [];
    const fromMarks = (report.results || []).flatMap(r =>
      (r.marks?.subjectMarks || []).map(sm => ({
        id: sm.subject?._id || sm.subject,
        name: sm.name || sm.subject?.name || sm.subject || 'Subject'
      }))
    );
    const merged = [...fromExam, ...fromMarks].filter(x => x.id);
    const uniq = [];
    const seen = new Set();
    merged.forEach(s => {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        uniq.push(s);
      }
    });
    return uniq;
  }, [report]);

  const filteredResults = useMemo(() => {
    if (!report?.results) return [];
    return report.results.filter(r => {
      const studentName = r.student?.name || r.student?.fullName || r.student?.personalInfo?.fullName || '';
      const studentId = r.student?.studentId || r.student?.admissionNo || '';
      const matchStudent = filters.studentQuery
        ? (studentName.toLowerCase().includes(filters.studentQuery.toLowerCase()) ||
          studentId.toLowerCase().includes(filters.studentQuery.toLowerCase()))
        : true;
      const matchSubject = filters.subjectId
        ? (r.marks?.subjectMarks || []).some(sm => 
            (sm.subject?._id || sm.subject) === filters.subjectId ||
            (sm.subject?._id?.toString() || sm.subject?.toString()) === filters.subjectId
          )
        : true;
      return matchStudent && matchSubject;
    });
  }, [report, filters]);

  // Group results by batch
  const resultsByBatch = useMemo(() => {
    if (!filteredResults || filteredResults.length === 0) return {};
    
    const grouped = {};
    filteredResults.forEach(r => {
      // Get batch name from student's batches
      const batches = r.student?.batches || [];
      let batchName = 'No Batch';
      
      if (batches && batches.length > 0) {
        // Use first batch name, or combine if multiple
        if (Array.isArray(batches)) {
          batchName = batches.map(b => b.name || b).join(', ') || 'No Batch';
        } else if (typeof batches === 'string') {
          batchName = batches;
        } else {
          batchName = batches.name || 'No Batch';
        }
      }
      
      if (!grouped[batchName]) {
        grouped[batchName] = [];
      }
      grouped[batchName].push(r);
    });
    
    return grouped;
  }, [filteredResults]);

  const downloadSubject = async (subjectId) => {
    if (!selectedExamId) {
      alert('Please select an exam first.');
      return;
    }
    if (!subjectId) {
      alert('No subject selected for download.');
      return;
    }
    try {
      await examMarksAPI.downloadSubjectMarksheet(selectedExamId, subjectId);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to download subject PDF');
      throw e;
    }
  };

  const downloadAllSubjects = async () => {
    const validSubjects = subjectOptions.filter(s => s.id);
    if (!selectedExamId) {
      alert('Please select an exam first.');
      return;
    }
    if (validSubjects.length === 0) {
      alert('No subjects available for this exam.');
      return;
    }
    for (const s of validSubjects) {
      try {
        await downloadSubject(s.id);
      } catch (e) {
        // stop further downloads on first failure
        break;
      }
    }
  };

  const downloadStudent = async (studentId) => {
    if (!studentId) {
      alert('Student id missing for download.');
      return;
    }
    try {
      await examMarksAPI.downloadStudentMarksheet(studentId, {
        examType: report?.exam?.examType,
        academicYear: report?.exam?.academicYear
      });
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to download student PDF');
      throw e;
    }
  };

  const downloadCompleteExamReport = async () => {
    if (!selectedExamId) {
      alert('Please select an exam first.');
      return;
    }
    try {
      await examMarksAPI.downloadCompleteExamReport(selectedExamId);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to download complete exam report');
    }
  };

  return (
    <Container className="py-3">
      <Row className="mb-3">
        <Col md={4}>
          <AcademicYearFilter
            value={filters.academicYear}
            onChange={(year) => setFilters({...filters, academicYear: year})}
            size="sm"
          />
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Select Exam</Form.Label>
            <Form.Select
              size="sm"
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                if (e.target.value) loadReport(e.target.value);
              }}
            >
              <option value="">-- Select Exam --</option>
              {exams.map(exam => (
                <option key={exam._id || exam.id} value={exam._id || exam.id}>
                  {exam.examName || exam.name} - {exam.academicInfo?.academicYear || exam.academicYear || 'N/A'}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Exam Results</h4>
        <div className="d-flex gap-2">
          <Dropdown>
            <Dropdown.Toggle size="sm" variant="outline-primary">📄 Download PDF</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={downloadCompleteExamReport}>
                📋 Complete Exam Report (All Students & Subjects)
              </Dropdown.Item>
              <Dropdown.Divider />
              {subjectOptions.map(s => (
                <Dropdown.Item key={s.id} onClick={() => downloadSubject(s.id)}>
                  {s.name} Marksheet
                </Dropdown.Item>
              ))}
              {subjectOptions.length > 1 && (
                <Dropdown.Item onClick={downloadAllSubjects}>
                  All Subjects (download all)
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Select Exam</Form.Label>
                <Form.Select
                  value={selectedExamId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedExamId(val);
                    setReport(null);
                    loadReport(val);
                  }}
                >
                  <option value="">Choose exam</option>
                  {exams.map(ex => (
                    <option key={ex._id || ex.id} value={ex._id || ex.id}>
                      {ex.name || ex.examName} ({ex.examType})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Filter by Subject</Form.Label>
                <Form.Select
                  value={filters.subjectId}
                  onChange={(e) => setFilters(prev => ({ ...prev, subjectId: e.target.value }))}
                >
                  <option value="">All subjects</option>
                  {subjectOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Filter by Student</Form.Label>
                <InputGroup>
                  <Form.Control
                    placeholder="Name or ID"
                    value={filters.studentQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, studentQuery: e.target.value }))}
                  />
                  <Button variant="outline-secondary" onClick={() => setFilters(prev => ({ ...prev, studentQuery: '' }))}>Clear</Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && <div className="text-center py-3"><Spinner /></div>}
      {error && <Alert variant="danger">{error}</Alert>}

      {report && (
        <>
          <Card className="mb-3">
            <Card.Body>
              <h5 className="mb-1">{report.exam.examName} <Badge bg="secondary">{report.exam.status}</Badge></h5>
              <div className="text-muted small">
                {report.exam.subject?.name || report.exam.subject || 'Exam'} • {report.exam.examType}
              </div>
              <div className="text-muted small mt-2">
                Total: {report.statistics.totalStudents} • Present: {report.statistics.studentsPresent} • Absent: {report.statistics.studentsAbsent} • Pass: {report.statistics.studentsPassed} • Pass%: {report.statistics.passPercentage}%
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Detailed Results (Grouped by Batch)</Card.Header>
            <Card.Body>
              {Object.keys(resultsByBatch).length === 0 ? (
                <div className="text-center text-muted py-3">No results</div>
              ) : (
                Object.entries(resultsByBatch).map(([batchName, batchResults]) => (
                  <div key={batchName} className="mb-4">
                    <h6 className="mb-3">
                      <Badge bg="primary" className="me-2">{batchName}</Badge>
                      <span className="text-muted small">({batchResults.length} student{batchResults.length !== 1 ? 's' : ''})</span>
                    </h6>
                    <Table responsive hover className="mb-4">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Subjects</th>
                          <th>Attendance</th>
                          <th>Obtained</th>
                          <th>%</th>
                          <th>Grade</th>
                          <th>Status</th>
                          <th className="print-hide">PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((r, idx) => (
                          <tr key={idx}>
                            <td>
                              {r.student?.name || r.student?.fullName || r.student?.personalInfo?.fullName || 'N/A'}
                              <div className="text-muted small">{r.student?.studentId || r.student?.admissionNo || 'N/A'}</div>
                            </td>
                            <td>
                              {r.marks.subjectMarks && r.marks.subjectMarks.length > 0 ? (
                                <div className="small">
                                  {r.marks.subjectMarks.map((sm, i) => (
                                    <div key={i}>
                                      <strong>{sm.name || sm.subjectName || sm.subject?.name || sm.subject || 'Subject'}</strong>{' '}
                                      {sm.obtainedMarks ?? sm.marksObtained ?? 0}/{sm.maxMarks ?? 0}{' '}
                                      ({Math.round(sm.percentage ?? ((sm.marksObtained ?? 0) / (sm.maxMarks || 1) * 100))}%)
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted">No subject marks</span>
                              )}
                            </td>
                            <td>{r.attendance}</td>
                            <td>{r.marks.obtained}/{r.marks.total}</td>
                            <td>{Math.round(r.marks.percentage)}%</td>
                            <td>{r.result.grade || '-'}</td>
                            <td>{r.result.status}</td>
                            <td className="print-hide">
                              <Button 
                                size="sm" 
                                variant="outline-primary" 
                                onClick={() => {
                                  const sid = r.student.id || r.student._id;
                                  if (!sid) {
                                    alert('Student ID not available');
                                    return;
                                  }
                                  downloadStudent(sid);
                                }}
                              >
                                PDF
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
};

export default ExamResultsList;
