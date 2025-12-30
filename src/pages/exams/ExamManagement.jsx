import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal, Badge,
  Alert, Spinner, Tabs, Tab, InputGroup, FormControl, ListGroup
} from 'react-bootstrap';
import { useAuth } from '../../store/auth';
import { ROLES } from '../../utils/roles';
import {
  getExams, createExam, getExam, getExamGroups, createExamGroup,
  getStudentsByEntity, getAcademicEntities, getAvailableTeachers,
  assignGroupTeachers, manageGroupStudents
} from '../../api/exams';
import AcademicYearFilter from '../../components/AcademicYearFilter';

// Standard options for student selection
const STANDARD_OPTIONS = [
  'Pratham 1st Year',
  'Pratham 2nd Year',
  'Pratham 3rd Year',
  'Pravesh 1st Year',
  'Pravesh 2nd Year',
  'Moola 1st Year',
  'Moola 2nd Year',
  'B.A. 1st Year',
  'B.A. 2nd Year',
  'B.A. 3rd Year',
  'M.A. 1st Year',
  'M.A. 2nd Year'
];

const ExamManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examGroups, setExamGroups] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Academic entities
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  
  // Academic year
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [showAllYears, setShowAllYears] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);

  // Modals
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showSelectStudents, setShowSelectStudents] = useState(false);
  const [showAssignTeachers, setShowAssignTeachers] = useState(false);

  // Forms
  const [examForm, setExamForm] = useState({
    examName: '',
    examType: 'midterm',
    subject: '',
    description: '',
    academicYear: '',
    term: 'annual',
    standard: '', // Standard field for classification
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    duration: 120,
    totalMarks: 100,
    passingMarks: 40,
    useDivisions: false,
    divisions: Array(10).fill(null).map((_, i) => ({
      name: '',
      maxMarks: 10,
      order: i + 1
    }))
  });

  const [groupForm, setGroupForm] = useState({
    groupName: '',
    description: '',
    selectionType: 'by-department', // manual, by-department, by-subdepartment, by-batch, by-standard, mixed
    selectedDepartments: [],
    selectedSubDepartments: [],
    selectedBatches: [],
    selectedStandards: [],
    selectedStudents: [],
    academicYear: ''
  });

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  useEffect(() => {
    const initialize = async () => {
      await loadAcademicYearData();
      await loadAcademicEntities();
      await loadTeachers();
    };
    initialize();
  }, []);

  useEffect(() => {
    loadExams();
  }, [selectedAcademicYear, showAllYears]);

  useEffect(() => {
    if (selectedExam) {
      loadExamGroups(selectedExam._id || selectedExam.id);
    }
  }, [selectedExam]);

  const loadAcademicYearData = async () => {
    try {
      // Load current academic year and list
      const { getCurrentAcademicYear, getAcademicYearList } = await import('../../api/academicYear');
      
      const [currentYearResponse, yearsResponse] = await Promise.all([
        getCurrentAcademicYear(),
        getAcademicYearList(5, 2)
      ]);
      
      if (currentYearResponse.success) {
        const currentYear = currentYearResponse.data.academicYear;
        setSelectedAcademicYear(currentYear);
        // Set default in exam form
        setExamForm(prev => ({ ...prev, academicYear: currentYear }));
      }
      
      if (yearsResponse.success) {
        setAcademicYears(yearsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading academic year data:', error);
    }
  };

  const loadExams = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { myExams: 'false' };
      
      if (!showAllYears && selectedAcademicYear) {
        params.academicYear = selectedAcademicYear;
      } else if (showAllYears) {
        params.showAllYears = 'true';
      }
      
      const response = await getExams(params);
      if (response.success) {
        setExams(response.data.exams || []);
      } else {
        setError(response.message || 'Failed to load exams');
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      setError(error?.response?.data?.message || 'Failed to load exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicEntities = async () => {
    try {
      const response = await getAcademicEntities();
      if (response.success) {
        setDepartments(response.data.departments || []);
        setSubDepartments(response.data.subDepartments || []);
        setBatches(response.data.batches || []);
      }
    } catch (error) {
      console.error('Error loading academic entities:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await getAvailableTeachers();
      if (response.success) {
        setTeachers(response.data.teachers || []);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadExamGroups = async (examId) => {
    try {
      const response = await getExamGroups(examId);
      if (response.success) {
        setExamGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error('Error loading exam groups:', error);
    }
  };

  const loadStudents = async () => {
    if (!groupForm.selectionType || groupForm.selectionType === 'manual') {
      return;
    }

    setLoading(true);
    try {
      const filters = {};
      
      if (groupForm.selectionType === 'by-department' && groupForm.selectedDepartments.length > 0) {
        // For multiple departments, we'll need to handle it differently
        // For now, use the first one for preview
        filters.departmentId = groupForm.selectedDepartments[0];
      } else if (groupForm.selectionType === 'by-subdepartment' && groupForm.selectedSubDepartments.length > 0) {
        filters.subDepartmentId = groupForm.selectedSubDepartments[0];
      } else if (groupForm.selectionType === 'by-batch' && groupForm.selectedBatches.length > 0) {
        filters.batchId = groupForm.selectedBatches[0];
      } else if (groupForm.selectionType === 'by-standard' && groupForm.selectedStandards.length > 0) {
        // Pass all selected standards as an array
        filters.standard = groupForm.selectedStandards;
      } else if (groupForm.selectionType === 'mixed') {
        // For mixed, show students from first selected entity
        if (groupForm.selectedDepartments.length > 0) {
          filters.departmentId = groupForm.selectedDepartments[0];
        } else if (groupForm.selectedSubDepartments.length > 0) {
          filters.subDepartmentId = groupForm.selectedSubDepartments[0];
        } else if (groupForm.selectedBatches.length > 0) {
          filters.batchId = groupForm.selectedBatches[0];
        } else if (groupForm.selectedStandards.length > 0) {
          filters.standard = groupForm.selectedStandards;
        }
      }

      if (groupForm.academicYear) {
        filters.academicYear = groupForm.academicYear;
      }

      if (Object.keys(filters).length > 0) {
        const response = await getStudentsByEntity(filters);
        if (response.success) {
          setAvailableStudents(response.data.students || []);
        }
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSelectStudents && groupForm.selectionType !== 'manual') {
      loadStudents();
    }
  }, [showSelectStudents, groupForm.selectionType, groupForm.selectedDepartments, groupForm.selectedSubDepartments, groupForm.selectedBatches, groupForm.selectedStandards]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Transform to match backend expected format (/exam-management endpoint)
      const examData = {
        name: examForm.examName.trim(),
        examType: examForm.examType,
        description: examForm.description?.trim() || '',
        examDate: examForm.startDate, // Backend expects examDate
        startTime: examForm.startTime || '09:00',
        endTime: examForm.endTime || '12:00',
        duration: parseInt(examForm.duration) || 120,
        // Backend expects subjects array
        subjects: [{
          subject: examForm.subject.trim(), // Subject ID
          maxMarks: parseInt(examForm.totalMarks) || 100,
          passingMarks: parseInt(examForm.passingMarks) || 40,
          weightage: 1,
          // Add division support
          useDivisions: examForm.useDivisions || false,
          divisions: examForm.useDivisions && examForm.divisions 
            ? examForm.divisions
                .filter(div => div.name && div.name.trim() !== '')
                .map((div, index) => ({
                  name: div.name.trim(),
                  maxMarks: div.maxMarks || 10,
                  order: div.order || index + 1
                }))
            : []
        }],
        // Include at top level for the backend to extract
        useDivisions: examForm.useDivisions || false,
        divisions: examForm.useDivisions && examForm.divisions 
          ? examForm.divisions
              .filter(div => div.name && div.name.trim() !== '')
              .map((div, index) => ({
                name: div.name.trim(),
                maxMarks: div.maxMarks || 10,
                order: div.order || index + 1
              }))
          : []
      };
      
      console.log('📝 Sending exam data with divisions:', JSON.stringify(examData, null, 2));

      const response = await createExam(examData);
      if (response.success) {
        setSuccess('Exam created successfully!');
        setShowCreateExam(false);
        setExamForm({
          examName: '', examType: 'midterm', subject: '', description: '',
          academicYear: '', term: 'annual', standard: '',
          startDate: '', endDate: '', startTime: '', endTime: '', duration: 120,
          totalMarks: 100, passingMarks: 40,
          useDivisions: false,
          divisions: Array(10).fill(null).map((_, i) => ({
            name: '',
            maxMarks: 10,
            order: i + 1
          }))
        });
        await loadExams();
      } else {
        setError(response.message || 'Failed to create exam');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      setError(error?.response?.data?.message || 'Failed to create exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedExam) {
      setError('Please select an exam first');
      setLoading(false);
      return;
    }

    try {
      const studentSelection = {
        selectionType: groupForm.selectionType,
        academicFilters: {
          academicYear: groupForm.academicYear || examForm.academicYear
        }
      };

      if (groupForm.selectionType === 'by-department') {
        studentSelection.academicFilters.departments = groupForm.selectedDepartments;
      } else if (groupForm.selectionType === 'by-subdepartment') {
        studentSelection.academicFilters.subDepartments = groupForm.selectedSubDepartments;
      } else if (groupForm.selectionType === 'by-batch') {
        studentSelection.academicFilters.batches = groupForm.selectedBatches;
      } else if (groupForm.selectionType === 'by-standard') {
        studentSelection.academicFilters.standards = groupForm.selectedStandards;
      } else if (groupForm.selectionType === 'mixed') {
        studentSelection.academicFilters.departments = groupForm.selectedDepartments;
        studentSelection.academicFilters.subDepartments = groupForm.selectedSubDepartments;
        studentSelection.academicFilters.batches = groupForm.selectedBatches;
        studentSelection.academicFilters.standards = groupForm.selectedStandards;
      }

      const groupData = {
        groupName: groupForm.groupName.trim(),
        description: groupForm.description?.trim() || '',
        studentSelection,
        students: groupForm.selectionType === 'manual' 
          ? groupForm.selectedStudents.map(s => ({ studentId: s._id || s.id }))
          : []
      };

      const response = await createExamGroup(selectedExam._id || selectedExam.id, groupData);
      if (response.success) {
        setSuccess(`Exam group created successfully with ${response.data.group.students?.length || 0} students!`);
        setShowCreateGroup(false);
        setGroupForm({
          groupName: '', description: '', selectionType: 'by-department',
          selectedDepartments: [], selectedSubDepartments: [], selectedBatches: [],
          selectedStandards: [], selectedStudents: [], academicYear: ''
        });
        await loadExamGroups(selectedExam._id || selectedExam.id);
      } else {
        setError(response.message || 'Failed to create exam group');
      }
    } catch (error) {
      console.error('Error creating exam group:', error);
      setError(error?.response?.data?.message || 'Failed to create exam group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeachers = async () => {
    if (!selectedGroup || selectedTeachers.length === 0) {
      setError('Please select a group and at least one teacher');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const teachersData = selectedTeachers.map(teacherId => ({
        teacherId: teacherId,
        role: 'primary-examiner',
        markingResponsibility: {
          canEnterMarks: true,
          canModifyMarks: true,
          canFinalizeMarks: false
        }
      }));

      const response = await assignGroupTeachers(
        selectedExam._id || selectedExam.id,
        selectedGroup._id || selectedGroup.id,
        teachersData
      );

      if (response.success) {
        setSuccess('Teachers assigned successfully!');
        setShowAssignTeachers(false);
        setSelectedTeachers([]);
        await loadExamGroups(selectedExam._id || selectedExam.id);
      } else {
        setError(response.message || 'Failed to assign teachers');
      }
    } catch (error) {
      console.error('Error assigning teachers:', error);
      setError(error?.response?.data?.message || 'Failed to assign teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canManageExams = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.HOD;

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'secondary',
      scheduled: 'primary',
      ongoing: 'warning',
      completed: 'success',
      'results-published': 'info',
      cancelled: 'danger'
    };
    return <Badge bg={badges[status] || 'light'}>{status}</Badge>;
  };

  if (loading && exams.length === 0) {
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
          <h2>Exam Management</h2>
          <p className="text-muted">Create and manage exams, assign students and teachers</p>
        </Col>
        {canManageExams && (
          <Col xs="auto">
            <Button variant="primary" onClick={async () => {
              // Load current academic year
              const currentYear = await (await import('../../api/academicYear')).getCurrentAcademicYear();
              const currentYearValue = currentYear.success ? currentYear.data.academicYear : '';
              
              setExamForm({
                examName: '', examType: 'midterm', subject: '', description: '',
                academicYear: currentYearValue,
                term: 'annual', standard: '',
                startDate: '', endDate: '', startTime: '', endTime: '', duration: 120,
                totalMarks: 100, passingMarks: 40,
                useDivisions: false,
                divisions: Array(10).fill(null).map((_, i) => ({
                  name: '',
                  maxMarks: 10,
                  order: i + 1
                }))
              });
              setShowCreateExam(true);
            }}>
              <i className="bi bi-plus-circle"></i> Create Exam
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

      <Row className="mb-3">
        <Col md={4}>
          <AcademicYearFilter
            value={showAllYears ? '' : selectedAcademicYear}
            onChange={(year) => {
              if (!year || year === '') {
                setShowAllYears(true);
                setSelectedAcademicYear('');
              } else {
                setShowAllYears(false);
                setSelectedAcademicYear(year);
              }
            }}
            size="sm"
            label="Academic Year Filter"
          />
        </Col>
      </Row>

      <Row>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5>Exams {!showAllYears && selectedAcademicYear && `(${selectedAcademicYear})`}</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {exams.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No exams found. Create your first exam to get started.</p>
                </div>
              ) : (
                <ListGroup>
                  {exams.map(exam => (
                    <ListGroup.Item
                      key={exam._id || exam.id}
                      action
                      active={selectedExam?._id === exam._id || selectedExam?.id === exam.id}
                      onClick={() => setSelectedExam(exam)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <strong>{exam.examName}</strong>
                        <br />
                        <small className="text-muted">{exam.subject}</small>
                        <br />
                        {getStatusBadge(exam.status)}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          {selectedExam ? (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h5>{selectedExam.examName}</h5>
                  <small className="text-muted">{selectedExam.subject} • {selectedExam.examType}</small>
                </div>
                {canManageExams && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setGroupForm({
                        groupName: '', description: '', selectionType: 'by-department',
                        selectedDepartments: [], selectedSubDepartments: [], selectedBatches: [],
                        selectedStandards: [], selectedStudents: [], academicYear: selectedExam.academicInfo?.academicYear || ''
                      });
                      setShowCreateGroup(true);
                    }}
                  >
                    <i className="bi bi-plus-circle"></i> Add Group
                  </Button>
                )}
              </Card.Header>
              <Card.Body>
                <Tabs defaultActiveKey="groups" className="mb-3">
                  <Tab eventKey="groups" title="Groups">
                    {examGroups.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted">No groups found. Create a group to add students.</p>
                      </div>
                    ) : (
                      <Table striped hover responsive>
                        <thead>
                          <tr>
                            <th>Group Name</th>
                            <th>Selection Type</th>
                            <th>Students</th>
                            <th>Teachers</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examGroups.map(group => (
                            <tr key={group._id || group.id}>
                              <td><strong>{group.groupName}</strong></td>
                              <td><Badge bg="info">{group.studentSelection?.selectionType}</Badge></td>
                              <td><Badge bg="success">{group.students?.filter(s => s.status === 'active').length || 0}</Badge></td>
                              <td><Badge bg="warning">{group.assignedTeachers?.filter(t => t.assignment?.isActive).length || 0}</Badge></td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedGroup(group);
                                      setShowAssignTeachers(true);
                                    }}
                                  >
                                    Assign Teachers
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Tab>
                  <Tab eventKey="details" title="Details">
                    <Row>
                      <Col md={6}>
                        <p><strong>Exam Type:</strong> {selectedExam.examType}</p>
                        <p><strong>Subject:</strong> {selectedExam.subject}</p>
                        <p><strong>Academic Year:</strong> {selectedExam.academicInfo?.academicYear}</p>
                        <p><strong>Status:</strong> {getStatusBadge(selectedExam.status)}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Start Date:</strong> {new Date(selectedExam.schedule?.startDate).toLocaleDateString()}</p>
                        <p><strong>End Date:</strong> {new Date(selectedExam.schedule?.endDate).toLocaleDateString()}</p>
                        <p><strong>Total Marks:</strong> {selectedExam.marksConfig?.totalMarks}</p>
                        <p><strong>Passing Marks:</strong> {selectedExam.marksConfig?.passingMarks}</p>
                      </Col>
                    </Row>
                    {selectedExam.description && (
                      <div className="mt-3">
                        <strong>Description:</strong>
                        <p>{selectedExam.description}</p>
                      </div>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body>
                <div className="text-center py-5">
                  <p className="text-muted">Select an exam from the list to view details and manage groups</p>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Create Exam Modal */}
      <Modal show={showCreateExam} onHide={() => setShowCreateExam(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Create New Exam</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateExam}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Exam Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={examForm.examName}
                    onChange={(e) => setExamForm({...examForm, examName: e.target.value})}
                    placeholder="e.g., Midterm Examination"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Exam Type *</Form.Label>
                  <Form.Select
                    value={examForm.examType}
                    onChange={(e) => setExamForm({...examForm, examType: e.target.value})}
                    required
                  >
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="unit-test">Unit Test</option>
                    <option value="practical">Practical</option>
                    <option value="oral">Oral</option>
                    <option value="project">Project</option>
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject *</Form.Label>
                  <Form.Control
                    type="text"
                    value={examForm.subject}
                    onChange={(e) => setExamForm({...examForm, subject: e.target.value})}
                    placeholder="e.g., Mathematics"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Academic Year *</Form.Label>
                  <Form.Select
                    value={examForm.academicYear}
                    onChange={(e) => setExamForm({...examForm, academicYear: e.target.value})}
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map(year => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({...examForm, startDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({...examForm, endDate: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({...examForm, duration: parseInt(e.target.value) || 120})}
                    min="1"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={examForm.startTime}
                    onChange={(e) => setExamForm({...examForm, startTime: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={examForm.endTime}
                    onChange={(e) => setExamForm({...examForm, endTime: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Standard</Form.Label>
                  <Form.Select
                    name="standard"
                    value={examForm.standard}
                    onChange={(e) => setExamForm({...examForm, standard: e.target.value})}
                  >
                    <option value="">Select Standard (Optional)</option>
                    {STANDARD_OPTIONS.map(standard => (
                      <option key={standard} value={standard}>
                        {standard}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select the standard/class level for this exam (for classification only)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Marks *</Form.Label>
                  <Form.Control
                    type="number"
                    value={examForm.totalMarks}
                    onChange={(e) => setExamForm({...examForm, totalMarks: parseInt(e.target.value) || 100})}
                    min="1"
                    required
                    disabled={examForm.useDivisions}
                  />
                  {examForm.useDivisions && (
                    <Form.Text className="text-muted">
                      Total marks will be calculated from divisions (10 × 10 = 100)
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Passing Marks *</Form.Label>
                  <Form.Control
                    type="number"
                    value={examForm.passingMarks}
                    onChange={(e) => setExamForm({...examForm, passingMarks: parseInt(e.target.value) || 40})}
                    min="0"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            {/* Division-based Marking */}
            <hr className="my-4" />
            <Card className="mb-3" style={{ border: '2px solid #0d6efd' }}>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="useDivisionsCheckbox"
                    label={<strong>Use Division-based Marking (10 divisions × 10 marks = 100 total)</strong>}
                    checked={examForm.useDivisions}
                    onChange={(e) => {
                      const useDivisions = e.target.checked;
                      setExamForm({
                        ...examForm,
                        useDivisions,
                        totalMarks: useDivisions ? 100 : examForm.totalMarks,
                        divisions: useDivisions 
                          ? Array(10).fill(null).map((_, i) => ({
                              name: examForm.divisions[i]?.name || '',
                              maxMarks: 10,
                              order: i + 1
                            }))
                          : examForm.divisions
                      });
                    }}
                    style={{ fontSize: '1.1rem' }}
                  />
                  <Form.Text className="text-muted d-block mt-2">
                    <i className="bi bi-info-circle"></i> Enable this to divide marks into 10 sections (e.g., Section A, Section B, etc.)
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {examForm.useDivisions && (
              <Card className="mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                <Card.Header>
                  <strong>Division Configuration (10 divisions × 10 marks each = 100 total)</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    {examForm.divisions.map((division, index) => (
                      <Col md={6} key={index} className="mb-2">
                        <InputGroup size="sm">
                          <InputGroup.Text style={{ minWidth: '80px' }}>
                            Division {index + 1}
                          </InputGroup.Text>
                          <Form.Control
                            type="text"
                            placeholder={`Division ${index + 1} name (e.g., Section A)`}
                            value={division.name}
                            onChange={(e) => {
                              const newDivisions = [...examForm.divisions];
                              newDivisions[index] = {
                                ...newDivisions[index],
                                name: e.target.value
                              };
                              setExamForm({ ...examForm, divisions: newDivisions });
                            }}
                            required={examForm.useDivisions}
                          />
                          <InputGroup.Text style={{ minWidth: '60px' }}>
                            10 marks
                          </InputGroup.Text>
                        </InputGroup>
                      </Col>
                    ))}
                  </Row>
                  <Alert variant="info" className="mt-2 mb-0">
                    <small>
                      <strong>Total:</strong> {examForm.divisions.reduce((sum, div) => sum + (div.maxMarks || 10), 0)} marks 
                      ({examForm.divisions.length} divisions × 10 marks each)
                    </small>
                  </Alert>
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={examForm.description}
                onChange={(e) => setExamForm({...examForm, description: e.target.value})}
                placeholder="Optional description of the exam"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateExam(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Exam'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Group Modal */}
      <Modal show={showCreateGroup} onHide={() => setShowCreateGroup(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Exam Group</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateGroup}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Group Name *</Form.Label>
              <Form.Control
                type="text"
                value={groupForm.groupName}
                onChange={(e) => setGroupForm({...groupForm, groupName: e.target.value})}
                placeholder="e.g., Group A - Department A"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={groupForm.description}
                onChange={(e) => setGroupForm({...groupForm, description: e.target.value})}
                placeholder="Optional description"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Student Selection Type *</Form.Label>
              <Form.Select
                value={groupForm.selectionType}
                onChange={(e) => setGroupForm({
                  ...groupForm,
                  selectionType: e.target.value,
                  selectedDepartments: [],
                  selectedSubDepartments: [],
                  selectedBatches: [],
                  selectedStandards: [],
                  selectedStudents: []
                })}
                required
              >
                <option value="by-department">By Department</option>
                <option value="by-subdepartment">By Sub-Department</option>
                <option value="by-batch">By Batch</option>
                <option value="by-standard">By Standard</option>
                <option value="mixed">Mixed (Multiple Filters)</option>
                <option value="manual">Manual Selection</option>
              </Form.Select>
            </Form.Group>

            {groupForm.selectionType === 'by-department' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Department(s) *</Form.Label>
                <Form.Select
                  multiple
                  value={groupForm.selectedDepartments}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setGroupForm({...groupForm, selectedDepartments: selected});
                  }}
                  required
                >
                  {departments.map(dept => (
                    <option key={dept._id || dept.id} value={dept._id || dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">Hold Ctrl/Cmd to select multiple departments</Form.Text>
              </Form.Group>
            )}

            {groupForm.selectionType === 'by-subdepartment' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Sub-Department(s) *</Form.Label>
                <Form.Select
                  multiple
                  value={groupForm.selectedSubDepartments}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setGroupForm({...groupForm, selectedSubDepartments: selected});
                  }}
                  required
                >
                  {subDepartments.map(subDept => (
                    <option key={subDept._id || subDept.id} value={subDept._id || subDept.id}>
                      {subDept.name} ({subDept.code}) - {subDept.department?.name || ''}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">Hold Ctrl/Cmd to select multiple sub-departments</Form.Text>
              </Form.Group>
            )}

            {groupForm.selectionType === 'by-batch' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Batch(es) *</Form.Label>
                <Form.Select
                  multiple
                  value={groupForm.selectedBatches}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setGroupForm({...groupForm, selectedBatches: selected});
                  }}
                  required
                >
                  {batches.map(batch => (
                    <option key={batch._id || batch.id} value={batch._id || batch.id}>
                      {batch.name} ({batch.code}) - {batch.department?.name || ''}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">Hold Ctrl/Cmd to select multiple batches</Form.Text>
              </Form.Group>
            )}

            {groupForm.selectionType === 'by-standard' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Standard(s) *</Form.Label>
                <Form.Select
                  multiple
                  value={groupForm.selectedStandards}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setGroupForm({...groupForm, selectedStandards: selected});
                  }}
                  required
                >
                  {STANDARD_OPTIONS.map(standard => (
                    <option key={standard} value={standard}>
                      {standard}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Hold Ctrl/Cmd to select multiple standards. Students with matching current standard will be included.
                </Form.Text>
              </Form.Group>
            )}

            {groupForm.selectionType === 'mixed' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Select Department(s)</Form.Label>
                  <Form.Select
                    multiple
                    value={groupForm.selectedDepartments}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setGroupForm({...groupForm, selectedDepartments: selected});
                    }}
                  >
                    {departments.map(dept => (
                      <option key={dept._id || dept.id} value={dept._id || dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Select Sub-Department(s)</Form.Label>
                  <Form.Select
                    multiple
                    value={groupForm.selectedSubDepartments}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setGroupForm({...groupForm, selectedSubDepartments: selected});
                    }}
                  >
                    {subDepartments.map(subDept => (
                      <option key={subDept._id || subDept.id} value={subDept._id || subDept.id}>
                        {subDept.name} ({subDept.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Select Batch(es)</Form.Label>
                  <Form.Select
                    multiple
                    value={groupForm.selectedBatches}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setGroupForm({...groupForm, selectedBatches: selected});
                    }}
                  >
                    {batches.map(batch => (
                      <option key={batch._id || batch.id} value={batch._id || batch.id}>
                        {batch.name} ({batch.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Select Standard(s)</Form.Label>
                  <Form.Select
                    multiple
                    value={groupForm.selectedStandards}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setGroupForm({...groupForm, selectedStandards: selected});
                    }}
                  >
                    {STANDARD_OPTIONS.map(standard => (
                      <option key={standard} value={standard}>
                        {standard}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">Hold Ctrl/Cmd to select multiple standards</Form.Text>
                </Form.Group>
                <Alert variant="info">
                  At least one filter (department, sub-department, batch, or standard) must be selected for mixed selection.
                </Alert>
              </>
            )}

            {groupForm.selectionType === 'manual' && (
              <Form.Group className="mb-3">
                <Form.Label>Select Students</Form.Label>
                <Button
                  variant="outline-primary"
                  onClick={() => {
                    setShowSelectStudents(true);
                  }}
                >
                  Select Students
                </Button>
                {groupForm.selectedStudents.length > 0 && (
                  <div className="mt-2">
                    <Badge bg="success">{groupForm.selectedStudents.length} students selected</Badge>
                  </div>
                )}
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Academic Year (Optional)</Form.Label>
              <Form.Control
                type="text"
                value={groupForm.academicYear}
                onChange={(e) => setGroupForm({...groupForm, academicYear: e.target.value})}
                placeholder="e.g., 2024-2025"
              />
              <Form.Text className="text-muted">Leave empty to use exam's academic year</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Select Students Modal */}
      <Modal show={showSelectStudents} onHide={() => setShowSelectStudents(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Students</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Filter by Department</Form.Label>
            <Form.Select
              onChange={(e) => {
                if (e.target.value) {
                  loadStudents();
                }
              }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept._id || dept.id} value={dept._id || dept.id}>
                  {dept.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {availableStudents.length > 0 ? (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGroupForm({
                            ...groupForm,
                            selectedStudents: availableStudents
                          });
                        } else {
                          setGroupForm({
                            ...groupForm,
                            selectedStudents: []
                          });
                        }
                      }}
                    />
                  </th>
                  <th>Admission No</th>
                  <th>Name</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {availableStudents.map(student => (
                  <tr key={student._id || student.id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={groupForm.selectedStudents.some(s => (s._id || s.id) === (student._id || student.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupForm({
                              ...groupForm,
                              selectedStudents: [...groupForm.selectedStudents, student]
                            });
                          } else {
                            setGroupForm({
                              ...groupForm,
                              selectedStudents: groupForm.selectedStudents.filter(s => (s._id || s.id) !== (student._id || student.id))
                            });
                          }
                        }}
                      />
                    </td>
                    <td>{student.admissionNo || student.studentId || '-'}</td>
                    <td>{student.fullName || student.personalInfo?.fullName || '-'}</td>
                    <td>{student.academicInfo?.department?.name || student.department?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted">No students found. Please select filters to load students.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSelectStudents(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setShowSelectStudents(false)}>
            Done ({groupForm.selectedStudents.length} selected)
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Teachers Modal */}
      <Modal show={showAssignTeachers} onHide={() => setShowAssignTeachers(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Assign Teachers to {selectedGroup?.groupName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Teachers *</Form.Label>
            <Form.Select
              multiple
              value={selectedTeachers}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedTeachers(selected);
              }}
              required
            >
              {teachers.map(teacher => (
                <option key={teacher._id || teacher.id} value={teacher._id || teacher.id}>
                  {teacher.personalInfo?.fullName || teacher.fullName} ({teacher.email})
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">Hold Ctrl/Cmd to select multiple teachers</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignTeachers(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignTeachers} disabled={loading || selectedTeachers.length === 0}>
            {loading ? 'Assigning...' : 'Assign Teachers'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExamManagement;

