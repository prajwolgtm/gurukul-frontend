import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Table, 
  Modal, Badge, Alert, Spinner, Tabs, Tab 
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import { 
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getSubDepartments, createSubDepartment, updateSubDepartment, deleteSubDepartment,
  getBatches, createBatch, updateBatch, deleteBatch
} from '../api/departments';

// Standard options
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

const DepartmentManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showSubDeptModal, setShowSubDeptModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState(null);
  
  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', hodId: '' });
  const [subDeptForm, setSubDeptForm] = useState({ 
    name: '', code: '', department: '', description: '', coordinatorId: '' 
  });
  const [batchForm, setBatchForm] = useState({ 
    name: '', code: '', department: '', subDepartment: '', 
    academicYear: '', standard: '', maxStudents: '', classTeacherId: '' 
  });
  const [selectedBatch, setSelectedBatch] = useState(null);

  useEffect(() => {
    loadDepartments();
    loadSubDepartments();
    loadBatches();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getDepartments();
      if (response.success) {
        // Handle both response.data and response.departments
        setDepartments(response.departments || response.data || []);
      } else {
        setError(response.message || 'Failed to load departments');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      setError(error?.response?.data?.message || 'Failed to load departments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubDepartments = async () => {
    try {
      const response = await getSubDepartments();
      console.log('Sub-departments response:', response); // Debug log
      if (response.success) {
        setSubDepartments(response.subDepartments || response.data || []);
      } else {
        console.warn('Sub-departments response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading sub-departments:', error);
      console.error('Error details:', error?.response?.data || error.message);
      // Don't show error for sub-departments - it's not critical
    }
  };

  const loadBatches = async () => {
    try {
      const response = await getBatches();
      console.log('Batches response:', response); // Debug log
      if (response.success) {
        setBatches(response.batches || response.data || []);
      } else {
        console.warn('Batches response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      console.error('Error details:', error?.response?.data || error.message);
      // Don't show error for batches - it's not critical
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      // Prepare data - only include hodId if it's not empty
      const departmentData = {
        name: deptForm.name.trim(),
        code: deptForm.code.trim(),
        description: deptForm.description?.trim() || ''
      };
      
      // Only add hodId if it's provided and not empty
      if (deptForm.hodId && deptForm.hodId.toString().trim() !== '') {
        departmentData.hodId = deptForm.hodId;
      }
      
      const response = selectedDepartment 
        ? await updateDepartment(selectedDepartment.id || selectedDepartment._id, departmentData)
        : await createDepartment(departmentData);
      
      if (response.success) {
        setSuccess(selectedDepartment ? 'Department updated successfully!' : 'Department created successfully!');
        await loadDepartments(); // Reload data
        setDeptForm({ name: '', code: '', description: '', hodId: '' });
        setShowDeptModal(false);
        setShowEditDeptModal(false);
        setSelectedDepartment(null);
      } else {
        setError(response.message || 'Failed to save department');
      }
    } catch (error) {
      console.error('Error saving department:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to save department. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDepartment = (dept) => {
    setSelectedDepartment(dept);
    setDeptForm({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      hodId: dept.hod?._id || dept.hod || ''
    });
    setShowEditDeptModal(true);
  };

  const handleEditSubDepartment = (subDept) => {
    setSelectedSubDepartment(subDept);
    setSubDeptForm({
      name: subDept.name || '',
      code: subDept.code || '',
      department: subDept.department?._id || subDept.department || '',
      description: subDept.description || '',
      coordinatorId: subDept.coordinator?._id || subDept.coordinator || ''
    });
    setShowSubDeptModal(true);
  };

  const handleEditBatch = (batch) => {
    setSelectedBatch(batch);
    // Extract sub-department ID - handle both populated object and direct ID
    const subDeptId = batch.subDepartment?._id || batch.subDepartment || null;
    console.log('Editing batch - subDepartment:', batch.subDepartment, 'extracted ID:', subDeptId);
    setBatchForm({
      name: batch.name || '',
      code: batch.code || '',
      department: batch.department?._id || batch.department || '',
      subDepartment: subDeptId || '', // Use empty string for null to match form select
      academicYear: batch.academicYear || '',
      standard: batch.standard || '',
      maxStudents: batch.maxStudents || '',
      classTeacherId: batch.classTeacher?._id || batch.classTeacher || ''
    });
    setShowBatchModal(true);
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await deleteDepartment(deptId);
      if (response.success) {
        setSuccess('Department deleted successfully!');
        await loadDepartments();
      } else {
        setError(response.message || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      setError(error?.response?.data?.message || 'Failed to delete department. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const departmentId = batch.department?._id || batch.department;
      const batchId = batch.id || batch._id;
      
      if (!departmentId) {
        setError('Department ID is missing. Cannot delete batch.');
        setLoading(false);
        return;
      }
      
      const response = await deleteBatch(batchId, departmentId);
      if (response.success) {
        setSuccess('Batch deleted successfully!');
        await loadBatches();
        await loadDepartments();
      } else {
        setError(response.message || 'Failed to delete batch');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      setError(error?.response?.data?.message || 'Failed to delete batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    // Validate required fields
    if (!subDeptForm.department) {
      setError('Please select a department');
      setLoading(false);
      return;
    }
    
    try {
      // Prepare data - only include coordinatorId if it's not empty
      const subDeptData = {
        name: subDeptForm.name.trim(),
        code: subDeptForm.code.trim(),
        description: subDeptForm.description?.trim() || '',
        department: subDeptForm.department
      };
      
      // Only add coordinatorId if it's provided and not empty
      if (subDeptForm.coordinatorId && subDeptForm.coordinatorId.toString().trim() !== '') {
        subDeptData.coordinatorId = subDeptForm.coordinatorId;
      }
      
      const response = selectedSubDepartment 
        ? await updateSubDepartment(selectedSubDepartment.id || selectedSubDepartment._id, subDeptData)
        : await createSubDepartment(subDeptData);
      
      if (response.success) {
        setSuccess(selectedSubDepartment ? 'Sub-department updated successfully!' : 'Sub-department created successfully!');
        // Reload sub-departments first, then departments
        await loadSubDepartments();
        await loadDepartments(); // Reload departments
        setSubDeptForm({ name: '', code: '', department: '', description: '', coordinatorId: '' });
        setShowSubDeptModal(false);
        setSelectedSubDepartment(null);
      } else {
        setError(response.message || 'Failed to save sub-department');
      }
    } catch (error) {
      console.error('Error saving sub-department:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to save sub-department. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    // Validate required fields
    if (!batchForm.department) {
      setError('Please select a department');
      setLoading(false);
      return;
    }
    
    if (!batchForm.academicYear) {
      setError('Please enter an academic year');
      setLoading(false);
      return;
    }
    
    try {
      // Prepare data - use subDepartmentId for both create and update
      const batchData = {
        name: batchForm.name.trim(),
        code: batchForm.code.trim(),
        department: batchForm.department,
        academicYear: batchForm.academicYear.trim(),
        standard: batchForm.standard || undefined,
        maxStudents: batchForm.maxStudents ? parseInt(batchForm.maxStudents) : null // null = unlimited
      };
      
      // Handle subDepartmentId - always include when updating, optional when creating
      if (selectedBatch) {
        // When updating, always send subDepartmentId (even if null/empty to clear it)
        // Convert empty string, null, or undefined to null for backend
        const subDeptValue = (batchForm.subDepartment && batchForm.subDepartment.toString().trim() !== '') 
          ? batchForm.subDepartment.toString().trim()
          : null;
        batchData.subDepartmentId = subDeptValue;
        console.log('Updating batch - subDepartmentId:', subDeptValue, 'from form value:', batchForm.subDepartment, 'batchData:', batchData);
      } else {
        // When creating, only add if provided and not empty
      if (batchForm.subDepartment && batchForm.subDepartment.toString().trim() !== '') {
          batchData.subDepartmentId = batchForm.subDepartment.toString().trim();
        }
      }
      
      // Handle classTeacherId - always include when updating, optional when creating
      if (selectedBatch) {
        // When updating, always send classTeacherId (even if empty to clear it)
        batchData.classTeacherId = batchForm.classTeacherId && batchForm.classTeacherId.toString().trim() !== '' 
          ? batchForm.classTeacherId 
          : '';
      } else {
        // When creating, only add if provided and not empty
      if (batchForm.classTeacherId && batchForm.classTeacherId.toString().trim() !== '') {
        batchData.classTeacherId = batchForm.classTeacherId;
        }
      }
      
      const response = selectedBatch 
        ? await updateBatch(selectedBatch.id || selectedBatch._id, batchData)
        : await createBatch(batchData);
      
      if (response.success) {
        setSuccess(selectedBatch ? 'Batch updated successfully!' : 'Batch created successfully!');
        await loadBatches(); // Reload batches
        await loadDepartments(); // Reload departments
        setBatchForm({ name: '', code: '', department: '', subDepartment: '', academicYear: '', standard: '', maxStudents: '', classTeacherId: '' });
        setShowBatchModal(false);
        setSelectedBatch(null);
      } else {
        setError(response.message || 'Failed to save batch');
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to save batch. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canManageDepartments = user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL;
  const canManageSubDepartments = canManageDepartments || user?.role === ROLES.HOD;
  const canManageBatches = canManageSubDepartments;

  if (loading) {
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
          <h2>Department Management</h2>
          <p className="text-muted">Manage academic structure and organization</p>
        </Col>
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

      <Tabs defaultActiveKey="departments" className="mb-4">
        <Tab eventKey="departments" title="Departments">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Departments</span>
              {canManageDepartments && (
                <Button variant="primary" size="sm" onClick={() => {
                setDeptForm({ name: '', code: '', description: '', hodId: '' });
                setSelectedDepartment(null);
                setShowDeptModal(true);
              }}>
                  <i className="bi bi-plus-circle"></i> Add Department
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {departments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No departments found. Create your first department to get started.</p>
                </div>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>HOD</th>
                      <th>Students</th>
                      <th>Batches</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => (
                      <tr key={dept._id || dept.id}>
                        <td><Badge bg="primary">{dept.code}</Badge></td>
                        <td><strong>{dept.name}</strong></td>
                        <td>{dept.description || <span className="text-muted">-</span>}</td>
                        <td>
                          {dept.hod ? (
                            <span>{dept.hod.fullName || dept.hod}</span>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </td>
                        <td><Badge bg="info">{dept.totalStudents || 0}</Badge></td>
                        <td><Badge bg="secondary">{dept.totalBatches || 0}</Badge></td>
                        <td>
                          {canManageDepartments && (
                            <div className="btn-group btn-group-sm">
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => handleEditDepartment(dept)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                onClick={() => handleDeleteDepartment(dept.id || dept._id)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="subdepartments" title="Sub-Departments">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Sub-Departments</span>
              {canManageSubDepartments && (
                <Button variant="primary" size="sm" onClick={() => {
                  setSubDeptForm({ name: '', code: '', department: '', description: '', coordinatorId: '' });
                  setSelectedSubDepartment(null);
                  setShowSubDeptModal(true);
                }}>
                  <i className="bi bi-plus-circle"></i> Add Sub-Department
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {subDepartments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No sub-departments found. Create your first sub-department to get started.</p>
                </div>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Coordinator</th>
                      <th>Students</th>
                      <th>Batches</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subDepartments.map(subDept => (
                      <tr key={subDept._id || subDept.id}>
                        <td><Badge bg="success">{subDept.code}</Badge></td>
                        <td><strong>{subDept.name}</strong></td>
                        <td>
                          {subDept.department ? (
                            <Badge bg="primary">
                              {subDept.department.name || subDept.department} ({subDept.department.code || ''})
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {subDept.coordinator ? (
                            <span>{subDept.coordinator.fullName || subDept.coordinator}</span>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </td>
                        <td><Badge bg="info">{subDept.totalStudents || 0}</Badge></td>
                        <td><Badge bg="secondary">{subDept.totalBatches || 0}</Badge></td>
                        <td>
                          {canManageSubDepartments && (
                            <div className="btn-group btn-group-sm">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleEditSubDepartment(subDept)}
                              >
                                Edit
                              </Button>
                              <Button variant="outline-danger" size="sm">Delete</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="batches" title="Batches">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Batches</span>
              {canManageBatches && (
                <Button variant="primary" size="sm" onClick={() => {
                  setBatchForm({ name: '', code: '', department: '', subDepartment: '', academicYear: '', standard: '', maxStudents: '', classTeacherId: '' });
                  setSelectedBatch(null);
                  setShowBatchModal(true);
                }}>
                  <i className="bi bi-plus-circle"></i> Add Batch
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {batches.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No batches found. Create your first batch to get started.</p>
                </div>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Sub-Dept</th>
                      <th>Academic Year</th>
                      <th>Standard</th>
                      <th>Students</th>
                      <th>Class Teacher</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(batch => (
                      <tr key={batch._id || batch.id}>
                        <td><Badge bg="warning">{batch.code}</Badge></td>
                        <td><strong>{batch.name}</strong></td>
                        <td>
                          {batch.department ? (
                            <Badge bg="primary">
                              {batch.department.name || batch.department} ({batch.department.code || ''})
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {batch.subDepartment ? (
                            <Badge bg="success">
                              {batch.subDepartment.name || batch.subDepartment} ({batch.subDepartment.code || ''})
                            </Badge>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>{batch.academicYear}</td>
                        <td><Badge bg="info">{batch.standard || 'N/A'}</Badge></td>
                        <td>
                          <Badge bg="info">
                            {batch.currentStudentCount || 0} {batch.maxStudents ? `/ ${batch.maxStudents}` : '(Unlimited)'}
                          </Badge>
                        </td>
                        <td>
                          {batch.classTeacher ? (
                            <span>{batch.classTeacher.fullName || batch.classTeacher}</span>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </td>
                        <td>
                          {canManageBatches && (
                            <div className="btn-group btn-group-sm">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleEditBatch(batch)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDeleteBatch(batch)}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Add Department Modal */}
      <Modal show={showDeptModal} onHide={() => { 
        setShowDeptModal(false); 
        setDeptForm({ name: '', code: '', description: '', hodId: '' }); 
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Add Department</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDeptSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                placeholder="e.g., Rigveda Department"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Code *</Form.Label>
              <Form.Control
                type="text"
                value={deptForm.code}
                onChange={(e) => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})}
                placeholder="e.g., RIG"
                required
                maxLength={10}
              />
              <Form.Text className="text-muted">Code will be automatically converted to uppercase</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={deptForm.description}
                onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
                placeholder="Optional description of the department"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { 
              setShowDeptModal(false); 
              setDeptForm({ name: '', code: '', description: '', hodId: '' }); 
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal show={showEditDeptModal} onHide={() => { 
        setShowEditDeptModal(false); 
        setSelectedDepartment(null);
        setDeptForm({ name: '', code: '', description: '', hodId: '' }); 
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Department: {selectedDepartment?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleDeptSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm({...deptForm, name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Department Code *</Form.Label>
              <Form.Control
                type="text"
                value={deptForm.code}
                onChange={(e) => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})}
                required
                maxLength={10}
              />
              <Form.Text className="text-muted">Code will be automatically converted to uppercase</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={deptForm.description}
                onChange={(e) => setDeptForm({...deptForm, description: e.target.value})}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { 
              setShowEditDeptModal(false); 
              setSelectedDepartment(null);
              setDeptForm({ name: '', code: '', description: '', hodId: '' }); 
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Sub-Department Modal */}
      <Modal show={showSubDeptModal} onHide={() => { 
        setShowSubDeptModal(false); 
        setSubDeptForm({ name: '', code: '', department: '', description: '', coordinatorId: '' }); 
        setSelectedSubDepartment(null);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedSubDepartment ? 'Edit' : 'Add'} Sub-Department</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubDeptSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Parent Department *</Form.Label>
              <Form.Select
                value={subDeptForm.department}
                onChange={(e) => setSubDeptForm({...subDeptForm, department: e.target.value})}
                required
                disabled={!!selectedSubDepartment}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id || dept.id} value={dept._id || dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </Form.Select>
              {selectedSubDepartment && (
                <Form.Text className="text-muted">Department cannot be changed after creation</Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sub-Department Name *</Form.Label>
              <Form.Control
                type="text"
                value={subDeptForm.name}
                onChange={(e) => setSubDeptForm({...subDeptForm, name: e.target.value})}
                placeholder="e.g., Prathama Section"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sub-Department Code *</Form.Label>
              <Form.Control
                type="text"
                value={subDeptForm.code}
                onChange={(e) => setSubDeptForm({...subDeptForm, code: e.target.value.toUpperCase()})}
                placeholder="e.g., PRATHAMA"
                required
                maxLength={10}
              />
              <Form.Text className="text-muted">Code will be automatically converted to uppercase</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={subDeptForm.description}
                onChange={(e) => setSubDeptForm({...subDeptForm, description: e.target.value})}
                placeholder="Optional description of the sub-department"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { 
              setShowSubDeptModal(false); 
              setSubDeptForm({ name: '', code: '', department: '', description: '', coordinatorId: '' }); 
              setSelectedSubDepartment(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (selectedSubDepartment ? 'Updating...' : 'Creating...') : (selectedSubDepartment ? 'Update' : 'Create')} Sub-Department
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Batch Modal */}
      <Modal show={showBatchModal} onHide={() => { 
        setShowBatchModal(false); 
        setBatchForm({ name: '', code: '', department: '', subDepartment: '', academicYear: '', standard: '', maxStudents: '', classTeacherId: '' }); 
        setSelectedBatch(null);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedBatch ? 'Edit' : 'Add'} Batch</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBatchSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Department *</Form.Label>
              <Form.Select
                value={batchForm.department}
                onChange={(e) => {
                  setBatchForm({...batchForm, department: e.target.value, subDepartment: ''});
                }}
                required
                disabled={!!selectedBatch}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept._id || dept.id} value={dept._id || dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </Form.Select>
              {selectedBatch && (
                <Form.Text className="text-muted">Department cannot be changed after creation</Form.Text>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sub-Department (Optional)</Form.Label>
              <Form.Select
                value={batchForm.subDepartment}
                onChange={(e) => setBatchForm({...batchForm, subDepartment: e.target.value})}
                disabled={!batchForm.department}
              >
                <option value="">None - Department level batch</option>
                {batchForm.department && subDepartments
                  .filter(subDept => {
                    const deptId = subDept.department?._id || subDept.department;
                    return deptId === batchForm.department || deptId?.toString() === batchForm.department;
                  })
                  .map(subDept => (
                    <option key={subDept._id || subDept.id} value={subDept._id || subDept.id}>
                      {subDept.name} ({subDept.code})
                    </option>
                  ))}
              </Form.Select>
              {!batchForm.department && (
                <Form.Text className="text-muted">Please select a department first</Form.Text>
              )}
              {batchForm.department && subDepartments.filter(subDept => {
                const deptId = subDept.department?._id || subDept.department;
                return deptId === batchForm.department || deptId?.toString() === batchForm.department;
              }).length === 0 && (
                <Form.Text className="text-muted">No sub-departments available for this department</Form.Text>
              )}
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Batch Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={batchForm.name}
                    onChange={(e) => setBatchForm({...batchForm, name: e.target.value})}
                    placeholder="e.g., First Year Batch"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Batch Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={batchForm.code}
                    onChange={(e) => setBatchForm({...batchForm, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., FY2024"
                    required
                    maxLength={20}
                  />
                  <Form.Text className="text-muted">Code will be automatically converted to uppercase</Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Sub-Department (Optional)</Form.Label>
              <Form.Select
                value={batchForm.subDepartment}
                onChange={(e) => setBatchForm({...batchForm, subDepartment: e.target.value})}
                disabled={!batchForm.department}
              >
                <option value="">None (Batch belongs to department only)</option>
                {batchForm.department && subDepartments
                  .filter(subDept => (subDept.department?._id || subDept.department) === batchForm.department)
                  .map(subDept => (
                    <option key={subDept._id || subDept.id} value={subDept._id || subDept.id}>
                      {subDept.name} ({subDept.code})
                    </option>
                  ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Select a sub-department if this batch belongs to a specific sub-department. Leave empty if the batch belongs to the department only.
              </Form.Text>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Academic Year *</Form.Label>
                  <Form.Control
                    type="text"
                    value={batchForm.academicYear}
                    onChange={(e) => setBatchForm({...batchForm, academicYear: e.target.value})}
                    placeholder="e.g., 2024-2025"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Standard</Form.Label>
                  <Form.Select
                    name="standard"
                    value={batchForm.standard}
                    onChange={(e) => setBatchForm({...batchForm, standard: e.target.value})}
                  >
                    <option value="">Select Standard (Optional)</option>
                    {STANDARD_OPTIONS.map(standard => (
                      <option key={standard} value={standard}>
                        {standard}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Select the standard/class level for this batch (for classification only)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Max Students (Optional)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={batchForm.maxStudents}
                onChange={(e) => setBatchForm({...batchForm, maxStudents: e.target.value ? parseInt(e.target.value) : ''})}
                placeholder="Leave empty for unlimited"
              />
              <Form.Text className="text-muted">Maximum number of students allowed in this batch. Leave empty for unlimited students.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { 
              setShowBatchModal(false); 
              setBatchForm({ name: '', code: '', department: '', subDepartment: '', academicYear: '', standard: '', maxStudents: '', classTeacherId: '' }); 
              setSelectedBatch(null);
            }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (selectedBatch ? 'Updating...' : 'Creating...') : (selectedBatch ? 'Update' : 'Create')} Batch
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DepartmentManagement;
