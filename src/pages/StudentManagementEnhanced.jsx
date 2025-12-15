import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Table, Modal, 
  Badge, Alert, Spinner, Nav, ProgressBar 
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import { getStudents, createStudent, updateStudent, deleteStudent, uploadExcelFile } from '../api/students';
import { getDepartments } from '../api/departments';
import ImageUpload from '../components/ImageUpload';
import { useDropzone } from 'react-dropzone';
import { downloadStudentTemplate, validateExcelStructure } from '../utils/excelTemplate';

const StudentManagementEnhanced = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('individual');
  
  // Individual Student Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bulk Upload
  const [excelFile, setExcelFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);
  
  const [studentForm, setStudentForm] = useState({
    admissionNo: '', fullName: '', dateOfBirth: '', bloodGroup: '', shaakha: '', gothra: '',
    telephone: '', fatherName: '', motherName: '', occupation: '', nationality: 'Indian',
    religion: 'Hindu', caste: '', motherTongue: '', presentAddress: '', permanentAddress: '',
    lastSchoolAttended: '', lastStandardStudied: '', tcDetails: '', admittedToStandard: '',
    dateOfAdmission: '', currentStandard: '', remarks: '', guardianEmail: '', 
    departmentId: '', batchIds: [], profileImage: null
  });

  useEffect(() => {
    loadStudents();
    loadDepartments();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudents();
      if (response.success) {
        setStudents(response.data || []);
      } else {
        setError(response.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      if (response.success) {
        setDepartments(response.departments || response.data || []);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate required fields
    if (!studentForm.departmentId) {
      setError('Please select a department');
      return;
    }
    
    setLoading(true);
    try {
      const response = await createStudent(studentForm);
      if (response.success) {
        setSuccess('Student created successfully!');
        await loadStudents();
        resetForm();
        setShowAddModal(false);
      } else {
        setError(response.message || 'Failed to create student');
      }
    } catch (error) {
      console.error('Error creating student:', error);
      setError(error?.response?.data?.message || 'Failed to create student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setStudentForm({
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      bloodGroup: student.bloodGroup,
      shaakha: student.shaakha,
      gothra: student.gothra,
      telephone: student.telephone,
      fatherName: student.fatherName,
      motherName: student.motherName || '',
      occupation: student.occupation,
      nationality: student.nationality || 'Indian',
      religion: student.religion || 'Hindu',
      caste: student.caste || '',
      motherTongue: student.motherTongue || '',
      presentAddress: student.presentAddress,
      permanentAddress: student.permanentAddress || '',
      lastSchoolAttended: student.lastSchoolAttended || '',
      lastStandardStudied: student.lastStandardStudied || '',
      tcDetails: student.tcDetails || '',
      admittedToStandard: student.admittedToStandard,
      dateOfAdmission: student.dateOfAdmission ? new Date(student.dateOfAdmission).toISOString().split('T')[0] : '',
      currentStandard: student.currentStandard || '',
      remarks: student.remarks || '',
      guardianEmail: student.guardianInfo?.guardianEmail || '',
      departmentId: student.academicInfo?.department?._id || student.academicInfo?.department || '',
      batchIds: student.academicInfo?.batches?.map(b => b.batch?._id || b.batch) || [],
      profileImage: student.profileImage || null
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await updateStudent(selectedStudent._id, studentForm);
      if (response.success) {
        setSuccess('Student updated successfully!');
        await loadStudents();
        setShowEditModal(false);
        setSelectedStudent(null);
        resetForm();
      } else {
        setError(response.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      setError(error?.response?.data?.message || 'Failed to update student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to deactivate this student?')) {
      try {
        const response = await deleteStudent(studentId);
        if (response.success) {
          setSuccess('Student deactivated successfully!');
          await loadStudents();
        } else {
          setError(response.message || 'Failed to deactivate student');
        }
      } catch (error) {
        console.error('Error deactivating student:', error);
        setError('Failed to deactivate student. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setStudentForm({
      admissionNo: '', fullName: '', dateOfBirth: '', bloodGroup: '', shaakha: '', gothra: '',
      telephone: '', fatherName: '', motherName: '', occupation: '', nationality: 'Indian',
      religion: 'Hindu', caste: '', motherTongue: '', presentAddress: '', permanentAddress: '',
      lastSchoolAttended: '', lastStandardStudied: '', tcDetails: '', admittedToStandard: '',
      dateOfAdmission: '', currentStandard: '', remarks: '', guardianEmail: '',
      departmentId: '', batchIds: [], profileImage: null
    });
  };

  // Excel Upload Handlers
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setError('');
        setLoading(true);
        try {
          // Validate Excel structure before setting file
          await validateExcelStructure(file);
          setExcelFile(file);
        } catch (validationError) {
          setError(validationError.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleExcelUpload = async () => {
    if (!excelFile) {
      setError('Please select an Excel file');
      return;
    }

    setError('');
    setSuccess('');
    setUploadProgress(0);
    setUploadResults(null);
    setLoading(true);

    try {
      // Simulate progress (actual progress would come from backend)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadExcelFile(excelFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setSuccess(response.message);
        setUploadResults(response.results);
        setExcelFile(null);
        await loadStudents();
      } else {
        setError(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      setError(error?.response?.data?.message || 'Failed to upload Excel file. Please check the file format.');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (student.fullName || '').toLowerCase().includes(searchLower) ||
      (student.admissionNo || '').toLowerCase().includes(searchLower) ||
      (student.fatherName || '').toLowerCase().includes(searchLower)
    );
  });

  const canManageStudents = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.HOD;

  const shaakhaOptions = [
    'Rigveda – Shaakal',
    'Krishna Yajurveda – Taittiriya',
    'Shukla Yajurveda – Kanva',
    'Shukla Yajurveda – Madhyandina',
    'Samaveda – Ranayaneeya',
    'Samaveda – Kauthuma',
    'Atharvaveda – Shaunaka'
  ];

  const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (loading && students.length === 0) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Student Management</h2>
          <p className="text-muted">Add individual students or bulk upload from Excel</p>
        </Col>
        {canManageStudents && (
          <Col xs="auto">
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <i className="bi bi-plus-circle"></i> Add New Student
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

      <Card className="mb-4">
        <Card.Body>
          <Form.Control
            type="text"
            placeholder="Search by name, admission number, or father's name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'list')}>
            <Nav.Item>
              <Nav.Link eventKey="list">All Students ({filteredStudents.length})</Nav.Link>
            </Nav.Item>
            {canManageStudents && (
              <>
                <Nav.Item>
                  <Nav.Link eventKey="individual">Add Individual</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="bulk">Bulk Upload (Excel)</Nav.Link>
                </Nav.Item>
              </>
            )}
          </Nav>
        </Card.Header>
        <Card.Body>
          {activeTab === 'list' && (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Admission No</th>
                  <th>Full Name</th>
                  <th>Age</th>
                  <th>Blood Group</th>
                  <th>Shaakha</th>
                  <th>Father Name</th>
                  <th>Current Standard</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      <p className="text-muted">No students found</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student._id}>
                      <td>
                        {student.profileImage ? (
                          <img 
                            src={student.profileImage} 
                            alt={student.fullName}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px' }}>No Photo</span>
                          </div>
                        )}
                      </td>
                      <td><Badge bg="primary">{student.admissionNo}</Badge></td>
                      <td>
                        <div>
                          <strong>{student.fullName}</strong>
                          <br />
                          <small className="text-muted">DOB: {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}</small>
                        </div>
                      </td>
                      <td>{student.age ? `${student.age} years` : 'N/A'}</td>
                      <td><Badge bg="info">{student.bloodGroup}</Badge></td>
                      <td><Badge bg="success">{student.shaakha}</Badge></td>
                      <td>{student.fatherName}</td>
                      <td><Badge bg="warning">{student.currentStandard || student.admittedToStandard}</Badge></td>
                      <td>
                        {canManageStudents && (
                          <div className="btn-group btn-group-sm">
                            <Button variant="outline-primary" size="sm" onClick={() => handleEditStudent(student)}>
                              Edit
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteStudent(student._id)}>
                              Deactivate
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {activeTab === 'individual' && canManageStudents && (
            <div>
              <Alert variant="info">
                <strong>Add Individual Student</strong>
                <p className="mb-0 mt-2">Click the "Add New Student" button above to add a single student with all details including profile photo.</p>
              </Alert>
              <div className="text-center py-5">
                <Button variant="primary" size="lg" onClick={() => setShowAddModal(true)}>
                  <i className="bi bi-plus-circle"></i> Add New Student
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'bulk' && canManageStudents && (
            <div>
              <Alert variant="info">
                <strong>Excel Upload Instructions:</strong>
                <ul className="mb-0 mt-2">
                  <li>
                    <Button 
                      variant="link" 
                      className="p-0 text-decoration-none" 
                      onClick={downloadStudentTemplate}
                      style={{ verticalAlign: 'baseline' }}
                    >
                      📥 Download Excel Template
                    </Button>
                  </li>
                  <li><strong>Required columns:</strong> Admission no, Full Name, D O B, Blood Group, Shaakha, Gothra, Telephone / Mobile No, Father Name, Occupation, Admitted to Standard, Date of Admission</li>
                  <li><strong>Note:</strong> Shaakha column maps to Department name. If department doesn't exist, it will be set to null.</li>
                  <li><strong>Date formats:</strong> YYYY-MM-DD or DD/MM/YYYY</li>
                  <li><strong>Blood Group:</strong> A+, A-, B+, B-, AB+, AB-, O+, O-</li>
                  <li><strong>Optional fields:</strong> Age, Stay Duration (calculated automatically), Mother Name, Nationality, Religion, Caste, Mother Tongue, Permanent Address, Last School Attended, Last Standard Studied, T C details, Current Standard, Remarks</li>
                  <li><strong>Max file size:</strong> 10MB</li>
                </ul>
              </Alert>

              <div {...getRootProps()} style={{
                border: '2px dashed #ccc',
                borderRadius: '8px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? '#f0f0f0' : 'white',
                marginBottom: '20px'
              }}>
                <input {...getInputProps()} />
                {excelFile ? (
                  <div>
                    <p className="text-success">✓ {excelFile.name}</p>
                    <Button variant="outline-danger" size="sm" onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}>
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p>{isDragActive ? 'Drop the Excel file here' : 'Drag & drop an Excel file here, or click to select'}</p>
                    <p className="text-muted">Supports .xlsx and .xls files</p>
                  </div>
                )}
              </div>

              {uploadProgress > 0 && (
                <ProgressBar 
                  now={uploadProgress} 
                  label={`${uploadProgress}%`}
                  className="mb-3"
                />
              )}

              {excelFile && (
                <div className="text-center mb-3">
                  <Button 
                    variant="primary" 
                    onClick={handleExcelUpload}
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? 'Uploading...' : 'Upload Excel File'}
                  </Button>
                </div>
              )}

              {uploadResults && (
                <Card className="mt-4">
                  <Card.Header>
                    <strong>Upload Results</strong>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Alert variant="success">
                          <strong>Successful:</strong> {uploadResults.successful?.length || 0} students
                        </Alert>
                      </Col>
                      <Col md={6}>
                        <Alert variant="danger">
                          <strong>Failed:</strong> {uploadResults.failed?.length || 0} students
                        </Alert>
                      </Col>
                    </Row>
                    {uploadResults.failed && uploadResults.failed.length > 0 && (
                      <div>
                        <h6>Failed Records:</h6>
                        <Table striped size="sm">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Admission No</th>
                              <th>Name</th>
                              <th>Errors</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uploadResults.failed.slice(0, 10).map((fail, idx) => (
                              <tr key={idx}>
                                <td>{fail.rowNumber || 'N/A'}</td>
                                <td>{fail.admissionNo || 'N/A'}</td>
                                <td>{fail.fullName || 'N/A'}</td>
                                <td>
                                  <ul className="mb-0" style={{ fontSize: '0.85rem' }}>
                                    {(fail.errors || []).map((err, i) => (
                                      <li key={i}>{err}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                        {uploadResults.failed.length > 10 && (
                          <p className="text-muted">... and {uploadResults.failed.length - 10} more</p>
                        )}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Student Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Add New Student</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddStudent}>
          <Modal.Body>
            <ImageUpload
              value={studentForm.profileImage}
              onChange={(url) => setStudentForm({...studentForm, profileImage: url})}
              label="Profile Photo (Optional)"
            />
            
            <Row>
              <Col md={6}>
                <h6 className="border-bottom pb-2 mb-3">Basic Information</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Admission Number *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.admissionNo} 
                    onChange={(e) => setStudentForm({...studentForm, admissionNo: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.fullName} 
                    onChange={(e) => setStudentForm({...studentForm, fullName: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth *</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={studentForm.dateOfBirth} 
                        onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group *</Form.Label>
                      <Form.Select 
                        value={studentForm.bloodGroup} 
                        onChange={(e) => setStudentForm({...studentForm, bloodGroup: e.target.value})} 
                        required
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroupOptions.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Shaakha *</Form.Label>
                  <Form.Select 
                    value={studentForm.shaakha} 
                    onChange={(e) => setStudentForm({...studentForm, shaakha: e.target.value})} 
                    required
                  >
                    <option value="">Select Shaakha</option>
                    {shaakhaOptions.map(shaakha => (
                      <option key={shaakha} value={shaakha}>{shaakha}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Gothra *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.gothra} 
                    onChange={(e) => setStudentForm({...studentForm, gothra: e.target.value})} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <h6 className="border-bottom pb-2 mb-3">Contact & Family</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Telephone/Mobile *</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={studentForm.telephone} 
                    onChange={(e) => setStudentForm({...studentForm, telephone: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Father Name *</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.fatherName} 
                        onChange={(e) => setStudentForm({...studentForm, fatherName: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mother Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.motherName} 
                        onChange={(e) => setStudentForm({...studentForm, motherName: e.target.value})} 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Occupation *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.occupation} 
                    onChange={(e) => setStudentForm({...studentForm, occupation: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Guardian Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={studentForm.guardianEmail} 
                    onChange={(e) => setStudentForm({...studentForm, guardianEmail: e.target.value})} 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Present Address *</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={studentForm.presentAddress} 
                    onChange={(e) => setStudentForm({...studentForm, presentAddress: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Permanent Address</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={studentForm.permanentAddress} 
                    onChange={(e) => setStudentForm({...studentForm, permanentAddress: e.target.value})} 
                    placeholder="Leave empty to use present address"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mt-3">
              <Col md={12}>
                <h6 className="border-bottom pb-2 mb-3">Academic Information</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select 
                        value={studentForm.departmentId} 
                        onChange={(e) => setStudentForm({...studentForm, departmentId: e.target.value})} 
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept._id || dept.id} value={dept._id || dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admitted to Standard *</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.admittedToStandard} 
                        onChange={(e) => setStudentForm({...studentForm, admittedToStandard: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Admission *</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={studentForm.dateOfAdmission} 
                        onChange={(e) => setStudentForm({...studentForm, dateOfAdmission: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Standard</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.currentStandard} 
                        onChange={(e) => setStudentForm({...studentForm, currentStandard: e.target.value})} 
                        placeholder="Leave empty to use admitted standard"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Remarks</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={studentForm.remarks} 
                    onChange={(e) => setStudentForm({...studentForm, remarks: e.target.value})} 
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Student'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Student Modal - Similar to Add Modal but with pre-filled data */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); resetForm(); }} size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Edit Student: {selectedStudent?.fullName}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateStudent}>
          <Modal.Body>
            <ImageUpload
              value={studentForm.profileImage}
              onChange={(url) => setStudentForm({...studentForm, profileImage: url})}
              label="Profile Photo"
            />
            
            {/* Same form fields as Add Modal - can be extracted to a separate component */}
            <Row>
              <Col md={6}>
                <h6 className="border-bottom pb-2 mb-3">Basic Information</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Admission Number *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.admissionNo} 
                    onChange={(e) => setStudentForm({...studentForm, admissionNo: e.target.value})} 
                    required 
                    disabled
                  />
                  <Form.Text className="text-muted">Admission number cannot be changed</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.fullName} 
                    onChange={(e) => setStudentForm({...studentForm, fullName: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth *</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={studentForm.dateOfBirth} 
                        onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group *</Form.Label>
                      <Form.Select 
                        value={studentForm.bloodGroup} 
                        onChange={(e) => setStudentForm({...studentForm, bloodGroup: e.target.value})} 
                        required
                      >
                        <option value="">Select Blood Group</option>
                        {bloodGroupOptions.map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Shaakha *</Form.Label>
                  <Form.Select 
                    value={studentForm.shaakha} 
                    onChange={(e) => setStudentForm({...studentForm, shaakha: e.target.value})} 
                    required
                  >
                    <option value="">Select Shaakha</option>
                    {shaakhaOptions.map(shaakha => (
                      <option key={shaakha} value={shaakha}>{shaakha}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Gothra *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.gothra} 
                    onChange={(e) => setStudentForm({...studentForm, gothra: e.target.value})} 
                    required 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <h6 className="border-bottom pb-2 mb-3">Contact & Family</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Telephone/Mobile *</Form.Label>
                  <Form.Control 
                    type="tel" 
                    value={studentForm.telephone} 
                    onChange={(e) => setStudentForm({...studentForm, telephone: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Father Name *</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.fatherName} 
                        onChange={(e) => setStudentForm({...studentForm, fatherName: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mother Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.motherName} 
                        onChange={(e) => setStudentForm({...studentForm, motherName: e.target.value})} 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Occupation *</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={studentForm.occupation} 
                    onChange={(e) => setStudentForm({...studentForm, occupation: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Guardian Email</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={studentForm.guardianEmail} 
                    onChange={(e) => setStudentForm({...studentForm, guardianEmail: e.target.value})} 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Present Address *</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={studentForm.presentAddress} 
                    onChange={(e) => setStudentForm({...studentForm, presentAddress: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Permanent Address</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={studentForm.permanentAddress} 
                    onChange={(e) => setStudentForm({...studentForm, permanentAddress: e.target.value})} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mt-3">
              <Col md={12}>
                <h6 className="border-bottom pb-2 mb-3">Academic Information</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select 
                        value={studentForm.departmentId} 
                        onChange={(e) => setStudentForm({...studentForm, departmentId: e.target.value})} 
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept._id || dept.id} value={dept._id || dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admitted to Standard *</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.admittedToStandard} 
                        onChange={(e) => setStudentForm({...studentForm, admittedToStandard: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Admission *</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={studentForm.dateOfAdmission} 
                        onChange={(e) => setStudentForm({...studentForm, dateOfAdmission: e.target.value})} 
                        required 
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Standard</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={studentForm.currentStandard} 
                        onChange={(e) => setStudentForm({...studentForm, currentStandard: e.target.value})} 
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Remarks</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={2} 
                    value={studentForm.remarks} 
                    onChange={(e) => setStudentForm({...studentForm, remarks: e.target.value})} 
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowEditModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Student'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default StudentManagementEnhanced;

