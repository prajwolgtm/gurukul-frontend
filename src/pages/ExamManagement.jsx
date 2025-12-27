import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Table, Modal,
  Badge, Alert, Spinner, Tabs, Tab, Pagination, ListGroup
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { ROLES } from '../utils/roles';
import examsAPI, { examMarksAPI } from '../api/exams';
import academicAPI from '../api/academic';
import AcademicYearFilter from '../components/AcademicYearFilter';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subDepartments, setSubDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form states
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSubjectsListModal, setShowSubjectsListModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [showMarksEntryModal, setShowMarksEntryModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [examMarks, setExamMarks] = useState([]);
  const [marksFormData, setMarksFormData] = useState({
    isPresent: true,
    absentReason: '',
    subjectMarks: [],
    remarks: '',
    teacherRemarks: ''
  });
  
  // Helper to initialize division marks
  const initializeDivisionMarks = () => {
    return Array.from({ length: 10 }, (_, i) => ({
      divisionName: `Division ${i + 1}`,
      marksObtained: 0,
      maxMarks: 10
    }));
  };

  const [examFormData, setExamFormData] = useState({
    name: '',
    description: '',
    examType: 'unit',
    examDate: '',
    startTime: '',
    endTime: '',
    duration: 180,
    selectionType: 'department',
    targetDepartment: '',
    targetSubDepartments: [],
    targetBatches: [],
    targetStandards: [],
    customStudents: [],
    subjects: [],
    instructions: '',
    venue: '',
    remarks: '',
    useDivisions: false
  });

  const [subjectFormData, setSubjectFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'theory',
    credits: 1
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    examType: '',
    status: '',
    academicYear: null, // Will be set to current year by AcademicYearFilter
    page: 1,
    limit: 20
  });

  // Check permissions
  const canManage = user?.role !== ROLES.PARENT;
  const canCreate = user?.role !== ROLES.PARENT;
  const canDelete = [ROLES.ADMIN, ROLES.COORDINATOR].includes(user?.role);

  const loadInitialData = useCallback(async () => {
    try {
      const [subjectsRes, departmentsRes] = await Promise.all([
        examsAPI.getSubjects(),
        academicAPI.getDepartments()
      ]);

      setSubjects(subjectsRes.subjects || []);
      setDepartments(departmentsRes.departments || []);
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      setMessage({
        type: 'danger',
        text: 'Error loading data. Please refresh the page.'
      });
    }
  }, []);

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      // Add academic year filter if selected
      if (filters.academicYear && filters.academicYear !== 'all' && filters.academicYear !== '') {
        params.academicYear = filters.academicYear;
        params.showAllYears = 'false';
      } else if (filters.academicYear === '' || filters.academicYear === 'all') {
        params.showAllYears = 'true';
      } else {
        params.showAllYears = 'false';
      }
      const response = await examsAPI.getExams(params);
      setExams(response.exams || []);
      setPagination({
        currentPage: response.page || 1,
        totalPages: response.pages || 1,
        totalExams: response.total || 0
      });
    } catch (error) {
      console.error('❌ Error loading exams:', error);
      setMessage({
        type: 'danger',
        text: 'Error loading exams'
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load exams when filters change
  useEffect(() => {
    loadExams();
  }, [loadExams]);

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

  const loadEligibleStudents = async (examId) => {
    try {
      const response = await examsAPI.getExam(examId);
      setEligibleStudents(response.eligibleStudents || []);
      setSelectedExam(response.exam);
    } catch (error) {
      console.error('❌ Error loading eligible students:', error);
      setEligibleStudents([]);
    }
  };

  const loadExamMarks = async (examId) => {
    try {
      const response = await examMarksAPI.getExamMarks(examId);
      setExamMarks(response.examMarks || []);
    } catch (error) {
      console.error('❌ Error loading exam marks:', error);
      setExamMarks([]);
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

  const handleExamFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'targetSubDepartments' || name === 'targetBatches' || name === 'targetDepartments' || name === 'targetStandards' || name === 'customStudents') {
      // Handle multiple select
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      
      // Special handling for "All Departments" option
      if (name === 'targetDepartments') {
        if (selectedOptions.includes('__all__')) {
          // If "All Departments" is selected, clear other selections and keep only __all__
          setExamFormData(prev => ({
            ...prev,
            targetDepartments: ['__all__']
          }));
        } else {
          // If specific departments are selected, remove __all__ if it exists
          const filteredOptions = selectedOptions.filter(opt => opt !== '__all__');
          setExamFormData(prev => ({
            ...prev,
            targetDepartments: filteredOptions.length > 0 ? filteredOptions : selectedOptions
          }));
        }
      } else {
        setExamFormData(prev => ({
          ...prev,
          [name]: selectedOptions
        }));
      }
    } else if (name === 'subjects') {
      // Handle subjects array
      setExamFormData(prev => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => ({
          subject: option.value,
          maxMarks: 100,
          passingMarks: 40,
          weightage: 1,
          useDivisions: prev.useDivisions || false,
          divisions: prev.useDivisions 
            ? Array.from({ length: 10 }, (_, i) => ({
                name: `Division ${i + 1}`,
                maxMarks: 10,
                order: i + 1
              }))
            : []
        }));
        return {
          ...prev,
          subjects: selectedOptions
        };
      });
    } else if (name === 'useDivisions') {
      // Handle division checkbox
      const useDivisions = checked;
      setExamFormData(prev => ({
        ...prev,
        useDivisions,
        subjects: prev.subjects.map(subj => ({
          ...subj,
          useDivisions,
          divisions: useDivisions 
            ? Array.from({ length: 10 }, (_, i) => ({
                name: `Division ${i + 1}`,
                maxMarks: 10,
                order: i + 1
              }))
            : []
        }))
      }));
    } else {
      setExamFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Load related data when selection type or department changes
    if (name === 'selectionType') {
      setExamFormData(prev => ({
        ...prev,
        targetDepartment: '',
        targetSubDepartments: [],
        targetBatches: [],
        targetStandards: [],
        customStudents: []
      }));
    }

    if (name === 'targetDepartment') {
      loadSubDepartments(value);
      loadBatches(value);
      setExamFormData(prev => ({
        ...prev,
        targetSubDepartments: [],
        targetBatches: []
      }));
    }
  };

  const handleSubjectFormChange = (e) => {
    const { name, value } = e.target;
    setSubjectFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare exam data
      const examData = {
        ...examFormData,
        // Map selection type to correct field names
        examScope: examFormData.selectionType,
        selectionType: examFormData.selectionType,
        department: examFormData.selectionType === 'department' ? examFormData.targetDepartment : undefined,
        subDepartments: examFormData.selectionType === 'subDepartment' ? examFormData.targetSubDepartments : undefined,
        batches: examFormData.selectionType === 'batch' ? examFormData.targetBatches : undefined,
        targetStandards: examFormData.selectionType === 'standard' ? examFormData.targetStandards : undefined,
        customStudents: examFormData.selectionType === 'custom' ? examFormData.customStudents : undefined,
        // Include division configuration (fixed 1-10 divisions)
        useDivisions: examFormData.useDivisions || false,
        divisions: examFormData.useDivisions 
          ? Array.from({ length: 10 }, (_, i) => ({
              name: `Division ${i + 1}`,
              maxMarks: 10,
              order: i + 1
            }))
          : [],
        // Include multiple departments if selected
        targetDepartments: examFormData.selectionType === 'department' && examFormData.targetDepartments?.length > 0 
          ? examFormData.targetDepartments 
          : undefined
      };
      
      if (editingExam) {
        await examsAPI.updateExam(editingExam._id, examData);
        setMessage({ type: 'success', text: 'Exam updated successfully!' });
      } else {
        await examsAPI.createExam(examData);
        setMessage({ type: 'success', text: 'Exam created successfully!' });
      }
      
      setShowExamModal(false);
      resetExamForm();
      loadExams();
    } catch (error) {
      console.error('❌ Error saving exam:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error saving exam'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await examsAPI.createSubject(subjectFormData);
      setMessage({ type: 'success', text: 'Subject created successfully!' });
      setShowSubjectModal(false);
      resetSubjectForm();
      
      // Reload subjects
      const response = await examsAPI.getSubjects();
      setSubjects(response.subjects || []);
    } catch (error) {
      console.error('❌ Error creating subject:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error creating subject'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await examsAPI.deleteSubject(subjectId);
      setMessage({ type: 'success', text: 'Subject deleted successfully!' });
      
      // Reload all subjects (including inactive) for the subjects list modal
      const allSubjectsResponse = await examsAPI.getSubjects({ includeInactive: true });
      setSubjects(allSubjectsResponse.subjects || []);
    } catch (error) {
      console.error('❌ Error deleting subject:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error deleting subject'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    // Check if any subject uses divisions
    const firstSubject = exam.subjects?.[0];
    const useDivisions = firstSubject?.useDivisions || false;
    
    setExamFormData({
      name: exam.name || '',
      description: exam.description || '',
      examType: exam.examType || 'unit',
      examDate: exam.examDate ? exam.examDate.split('T')[0] : '',
      startTime: exam.startTime || '',
      endTime: exam.endTime || '',
      duration: exam.duration || 180,
      selectionType: exam.examScope || exam.selectionType || 'department',
      targetDepartment: exam.department?._id || '',
      targetSubDepartments: exam.subDepartments?.map(sd => sd._id) || exam.targetSubDepartments?.map(sd => sd._id || sd) || [],
      targetBatches: exam.batches?.map(b => b._id) || exam.targetBatches?.map(b => b._id || b) || [],
      targetStandards: exam.targetStandards || [],
      customStudents: exam.customStudents?.map(s => s._id) || [],
      subjects: exam.subjects || [],
      instructions: exam.instructions || '',
      venue: exam.venue || '',
      remarks: exam.remarks || '',
      useDivisions
    });

    // Load related data
    if (exam.department?._id) {
      loadSubDepartments(exam.department._id);
      loadBatches(exam.department._id);
    }

    setShowExamModal(true);
  };

  const handleStatusChange = async (examId, newStatus) => {
    try {
      setLoading(true);
      await examsAPI.updateExam(examId, { status: newStatus });
      setMessage({ 
        type: 'success', 
        text: `Exam status changed to ${newStatus} successfully!` 
      });
      loadExams(); // Reload exams to reflect the change
    } catch (error) {
      console.error('❌ Error updating exam status:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error updating exam status'
      });
      // Reload exams to revert the UI change
      loadExams();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }

    try {
      setLoading(true);
      await examsAPI.deleteExam(examId);
      setMessage({ type: 'success', text: 'Exam deleted successfully!' });
      loadExams();
    } catch (error) {
      console.error('❌ Error deleting exam:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error deleting exam'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageMarks = async (exam) => {
    setSelectedExam(exam);
    await loadEligibleStudents(exam._id);
    await loadExamMarks(exam._id);
    setShowMarksModal(true);
  };

  const handleEnterMarks = (student) => {
    setSelectedStudent(student);
    
    // Check if marks already exist for this student
    const existingMarks = examMarks.find(m => m.student._id === student._id);
    
    if (existingMarks) {
      // Pre-fill form with existing marks
      setMarksFormData({
        isPresent: existingMarks.isPresent !== false,
        absentReason: existingMarks.absentReason || '',
        subjectMarks: existingMarks.subjectMarks.map(sm => {
          const examSubject = selectedExam?.subjects?.find(s => 
            (s.subject._id || s.subject).toString() === (sm.subject._id || sm.subject).toString()
          );
          const useDivisions = examSubject?.useDivisions || false;
          
          return {
            subject: sm.subject._id || sm.subject,
            marksObtained: sm.marksObtained,
            maxMarks: sm.maxMarks,
            useDivisions,
            divisionMarks: useDivisions && sm.divisionMarks && sm.divisionMarks.length > 0
              ? sm.divisionMarks
              : useDivisions ? initializeDivisionMarks() : []
          };
        }),
        remarks: existingMarks.remarks || '',
        teacherRemarks: existingMarks.teacherRemarks || ''
      });
    } else {
      // Initialize with exam subjects
      const initialSubjectMarks = selectedExam?.subjects?.map(subj => {
        const useDivisions = subj.useDivisions || false;
        return {
          subject: subj.subject._id || subj.subject,
          marksObtained: 0,
          maxMarks: subj.maxMarks || 100,
          useDivisions,
          divisionMarks: useDivisions ? initializeDivisionMarks() : []
        };
      }) || [];
      
      setMarksFormData({
        isPresent: true,
        absentReason: '',
        subjectMarks: initialSubjectMarks,
        remarks: '',
        teacherRemarks: ''
      });
    }
    
    setShowMarksEntryModal(true);
  };

  const handleMarksFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('subject_')) {
      const subjectId = name.split('_')[1];
      const marksValue = parseFloat(value) || 0;
      
      setMarksFormData(prev => ({
        ...prev,
        subjectMarks: prev.subjectMarks.map(sm => 
          sm.subject === subjectId || sm.subject._id === subjectId
            ? { ...sm, marksObtained: marksValue }
            : sm
        )
      }));
    } else if (name.startsWith('division_')) {
      // Handle division marks: format is division_subjectId_divisionIndex
      const parts = name.split('_');
      const subjectId = parts[1];
      const divisionIndex = parseInt(parts[2]);
      const marksValue = parseFloat(value) || 0;
      
      setMarksFormData(prev => ({
        ...prev,
        subjectMarks: prev.subjectMarks.map(sm => {
          if ((sm.subject === subjectId || sm.subject._id === subjectId) && sm.useDivisions) {
            const newDivisionMarks = [...(sm.divisionMarks || [])];
            if (newDivisionMarks[divisionIndex]) {
              newDivisionMarks[divisionIndex] = {
                ...newDivisionMarks[divisionIndex],
                marksObtained: marksValue
              };
              // Auto-calculate total marks from divisions
              const totalMarks = newDivisionMarks.reduce((sum, div) => sum + (div.marksObtained || 0), 0);
              return {
                ...sm,
                divisionMarks: newDivisionMarks,
                marksObtained: totalMarks
              };
            }
          }
          return sm;
        })
      }));
    } else {
      setMarksFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedStudent) return;

    try {
      setLoading(true);
      
      // Prepare subject marks data
      const subjectMarks = marksFormData.subjectMarks.map(sm => {
        const examSubject = selectedExam.subjects.find(s => 
          (s.subject._id || s.subject).toString() === (sm.subject._id || sm.subject).toString()
        );
        const useDivisions = examSubject?.useDivisions || false;
        
        const baseMark = {
          subject: sm.subject._id || sm.subject,
          marksObtained: sm.marksObtained || 0,
          maxMarks: examSubject?.maxMarks || sm.maxMarks || 100,
          passingMarks: examSubject?.passingMarks || 40,
          useDivisions
        };
        
        // Include division marks if divisions are enabled
        if (useDivisions && sm.divisionMarks && sm.divisionMarks.length > 0) {
          baseMark.divisionMarks = sm.divisionMarks.map(div => ({
            divisionName: div.divisionName || `Division ${div.order || 1}`,
            marksObtained: div.marksObtained || 0,
            maxMarks: div.maxMarks || 10
          }));
        }
        
        return baseMark;
      });

      const marksData = {
        exam: selectedExam._id,
        student: selectedStudent._id,
        subjectMarks,
        isPresent: marksFormData.isPresent,
        absentReason: marksFormData.absentReason || undefined,
        remarks: marksFormData.remarks || undefined,
        teacherRemarks: marksFormData.teacherRemarks || undefined
      };

      await examMarksAPI.saveExamMarks(marksData);
      
      setMessage({ type: 'success', text: 'Marks saved successfully!' });
      setShowMarksEntryModal(false);
      
      // Reload marks
      await loadExamMarks(selectedExam._id);
      
    } catch (error) {
      console.error('❌ Error saving marks:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error saving marks'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetExamForm = () => {
    setExamFormData({
      name: '',
      description: '',
      examType: 'unit',
      examDate: '',
      startTime: '',
      endTime: '',
      duration: 180,
      selectionType: 'department',
      targetDepartment: '',
      targetDepartments: [],
      targetSubDepartments: [],
      targetBatches: [],
      customStudents: [],
      subjects: [],
      instructions: '',
      venue: '',
      remarks: '',
      useDivisions: false
    });
    setEditingExam(null);
    setSubDepartments([]);
    setBatches([]);
  };

  const resetSubjectForm = () => {
    setSubjectFormData({
      name: '',
      code: '',
      description: '',
      category: 'theory',
      credits: 1
    });
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
              <h2>📝 Exam Management</h2>
              <p className="text-muted mb-0">Create exams, select students, and manage marks</p>
            </div>
            <div className="d-flex gap-2">
              {/* View Subjects - Available to all users who can manage exams */}
              {canManage && (
                <Button 
                  variant="outline-info" 
                  onClick={async () => {
                    setShowSubjectsListModal(true);
                    // Load all subjects (including inactive) when opening the modal
                    try {
                      setLoading(true);
                      const response = await examsAPI.getSubjects({ includeInactive: true });
                      setSubjects(response.subjects || []);
                    } catch (error) {
                      console.error('Error loading subjects:', error);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="me-2"
                >
                  📋 View Subjects
                </Button>
              )}
              {canCreate && (
                <>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => { resetSubjectForm(); setShowSubjectModal(true); }}
                    disabled={loading}
                    className="me-2"
                  >
                    ➕ Add Subject
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => { resetExamForm(); setShowExamModal(true); }}
                    disabled={loading}
                  >
                    ➕ Create Exam
                  </Button>
                </>
              )}
            </div>
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
                    <Form.Label>Academic Year</Form.Label>
                    <AcademicYearFilter
                      value={filters.academicYear || undefined}
                      onChange={(year) => {
                        setFilters(prev => ({ ...prev, academicYear: year || null, page: 1 }));
                      }}
                      size="sm"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Search</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search by exam name..."
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
                    <Form.Label>Exam Type</Form.Label>
                    <Form.Select
                      name="examType"
                      value={filters.examType}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Types</option>
                      <option value="unit">Unit Test</option>
                      <option value="midterm">Mid-term</option>
                      <option value="final">Final</option>
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="practical">Practical</option>
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
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>&nbsp;</Form.Label>
                    <Button
                      variant="outline-secondary"
                      className="d-block"
                      onClick={loadExams}
                      disabled={loading}
                    >
                      🔄
                    </Button>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Exams Table */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">📋 Exams List</h6>
              <Badge bg="info">
                {pagination.totalExams || 0} Total Exams
              </Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : exams.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No exams found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Exam Name</th>
                        <th>Type</th>
                        <th>Date & Time</th>
                        <th>Scope</th>
                        <th>Subjects</th>
                        <th>Status</th>
                        {canManage && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map(exam => (
                        <tr key={exam._id}>
                          <td>
                            <div>
                              <strong>{exam.name}</strong>
                              {exam.description && (
                                <>
                                  <br />
                                  <small className="text-muted">{exam.description}</small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary">
                              {exam.examType}
                            </Badge>
                          </td>
                          <td>
                            <div>
                              <strong>{new Date(exam.examDate).toLocaleDateString()}</strong>
                              <br />
                              <small className="text-muted">
                                {exam.startTime} - {exam.endTime}
                              </small>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Badge bg="primary" className="me-1">
                                {exam.selectionType === 'department' ? 'Department' :
                                 exam.selectionType === 'subDepartment' ? 'Sub-Department' :
                                 exam.selectionType === 'batch' ? 'Batch' :
                                 exam.selectionType === 'standard' ? 'Standard' : 'Custom'}
                              </Badge>
                              <br />
                              <small className="text-muted">
                                {exam.selectionType === 'department' && exam.targetDepartments?.includes('__all__') 
                                  ? 'All Departments'
                                  : exam.selectionType === 'department' && exam.targetDepartments?.length > 0
                                  ? `${exam.targetDepartments.length} department(s)`
                                  : exam.selectionType === 'department' && exam.targetDepartment
                                  ? exam.targetDepartment?.name || 'N/A'
                                  : exam.selectionType === 'subDepartment' && exam.targetSubDepartments?.length > 0
                                  ? exam.targetSubDepartments.map(sd => sd.name || sd).join(', ')
                                  : exam.selectionType === 'batch' && exam.targetBatches?.length > 0
                                  ? exam.targetBatches.map(b => b.name || b).join(', ')
                                  : exam.selectionType === 'standard' && exam.targetStandards?.length > 0
                                  ? exam.targetStandards.join(', ')
                                  : exam.selectionType === 'custom' && exam.customStudents?.length > 0
                                  ? `${exam.customStudents.length} students`
                                  : 'No selection'}
                              </small>
                              <br />
                              <small className="text-info">
                                {exam.eligibleStudentsCount !== undefined 
                                  ? `${exam.eligibleStudentsCount} eligible`
                                  : exam.customStudents?.length > 0
                                  ? `${exam.customStudents.length} students`
                                  : 'Click to view students'}
                              </small>
                            </div>
                          </td>
                          <td>
                            {exam.subjects?.length > 0 ? (
                              exam.subjects.map(subj => (
                                <Badge key={subj.subject._id} bg="info" className="me-1">
                                  {subj.subject.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted">No subjects</span>
                            )}
                          </td>
                          <td>
                            {canManage ? (
                              <Form.Select
                                size="sm"
                                value={exam.status || 'draft'}
                                onChange={(e) => handleStatusChange(exam._id, e.target.value)}
                                className="status-select"
                                style={{
                                  minWidth: '130px',
                                  cursor: 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                <option value="draft">📝 Draft</option>
                                <option value="scheduled">📅 Scheduled</option>
                                <option value="ongoing">⏳ Ongoing</option>
                                <option value="completed">✅ Completed</option>
                                <option value="cancelled">❌ Cancelled</option>
                              </Form.Select>
                            ) : (
                            <Badge 
                              bg={
                                exam.status === 'draft' ? 'secondary' :
                                exam.status === 'scheduled' ? 'primary' :
                                exam.status === 'ongoing' ? 'warning' :
                                exam.status === 'completed' ? 'success' :
                                'danger'
                              }
                            >
                              {exam.status}
                            </Badge>
                            )}
                          </td>
                          {canManage && (
                            <td>
                              <div className="d-flex gap-1 flex-wrap">
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => navigate(`/reports/exam/${exam._id || exam.id || exam.examId}`)}
                                  title="View exam results"
                                >
                                  📋 Results
                                </Button>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(exam)}
                                  title="Edit exam"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleManageMarks(exam)}
                                  title="Manage marks"
                                >
                                  📊
                                </Button>
                                {canDelete && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDelete(exam._id)}
                                    title="Delete exam"
                                  >
                                    🗑️
                                  </Button>
                                )}
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

      {/* Create/Edit Exam Modal */}
      <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingExam ? '✏️ Edit Exam' : '➕ Create New Exam'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleExamSubmit}>
          <Modal.Body>
            <Tabs defaultActiveKey="basic" className="mb-3">
              {/* Basic Information Tab */}
              <Tab eventKey="basic" title="📝 Basic Info">
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Exam Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={examFormData.name}
                        onChange={handleExamFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Exam Type *</Form.Label>
                      <Form.Select
                        name="examType"
                        value={examFormData.examType}
                        onChange={handleExamFormChange}
                        required
                      >
                        <option value="unit">Unit Test</option>
                        <option value="midterm">Mid-term</option>
                        <option value="final">Final</option>
                        <option value="assignment">Assignment</option>
                        <option value="project">Project</option>
                        <option value="practical">Practical</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Exam Date *</Form.Label>
                      <Form.Control
                        type="date"
                        name="examDate"
                        value={examFormData.examDate}
                        onChange={handleExamFormChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control
                        type="time"
                        name="startTime"
                        value={examFormData.startTime}
                        onChange={handleExamFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>End Time</Form.Label>
                      <Form.Control
                        type="time"
                        name="endTime"
                        value={examFormData.endTime}
                        onChange={handleExamFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Duration (minutes)</Form.Label>
                      <Form.Control
                        type="number"
                        name="duration"
                        value={examFormData.duration}
                        onChange={handleExamFormChange}
                        min="1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Venue</Form.Label>
                      <Form.Control
                        type="text"
                        name="venue"
                        value={examFormData.venue}
                        onChange={handleExamFormChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="description"
                        value={examFormData.description}
                        onChange={handleExamFormChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>

              {/* Student Selection Tab */}
              <Tab eventKey="students" title="👥 Student Selection">
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Selection Type *</Form.Label>
                      <Form.Select
                        name="selectionType"
                        value={examFormData.selectionType}
                        onChange={handleExamFormChange}
                        required
                      >
                        <option value="department">Entire Department</option>
                        <option value="subDepartment">Sub-Department(s)</option>
                        <option value="batch">Batch(es)</option>
                        <option value="standard">Standard(s)</option>
                        <option value="custom">Custom Student Selection</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {examFormData.selectionType === 'department' && (
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Departments *</Form.Label>
                        <Form.Select
                          multiple
                          name="targetDepartments"
                          value={examFormData.targetDepartments}
                          onChange={handleExamFormChange}
                          size={6}
                          required
                        >
                          <option value="__all__">All Departments</option>
                          {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Hold Ctrl/Cmd to select multiple departments, or select "All Departments" to include all students
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  )}

                  {examFormData.selectionType === 'subDepartment' && (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Department *</Form.Label>
                          <Form.Select
                            name="targetDepartment"
                            value={examFormData.targetDepartment}
                            onChange={handleExamFormChange}
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
                          <Form.Label>Sub-Departments *</Form.Label>
                          <Form.Select
                            multiple
                            name="targetSubDepartments"
                            value={examFormData.targetSubDepartments}
                            onChange={handleExamFormChange}
                            disabled={!examFormData.targetDepartment}
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
                      </Col>
                    </>
                  )}

                  {examFormData.selectionType === 'batch' && (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Department *</Form.Label>
                          <Form.Select
                            name="targetDepartment"
                            value={examFormData.targetDepartment}
                            onChange={handleExamFormChange}
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
                          <Form.Label>Batches *</Form.Label>
                          <Form.Select
                            multiple
                            name="targetBatches"
                            value={examFormData.targetBatches}
                            onChange={handleExamFormChange}
                            disabled={!examFormData.targetDepartment}
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
                      </Col>
                    </>
                  )}

                  {examFormData.selectionType === 'standard' && (
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Select Standard(s) *</Form.Label>
                        <Form.Select
                          multiple
                          name="targetStandards"
                          value={examFormData.targetStandards}
                          onChange={handleExamFormChange}
                          size={6}
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
                    </Col>
                  )}

                  {examFormData.selectionType === 'custom' && (
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Custom Students *</Form.Label>
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
                    </Col>
                  )}
                </Row>
              </Tab>

              {/* Subjects Tab */}
              <Tab eventKey="subjects" title="📚 Subjects">
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subjects *</Form.Label>
                      <Form.Select
                        multiple
                        name="subjects"
                        value={examFormData.subjects.map(s => s.subject)}
                        onChange={handleExamFormChange}
                        size={6}
                        required
                      >
                        {subjects.map(subject => (
                          <option key={subject._id} value={subject._id}>
                            {subject.name} ({subject.code}) - {subject.category}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        Hold Ctrl/Cmd to select multiple subjects. Default marks: 100 max, 40 passing.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  {/* Division-based Marking Option */}
                  <Col md={12}>
                    <hr className="my-3" />
                    <Card className="mb-3" style={{ border: '2px solid #0d6efd', backgroundColor: '#f8f9fa' }}>
                      <Card.Body>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            id="useDivisionsCheckbox"
                            name="useDivisions"
                            label={<strong>Use Division-based Marking (10 divisions × 10 marks = 100 total)</strong>}
                            checked={examFormData.useDivisions}
                            onChange={handleExamFormChange}
                            style={{ fontSize: '1.1rem' }}
                          />
                          <Form.Text className="text-muted d-block mt-2">
                            <i className="bi bi-info-circle"></i> Enable this to divide marks into 10 fixed divisions (Division 1 to Division 10), each worth 10 marks
                          </Form.Text>
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Division Configuration Info */}
                  {examFormData.useDivisions && (
                    <Col md={12}>
                      <Alert variant="info" className="mb-3">
                        <strong>Division-based Marking Enabled</strong>
                        <br />
                        <small>
                          Each subject will have 10 fixed divisions (Division 1 to Division 10), each worth 10 marks.
                          Total marks per subject: 100 (10 divisions × 10 marks).
                        </small>
                      </Alert>
                    </Col>
                  )}

                  {examFormData.subjects.length > 0 && (
                    <Col md={12}>
                      <h6>Selected Subjects Configuration:</h6>
                      <ListGroup>
                        {examFormData.subjects.map((subj, index) => {
                          const subject = subjects.find(s => s._id === subj.subject);
                          return (
                            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{subject?.name}</strong> ({subject?.code})
                                {examFormData.useDivisions && (
                                  <div className="mt-1">
                                    <small className="text-muted">
                                      10 Divisions (Division 1 to Division 10) × 10 marks each
                                    </small>
                                  </div>
                                )}
                              </div>
                              <div className="d-flex gap-2 align-items-center">
                                <small>Max: {subj.maxMarks}</small>
                                <small>Pass: {subj.passingMarks}</small>
                                <Badge bg="secondary">Weight: {subj.weightage}</Badge>
                                {examFormData.useDivisions && (
                                  <Badge bg="info">Divisions: {subj.divisions?.length || 0}</Badge>
                                )}
                              </div>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </Col>
                  )}
                </Row>
              </Tab>

              {/* Additional Info Tab */}
              <Tab eventKey="additional" title="ℹ️ Additional Info">
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Instructions</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="instructions"
                        value={examFormData.instructions}
                        onChange={handleExamFormChange}
                        placeholder="Enter exam instructions for students..."
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
                        value={examFormData.remarks}
                        onChange={handleExamFormChange}
                        placeholder="Internal remarks about the exam..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Tab>
            </Tabs>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowExamModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingExam ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingExam ? 'Update Exam' : 'Create Exam'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Create Subject Modal */}
      <Modal show={showSubjectModal} onHide={() => setShowSubjectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>➕ Add New Subject</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubjectSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={subjectFormData.name}
                    onChange={handleSubjectFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Subject Code *</Form.Label>
                  <Form.Control
                    type="text"
                    name="code"
                    value={subjectFormData.code}
                    onChange={handleSubjectFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name="category"
                    value={subjectFormData.category}
                    onChange={handleSubjectFormChange}
                  >
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Credits</Form.Label>
                  <Form.Control
                    type="number"
                    name="credits"
                    value={subjectFormData.credits}
                    onChange={handleSubjectFormChange}
                    min="1"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={subjectFormData.description}
                    onChange={handleSubjectFormChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubjectModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                'Create Subject'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Subjects Modal */}
      <Modal show={showSubjectsListModal} onHide={() => setShowSubjectsListModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>📚 All Subjects</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          )}
          {!loading && subjects.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No subjects found. Create your first subject!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Credits</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => (
                    <tr key={subject._id} className={!subject.isActive ? 'opacity-50' : ''}>
                      <td>
                        {subject.name}
                        {!subject.isActive && (
                          <Badge bg="secondary" className="ms-2">Inactive</Badge>
                        )}
                      </td>
                      <td>
                        <Badge bg="info">{subject.code}</Badge>
                      </td>
                      <td>
                        <Badge bg="secondary">{subject.category || 'N/A'}</Badge>
                      </td>
                      <td>{subject.credits || 'N/A'}</td>
                      <td>
                        {canDelete && subject.isActive && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject._id)}
                            disabled={loading}
                          >
                            🗑️ Delete
                          </Button>
                        )}
                        {!subject.isActive && (
                          <span className="text-muted text-sm">Deleted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubjectsListModal(false)}>
            Close
          </Button>
          {canCreate && (
            <Button 
              variant="primary" 
              onClick={() => {
                setShowSubjectsListModal(false);
                resetSubjectForm();
                setShowSubjectModal(true);
              }}
            >
              ➕ Add New Subject
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Manage Marks Modal */}
      <Modal show={showMarksModal} onHide={() => setShowMarksModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            📊 Manage Marks - {selectedExam?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="students" className="mb-3">
            <Tab eventKey="students" title={`👥 Eligible Students (${eligibleStudents.length})`}>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Admission No</th>
                      <th>Student Name</th>
                      <th>Department</th>
                      <th>Batches</th>
                      <th>Marks Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleStudents.map(student => {
                      const hasMarks = examMarks.some(mark => mark.student._id === student._id);
                      return (
                        <tr key={student._id}>
                          <td>{student.admissionNo}</td>
                          <td>{student.fullName}</td>
                          <td>
                            <Badge bg="primary">
                              {student.department?.name}
                            </Badge>
                          </td>
                          <td>
                            {student.batches?.map(batch => (
                              <Badge key={batch._id} bg="success" className="me-1">
                                {batch.name}
                              </Badge>
                            ))}
                          </td>
                          <td>
                            <Badge bg={hasMarks ? 'success' : 'warning'} className="me-2">
                              {hasMarks ? '✅ Entered' : '⏳ Pending'}
                            </Badge>
                            <Button
                              variant={hasMarks ? 'outline-primary' : 'primary'}
                              size="sm"
                              onClick={() => handleEnterMarks(student)}
                            >
                              {hasMarks ? '✏️ Edit' : '📝 Enter'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Tab>
            <Tab eventKey="marks" title={`📊 Entered Marks (${examMarks.length})`}>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Total Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Status</th>
                      <th>Entered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examMarks.map(mark => (
                      <tr key={mark._id}>
                        <td>
                          <div>
                            <strong>{mark.student.fullName}</strong>
                            <br />
                            <small className="text-muted">{mark.student.admissionNo}</small>
                          </div>
                        </td>
                        <td>
                          {mark.totalMarksObtained}/{mark.totalMaxMarks}
                        </td>
                        <td>
                          <Badge bg={mark.overallPercentage >= 40 ? 'success' : 'danger'}>
                            {mark.overallPercentage?.toFixed(1)}%
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="info">{mark.overallGrade}</Badge>
                        </td>
                        <td>
                          <Badge 
                            bg={
                              mark.status === 'draft' ? 'secondary' :
                              mark.status === 'submitted' ? 'primary' :
                              mark.status === 'verified' ? 'success' :
                              'info'
                            }
                          >
                            {mark.status}
                          </Badge>
                        </td>
                        <td>
                          <small>{mark.enteredBy?.fullName}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarksModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Enter Marks Modal */}
      <Modal show={showMarksEntryModal} onHide={() => setShowMarksEntryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            📝 Enter Marks - {selectedStudent?.fullName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedExam && (
            <>
              <Card className="mb-3">
                <Card.Body>
                  <h6>Exam: {selectedExam.name}</h6>
                  <small className="text-muted">
                    Date: {new Date(selectedExam.examDate).toLocaleDateString()}
                  </small>
                </Card.Body>
              </Card>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Student is Present"
                  name="isPresent"
                  checked={marksFormData.isPresent}
                  onChange={handleMarksFormChange}
                />
              </Form.Group>

              {!marksFormData.isPresent && (
                <Form.Group className="mb-3">
                  <Form.Label>Absent Reason</Form.Label>
                  <Form.Control
                    type="text"
                    name="absentReason"
                    value={marksFormData.absentReason}
                    onChange={handleMarksFormChange}
                    placeholder="Reason for absence..."
                  />
                </Form.Group>
              )}

              {marksFormData.isPresent && selectedExam.subjects && (
                <>
                  <h6 className="mb-3">Subject Marks</h6>
                  {selectedExam.subjects.map((examSubject, index) => {
                    const subject = examSubject.subject;
                    const subjectId = subject._id || subject;
                    const useDivisions = examSubject.useDivisions || false;
                    const subjectMark = marksFormData.subjectMarks.find(sm => 
                      (sm.subject._id || sm.subject).toString() === subjectId.toString()
                    ) || { 
                      marksObtained: 0, 
                      maxMarks: examSubject.maxMarks || 100,
                      useDivisions,
                      divisionMarks: useDivisions ? initializeDivisionMarks() : []
                    };

                    return (
                      <Card key={index} className="mb-3">
                        <Card.Body>
                          <Row>
                            <Col md={12}>
                              <strong>{subject.name || subject}</strong>
                              <br />
                              <small className="text-muted">
                                Max: {examSubject.maxMarks || 100} | 
                                Pass: {examSubject.passingMarks || 40}
                                {useDivisions && <span> | 10 Divisions (10 marks each)</span>}
                              </small>
                            </Col>
                          </Row>
                          
                          {useDivisions ? (
                            // Division-based marking
                            <Row className="mt-3">
                              <Col md={12}>
                                <h6 className="mb-2">Division Marks (10 marks each)</h6>
                                <Row>
                                  {(subjectMark.divisionMarks || initializeDivisionMarks()).map((div, divIndex) => (
                                    <Col md={6} key={divIndex} className="mb-2">
                                      <Form.Group>
                                        <Form.Label className="small">
                                          {div.divisionName || `Division ${divIndex + 1}`} (Max: {div.maxMarks || 10})
                                        </Form.Label>
                                        <Form.Control
                                          type="number"
                                          name={`division_${subjectId}_${divIndex}`}
                                          value={div.marksObtained || 0}
                                          onChange={handleMarksFormChange}
                                          min="0"
                                          max={div.maxMarks || 10}
                                          step="0.01"
                                          disabled={!marksFormData.isPresent}
                                          size="sm"
                                        />
                                      </Form.Group>
                                    </Col>
                                  ))}
                                </Row>
                                <Alert variant="info" className="mt-2 mb-0 py-2">
                                  <strong>Total: {subjectMark.marksObtained || 0}/{examSubject.maxMarks || 100}</strong>
                                  {' '}
                                  ({((subjectMark.marksObtained || 0) / (examSubject.maxMarks || 100) * 100).toFixed(1)}%)
                                  {subjectMark.marksObtained >= (examSubject.passingMarks || 40) ? (
                                    <Badge bg="success" className="ms-2">✅ Pass</Badge>
                                  ) : (
                                    <Badge bg="danger" className="ms-2">❌ Fail</Badge>
                                  )}
                                </Alert>
                              </Col>
                            </Row>
                          ) : (
                            // Regular marking
                            <Row className="mt-3">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Marks Obtained</Form.Label>
                                  <Form.Control
                                    type="number"
                                    name={`subject_${subjectId}`}
                                    value={subjectMark.marksObtained || 0}
                                    onChange={handleMarksFormChange}
                                    min="0"
                                    max={examSubject.maxMarks || 100}
                                    step="0.01"
                                    disabled={!marksFormData.isPresent}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <div className="mt-4">
                                  {subjectMark.marksObtained >= (examSubject.passingMarks || 40) ? (
                                    <Badge bg="success">✅ Pass</Badge>
                                  ) : (
                                    <Badge bg="danger">❌ Fail</Badge>
                                  )}
                                  <br />
                                  <small>
                                    {((subjectMark.marksObtained / (examSubject.maxMarks || 100)) * 100).toFixed(1)}%
                                  </small>
                                </div>
                              </Col>
                            </Row>
                          )}
                        </Card.Body>
                      </Card>
                    );
                  })}
                </>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Teacher Remarks</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="teacherRemarks"
                  value={marksFormData.teacherRemarks}
                  onChange={handleMarksFormChange}
                  placeholder="Additional remarks about the student's performance..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Internal Remarks</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="remarks"
                  value={marksFormData.remarks}
                  onChange={handleMarksFormChange}
                  placeholder="Internal notes (not visible to students/parents)..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMarksEntryModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveMarks} disabled={loading}>
            {loading ? <Spinner size="sm" /> : '💾 Save Marks'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExamManagement;
