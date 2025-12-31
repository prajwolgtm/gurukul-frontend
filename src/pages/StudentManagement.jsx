import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal,
  Badge, Alert, Spinner, InputGroup, Tabs, Tab, Pagination
} from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import studentsAPI from '../api/students';
import academicAPI from '../api/academic';

// Standard options for dropdowns
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

const StudentManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    admissionNo: '',
    fullName: '',
    dateOfBirth: '',
    bloodGroup: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    fatherName: '',
    motherName: '',
    guardianPhone: '',
    guardianEmail: '',
    department: '',
    subDepartments: [],
    batches: [],
    admittedToStandard: '',
    currentStandard: '',
    dateOfAdmission: '',
    shaakha: '',
    gothra: '',
    status: 'active',
    remarks: '',
    aadhaarNumber: '',
    panNumber: '',
    bankDetails: { bankName: '', bankAddress: '', accountNumber: '', ifscCode: '', accountHolderName: '' }
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    subDepartment: '',
    batch: '',
    status: 'active',
    page: 1,
    limit: 20
  });
  const [showLeftout, setShowLeftout] = useState(false);

  // Sorting states
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc' // 'asc' or 'desc'
  });

  // Bulk upload states
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadData, setBulkUploadData] = useState('');
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Check permissions
  const canManage = [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL].includes(user?.role);
  const canCreate = [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL].includes(user?.role);
  const canDelete = [ROLES.ADMIN, ROLES.COORDINATOR].includes(user?.role);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load students when filters, showLeftout, or sortConfig changes
  useEffect(() => {
    loadStudents();
  }, [filters, showLeftout, sortConfig]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [studentsRes, departmentsRes] = await Promise.all([
        studentsAPI.getStudents(filters),
        academicAPI.getDepartments()
      ]);

      setStudents(studentsRes.students || []);
      setPagination({
        currentPage: studentsRes.pagination?.currentPage || 1,
        totalPages: studentsRes.pagination?.totalPages || 1,
        totalStudents: studentsRes.pagination?.totalStudents || 0
      });
      setDepartments(departmentsRes.departments || []);
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setMessage({
        type: 'danger',
        text: 'Error loading data. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      // Build query params with includeLeftout flag and sorting
      const queryParams = {
        ...filters,
        includeLeftout: showLeftout ? 'true' : 'false',
        sortBy: sortConfig.key || 'fullName',
        sortOrder: sortConfig.direction || 'asc'
      };
      const response = await studentsAPI.getStudents(queryParams);
      console.log('📊 Students API Response:', response);
      console.log('📊 Students Count:', response.students?.length || 0);
      setStudents(response.students || []);
      setPagination({
        currentPage: response.pagination?.currentPage || 1,
        totalPages: response.pagination?.totalPages || 1,
        totalStudents: response.pagination?.totalStudents || 0
      });
    } catch (error) {
      console.error('❌ Error loading students:', error);
      console.error('❌ Error details:', error.response?.data);
      setMessage({
        type: 'danger',
        text: 'Error loading students: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle column sorting - triggers backend sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    // Reset to page 1 when sorting changes
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const loadSubDepartments = async (departmentId) => {
    if (!departmentId) {
      setSubDepartments([]);
      return;
    }

    try {
      const response = await academicAPI.getSubDepartments(departmentId);
      setSubDepartments(response.subDepartments || []);
    } catch (error) {
      console.error('❌ Error loading sub-departments:', error);
      setSubDepartments([]);
    }
  };

  const loadBatches = async (departmentId, subDepartmentId = null) => {
    if (!departmentId) {
      setBatches([]);
      return;
    }

    try {
      let response;
      if (subDepartmentId) {
        response = await academicAPI.getSubDepartmentBatches(subDepartmentId);
      } else {
        response = await academicAPI.getDepartmentBatches(departmentId);
      }
      setBatches(response.batches || []);
    } catch (error) {
      console.error('❌ Error loading batches:', error);
      setBatches([]);
    }
  };

  // File upload dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    multiple: false
  });

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      setBulkUploadFile(file);
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'json') {
        // Handle JSON file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target.result);
            const studentsArray = Array.isArray(jsonData) ? jsonData : jsonData.students || [];
            setBulkUploadData(JSON.stringify(studentsArray, null, 2));
          } catch (error) {
            setMessage({ type: 'danger', text: 'Invalid JSON file format' });
          }
        };
        reader.readAsText(file);
      } else if (['xlsx', 'xls', 'csv'].includes(fileExtension)) {
        // Handle Excel/CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            // Convert Excel data to student format - handle all column name variations
            const studentsArray = jsonData.map(row => ({
              admissionNo: row['Admission no'] || row['Admission No'] || row['admissionNo'] || row['AdmissionNo'] || '',
              fullName: row['Full Name'] || row['fullName'] || row['FullName'] || row['Name'] || '',
              dateOfBirth: row['DOB'] || row['Date of Birth'] || row['dateOfBirth'] || row['DateOfBirth'] || '',
              gender: row['Gender'] || row['gender'] || 'Male',
              bloodGroup: row['Blood Group'] || row['bloodGroup'] || row['BloodGroup'] || '',
              phone: row['Telephone / Mobile No'] || row['Phone'] || row['phone'] || '',
              email: row['Email'] || row['email'] || '',
              address: row['Present Address'] || row['Address'] || row['address'] || '',
              fatherName: row['Father Name'] || row['fatherName'] || row['FatherName'] || '',
              motherName: row['Mother Name'] || row['motherName'] || row['MotherName'] || '',
              guardianPhone: row['Telephone / Mobile No'] || row['Guardian Phone'] || row['guardianPhone'] || row['GuardianPhone'] || '',
              guardianEmail: row['Guardian Email'] || row['guardianEmail'] || row['GuardianEmail'] || row['Parent Email'] || row['parentEmail'] || row['ParentEmail'] || '',
              department: row['Department'] || row['department'] || '',
              admittedToStandard: row['Admitted to Standard'] || row['Admitted To Standard'] || row['admittedToStandard'] || '',
              currentStandard: row['Current Standard'] || row['currentStandard'] || '',
              shaakha: row['Shaakha'] || row['shaakha'] || '',
              gothra: row['Gothra'] || row['gothra'] || '',
              remarks: row['Remarks'] || row['remarks'] || ''
            }));
            
            setBulkUploadData(JSON.stringify(studentsArray, null, 2));
          } catch (error) {
            setMessage({ type: 'danger', text: 'Error reading Excel file: ' + error.message });
          }
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('❌ Error handling file upload:', error);
      setMessage({ type: 'danger', text: 'Error processing file' });
    }
  };

  // Handle bulk upload submission
  const handleBulkUpload = async () => {
    try {
      setLoading(true);
      setUploadProgress({ total: 0, success: 0, errors: [] });
      
      let studentsData = [];
      
      if (bulkUploadData) {
        // Use parsed data (from file upload or JSON input)
        try {
          studentsData = JSON.parse(bulkUploadData);
        } catch (error) {
          setMessage({ type: 'danger', text: 'Invalid JSON format. Please check your data.' });
          return;
        }
      } else {
        setMessage({ type: 'danger', text: 'Please provide student data (upload a file or enter JSON)' });
        return;
      }

      if (!Array.isArray(studentsData) || studentsData.length === 0) {
        setMessage({ type: 'danger', text: 'Invalid student data format. Expected an array of students.' });
        return;
      }

      const response = await studentsAPI.bulkUploadStudents(studentsData);
      
      setUploadProgress({
        total: response.results?.total || studentsData.length,
        success: response.results?.success?.length || 0,
        errors: response.results?.errors || []
      });

      if (response.results?.success?.length > 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully uploaded ${response.results.success.length} students!` 
        });
        setShowBulkUploadModal(false);
        setBulkUploadData('');
        setBulkUploadFile(null);
        await loadStudents();
      }

      if (response.results?.errors?.length > 0) {
        setMessage({ 
          type: 'warning', 
          text: `${response.results.success.length} students uploaded, but ${response.results.errors.length} had errors. Check console for details.` 
        });
        console.error('Upload errors:', response.results.errors);
      }

    } catch (error) {
      console.error('❌ Error in bulk upload:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error uploading students'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page when filters change
    }));

    // Load sub-departments and batches when department filter changes
    if (name === 'department') {
      loadSubDepartments(value);
      loadBatches(value);
      setFilters(prev => ({
        ...prev,
        subDepartment: '',
        batch: ''
      }));
    }

    if (name === 'subDepartment') {
      loadBatches(filters.department, value);
      setFilters(prev => ({
        ...prev,
        batch: ''
      }));
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'subDepartments' || name === 'batches') {
      // Handle multiple select
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setFormData(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
    } else if (name.startsWith('bankDetails.')) {
      // Handle nested bank details fields
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Load sub-departments and batches when department changes
    if (name === 'department') {
      loadSubDepartments(value);
      loadBatches(value);
      setFormData(prev => ({
        ...prev,
        subDepartments: [],
        batches: []
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      console.log('💾 Saving student with data:', formData);
      console.log('📝 Bank/ID fields:', {
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        bankDetails: formData.bankDetails
      });
      
      if (editingStudent) {
        const response = await studentsAPI.updateStudent(editingStudent._id, formData);
        console.log('✅ Update response:', response);
        setMessage({ type: 'success', text: 'Student updated successfully!' });
      } else {
        const response = await studentsAPI.createStudent(formData);
        console.log('✅ Create response:', response);
        setMessage({ type: 'success', text: 'Student created successfully!' });
      }
      
      setShowModal(false);
      resetForm();
      // Reload students immediately
      await loadStudents();
    } catch (error) {
      console.error('❌ Error saving student:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error saving student'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (student) => {
    navigate(`/students/${student._id}/profile`);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      admissionNo: student.admissionNo || '',
      fullName: student.fullName || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      bloodGroup: student.bloodGroup || '',
      gender: student.gender || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      fatherName: student.fatherName || '',
      motherName: student.motherName || '',
      guardianPhone: student.guardianPhone || '',
      guardianEmail: student.guardianEmail || '',
      department: student.department?._id || '',
      subDepartments: student.subDepartments?.map(sd => sd._id) || [],
      batches: student.batches?.map(b => b._id) || [],
      admittedToStandard: student.admittedToStandard || '',
      currentStandard: student.currentStandard || '',
      dateOfAdmission: student.dateOfAdmission ? student.dateOfAdmission.split('T')[0] : '',
      shaakha: student.shaakha || '',
      gothra: student.gothra || '',
      status: student.status || 'active',
      remarks: student.remarks || '',
      aadhaarNumber: student.aadhaarNumber || '',
      panNumber: student.panNumber || '',
      bankDetails: {
        bankName: student.bankDetails?.bankName || '',
        bankAddress: student.bankDetails?.bankAddress || '',
        accountNumber: student.bankDetails?.accountNumber || '',
        ifscCode: student.bankDetails?.ifscCode || '',
        accountHolderName: student.bankDetails?.accountHolderName || ''
      }
    });

    // Load sub-departments and batches for the student's department
    if (student.department?._id) {
      loadSubDepartments(student.department._id);
      loadBatches(student.department._id);
    }

    setShowModal(true);
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      setLoading(true);
      await studentsAPI.deleteStudent(studentId);
      setMessage({ type: 'success', text: 'Student deleted successfully!' });
      loadStudents();
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error deleting student'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      admissionNo: '',
      fullName: '',
      dateOfBirth: '',
      bloodGroup: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      fatherName: '',
      motherName: '',
      guardianPhone: '',
      guardianEmail: '',
      department: '',
      subDepartments: [],
      batches: [],
      admittedToStandard: '',
      currentStandard: '',
      dateOfAdmission: '',
      shaakha: '',
      gothra: '',
      status: 'active',
      remarks: '',
      aadhaarNumber: '',
      panNumber: '',
      bankDetails: { bankName: '', bankAddress: '', accountNumber: '', ifscCode: '', accountHolderName: '' }
    });
    setEditingStudent(null);
    setSubDepartments([]);
    setBatches([]);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>🎓 Student Management</h2>
              <p className="text-muted mb-0">Manage student records and assignments</p>
            </div>
            {canCreate && (
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  onClick={() => { setShowBulkUploadModal(true); }}
                  disabled={loading}
                >
                  📤 Bulk Upload
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => { resetForm(); setShowModal(true); }}
                  disabled={loading}
                >
                  ➕ Add Student
                </Button>
              </div>
            )}
          </div>

          {/* Message Alert */}
          {message.text && (
            <Alert 
              variant={message.type} 
              dismissible 
              onClose={() => setMessage({ type: '', text: '' })}
              className="mb-4"
            >
              {message.text}
            </Alert>
          )}

          {/* Filters */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">🔍 Filters & Search</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by name, admission no..."
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Department</Form.Label>
                    <Form.Select
                      name="department"
                      value={filters.department}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Sub-Department</Form.Label>
                    <Form.Select
                      name="subDepartment"
                      value={filters.subDepartment}
                      onChange={handleFilterChange}
                      disabled={!filters.department}
                    >
                      <option value="">All Sub-Departments</option>
                      {subDepartments.map(subDept => (
                        <option key={subDept._id} value={subDept._id}>
                          {subDept.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Batch</Form.Label>
                    <Form.Select
                      name="batch"
                      value={filters.batch}
                      onChange={handleFilterChange}
                      disabled={!filters.department}
                    >
                      <option value="">All Batches</option>
                      {batches.map(batch => (
                        <option key={batch._id} value={batch._id}>
                          {batch.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="active">Active</option>
                      <option value="graduated">Graduated</option>
                      <option value="transferred">Transferred</option>
                      <option value="leftout">Left Out</option>
                      <option value="Completed Moola">Completed Moola</option>
                      <option value="Post Graduated">Post Graduated</option>
                      <option value="">All Status</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={1}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <Form.Check
                      type="checkbox"
                      label="Show Leftout"
                      checked={showLeftout}
                      onChange={(e) => {
                        setShowLeftout(e.target.checked);
                        // Reset status filter when toggling leftout
                        if (e.target.checked && filters.status === 'active') {
                          setFilters(prev => ({ ...prev, status: '' }));
                        }
                      }}
                      className="mt-2"
                    />
                  </Form.Group>
                </Col>
                <Col md={1}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <Button
                      variant="outline-secondary"
                      className="d-block"
                      onClick={loadStudents}
                      disabled={loading}
                    >
                      🔄
                    </Button>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Students Table */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">📋 Students List</h6>
              <Badge bg="info">
                {pagination.totalStudents || 0} Total Students
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No students found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('admissionNo')}
                        >
                          Admission No
                          {sortConfig.key === 'admissionNo' && (
                            <span className="ms-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('fullName')}
                        >
                          Student Name
                          {sortConfig.key === 'fullName' && (
                            <span className="ms-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('fatherName')}
                        >
                          Father's Name
                          {sortConfig.key === 'fatherName' && (
                            <span className="ms-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('department')}
                        >
                          Department
                          {sortConfig.key === 'department' && (
                            <span className="ms-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th>Current Standard</th>
                        <th>Sub-Departments</th>
                        <th>Batches</th>
                        <th 
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {sortConfig.key === 'status' && (
                            <span className="ms-2">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student._id}>
                          <td>
                            <strong>{student.admissionNo}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{student.fullName}</strong>
                              <br />
                              <small className="text-muted">
                                {student.email && `📧 ${student.email}`}
                                {student.phone && ` | 📞 ${student.phone}`}
                              </small>
                            </div>
                          </td>
                          <td>{student.fatherName}</td>
                          <td>
                            <Badge bg="primary">
                              {student.department?.name || 'N/A'}
                            </Badge>
                          </td>
                          <td>
                            {student.currentStandard ? (
                              <Badge bg="secondary">
                                {student.currentStandard}
                              </Badge>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            {student.subDepartments?.length > 0 ? (
                              student.subDepartments.map(sd => (
                                <Badge key={sd._id} bg="info" className="me-1">
                                  {sd.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td>
                            {student.batches?.length > 0 ? (
                              student.batches.map(batch => (
                                <Badge key={batch._id} bg="success" className="me-1">
                                  {batch.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted">None</span>
                            )}
                          </td>
                          <td>
                            <Badge 
                              bg={
                                student.status === 'active' ? 'success' :
                                student.status === 'graduated' ? 'primary' :
                                student.status === 'leftout' ? 'warning' :
                                student.status === 'transferred' ? 'info' :
                                student.status === 'Completed Moola' ? 'info' :
                                student.status === 'Post Graduated' ? 'primary' :
                                'warning'
                              }
                            >
                              {student.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => handleViewProfile(student)}
                                title="View student profile"
                              >
                                👁️
                              </Button>
                              {canManage && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(student)}
                                  title="Edit student"
                                >
                                  ✏️
                                </Button>
                              )}
                              {canManage && canDelete && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(student._id)}
                                  title="Delete student"
                                >
                                  🗑️
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-center py-3">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                    />
                    
                    {[...Array(pagination.totalPages)].map((_, index) => {
                      const page = index + 1;
                      if (
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.currentPage - 2 && page <= pagination.currentPage + 2)
                      ) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === pagination.currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      } else if (
                        page === pagination.currentPage - 3 ||
                        page === pagination.currentPage + 3
                      ) {
                        return <Pagination.Ellipsis key={page} />;
                      }
                      return null;
                    })}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.currentPage === pagination.totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Student Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingStudent ? '✏️ Edit Student' : '➕ Add New Student'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Tabs defaultActiveKey="basic" className="mb-3">
              {/* Basic Information Tab */}
              <Tab eventKey="basic" title="📝 Basic Info">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admission Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="admissionNo"
                        value={formData.admissionNo}
                        onChange={handleFormChange}
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
                        value={formData.fullName}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Birth *</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gender *</Form.Label>
                      <Form.Select
                        name="gender"
                        value={formData.gender}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Blood Group</Form.Label>
                      <Form.Select
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={handleFormChange}
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Family Information Tab */}
              <Tab eventKey="family" title="👨‍👩‍👧‍👦 Family Info">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Father's Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mother's Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Guardian Phone *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="guardianPhone"
                        value={formData.guardianPhone}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Parent Email (for Parent Portal)</Form.Label>
                      <Form.Control
                        type="email"
                        name="guardianEmail"
                        value={formData.guardianEmail}
                        onChange={handleFormChange}
                        placeholder="parent@example.com"
                      />
                      <Form.Text className="text-muted">
                        This email will be used for parent login (password: child's DOB in DDMMYYYY format)
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Shaakha</Form.Label>
                      <Form.Control
                        type="text"
                        name="shaakha"
                        value={formData.shaakha}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Gothra</Form.Label>
                      <Form.Control
                        type="text"
                        name="gothra"
                        value={formData.gothra}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Academic Information Tab */}
              <Tab eventKey="academic" title="🎓 Academic Info">
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department *</Form.Label>
                      <Form.Select
                        name="department"
                        value={formData.department}
                        onChange={handleFormChange}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sub-Departments (Multiple allowed)</Form.Label>
                      <Form.Select
                        multiple
                        name="subDepartments"
                        value={formData.subDepartments}
                        onChange={handleFormChange}
                        disabled={!formData.department}
                        size={4}
                      >
                        {subDepartments.map(subDept => (
                          <option key={subDept._id} value={subDept._id}>
                            {subDept.name} ({subDept.code})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Hold Ctrl/Cmd to select multiple sub-departments
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Batches (Multiple allowed)</Form.Label>
                      <Form.Select
                        multiple
                        name="batches"
                        value={formData.batches}
                        onChange={handleFormChange}
                        disabled={!formData.department}
                        size={4}
                      >
                        {batches.map(batch => (
                          <option key={batch._id} value={batch._id}>
                            {batch.name} ({batch.code}) - {batch.academicYear}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Hold Ctrl/Cmd to select multiple batches
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Admitted to Standard</Form.Label>
                      <Form.Select
                        name="admittedToStandard"
                        value={formData.admittedToStandard}
                        onChange={handleFormChange}
                      >
                        <option value="">Select Standard</option>
                        {STANDARD_OPTIONS.map(standard => (
                          <option key={standard} value={standard}>
                            {standard}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Standard</Form.Label>
                      <Form.Select
                        name="currentStandard"
                        value={formData.currentStandard}
                        onChange={handleFormChange}
                      >
                        <option value="">Select Standard</option>
                        {STANDARD_OPTIONS.map(standard => (
                          <option key={standard} value={standard}>
                            {standard}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date of Admission</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfAdmission"
                        value={formData.dateOfAdmission}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                      >
                        <option value="active">Active</option>
                        <option value="graduated">Graduated</option>
                        <option value="transferred">Transferred</option>
                        <option value="leftout">Left Out</option>
                        <option value="Completed Moola">Completed Moola</option>
                        <option value="Post Graduated">Post Graduated</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Remarks</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Bank & ID Details Tab */}
              <Tab eventKey="bank" title="💳 Bank & IDs">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Aadhaar Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="aadhaarNumber"
                        value={formData.aadhaarNumber}
                        onChange={handleFormChange}
                        placeholder="12-digit Aadhaar Number"
                        maxLength="12"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>PAN Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleFormChange}
                        placeholder="e.g. ABCDE1234F"
                        maxLength="10"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <h6 className="mb-3">Bank Details</h6>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bank Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="bankDetails.bankName"
                        value={(formData.bankDetails || {}).bankName || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. State Bank of India"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Holder Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="bankDetails.accountHolderName"
                        value={(formData.bankDetails || {}).accountHolderName || ''}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Account Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="bankDetails.accountNumber"
                        value={(formData.bankDetails || {}).accountNumber || ''}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>IFSC Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="bankDetails.ifscCode"
                        value={(formData.bankDetails || {}).ifscCode || ''}
                        onChange={handleFormChange}
                        placeholder="e.g. SBIN0040871"
                        maxLength="11"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bank Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="bankDetails.bankAddress"
                        value={(formData.bankDetails || {}).bankAddress || ''}
                        onChange={handleFormChange}
                        placeholder="Branch address"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingStudent ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingStudent ? 'Update Student' : 'Create Student'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal show={showBulkUploadModal} onHide={() => setShowBulkUploadModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>📤 Bulk Upload Students</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="file" className="mb-3">
            {/* File Upload Tab */}
            <Tab eventKey="file" title="📁 Upload File">
              <div className="mb-3">
                <p className="text-muted">
                  Upload an Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) file containing student data.
                </p>
                <div
                  {...getRootProps()}
                  className={`border rounded p-5 text-center ${isDragActive ? 'bg-light border-primary' : 'border-secondary'}`}
                  style={{ cursor: 'pointer' }}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p>📥 Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="mb-2">📁 Drag & drop a file here, or click to select</p>
                      <p className="text-muted small">
                        Supports: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
                      </p>
                    </div>
                  )}
                </div>
                {bulkUploadFile && (
                  <Alert variant="info" className="mt-3">
                    <strong>Selected file:</strong> {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(2)} KB)
                  </Alert>
                )}
              </div>
            </Tab>

            {/* JSON Input Tab */}
            <Tab eventKey="json" title="📝 JSON Input">
              <div className="mb-3">
                <p className="text-muted">
                  Paste or type student data in JSON format. Expected format: Array of student objects.
                </p>
                <Form.Group>
                  <Form.Label>Student Data (JSON)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={15}
                    value={bulkUploadData}
                    onChange={(e) => setBulkUploadData(e.target.value)}
                    placeholder={`[
  {
    "admissionNo": "STU001",
    "fullName": "John Doe",
    "dateOfBirth": "2010-01-15",
    "gender": "Male",
    "fatherName": "Father Name",
    "motherName": "Mother Name",
    "guardianPhone": "1234567890",
    "department": "DEPARTMENT_ID",
    ...
  }
]`}
                  />
                </Form.Group>
                <Form.Text className="text-muted">
                  Required fields: admissionNo, fullName, dateOfBirth, gender, fatherName, motherName, guardianPhone, department
                </Form.Text>
              </div>
            </Tab>
          </Tabs>

          {/* Upload Progress */}
          {uploadProgress && (
            <Alert variant={uploadProgress.errors.length > 0 ? 'warning' : 'success'}>
              <strong>Upload Results:</strong>
              <ul className="mb-0 mt-2">
                <li>Total: {uploadProgress.total}</li>
                <li>Success: {uploadProgress.success}</li>
                {uploadProgress.errors.length > 0 && (
                  <li>Errors: {uploadProgress.errors.length}</li>
                )}
              </ul>
              {uploadProgress.errors.length > 0 && (
                <details className="mt-2">
                  <summary>Error Details</summary>
                  <ul className="small">
                    {uploadProgress.errors.map((error, idx) => (
                      <li key={idx}>Row {error.row}: {error.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowBulkUploadModal(false);
            setBulkUploadData('');
            setBulkUploadFile(null);
            setUploadProgress(null);
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleBulkUpload} 
            disabled={loading || (!bulkUploadData && !bulkUploadFile)}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              '📤 Upload Students'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudentManagement;