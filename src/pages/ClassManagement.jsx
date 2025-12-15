import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal, Badge,
  Alert, Spinner, Tabs, Tab, InputGroup, ListGroup, Dropdown
} from 'react-bootstrap';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import api from '../api/client';
import { examsAPI } from '../api/exams';
import academicAPI from '../api/academic';
import { getCurrentAcademicYear, getAcademicYearList } from '../api/academicYear';
// Removed old attendance imports - using simplified API

const ClassManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  // Filters and search
  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    academicYear: '',
    status: 'active',
    myClasses: user?.role === ROLES.TEACHER ? 'true' : 'false',
    showAllYears: 'false'
  });
  
  // Academic year
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  // Academic data
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Student selection - exactly like exam management

  // Modals
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  
  // Simplified attendance marking state
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { studentId: 'present' | 'absent' | 'late' }
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceType, setAttendanceType] = useState('normal'); // 'normal', 'teacher-leave', 'school-holiday'
  const [teacherNotes, setTeacherNotes] = useState('');
  const [existingAttendance, setExistingAttendance] = useState(null); // Track if editing existing attendance
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);

  // Form data - simplified like exam creation
  const [classForm, setClassForm] = useState({
    className: '',
    subject: '',
    description: '',
    // Student selection - same as exam
    selectionType: 'department',
    targetDepartment: '',
    targetSubDepartments: [],
    targetBatches: [],
    customStudents: [],
    // Class-specific fields
    schedule: {
      dayOfWeek: [],
      startTime: '',
      endTime: '',
      duration: 0,
      room: '',
      building: ''
    },
    academicInfo: {
      academicYear: '',
      semester: 1,
      term: 'annual'
    },
    classTeacher: ''
  });

  useEffect(() => {
    const initialize = async () => {
      await loadAcademicYearData();
      await loadInitialData();
    };
    initialize();
  }, []);

  useEffect(() => {
    if (academicYears.length > 0) {
    loadClasses();
    }
  }, [filters, academicYears.length]);

  // Load sub-departments when department changes
  useEffect(() => {
    if (classForm.targetDepartment) {
      loadSubDepartments(classForm.targetDepartment);
      loadBatches(classForm.targetDepartment);
    } else {
      setSubDepartments([]);
      setBatches([]);
    }
  }, [classForm.targetDepartment]);

  const loadAcademicYearData = async () => {
    try {
      // Load current academic year
      const currentYearResponse = await getCurrentAcademicYear();
      if (currentYearResponse.success) {
        const currentYear = currentYearResponse.data.academicYear;
        setCurrentAcademicYear(currentYear);
        setFilters(prev => ({ ...prev, academicYear: currentYear }));
        // Set default in class form
        setClassForm(prev => ({
          ...prev,
          academicInfo: { ...prev.academicInfo, academicYear: currentYear }
        }));
      }
      
      // Load academic year list
      const yearsResponse = await getAcademicYearList(5, 2);
      if (yearsResponse.success) {
        setAcademicYears(yearsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading academic year data:', error);
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      
      // If showAllYears is false and academicYear is set, use it; otherwise show all
      if (filters.showAllYears === 'false' && filters.academicYear) {
        params.academicYear = filters.academicYear;
      } else if (filters.showAllYears === 'true') {
        params.showAllYears = 'true';
      }
      
      const response = await api.get('/classes', { params });
      if (response.data.success) {
        setClasses(response.data.data.classes);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to load classes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data - same as exam management
  const loadInitialData = async () => {
    try {
      const [subjectsRes, departmentsRes] = await Promise.all([
        examsAPI.getSubjects(),
        academicAPI.getDepartments()
      ]);

      setSubjects(subjectsRes.subjects || []);
      setDepartments(departmentsRes.departments || []);
      
      // Load teachers - use different endpoint based on user role
      try {
        let teacherRes;
        if (user?.role === ROLES.ADMIN || user?.role === ROLES.COORDINATOR) {
          // Admin/Coordinator can use all-accounts endpoint
          teacherRes = await api.get('/account-management/all-accounts?role=Teacher&status=verified');
          if (teacherRes.data.success) {
            setTeachers(teacherRes.data.accounts || []);
          }
        } else {
          // Other roles (including teachers) use teachers endpoint
          teacherRes = await api.get('/teachers?status=active&isVerified=true&limit=100');
          if (teacherRes.data.success) {
            // Transform teacher data to match expected format
            const teachersList = teacherRes.data.teachers || teacherRes.data.data?.teachers || teacherRes.data.data || [];
            setTeachers(teachersList.map(teacher => ({
              _id: teacher._id || teacher.user?._id,
              user: teacher.user,
              fullName: teacher.user?.fullName || teacher.fullName || teacher.personalInfo?.fullName,
              personalInfo: teacher.personalInfo || teacher.user?.personalInfo,
              email: teacher.user?.email || teacher.email
            })));
          }
        }
      } catch (teacherError) {
        console.warn('⚠️ Could not load teachers:', teacherError.message);
        // Don't fail the whole page if teachers can't be loaded
        setTeachers([]);
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setError('Error loading data. Please refresh the page.');
    }
  };

  // Load sub-departments - same as exam management
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

  // Load batches - same as exam management
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
  

  const handleClassFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'targetSubDepartments' || name === 'targetBatches') {
      // Handle multi-select
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      setClassForm(prev => ({
        ...prev,
        [name]: selected
      }));
    } else if (name === 'selectionType') {
      // Reset selection when type changes
      setClassForm(prev => ({
        ...prev,
        selectionType: value,
        targetDepartment: '',
        targetSubDepartments: [],
        targetBatches: [],
        customStudents: []
      }));
    } else if (name === 'dayOfWeek') {
      // Handle day checkboxes
      const days = classForm.schedule.dayOfWeek.includes(value)
        ? classForm.schedule.dayOfWeek.filter(d => d !== value)
        : [...classForm.schedule.dayOfWeek, value];
      setClassForm(prev => ({
        ...prev,
        schedule: { ...prev.schedule, dayOfWeek: days }
      }));
    } else if (name.startsWith('schedule.')) {
      // Handle schedule fields
      const field = name.split('.')[1];
      setClassForm(prev => ({
        ...prev,
        schedule: { ...prev.schedule, [field]: value }
      }));
    } else if (name.startsWith('academicInfo.')) {
      // Handle academic info fields
      const field = name.split('.')[1];
      setClassForm(prev => ({
        ...prev,
        academicInfo: { ...prev.academicInfo, [field]: value }
      }));
    } else {
      setClassForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare class data - same structure as exam
      const classData = {
        className: classForm.className,
        subject: classForm.subject,
        description: classForm.description,
        // Student selection - same as exam (backend will fetch students based on these)
        selectionType: classForm.selectionType,
        department: classForm.selectionType === 'department' ? classForm.targetDepartment : 
                    (classForm.selectionType === 'subDepartment' || classForm.selectionType === 'batch') ? classForm.targetDepartment : undefined,
        subDepartments: classForm.selectionType === 'subDepartment' ? classForm.targetSubDepartments : undefined,
        batches: classForm.selectionType === 'batch' ? classForm.targetBatches : undefined,
        customStudents: classForm.selectionType === 'custom' ? classForm.customStudents : undefined,
        // Class-specific fields
        schedule: classForm.schedule,
        academicInfo: classForm.academicInfo,
        classTeacher: classForm.classTeacher || user.id,
        createdBy: user.id
      };
      
      console.log('📤 Sending class creation data:', {
        selectionType: classData.selectionType,
        department: classData.department,
        subDepartments: classData.subDepartments,
        batches: classData.batches
      });
      
      // Validate selection criteria
      if (classForm.selectionType === 'department' && !classForm.targetDepartment) {
        setError('Please select a department');
        setLoading(false);
        return;
      }
      if (classForm.selectionType === 'subDepartment' && (!classForm.targetDepartment || !classForm.targetSubDepartments || classForm.targetSubDepartments.length === 0)) {
        setError('Please select a department and at least one sub-department');
        setLoading(false);
        return;
      }
      if (classForm.selectionType === 'batch' && (!classForm.targetDepartment || !classForm.targetBatches || classForm.targetBatches.length === 0)) {
        setError('Please select a department and at least one batch');
        setLoading(false);
        return;
      }
      
      const response = await api.post('/classes', classData);
      if (response.data.success) {
        const studentCount = response.data.data?.class?.students?.length || 0;
        setSuccess(`Class created successfully with ${studentCount} student(s)!`);
        setShowCreateClass(false);
        resetForm();
        loadClasses();
      } else {
        setError(response.data.message || 'Failed to create class');
      }
    } catch (error) {
      setError('Failed to create class: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare class data - same structure as create
      const classData = {
        className: classForm.className,
        subject: classForm.subject,
        description: classForm.description,
        // Student selection - same as exam (backend will fetch students based on these)
        selectionType: classForm.selectionType,
        department: classForm.selectionType === 'department' ? classForm.targetDepartment : 
                    (classForm.selectionType === 'subDepartment' || classForm.selectionType === 'batch') ? classForm.targetDepartment : undefined,
        subDepartments: classForm.selectionType === 'subDepartment' ? classForm.targetSubDepartments : undefined,
        batches: classForm.selectionType === 'batch' ? classForm.targetBatches : undefined,
        customStudents: classForm.selectionType === 'custom' ? classForm.customStudents : undefined,
        // Class-specific fields
        schedule: classForm.schedule,
        academicInfo: classForm.academicInfo,
        classTeacher: classForm.classTeacher || user.id,
        updatedBy: user.id
      };
      
      console.log('📤 Sending class update data:', {
        selectionType: classData.selectionType,
        department: classData.department,
        subDepartments: classData.subDepartments,
        batches: classData.batches
      });
      
      // Validate selection criteria
      if (classForm.selectionType === 'department' && !classForm.targetDepartment) {
        setError('Please select a department');
        setLoading(false);
        return;
      }
      if (classForm.selectionType === 'subDepartment' && (!classForm.targetDepartment || !classForm.targetSubDepartments || classForm.targetSubDepartments.length === 0)) {
        setError('Please select a department and at least one sub-department');
        setLoading(false);
        return;
      }
      if (classForm.selectionType === 'batch' && (!classForm.targetDepartment || !classForm.targetBatches || classForm.targetBatches.length === 0)) {
        setError('Please select a department and at least one batch');
        setLoading(false);
        return;
      }
      
      const response = await api.put(`/classes/${selectedClass._id}`, classData);
      if (response.data.success) {
        const studentCount = response.data.data?.class?.students?.length || 0;
        setSuccess(`Class updated successfully with ${studentCount} student(s)!`);
        setShowEditClass(false);
        resetForm();
        loadClasses();
      } else {
        setError(response.data.message || 'Failed to update class');
      }
    } catch (error) {
      setError('Failed to update class: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    
    setLoading(true);
    try {
      const response = await api.delete(`/classes/${classId}`);
      if (response.data.success) {
        setSuccess('Class deleted successfully!');
        loadClasses();
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('Failed to delete class: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setClassForm({
      className: '',
      subject: '',
      description: '',
      selectionType: 'department',
      targetDepartment: '',
      targetSubDepartments: [],
      targetBatches: [],
      customStudents: [],
      schedule: {
        dayOfWeek: [],
        startTime: '',
        endTime: '',
        duration: 0,
        room: '',
        building: ''
      },
      academicInfo: {
        academicYear: '2024-2025',
        semester: 1,
        term: 'annual'
      },
      classTeacher: ''
    });
    setSubDepartments([]);
    setBatches([]);
  };

  const openEditModal = (classData) => {
    setSelectedClass(classData);
    
    // Extract department ID - could be ObjectId or string
    const deptId = classData.department?._id || classData.department || classData.targetDepartment || '';
    
    // Extract schedule - handle both old and new formats
    const schedule = classData.schedule || {};
    const scheduleDayOfWeek = schedule.dayOfWeek || schedule.days || [];
    
    setClassForm({
      className: classData.className || '',
      subject: classData.subject?._id || classData.subject?.name || classData.subject || '',
      description: classData.description || '',
      selectionType: classData.selectionType || 'department',
      targetDepartment: deptId.toString(),
      targetSubDepartments: classData.subDepartments?.map(d => d._id || d) || classData.targetSubDepartments || [],
      targetBatches: classData.batches?.map(b => b._id || b) || classData.targetBatches || [],
      customStudents: classData.customStudents || [],
      schedule: {
        dayOfWeek: Array.isArray(scheduleDayOfWeek) ? scheduleDayOfWeek : [],
        startTime: schedule.startTime || schedule.sessionStartTime || '',
        endTime: schedule.endTime || schedule.sessionEndTime || '',
        duration: schedule.duration || 0,
        room: schedule.room || schedule.venue?.room || '',
        building: schedule.building || schedule.venue?.building || ''
      },
      academicInfo: classData.academicInfo || {
        academicYear: '2024-2025',
        semester: 1,
        term: 'annual'
      },
      classTeacher: classData.classTeacher?._id || classData.classTeacher || ''
    });
    
    // Load sub-departments and batches if department is set
    if (deptId) {
      loadSubDepartments(deptId.toString());
      loadBatches(deptId.toString());
    }
    
    setShowEditClass(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      completed: 'primary',
      cancelled: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  // Check if user can mark attendance for a class
  const canMarkAttendance = (classItem) => {
    if (!classItem) return false;
    const classTeacherId = classItem.classTeacher?._id || classItem.classTeacher;
    return (
      user?.role === ROLES.ADMIN ||
      user?.role === ROLES.COORDINATOR ||
      user?.role === ROLES.PRINCIPAL ||
      user?.role === ROLES.HOD ||
      classTeacherId === user?.id
    );
  };

  // Handle mark attendance button click - simplified
  const handleMarkAttendanceClick = async (classItem) => {
    setSelectedClass(classItem);
    setLoading(true);
    try {
      // Load class details with students
      const classResponse = await api.get(`/classes/${classItem._id}`);
      if (classResponse.data.success) {
        const classData = classResponse.data.data?.class || classResponse.data.data || classItem;
        
        // Get students from class
        let students = [];
        if (classData.students && classData.students.length > 0) {
          students = classData.students
            .filter(s => (s.status === 'active' || !s.status))
            .map(s => {
              const student = s.student || s;
              return {
                _id: student._id || student,
                fullName: student.fullName || student.personalInfo?.fullName || 'Unknown',
                admissionNo: student.admissionNo || student.studentId || 'N/A'
              };
            });
        }
        
        setClassStudents(students);
        
        // Initialize attendance data - default all to 'present' (only for normal type)
        if (students.length > 0) {
          const initialAttendance = {};
          students.forEach(student => {
            initialAttendance[student._id] = 'present';
          });
          setAttendanceData(initialAttendance);
        }
        
        // Reset form
        setAttendanceDate(new Date().toISOString().split('T')[0]);
        setAttendanceType('normal');
        setTeacherNotes('');
        setExistingAttendance(null);
        setIsEditingAttendance(false);
        
        setShowMarkAttendance(true);
      }
    } catch (error) {
      setError('Failed to load class data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark attendance - simplified
  const handleMarkAttendance = async () => {
    if (!selectedClass) return;
    
    setLoading(true);
    try {
      // Prepare attendance data
      const attendanceDataArray = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status
      }));
      
      const requestData = {
        classId: selectedClass._id,
        date: attendanceDate,
        attendanceType,
        teacherNotes: teacherNotes || undefined,
        attendanceData: attendanceType === 'normal' ? attendanceDataArray : undefined
      };
      
      const response = await api.post('/class-attendance/mark', requestData);
      
      if (response.data.success) {
        const typeLabel = attendanceType === 'normal' ? 'Normal class' : 
                         attendanceType === 'teacher-leave' ? 'Teacher leave' : 'School holiday';
        const actionLabel = response.data.data?.isUpdate ? 'updated' : 'marked';
        setSuccess(`${typeLabel} attendance ${actionLabel} successfully!`);
        setShowMarkAttendance(false);
        setAttendanceData({});
        setTeacherNotes('');
        setExistingAttendance(null);
        setIsEditingAttendance(false);
        loadClasses();
      } else {
        setError(response.data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      setError('Failed to mark attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading && classes.length === 0) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Class Management</h2>
          <p className="text-muted">Manage classes, assignments, and schedules</p>
        </Col>
        <Col xs="auto">
          {(user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || user?.role === ROLES.HOD) && (
            <Button variant="primary" onClick={() => setShowCreateClass(true)}>
              Create New Class
            </Button>
          )}
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
        <Tab eventKey="list" title="Classes List">
          <Card>
            <Card.Header>
              <Row>
                <Col md={3}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search classes..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={filters.subject}
                    onChange={(e) => setFilters({...filters, subject: e.target.value})}
                  >
                    <option value="">All Subjects</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Sanskrit">Sanskrit</option>
                    <option value="Vedic Studies">Vedic Studies</option>
                    <option value="Philosophy">Philosophy</option>
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="completed">Completed</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={filters.showAllYears === 'true' ? 'all' : filters.academicYear}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        setFilters({...filters, showAllYears: 'true', academicYear: ''});
                      } else {
                        setFilters({...filters, showAllYears: 'false', academicYear: e.target.value});
                      }
                    }}
                  >
                    <option value="all">Show All Years</option>
                    {academicYears.map(year => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                {user?.role !== ROLES.TEACHER && (
                  <Col md={2}>
                    <Form.Check
                      type="checkbox"
                      label="My Classes Only"
                      checked={filters.myClasses === 'true'}
                      onChange={(e) => setFilters({...filters, myClasses: e.target.checked ? 'true' : 'false'})}
                    />
                  </Col>
                )}
              </Row>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" /> Loading classes...
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center text-muted">
                  <p>No classes found</p>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Students</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((classItem) => (
                      <tr key={classItem._id}>
                        <td>
                          <strong>{classItem.className}</strong>
                          {classItem.description && (
                            <div className="text-muted small">{classItem.description}</div>
                          )}
                        </td>
                        <td>{classItem.subject}</td>
                        <td>
                          {classItem.classTeacher?.personalInfo?.fullName || classItem.classTeacher?.fullName || 'Not assigned'}
                          {classItem.additionalTeachers?.length > 0 && (
                            <div className="text-muted small">
                              +{classItem.additionalTeachers.length} more
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge bg="info">{classItem.students?.length || 0} students</Badge>
                        </td>
                        <td>
                          {classItem.schedule?.dayOfWeek?.length > 0 || classItem.schedule?.days?.length > 0 ? (
                            <div>
                              <div>{(classItem.schedule.dayOfWeek || classItem.schedule.days || []).join(', ')}</div>
                              <div className="text-muted small">
                                {classItem.schedule.startTime || classItem.schedule.sessionStartTime || ''} - {classItem.schedule.endTime || classItem.schedule.sessionEndTime || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Not scheduled</span>
                          )}
                        </td>
                        <td>{getStatusBadge(classItem.status)}</td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" size="sm">
                              Actions
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={async () => {
                                setLoading(true);
                                try {
                                  // Fetch full class details with populated students
                                  const response = await api.get(`/classes/${classItem._id}`);
                                  if (response.data.success) {
                                    setSelectedClass(response.data.data?.class || response.data.data || classItem);
                                    setShowClassDetails(true);
                                  } else {
                                    setError('Failed to load class details');
                                  }
                                } catch (error) {
                                  setError('Failed to load class details: ' + error.message);
                                  // Fallback to using classItem if fetch fails
                                setSelectedClass(classItem);
                                setShowClassDetails(true);
                                } finally {
                                  setLoading(false);
                                }
                              }}>
                                View Details
                              </Dropdown.Item>
                              {canMarkAttendance(classItem) && (
                                <>
                                  <Dropdown.Item onClick={() => handleMarkAttendanceClick(classItem)}>
                                    📝 Mark Attendance
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                </>
                              )}
                              {(user?.role === ROLES.ADMIN || user?.role === ROLES.PRINCIPAL || 
                                user?.role === ROLES.HOD || classItem.classTeacher?._id === user?.id) && (
                                <>
                                  <Dropdown.Item onClick={() => openEditModal(classItem)}>
                                    Edit Class
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item 
                                    className="text-danger"
                                    onClick={() => handleDeleteClass(classItem._id)}
                                  >
                                    Delete Class
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="schedule" title="Schedule View">
          <Card>
            <Card.Header>
              <h5>Weekly Schedule</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center text-muted">
                <p>Schedule view will be implemented here</p>
                <p>This will show a weekly calendar view of all classes</p>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Create Class Modal */}
      <Modal show={showCreateClass} onHide={() => setShowCreateClass(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Class</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateClass}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Class Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={classForm.className}
                    onChange={(e) => setClassForm({...classForm, className: e.target.value})}
                    placeholder="e.g. Advanced Sanskrit, Vedic Studies Level 1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject *</Form.Label>
                  {subjects.length > 0 ? (
                    <>
                  <Form.Select
                    name="subject"
                    value={classForm.subject}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setClassForm({...classForm, subject: '__custom__'});
                      } else {
                        handleClassFormChange(e);
                      }
                    }}
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject.name}>
                            {subject.name} {subject.code ? `(${subject.code})` : ''} {subject.category ? `- ${subject.category}` : ''}
                      </option>
                    ))}
                    <option value="__custom__">+ Add Custom Subject</option>
                  </Form.Select>
                  {classForm.subject === '__custom__' && (
                    <Form.Control
                      type="text"
                      className="mt-2"
                      placeholder="Enter custom subject name"
                          value={classForm.subject === '__custom__' ? '' : classForm.subject}
                      onChange={(e) => setClassForm({...classForm, subject: e.target.value})}
                          required
                        />
                      )}
                    </>
                  ) : (
                    <Form.Control
                      type="text"
                      value={classForm.subject}
                      onChange={(e) => setClassForm({...classForm, subject: e.target.value})}
                      placeholder="Enter subject name"
                      required
                    />
                  )}
                  <Form.Text className="text-muted">
                    {subjects.length === 0 && 'No subjects found. Enter a custom subject name.'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={classForm.description}
                onChange={(e) => setClassForm({...classForm, description: e.target.value})}
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Academic Year *</Form.Label>
                  <Form.Select
                    name="academicInfo.academicYear"
                    value={classForm.academicInfo.academicYear}
                    onChange={handleClassFormChange}
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Semester</Form.Label>
                  <Form.Select
                    name="academicInfo.semester"
                    value={classForm.academicInfo.semester}
                    onChange={handleClassFormChange}
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h6 className="mb-3">📅 Schedule & Timing</h6>
            <Form.Group className="mb-3">
              <Form.Label>Days of Week *</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <Form.Check
                    key={day}
                    type="checkbox"
                    id={`day-${day}`}
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                    checked={classForm.schedule.dayOfWeek.includes(day)}
                    value={day}
                    name="dayOfWeek"
                    onChange={handleClassFormChange}
                  />
                ))}
              </div>
            </Form.Group>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="time"
                    name="schedule.startTime"
                    value={classForm.schedule.startTime}
                    onChange={(e) => {
                      handleClassFormChange(e);
                      // Calculate duration
                      const startTime = e.target.value;
                      const endTime = classForm.schedule.endTime;
                      if (startTime && endTime) {
                        const [sh, sm] = startTime.split(':').map(Number);
                        const [eh, em] = endTime.split(':').map(Number);
                        const duration = (eh * 60 + em) - (sh * 60 + sm);
                        setClassForm(prev => ({
                          ...prev,
                          schedule: {...prev.schedule, duration: duration > 0 ? duration : 0}
                        }));
                      }
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="time"
                    name="schedule.endTime"
                    value={classForm.schedule.endTime}
                    onChange={(e) => {
                      handleClassFormChange(e);
                      // Calculate duration
                      const endTime = e.target.value;
                      const startTime = classForm.schedule.startTime;
                      if (startTime && endTime) {
                        const [sh, sm] = startTime.split(':').map(Number);
                        const [eh, em] = endTime.split(':').map(Number);
                        const duration = (eh * 60 + em) - (sh * 60 + sm);
                        setClassForm(prev => ({
                          ...prev,
                          schedule: {...prev.schedule, duration: duration > 0 ? duration : 0}
                        }));
                      }
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    value={classForm.schedule.duration || ''}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h6 className="mb-3">📍 Venue</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Room / Hall</Form.Label>
                  <Form.Control
                    type="text"
                    name="schedule.room"
                    value={classForm.schedule.room}
                    onChange={handleClassFormChange}
                    placeholder="e.g. Room 101, Hall A"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Building</Form.Label>
                  <Form.Control
                    type="text"
                    name="schedule.building"
                    value={classForm.schedule.building}
                    onChange={handleClassFormChange}
                    placeholder="e.g. Main Building, Block A"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <hr />
            <h6 className="mb-3">👥 Student Selection</h6>
            <Form.Group className="mb-3">
              <Form.Label>Selection Type *</Form.Label>
              <Form.Select
                name="selectionType"
                value={classForm.selectionType}
                onChange={handleClassFormChange}
                required
              >
                <option value="department">Entire Department</option>
                <option value="subDepartment">Sub-Department(s)</option>
                <option value="batch">Batch(es)</option>
                <option value="custom">Custom Student Selection</option>
              </Form.Select>
            </Form.Group>

            {classForm.selectionType === 'department' && (
              <Form.Group className="mb-3">
                <Form.Label>Department *</Form.Label>
                <Form.Select
                  name="targetDepartment"
                  value={classForm.targetDepartment}
                  onChange={handleClassFormChange}
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
            )}

            {classForm.selectionType === 'subDepartment' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="targetDepartment"
                    value={classForm.targetDepartment}
                    onChange={handleClassFormChange}
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
                <Form.Group className="mb-3">
                  <Form.Label>Sub-Departments *</Form.Label>
                  <Form.Select
                    multiple
                    name="targetSubDepartments"
                    value={classForm.targetSubDepartments}
                    onChange={handleClassFormChange}
                    disabled={!classForm.targetDepartment}
                    size={4}
                    required
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
              </>
            )}
            
            {classForm.selectionType === 'batch' && (
              <>
            <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="targetDepartment"
                    value={classForm.targetDepartment}
                    onChange={handleClassFormChange}
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
                <Form.Group className="mb-3">
                  <Form.Label>Batches *</Form.Label>
                  <Form.Select
                    multiple
                    name="targetBatches"
                    value={classForm.targetBatches}
                    onChange={handleClassFormChange}
                    disabled={!classForm.targetDepartment}
                    size={4}
                    required
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
              </>
            )}

            {classForm.selectionType === 'custom' && (
              <Form.Group className="mb-3">
                <Form.Label>Custom Students</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Custom student selection will be implemented with a student picker component"
                  disabled
                />
              <Form.Text className="text-muted">
                  Custom student selection feature coming soon
                </Form.Text>
              </Form.Group>
            )}

            <hr />
            <h6 className="mb-3">👨‍🏫 Teacher Assignment</h6>
            <Form.Group className="mb-3">
              <Form.Label>Class Teacher *</Form.Label>
              <Form.Select
                name="classTeacher"
                value={classForm.classTeacher || (user?.role === ROLES.TEACHER ? user.id : '')}
                onChange={handleClassFormChange}
                required
                disabled={user?.role === ROLES.TEACHER}
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => {
                  const teacherId = teacher._id || teacher.user?._id || teacher.id;
                  const teacherName = teacher.user?.fullName || teacher.fullName || teacher.personalInfo?.fullName || teacher.email;
                  return (
                    <option key={teacherId} value={teacherId}>
                      {teacherName}
                    </option>
                  );
                })}
              </Form.Select>
              <Form.Text className="text-muted">
                {user?.role === ROLES.TEACHER 
                  ? 'You will be assigned as the class teacher.'
                  : 'The main teacher responsible for this class. They can take attendance and manage the class.'}
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateClass(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Class Modal */}
      <Modal show={showEditClass} onHide={() => setShowEditClass(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Class</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateClass}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Class Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="className"
                    value={classForm.className}
                    onChange={handleClassFormChange}
                    placeholder="e.g. Advanced Sanskrit, Vedic Studies Level 1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject *</Form.Label>
                  {subjects.length > 0 ? (
                    <>
                      <Form.Select
                        name="subject"
                        value={classForm.subject}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setClassForm({...classForm, subject: '__custom__'});
                          } else {
                            handleClassFormChange(e);
                          }
                        }}
                        required
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subject => (
                          <option key={subject._id} value={subject.name}>
                            {subject.name} {subject.code ? `(${subject.code})` : ''} {subject.category ? `- ${subject.category}` : ''}
                          </option>
                        ))}
                        <option value="__custom__">+ Add Custom Subject</option>
                      </Form.Select>
                      {classForm.subject === '__custom__' && (
                  <Form.Control
                    type="text"
                          className="mt-2"
                          placeholder="Enter custom subject name"
                          value={classForm.subject === '__custom__' ? '' : classForm.subject}
                    onChange={(e) => setClassForm({...classForm, subject: e.target.value})}
                    required
                  />
                      )}
                    </>
                  ) : (
                    <Form.Control
                      type="text"
                      name="subject"
                      value={classForm.subject}
                      onChange={handleClassFormChange}
                      placeholder="Enter subject name"
                      required
                    />
                  )}
                  <Form.Text className="text-muted">
                    {subjects.length === 0 && 'No subjects found. Enter a custom subject name.'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={classForm.description}
                onChange={handleClassFormChange}
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Academic Year *</Form.Label>
              <Form.Select
                    name="academicInfo.academicYear"
                    value={classForm.academicInfo.academicYear}
                    onChange={handleClassFormChange}
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Semester</Form.Label>
              <Form.Select
                    name="academicInfo.semester"
                    value={classForm.academicInfo.semester}
                    onChange={handleClassFormChange}
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
              </Form.Select>
                </Form.Group>
            </Col>
          </Row>

            <hr />
            <h6 className="mb-3">📅 Schedule & Timing</h6>
            <Form.Group className="mb-3">
              <Form.Label>Days of Week *</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <Form.Check
                    key={day}
                  type="checkbox"
                    id={`edit-day-${day}`}
                    label={day.charAt(0).toUpperCase() + day.slice(1)}
                    checked={classForm.schedule.dayOfWeek.includes(day)}
                    value={day}
                    name="dayOfWeek"
                    onChange={handleClassFormChange}
                  />
                ))}
              </div>
            </Form.Group>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Time *</Form.Label>
                  <Form.Control
                    type="time"
                    name="schedule.startTime"
                    value={classForm.schedule.startTime}
                    onChange={(e) => {
                      handleClassFormChange(e);
                      // Calculate duration
                      const startTime = e.target.value;
                      const endTime = classForm.schedule.endTime;
                      if (startTime && endTime) {
                        const [sh, sm] = startTime.split(':').map(Number);
                        const [eh, em] = endTime.split(':').map(Number);
                        const duration = (eh * 60 + em) - (sh * 60 + sm);
                        setClassForm(prev => ({
                          ...prev,
                          schedule: {...prev.schedule, duration: duration > 0 ? duration : 0}
                        }));
                      }
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>End Time *</Form.Label>
                  <Form.Control
                    type="time"
                    name="schedule.endTime"
                    value={classForm.schedule.endTime}
                  onChange={(e) => {
                      handleClassFormChange(e);
                      // Calculate duration
                      const endTime = e.target.value;
                      const startTime = classForm.schedule.startTime;
                      if (startTime && endTime) {
                        const [sh, sm] = startTime.split(':').map(Number);
                        const [eh, em] = endTime.split(':').map(Number);
                        const duration = (eh * 60 + em) - (sh * 60 + sm);
                        setClassForm(prev => ({
                          ...prev,
                          schedule: {...prev.schedule, duration: duration > 0 ? duration : 0}
                        }));
                      }
                    }}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Duration (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    value={classForm.schedule.duration || ''}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />
            <h6 className="mb-3">📍 Venue</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Room / Hall</Form.Label>
                  <Form.Control
                    type="text"
                    name="schedule.room"
                    value={classForm.schedule.room}
                    onChange={handleClassFormChange}
                    placeholder="e.g. Room 101, Hall A"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Building</Form.Label>
                  <Form.Control
                    type="text"
                    name="schedule.building"
                    value={classForm.schedule.building}
                    onChange={handleClassFormChange}
                    placeholder="e.g. Main Building, Block A"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <hr />
            <h6 className="mb-3">👥 Student Selection</h6>
            <Form.Group className="mb-3">
              <Form.Label>Selection Type *</Form.Label>
              <Form.Select
                name="selectionType"
                value={classForm.selectionType}
                onChange={handleClassFormChange}
                required
              >
                <option value="department">Entire Department</option>
                <option value="subDepartment">Sub-Department(s)</option>
                <option value="batch">Batch(es)</option>
                <option value="custom">Custom Student Selection</option>
              </Form.Select>
            </Form.Group>

            {classForm.selectionType === 'department' && (
              <Form.Group className="mb-3">
                <Form.Label>Department *</Form.Label>
                <Form.Select
                  name="targetDepartment"
                  value={classForm.targetDepartment}
                  onChange={handleClassFormChange}
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
            )}

            {classForm.selectionType === 'subDepartment' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="targetDepartment"
                    value={classForm.targetDepartment}
                    onChange={handleClassFormChange}
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
                <Form.Group className="mb-3">
                  <Form.Label>Sub-Departments *</Form.Label>
                  <Form.Select
                    multiple
                    name="targetSubDepartments"
                    value={classForm.targetSubDepartments}
                    onChange={handleClassFormChange}
                    disabled={!classForm.targetDepartment}
                    size={4}
                    required
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
              </>
            )}

            {classForm.selectionType === 'batch' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="targetDepartment"
                    value={classForm.targetDepartment}
                    onChange={handleClassFormChange}
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
                <Form.Group className="mb-3">
                  <Form.Label>Batches *</Form.Label>
                  <Form.Select
                    multiple
                    name="targetBatches"
                    value={classForm.targetBatches}
                    onChange={handleClassFormChange}
                    disabled={!classForm.targetDepartment}
                    size={4}
                    required
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
              </>
            )}

            {classForm.selectionType === 'custom' && (
              <Form.Group className="mb-3">
                <Form.Label>Custom Students</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Custom student selection will be implemented with a student picker component"
                  disabled
                />
                <Form.Text className="text-muted">
                  Custom student selection feature coming soon
                </Form.Text>
              </Form.Group>
            )}

            <hr />
            <h6 className="mb-3">👨‍🏫 Teacher Assignment</h6>
            <Form.Group className="mb-3">
              <Form.Label>Class Teacher *</Form.Label>
              <Form.Select
                name="classTeacher"
                value={classForm.classTeacher || (user?.role === ROLES.TEACHER ? user.id : '')}
                onChange={handleClassFormChange}
                required
                disabled={user?.role === ROLES.TEACHER}
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => {
                  const teacherId = teacher._id || teacher.user?._id || teacher.id;
                  const teacherName = teacher.user?.fullName || teacher.fullName || teacher.personalInfo?.fullName || teacher.email;
                  return (
                    <option key={teacherId} value={teacherId}>
                      {teacherName}
                    </option>
                  );
                })}
              </Form.Select>
              <Form.Text className="text-muted">
                {user?.role === ROLES.TEACHER 
                  ? 'You will be assigned as the class teacher.'
                  : 'The main teacher responsible for this class. They can take attendance and manage the class.'}
              </Form.Text>
            </Form.Group>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditClass(false)}>
            Cancel
          </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Class'}
          </Button>
        </Modal.Footer>
        </Form>
      </Modal>


      {/* Class Details Modal */}
      <Modal show={showClassDetails} onHide={() => setShowClassDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedClass?.className}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClass && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Class Information</h6>
                  <p><strong>Subject:</strong> {selectedClass.subject}</p>
                  <p><strong>Description:</strong> {selectedClass.description || 'No description'}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedClass.status)}</p>
                  <p><strong>Academic Year:</strong> {selectedClass.academicInfo?.academicYear}</p>
                </Col>
                <Col md={6}>
                  <h6>Schedule</h6>
                  {selectedClass.schedule?.startTime || selectedClass.schedule?.sessionStartTime ? (
                    <div>
                      <p><strong>Time:</strong> {selectedClass.schedule.startTime || selectedClass.schedule.sessionStartTime} - {selectedClass.schedule.endTime || selectedClass.schedule.sessionEndTime}</p>
                      <p><strong>Days:</strong> {(selectedClass.schedule.dayOfWeek || selectedClass.schedule.days || []).join(', ') || 'Not set'}</p>
                      <p><strong>Room:</strong> {selectedClass.schedule.room || selectedClass.schedule.venue?.room || 'Not set'}</p>
                      <p><strong>Building:</strong> {selectedClass.schedule.building || selectedClass.schedule.venue?.building || 'Not set'}</p>
                    </div>
                  ) : (
                    <p className="text-muted">No schedule set</p>
                  )}
                </Col>
              </Row>
              
              <hr />
              
              <h6>Students ({selectedClass.students?.length || 0})</h6>
              {selectedClass.students?.length > 0 ? (
                <ListGroup>
                  {selectedClass.students.slice(0, 10).map((studentInfo, index) => {
                    const student = studentInfo.student || studentInfo;
                    const studentName = student?.fullName || 
                                       student?.personalInfo?.fullName || 
                                       (typeof student === 'object' && student !== null ? 'Unknown Student' : 'Unknown Student');
                    const admissionNo = student?.admissionNo || 
                                      student?.studentId || 
                                      (studentInfo?.admissionNo || studentInfo?.studentId || 'N/A');
                    
                    return (
                      <ListGroup.Item key={student?._id || studentInfo?.student?._id || index} className="d-flex justify-content-between">
                        <span>{studentName}</span>
                        <Badge bg="secondary">{admissionNo}</Badge>
                    </ListGroup.Item>
                    );
                  })}
                  {selectedClass.students.length > 10 && (
                    <ListGroup.Item className="text-center text-muted">
                      ... and {selectedClass.students.length - 10} more students
                    </ListGroup.Item>
                  )}
                </ListGroup>
              ) : (
                <p className="text-muted">No students enrolled</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClassDetails(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mark Attendance Modal - Simplified */}
      <Modal show={showMarkAttendance} onHide={() => setShowMarkAttendance(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {isEditingAttendance ? '✏️ Edit Attendance' : '📝 Mark Attendance'} - {selectedClass?.className}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleMarkAttendance(); }}>
          <Modal.Body>
            {isEditingAttendance && (
              <Alert variant="warning" className="mb-3">
                <strong>⚠️ Editing Existing Attendance:</strong> Attendance for this date already exists. Changes will update the existing record.
              </Alert>
            )}
            <Alert variant="info" className="mb-3">
              <strong>Class:</strong> {selectedClass?.className} | 
              <strong className="ms-2">Students:</strong> {classStudents.length}
            </Alert>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={attendanceDate}
                    onChange={async (e) => {
                      const selectedDate = e.target.value;
                      setAttendanceDate(selectedDate);
                      
                      // Check if attendance already exists for this date
                      if (selectedDate && selectedClass?._id) {
                        try {
                          const checkResponse = await api.get(`/class-attendance/class/${selectedClass._id}`, {
                            params: {
                              startDate: selectedDate,
                              endDate: selectedDate,
                              limit: 1
                            }
                          });
                          
                          if (checkResponse.data.success && checkResponse.data.data?.attendance?.length > 0) {
                            const existing = checkResponse.data.data.attendance[0];
                            setExistingAttendance(existing);
                            setIsEditingAttendance(true);
                            
                            // Load existing data
                            if (existing.sessionStatus === 'completed') {
                              setAttendanceType('normal');
                              // Load student attendance
                              const existingAttendanceData = {};
                              if (existing.attendance && existing.attendance.length > 0) {
                                existing.attendance.forEach(att => {
                                  const studentId = att.student?._id || att.student;
                                  if (studentId) {
                                    existingAttendanceData[studentId] = att.status || 'absent';
                                  }
                                });
                              }
                              // Fill in missing students as absent
                              classStudents.forEach(student => {
                                if (!existingAttendanceData[student._id]) {
                                  existingAttendanceData[student._id] = 'absent';
                                }
                              });
                              setAttendanceData(existingAttendanceData);
                            } else if (existing.sessionStatus === 'teacher-leave') {
                              setAttendanceType('teacher-leave');
                              setAttendanceData({});
                            } else if (existing.sessionStatus === 'holiday') {
                              setAttendanceType('school-holiday');
                              setAttendanceData({});
                            }
                            
                            setTeacherNotes(existing.sessionNotes?.teacherNotes || '');
                            setSuccess('Found existing attendance for this date. You can edit it.');
                          } else {
                            setExistingAttendance(null);
                            setIsEditingAttendance(false);
                            // Reset to defaults
                            const initialAttendance = {};
                            classStudents.forEach(student => {
                              initialAttendance[student._id] = 'present';
                            });
                            setAttendanceData(initialAttendance);
                            setAttendanceType('normal');
                            setTeacherNotes('');
                          }
                        } catch (error) {
                          console.log('Could not check existing attendance:', error);
                          setExistingAttendance(null);
                          setIsEditingAttendance(false);
                        }
                      }
                    }}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Attendance Type *</Form.Label>
                  <Form.Select
                    value={attendanceType}
                    onChange={(e) => {
                      setAttendanceType(e.target.value);
                      // Reset attendance data when changing type
                      if (e.target.value !== 'normal') {
                        setAttendanceData({});
                      } else {
                        // Re-initialize for normal type
                        const initialAttendance = {};
                        classStudents.forEach(student => {
                          initialAttendance[student._id] = 'present';
                        });
                        setAttendanceData(initialAttendance);
                      }
                    }}
                    required
                  >
                    <option value="normal">📚 Normal Class</option>
                    <option value="teacher-leave">👨‍🏫 Teacher on Leave</option>
                    <option value="school-holiday">🏫 School Holiday</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {attendanceType === 'teacher-leave' && 'This day will NOT count in class conducted count'}
                    {attendanceType === 'school-holiday' && 'This day will NOT count in class conducted count'}
                    {attendanceType === 'normal' && 'Mark individual student attendance'}
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {attendanceType === 'normal' && classStudents.length > 0 && (
              <>
                <hr />
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6>Student Attendance</h6>
                    <div>
                      <Button
                        type="button"
                        variant="outline-success"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          const allPresent = {};
                          classStudents.forEach(student => {
                            allPresent[student._id] = 'present';
                          });
                          setAttendanceData(allPresent);
                        }}
                      >
                        Mark All Present
                      </Button>
                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          const allAbsent = {};
                          classStudents.forEach(student => {
                            allAbsent[student._id] = 'absent';
                          });
                          setAttendanceData(allAbsent);
                        }}
                      >
                        Mark All Absent
                      </Button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px' }}>
                    <Table striped hover size="sm">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Admission No</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student) => (
                          <tr key={student._id}>
                            <td><strong>{student.fullName}</strong></td>
                            <td>{student.admissionNo}</td>
                            <td>
                              <Form.Select
                                size="sm"
                                value={attendanceData[student._id] || 'present'}
                                onChange={(e) => {
                                  setAttendanceData({
                                    ...attendanceData,
                                    [student._id]: e.target.value
                                  });
                                }}
                                required
                              >
                                <option value="present">✅ Present</option>
                                <option value="absent">❌ Absent</option>
                                <option value="late">⏰ Late</option>
                              </Form.Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>

                <div className="mb-3">
                  <Badge bg="success" className="me-2">
                    Present: {Object.values(attendanceData).filter(s => s === 'present').length}
                  </Badge>
                  <Badge bg="danger" className="me-2">
                    Absent: {Object.values(attendanceData).filter(s => s === 'absent').length}
                  </Badge>
                  <Badge bg="warning">
                    Late: {Object.values(attendanceData).filter(s => s === 'late').length}
                  </Badge>
                </div>
              </>
            )}

            <hr />
            <Form.Group className="mb-3">
              <Form.Label>Teacher Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="Add notes about today's class (optional)"
              />
              <Form.Text className="text-muted">
                Teacher can add notes about the class, topics covered, or any observations
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMarkAttendance(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading || (attendanceType === 'normal' && Object.keys(attendanceData).length === 0)}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Marking...
                </>
              ) : (
                '💾 Mark Attendance'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ClassManagement;
