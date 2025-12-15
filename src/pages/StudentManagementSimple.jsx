import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge } from 'react-bootstrap';
import { studentManagementAPI } from '../api/studentManagement';

const StudentManagementSimple = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [studentForm, setStudentForm] = useState({
    admissionNo: '',
    fullName: '',
    dateOfBirth: '',
    bloodGroup: '',
    shaakha: 'Rig Veda',
    gothra: '',
    telephone: '',
    fatherName: '',
    motherName: '',
    occupation: '',
    nationality: 'Indian',
    religion: 'Hindu',
    caste: '',
    motherTongue: '',
    presentAddress: '',
    permanentAddress: '',
    lastSchoolAttended: '',
    lastStandardStudied: '',
    tcDetails: '',
    admittedToStandard: '',
    dateOfAdmission: '',
    currentStandard: '',
    remarks: '',
    guardianEmail: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    studentId: '',
    departmentId: '',
    subDepartmentId: '',
    batchId: '',
    role: 'student',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('Loading initial data...');
      
      const [studentsRes, departmentsRes] = await Promise.all([
        studentManagementAPI.getStudents(),
        studentManagementAPI.getDepartments()
      ]);

      console.log('Students response:', studentsRes);
      console.log('Departments response:', departmentsRes);

      setStudents(studentsRes.students || []);
      setDepartments(departmentsRes.departments || []);
      
      console.log('Students loaded:', studentsRes.students?.length || 0);
      console.log('Departments loaded:', departmentsRes.departments?.length || 0);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'danger', text: 'Error loading data: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle student form changes
  const handleStudentFormChange = (e) => {
    const { name, value } = e.target;
    setStudentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle assignment form changes
  const handleAssignmentFormChange = (e) => {
    const { name, value } = e.target;
    setAssignmentForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Load sub-departments when department changes
    if (name === 'departmentId') {
      loadSubDepartments(value);
      setAssignmentForm(prev => ({ ...prev, subDepartmentId: '', batchId: '' }));
    }

    // Load batches when sub-department changes
    if (name === 'subDepartmentId') {
      if (value) {
        loadSubDepartmentBatches(value);
      } else {
        loadDepartmentBatches(assignmentForm.departmentId);
      }
      setAssignmentForm(prev => ({ ...prev, batchId: '' }));
    }
  };

  // Load sub-departments for a department
  const loadSubDepartments = async (departmentId) => {
    if (!departmentId) return;
    try {
      const response = await studentManagementAPI.getSubDepartments(departmentId);
      setSubDepartments(response.subDepartments || []);
    } catch (error) {
      console.error('Error loading sub-departments:', error);
    }
  };

  // Load batches for a department
  const loadDepartmentBatches = async (departmentId) => {
    if (!departmentId) return;
    try {
      console.log('🔍 Loading batches for department:', departmentId);
      const response = await studentManagementAPI.getDepartmentBatches(departmentId);
      console.log('📦 Department batches response:', response);
      setBatches(response.batches || []);
      console.log('📊 Department batches loaded:', response.batches?.length || 0);
    } catch (error) {
      console.error('❌ Error loading department batches:', error);
    }
  };

  // Load batches for a sub-department
  const loadSubDepartmentBatches = async (subDepartmentId) => {
    if (!subDepartmentId) return;
    try {
      console.log('🔍 Loading batches for sub-department:', subDepartmentId);
      const response = await studentManagementAPI.getSubDepartmentBatches(subDepartmentId);
      console.log('📦 Sub-department batches response:', response);
      setBatches(response.batches || []);
      console.log('📊 Sub-department batches loaded:', response.batches?.length || 0);
    } catch (error) {
      console.error('❌ Error loading sub-department batches:', error);
    }
  };

  // Create new student
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await studentManagementAPI.createStudent(studentForm);
      setMessage({ type: 'success', text: response.message });
      
      // Reset form
      setStudentForm({
        admissionNo: '', fullName: '', dateOfBirth: '', bloodGroup: '',
        shaakha: 'Rig Veda', gothra: '', telephone: '', fatherName: '',
        motherName: '', occupation: '', nationality: 'Indian', religion: 'Hindu',
        caste: '', motherTongue: '', presentAddress: '', permanentAddress: '',
        lastSchoolAttended: '', lastStandardStudied: '', tcDetails: '',
        admittedToStandard: '', dateOfAdmission: '', currentStandard: '',
        remarks: '', guardianEmail: ''
      });

      // Reload students
      await loadInitialData();
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error creating student: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Assign student to department and batch
  const handleAssignStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await studentManagementAPI.assignStudent(assignmentForm);
      setMessage({ type: 'success', text: response.message });
      
      // Reset form
      setAssignmentForm({
        studentId: '', departmentId: '', subDepartmentId: '', batchId: '', role: 'student', notes: ''
      });

      // Reload students
      await loadInitialData();
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error assigning student: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Student Management</h2>
      
      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Row>
        {/* Create Student Form */}
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Create New Student</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateStudent}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admission No *</Form.Label>
                      <Form.Control
                        type="text"
                        name="admissionNo"
                        value={studentForm.admissionNo}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={studentForm.fullName}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth *</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={studentForm.dateOfBirth}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group *</Form.Label>
                      <Form.Select
                        name="bloodGroup"
                        value={studentForm.bloodGroup}
                        onChange={handleStudentFormChange}
                        required
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Shaakha *</Form.Label>
                      <Form.Select
                        name="shaakha"
                        value={studentForm.shaakha}
                        onChange={handleStudentFormChange}
                        required
                      >
                        <option value="Rig Veda">Rig Veda</option>
                        <option value="Yajur Veda">Yajur Veda</option>
                        <option value="Sama Veda">Sama Veda</option>
                        <option value="Atharva Veda">Atharva Veda</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gothra *</Form.Label>
                      <Form.Control
                        type="text"
                        name="gothra"
                        value={studentForm.gothra}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telephone *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="telephone"
                        value={studentForm.telephone}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Father Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="fatherName"
                        value={studentForm.fatherName}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admitted to Standard *</Form.Label>
                      <Form.Control
                        type="text"
                        name="admittedToStandard"
                        value={studentForm.admittedToStandard}
                        onChange={handleStudentFormChange}
                        placeholder="e.g., Prathama, 5th"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Admission *</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfAdmission"
                        value={studentForm.dateOfAdmission}
                        onChange={handleStudentFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Present Address *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="presentAddress"
                    value={studentForm.presentAddress}
                    onChange={handleStudentFormChange}
                    required
                  />
                </Form.Group>

                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Student'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Assign Student Form */}
        <Col lg={6}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5>Assign Student to Department & Batch</h5>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={loadInitialData}
                disabled={loading}
              >
                {loading ? '🔄 Loading...' : '🔄 Refresh'}
              </Button>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleAssignStudent}>
                <Form.Group className="mb-3">
                  <Form.Label>Select Student *</Form.Label>
                  <Form.Select
                    name="studentId"
                    value={assignmentForm.studentId}
                    onChange={handleAssignmentFormChange}
                    required
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? 'Loading students...' : 
                       students.length === 0 ? 'No students available - Create a student first' : 
                       'Choose Student'}
                    </option>
                    {students.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.admissionNo} - {student.fullName}
                      </option>
                    ))}
                  </Form.Select>
                  {students.length === 0 && !loading && (
                    <Form.Text className="text-muted">
                      📝 Create a student using the form on the left first, then refresh this page to assign them.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Department *</Form.Label>
                  <Form.Select
                    name="departmentId"
                    value={assignmentForm.departmentId}
                    onChange={handleAssignmentFormChange}
                    required
                  >
                    <option value="">Choose Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Sub-Department (Optional)</Form.Label>
                  <Form.Select
                    name="subDepartmentId"
                    value={assignmentForm.subDepartmentId}
                    onChange={handleAssignmentFormChange}
                  >
                    <option value="">Choose Sub-Department</option>
                    {subDepartments.map(subDept => (
                      <option key={subDept._id} value={subDept._id}>
                        {subDept.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Select Batch *</Form.Label>
                  <Form.Select
                    name="batchId"
                    value={assignmentForm.batchId}
                    onChange={handleAssignmentFormChange}
                    required
                  >
                    <option value="">Choose Batch</option>
                    {batches.map(batch => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} ({batch.academicYear})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    name="role"
                    value={assignmentForm.role}
                    onChange={handleAssignmentFormChange}
                  >
                    <option value="student">Student</option>
                    <option value="monitor">Monitor</option>
                    <option value="assistant">Assistant</option>
                    <option value="leader">Leader</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="notes"
                    value={assignmentForm.notes}
                    onChange={handleAssignmentFormChange}
                    placeholder="Any additional notes..."
                  />
                </Form.Group>

                <Button type="submit" variant="success" disabled={loading}>
                  {loading ? 'Assigning...' : 'Assign Student'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Students List */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5>Students List</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">Loading students...</div>
              ) : (
                <Table responsive striped>
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Shaakha</th>
                      <th>Stay Duration</th>
                      <th>Assignments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student._id}>
                        <td>{student.admissionNo}</td>
                        <td>{student.fullName}</td>
                        <td>{student.age} years</td>
                        <td>{student.shaakha}</td>
                        <td>{student.stayDuration} years</td>
                        <td>
                          {student.assignments && student.assignments.length > 0 ? (
                            student.assignments.map((assignment, index) => (
                              <Badge key={index} bg="info" className="me-1">
                                {assignment.department?.name} > {assignment.batch?.name}
                              </Badge>
                            ))
                          ) : (
                            <Badge bg="secondary">No assignments</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StudentManagementSimple;
