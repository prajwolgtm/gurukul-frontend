import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Spinner, Alert, Table, Badge, Button, Dropdown } from 'react-bootstrap';
import api from '../../api/client';
import { examMarksAPI } from '../../api/exams';

const ExamReport = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const downloadSubject = async (subjectId) => {
    try {
      await examMarksAPI.downloadSubjectMarksheet(id, subjectId);
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to download subject PDF');
    }
  };

  const downloadAllSubjects = async () => {
    const subjects = (report?.exam?.subjects && report.exam.subjects.length > 0)
      ? report.exam.subjects.map(s => s.subject?._id || s.subject)
      : report?.exam?.subject?._id
        ? [report.exam.subject._id]
        : [];
    for (const sid of subjects) {
      if (sid) {
        await downloadSubject(sid);
      }
    }
  };

  const downloadStudentPdf = async (studentId) => {
    try {
      await examMarksAPI.downloadStudentMarksheet(studentId, {
        examType: report?.exam?.examType,
        academicYear: report?.exam?.academicYear
      });
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to download student PDF');
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/exam-reports/exam/${id}`, { params: { format: 'detailed' } });
      if (data?.success) setReport(data.data);
      else setError(data?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-center"><Spinner /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!report) return null;

  const stats = report.statistics;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 print-hide">
        <h4>Exam Results</h4>
        <div className="d-flex gap-2">
          <Dropdown>
            <Dropdown.Toggle variant="outline-primary" size="sm">
              📄 Download PDF
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {report.exam.subject?._id && (
                <Dropdown.Item onClick={() => examMarksAPI.downloadSubjectMarksheet(id, report.exam.subject._id)}>
                  Subject-wise Marksheet
                </Dropdown.Item>
              )}
              {report.exam.subjects && report.exam.subjects.length > 0 && report.exam.subjects.map((sub, idx) => (
                <Dropdown.Item key={idx} onClick={() => examMarksAPI.downloadSubjectMarksheet(id, sub.subject?._id || sub.subject)}>
                  {sub.subject?.name || sub.subject} Marksheet
                </Dropdown.Item>
              ))}
              {(report.exam.subjects?.length || report.exam.subject?._id) && (
                <Dropdown.Item onClick={downloadAllSubjects}>
                  All Subjects (download all PDFs)
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="outline-secondary" size="sm" onClick={handlePrint}>
            🖨️ Print Results
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <h5 className="mb-1">{report.exam.examName} <Badge bg="secondary">{report.exam.status}</Badge></h5>
          <div className="text-muted small">{report.exam.subject} • {report.exam.examType}</div>
          <div className="text-muted small mt-2">
            Total: {stats.totalStudents} • Present: {stats.studentsPresent} • Absent: {stats.studentsAbsent} • Pass: {stats.studentsPassed} • Pass%: {stats.passPercentage}%
          </div>
        </Card.Body>
      </Card>

      {report.results && (
        <Card>
          <Card.Header className="print-hide">Detailed Results</Card.Header>
          <Card.Body>
            <Table responsive hover className="table-print">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subjects</th>
                  <th>Attendance</th>
                  <th>Obtained</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.student.name} <div className="text-muted small">{r.student.studentId}</div></td>
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
                  <td className="d-flex align-items-center gap-2">
                    <span>{r.result.status}</span>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="ms-auto print-hide"
                      onClick={() => downloadStudentPdf(r.student.id)}
                    >
                      PDF
                    </Button>
                  </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <style>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          .table-print {
            font-size: 10px;
          }
          .table-print th,
          .table-print td {
            padding: 4px !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default ExamReport;
