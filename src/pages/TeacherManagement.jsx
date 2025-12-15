import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal,
  Badge, Alert, Spinner, Tabs, Tab, Pagination
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import teachersAPI, { teacherAssignmentsAPI } from '../api/teachers';
import academicAPI from '../api/academic';

const TeacherManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    qualification: '',
    specialization: '',
    experience: '',
    joiningDate: '',
    subjects: [],
    address: '',
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    },
    remarks: ''
  });

  const [assignmentData, setAssignmentData] = useState({
    departments: [],
    subDepartments: [],
    batches: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: 'active',
    isVerified: '',
    page: 1,
    limit: 20
  });

  // Check permissions
  const canManage = [ROLES.ADMIN, ROLES.COORDINATOR].includes(user?.role);
  const canVerify = [ROLES.ADMIN, ROLES.COORDINATOR].includes(user?.role);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load teachers when filters change
  useEffect(() => {
    loadTeachers();
  }, [filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [teachersRes, departmentsRes] = await Promise.all([
        teachersAPI.getTeachers(filters),
        academicAPI.getDepartments()
      ]);

      setTeachers(teachersRes.teachers || []);
      setPagination({
        currentPage: teachersRes.pagination?.currentPage || 1,
        totalPages: teachersRes.pagination?.totalPages || 1,
        totalTeachers: teachersRes.pagination?.totalTeachers || 0
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

  const loadTeachers = async () => {
    try {
      setLoading(true);
      // Clean filters - remove empty strings to avoid sending them as query params
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );
      const response = await teachersAPI.getTeachers(cleanFilters);
      setTeachers(response.teachers || []);
      setPagination({
        currentPage: response.pagination?.currentPage || 1,
        totalPages: response.pagination?.totalPages || 1,
        totalTeachers: response.pagination?.totalTeachers || 0
      });
    } catch (error) {
      console.error('❌ Error loading teachers:', error);
      setMessage({
        type: 'danger',
        text: 'Error loading teachers'
      });
    } finally {
      setLoading(false);
    }
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else if (name === 'subjects') {
      // Handle subjects as comma-separated values
      const subjectsArray = value.split(',').map(s => s.trim()).filter(s => s);
      setFormData(prev => ({
        ...prev,
        subjects: subjectsArray
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    
    setAssignmentData(prev => ({
      ...prev,
      [name]: selectedOptions
    }));

    // Load related data when departments change
    if (name === 'departments' && selectedOptions.length > 0) {
      // Load sub-departments and batches for the first selected department
      loadSubDepartments(selectedOptions[0]);
      loadBatches(selectedOptions[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingTeacher) {
        await teachersAPI.updateTeacher(editingTeacher._id, formData);
        setMessage({ type: 'success', text: 'Teacher updated successfully!' });
      } else {
        await teachersAPI.createTeacher(formData);
        setMessage({ type: 'success', text: 'Teacher created successfully!' });
      }
      
      setShowModal(false);
      resetForm();
      loadTeachers();
    } catch (error) {
      console.error('❌ Error saving teacher:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error saving teacher'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await teachersAPI.updateTeacherAssignments(assigningTeacher._id, assignmentData);
      setMessage({ type: 'success', text: 'Teacher assignments updated successfully!' });
      setShowAssignmentModal(false);
      setAssigningTeacher(null);
      loadTeachers();
    } catch (error) {
      console.error('❌ Error updating assignments:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error updating assignments'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      fullName: teacher.user?.fullName || '',
      email: teacher.user?.email || '',
      phone: teacher.user?.phone || '',
      password: '', // Don't populate password for security
      employeeId: teacher.employeeId || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      experience: teacher.experience || '',
      joiningDate: teacher.joiningDate ? teacher.joiningDate.split('T')[0] : '',
      subjects: teacher.subjects || [],
      address: teacher.address || '',
      emergencyContact: teacher.emergencyContact || { name: '', phone: '', relation: '' },
      remarks: teacher.remarks || ''
    });
    setShowModal(true);
  };

  const handleAssign = (teacher) => {
    setAssigningTeacher(teacher);
    setAssignmentData({
      departments: teacher.departments?.map(d => d._id) || [],
      subDepartments: teacher.subDepartments?.map(sd => sd._id) || [],
      batches: teacher.batches?.map(b => b._id) || []
    });

    // Load sub-departments and batches if teacher has departments
    if (teacher.departments?.length > 0) {
      loadSubDepartments(teacher.departments[0]._id);
      loadBatches(teacher.departments[0]._id);
    }

    setShowAssignmentModal(true);
  };

  const handleVerify = async (teacherId) => {
    try {
      setLoading(true);
      await teachersAPI.verifyTeacher(teacherId);
      setMessage({ type: 'success', text: 'Teacher verified successfully!' });
      loadTeachers();
    } catch (error) {
      console.error('❌ Error verifying teacher:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error verifying teacher'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) {
      return;
    }

    try {
      setLoading(true);
      await teachersAPI.deleteTeacher(teacherId);
      setMessage({ type: 'success', text: 'Teacher deleted successfully!' });
      loadTeachers();
    } catch (error) {
      console.error('❌ Error deleting teacher:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error deleting teacher'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: '',
      qualification: '',
      specialization: '',
      experience: '',
      joiningDate: '',
      subjects: [],
      address: '',
      emergencyContact: { name: '', phone: '', relation: '' },
      remarks: ''
    });
    setEditingTeacher(null);
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
              <h2>👨‍🏫 Teacher Management</h2>
              <p className="text-muted mb-0">Manage teacher accounts and assignments</p>
            </div>
            {canManage && (
              <Button 
                variant="primary" 
                onClick={() => { resetForm(); setShowModal(true); }}
                disabled={loading}
              >
                ➕ Add Teacher
              </Button>
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
                      placeholder="Search by name, employee ID..."
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
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                      <option value="">All Status</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Verification</Form.Label>
                    <Form.Select
                      name="isVerified"
                      value={filters.isVerified}
                      onChange={handleFilterChange}
                    >
                      <option value="">All</option>
                      <option value="true">Verified</option>
                      <option value="false">Unverified</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <Button
                      variant="outline-secondary"
                      className="d-block"
                      onClick={loadTeachers}
                      disabled={loading}
                    >
                      🔄
                    </Button>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Teachers Table */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">📋 Teachers List</h6>
              <Badge bg="info">
                {pagination.totalTeachers || 0} Total Teachers
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No teachers found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Employee ID</th>
                        <th>Teacher Name</th>
                        <th>Qualification</th>
                        <th>Departments</th>
                        <th>Verification</th>
                        <th>Status</th>
                        {canManage && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map(teacher => (
                        <tr key={teacher._id}>
                          <td>
                            <strong>{teacher.employeeId}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{teacher.user?.fullName}</strong>
                              <br />
                              <small className="text-muted">
                                📧 {teacher.user?.email}
                                {teacher.user?.phone && ` | 📞 ${teacher.user?.phone}`}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              {teacher.qualification && (
                                <div>{teacher.qualification}</div>
                              )}
                              {teacher.specialization && (
                                <small className="text-muted">{teacher.specialization}</small>
                              )}
                              {teacher.experience && (
                                <small className="text-muted d-block">{teacher.experience} years exp.</small>
                              )}
                            </div>
                          </td>
                          <td>
                            {teacher.departments?.length > 0 ? (
                              teacher.departments.map(dept => (
                                <Badge key={dept._id} bg="primary" className="me-1">
                                  {dept.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted">Not assigned</span>
                            )}
                            {teacher.subDepartments?.length > 0 && (
                              <div className="mt-1">
                                {teacher.subDepartments.map(sd => (
                                  <Badge key={sd._id} bg="info" className="me-1">
                                    {sd.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {teacher.batches?.length > 0 && (
                              <div className="mt-1">
                                {teacher.batches.map(batch => (
                                  <Badge key={batch._id} bg="success" className="me-1">
                                    {batch.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge bg={teacher.isVerified ? 'success' : 'warning'}>
                              {teacher.isVerified ? '✅ Verified' : '⏳ Pending'}
                            </Badge>
                            {teacher.verifiedBy && (
                              <small className="d-block text-muted">
                                by {teacher.verifiedBy.fullName}
                              </small>
                            )}
                          </td>
                          <td>
                            <Badge 
                              bg={
                                teacher.status === 'active' ? 'success' :
                                teacher.status === 'inactive' ? 'danger' :
                                teacher.status === 'on_leave' ? 'warning' :
                                'secondary'
                              }
                            >
                              {teacher.status}
                            </Badge>
                          </td>
                          {canManage && (
                            <td>
                              <div className="d-flex gap-1 flex-wrap">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(teacher)}
                                  title="Edit teacher"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleAssign(teacher)}
                                  title="Manage assignments"
                                >
                                  📋
                                </Button>
                                {!teacher.isVerified && canVerify && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleVerify(teacher._id)}
                                    title="Verify teacher"
                                  >
                                    ✅
                                  </Button>
                                )}
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(teacher._id)}
                                  title="Delete teacher"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </td>
                          )}
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

      {/* Add/Edit Teacher Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTeacher ? '✏️ Edit Teacher' : '➕ Add New Teacher'}
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
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Employee ID *</Form.Label>
                      <Form.Control
                        type="text"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        required
                      />
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
                  {!editingTeacher && (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Password *</Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleFormChange}
                          required={!editingTeacher}
                        />
                      </Form.Group>
                    </Col>
                  )}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Joining Date</Form.Label>
                      <Form.Control
                        type="date"
                        name="joiningDate"
                        value={formData.joiningDate}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Professional Information Tab */}
              <Tab eventKey="professional" title="🎓 Professional Info">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Qualification</Form.Label>
                      <Form.Control
                        type="text"
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Specialization</Form.Label>
                      <Form.Control
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Experience (Years)</Form.Label>
                      <Form.Control
                        type="number"
                        name="experience"
                        value={formData.experience}
                        onChange={handleFormChange}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subjects (comma-separated)</Form.Label>
                      <Form.Control
                        type="text"
                        name="subjects"
                        value={formData.subjects.join(', ')}
                        onChange={handleFormChange}
                        placeholder="e.g. Mathematics, Physics, Chemistry"
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

              {/* Emergency Contact Tab */}
              <Tab eventKey="emergency" title="🚨 Emergency Contact">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="emergencyContact.name"
                        value={formData.emergencyContact.name}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="emergencyContact.phone"
                        value={formData.emergencyContact.phone}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Relation</Form.Label>
                      <Form.Control
                        type="text"
                        name="emergencyContact.relation"
                        value={formData.emergencyContact.relation}
                        onChange={handleFormChange}
                        placeholder="e.g. Spouse, Parent, Sibling"
                      />
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
                  {editingTeacher ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingTeacher ? 'Update Teacher' : 'Create Teacher'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Teacher Assignment Modal */}
      <Modal show={showAssignmentModal} onHide={() => setShowAssignmentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            📋 Manage Assignments - {assigningTeacher?.user?.fullName}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAssignmentSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Departments (Multiple allowed)</Form.Label>
                  <Form.Select
                    multiple
                    name="departments"
                    value={assignmentData.departments}
                    onChange={handleAssignmentChange}
                    size={4}
                  >
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Hold Ctrl/Cmd to select multiple departments
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sub-Departments (Multiple allowed)</Form.Label>
                  <Form.Select
                    multiple
                    name="subDepartments"
                    value={assignmentData.subDepartments}
                    onChange={handleAssignmentChange}
                    disabled={assignmentData.departments.length === 0}
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
                    value={assignmentData.batches}
                    onChange={handleAssignmentChange}
                    disabled={assignmentData.departments.length === 0}
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
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAssignmentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating...
                </>
              ) : (
                'Update Assignments'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TeacherManagement;