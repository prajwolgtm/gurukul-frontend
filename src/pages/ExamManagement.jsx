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
import teachersAPI from '../api/teachers';
import studentsAPI from '../api/students';
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
  const [teachers, setTeachers] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [studentPreview, setStudentPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [customAudienceRules, setCustomAudienceRules] = useState([]);
  const [customRuleForm, setCustomRuleForm] = useState({
    selectionType: 'department',
    targetDepartment: '',
    targetSubDepartments: [],
    targetBatches: [],
    targetStandards: [],
    targetDepartmentStandard: ''
  });
  const [customSubDepartments, setCustomSubDepartments] = useState([]);
  const [customBatches, setCustomBatches] = useState([]);
  const [customStudentSearch, setCustomStudentSearch] = useState('');
  const [customStudentResults, setCustomStudentResults] = useState([]);
  const [customStudentSearchLoading, setCustomStudentSearchLoading] = useState(false);
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
  const [selectedSubjectForEntry, setSelectedSubjectForEntry] = useState('');
  const [subjectMarksGrid, setSubjectMarksGrid] = useState({});
  const [marksSearch, setMarksSearch] = useState('');
  const [savingSubjectMarks, setSavingSubjectMarks] = useState(false);
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
    standard: '', // Standard field for Basic Info tab
    selectionType: 'department',
    targetDepartment: '',
    targetDepartments: [],
    targetSubDepartments: [],
    targetBatches: [],
    targetStandards: [],
    targetDepartmentStandard: '', // For department + single standard selection
    customStudents: [],
    accessTeachers: [],
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

  const getExamTypeLabel = (type) => ({
    unit: 'Unit Test',
    midterm: 'Mid-term',
    final: 'Final',
    assignment: 'Assignment',
    project: 'Project',
    practical: 'Practical'
  }[type] || type || 'Exam');

  const getStatusVariant = (status) => ({
    draft: 'secondary',
    scheduled: 'primary',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }[status] || 'secondary');

  const getScopeLabel = (selectionType) => ({
    department: 'Veda',
    departmentStandard: 'Veda + Standard',
    subDepartment: 'Shakha',
    batch: 'Batch',
    standard: 'Standard',
    custom: 'Custom'
  }[selectionType] || 'Selection');

  const getScopeDetail = (exam) => {
    if (exam.selectionType === 'department' && exam.targetDepartments?.includes('__all__')) {
      return 'All Departments';
    }
    if (exam.selectionType === 'department' && exam.targetDepartments?.length > 0) {
      return `${exam.targetDepartments.length} department(s)`;
    }
    if (exam.selectionType === 'department' && exam.targetDepartment) {
      return exam.targetDepartment?.name || 'N/A';
    }
    if (exam.selectionType === 'department') {
      return 'All Vedas';
    }
    if (exam.selectionType === 'departmentStandard' && exam.targetDepartment && exam.targetDepartmentStandard) {
      return `${exam.targetDepartment?.name || 'N/A'} - ${exam.targetDepartmentStandard}`;
    }
    if (exam.selectionType === 'subDepartment' && exam.targetSubDepartments?.length > 0) {
      return exam.targetSubDepartments.map(sd => sd.name || sd).join(', ');
    }
    if (exam.selectionType === 'batch' && exam.targetBatches?.length > 0) {
      return exam.targetBatches.map(b => b.name || b).join(', ');
    }
    if (exam.selectionType === 'standard' && exam.targetStandards?.length > 0) {
      return exam.targetStandards.join(', ');
    }
    if (exam.selectionType === 'custom' && exam.customStudents?.length > 0) {
      return `${exam.customStudents.length} students`;
    }
    return 'No selection';
  };

  const getEligibleLabel = (exam) => {
    if (exam.eligibleStudentsCount !== undefined) return `${exam.eligibleStudentsCount} eligible`;
    if (exam.customStudents?.length > 0) return `${exam.customStudents.length} students`;
    return 'View students';
  };

  const getTeacherName = (teacher) => (
    teacher.user?.fullName ||
    teacher.user?.personalInfo?.fullName ||
    teacher.fullName ||
    teacher.personalInfo?.fullName ||
    teacher.email ||
    'Teacher'
  );

  const getTeacherUserId = (teacher) => teacher.user?._id || teacher.user || teacher._id;

  const getSubjectId = (subjectConfig) => subjectConfig?.subject?._id || subjectConfig?.subject;

  const getSubjectName = (subjectConfig) => (
    subjectConfig?.subject?.name ||
    subjects.find(subject => subject._id === getSubjectId(subjectConfig))?.name ||
    'Subject'
  );

  const getSubjectCategoryLabel = (category) => ({
    theory: 'Theory',
    practical: 'Practical',
    oral: 'Oral',
    project: 'Project'
  }[category] || category || 'Subject');

  const toggleArrayValue = (field, value) => {
    setExamFormData(prev => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];

      return {
        ...prev,
        [field]: next
      };
    });
    setStudentPreview(null);
  };

  const setSingleExamField = (field, value, resets = {}) => {
    setExamFormData(prev => ({
      ...prev,
      [field]: value,
      ...resets
    }));
    setStudentPreview(null);
  };

  const toggleSubject = (subjectId) => {
    setExamFormData(prev => {
      const exists = prev.subjects.some(item => item.subject === subjectId);
      const nextSubjects = exists
        ? prev.subjects.filter(item => item.subject !== subjectId)
        : [
            ...prev.subjects,
            {
              subject: subjectId,
              maxMarks: 100,
              passingMarks: 40,
              weightage: 1,
              useDivisions: false,
              divisions: [],
              teacherAccess: (subjects.find(subject => subject._id === subjectId)?.teachers || []).map(link => ({
                teacher: link.teacher?._id || link.teacher,
                permission: 'edit'
              }))
            }
          ];

      return {
        ...prev,
        subjects: nextSubjects
      };
    });
  };

  const updateSubjectConfig = (subjectId, changes) => {
    setExamFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map(item => item.subject === subjectId ? { ...item, ...changes } : item)
    }));
  };

  const setSubjectTeacherPermission = (subjectId, teacher, permission) => {
    setExamFormData(prev => ({
      ...prev,
      subjects: prev.subjects.map(item => {
        if (item.subject !== subjectId) return item;
        const access = (item.teacherAccess || []).filter(link => (link.teacher?._id || link.teacher) !== teacher);
        return { ...item, teacherAccess: permission ? [...access, { teacher, permission }] : access };
      })
    }));
  };

  const OptionTileGrid = ({
    items,
    selected = [],
    onToggle,
    getLabel,
    getMeta,
    emptyText = 'No options available',
    columns = 'auto',
    disabled = false
  }) => (
    <div className={`option-tile-grid option-tile-grid-${columns}`}>
      {items.length === 0 ? (
        <div className="option-empty-state">{emptyText}</div>
      ) : (
        items.map(item => {
          const value = item.value || item._id || item.id;
          const active = selected.includes(value);
          return (
            <button
              type="button"
              key={value}
              className={`option-tile ${active ? 'selected' : ''}`}
              onClick={() => !disabled && onToggle(value)}
              disabled={disabled}
            >
              <span className="option-check">{active ? 'On' : ''}</span>
              <span>
                <strong>{getLabel(item)}</strong>
                {getMeta && <small>{getMeta(item)}</small>}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  const getStudentId = (student) => student?._id || student?.id || student?.student;

  const getStudentName = (student) => (
    student?.fullName ||
    student?.personalInfo?.fullName ||
    student?.student?.fullName ||
    'Student'
  );

  const getStudentMeta = (student) => [
    student?.admissionNo || student?.studentId,
    student?.department?.name,
    student?.currentStandard
  ].filter(Boolean).join(' | ');

  const selectedCustomStudents = examFormData.customStudents
    .map(studentId => customStudentResults.find(student => getStudentId(student) === studentId) || studentPreview?.students?.find(student => getStudentId(student) === studentId) || { _id: studentId, fullName: 'Selected student' });

  const getRuleLabel = (rule) => {
    const dept = departments.find(item => item._id === rule.targetDepartment);
    const deptName = dept?.name || 'Any Veda';
    if (rule.selectionType === 'department') return `Entire Veda: ${deptName}`;
    if (rule.selectionType === 'subDepartment') {
      const names = rule.targetSubDepartments
        .map(id => [...customSubDepartments, ...subDepartments].find(item => item._id === id)?.name || 'Shakha')
        .join(', ');
      return `${deptName} / ${names || 'selected Shakha'}`;
    }
    if (rule.selectionType === 'batch') {
      const names = rule.targetBatches
        .map(id => [...customBatches, ...batches].find(item => item._id === id)?.name || 'Batch')
        .join(', ');
      return `${deptName} / ${names || 'selected Batch'}`;
    }
    if (rule.selectionType === 'standard') return `Standard: ${rule.targetStandards.join(', ')}`;
    if (rule.selectionType === 'departmentStandard') return `${deptName} / ${rule.targetDepartmentStandard}`;
    return 'Custom rule';
  };

  const hydrateSubjectMarksGrid = (subjectId, studentsList = eligibleStudents, marksList = examMarks) => {
    if (!subjectId) {
      setSubjectMarksGrid({});
      return;
    }

    const nextGrid = {};
    studentsList.forEach(student => {
      const existingMark = marksList.find(mark => mark.student?._id === student._id || mark.student === student._id);
      const existingSubjectMark = existingMark?.subjectMarks?.find(mark => (mark.subject?._id || mark.subject)?.toString() === subjectId.toString());
      nextGrid[student._id] = {
        marksObtained: existingSubjectMark?.marksObtained ?? '',
        remarks: existingSubjectMark?.remarks || '',
        isPresent: existingMark?.isPresent !== false
      };
    });
    setSubjectMarksGrid(nextGrid);
  };

  const getResultSummary = () => {
    const totalStudents = eligibleStudents.length;
    const enteredCount = examMarks.length;
    const passedCount = examMarks.filter(mark => mark.isPassed).length;
    const average = enteredCount
      ? examMarks.reduce((sum, mark) => sum + (mark.overallPercentage || 0), 0) / enteredCount
      : 0;

    const subjectSummaries = selectedExam?.subjects?.map(subjectConfig => {
      const subjectId = getSubjectId(subjectConfig)?.toString();
      const subjectMarks = examMarks
        .map(mark => mark.subjectMarks?.find(subjectMark => (subjectMark.subject?._id || subjectMark.subject)?.toString() === subjectId))
        .filter(Boolean);
      const subjectAverage = subjectMarks.length
        ? subjectMarks.reduce((sum, mark) => sum + (mark.percentage || 0), 0) / subjectMarks.length
        : 0;
      return {
        id: subjectId,
        name: getSubjectName(subjectConfig),
        entered: subjectMarks.length,
        average: subjectAverage,
        passCount: subjectMarks.filter(mark => mark.isPassed).length
      };
    }) || [];

    const topStudents = [...examMarks]
      .sort((a, b) => (b.overallPercentage || 0) - (a.overallPercentage || 0))
      .slice(0, 5);

    return { totalStudents, enteredCount, passedCount, average, subjectSummaries, topStudents };
  };

  const loadInitialData = useCallback(async () => {
    try {
      const [subjectsRes, departmentsRes, teachersRes] = await Promise.all([
        examsAPI.getSubjects(),
        academicAPI.getDepartments(),
        teachersAPI.getTeachers({ status: 'active', isVerified: 'true', limit: 200 })
      ]);

      setSubjects(subjectsRes.subjects || []);
      setDepartments(departmentsRes.departments || []);
      setTeachers(teachersRes.teachers || teachersRes.data?.teachers || []);
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

  useEffect(() => {
    if (showMarksModal && selectedSubjectForEntry) {
      hydrateSubjectMarksGrid(selectedSubjectForEntry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectForEntry, examMarks, eligibleStudents, showMarksModal]);

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

  const loadCustomAudienceOptions = async (departmentId) => {
    if (!departmentId) {
      setCustomSubDepartments([]);
      setCustomBatches([]);
      return;
    }

    try {
      const [subDepartmentRes, batchRes] = await Promise.all([
        academicAPI.getSubDepartments(departmentId),
        academicAPI.getDepartmentBatches(departmentId)
      ]);
      setCustomSubDepartments(subDepartmentRes.subDepartments || []);
      setCustomBatches(batchRes.batches || []);
    } catch (error) {
      console.error('❌ Error loading custom audience options:', error);
      setCustomSubDepartments([]);
      setCustomBatches([]);
    }
  };

  const handleCustomRuleChange = (e) => {
    const { name, value } = e.target;
    const selectedOptions = e.target.multiple
      ? Array.from(e.target.selectedOptions, option => option.value)
      : value;

    setCustomRuleForm(prev => {
      const next = {
        ...prev,
        [name]: selectedOptions
      };

      if (name === 'selectionType') {
        next.targetDepartment = '';
        next.targetSubDepartments = [];
        next.targetBatches = [];
        next.targetStandards = [];
        next.targetDepartmentStandard = '';
      }

      if (name === 'targetDepartment') {
        next.targetSubDepartments = [];
        next.targetBatches = [];
        next.targetDepartmentStandard = '';
        loadCustomAudienceOptions(value);
      }

      return next;
    });
  };

  const handleAddCustomRule = () => {
    const rule = {
      selectionType: customRuleForm.selectionType,
      targetDepartment: customRuleForm.targetDepartment,
      department: customRuleForm.targetDepartment,
      targetSubDepartments: customRuleForm.targetSubDepartments,
      targetBatches: customRuleForm.targetBatches,
      targetStandards: customRuleForm.targetStandards,
      targetDepartmentStandard: customRuleForm.targetDepartmentStandard
    };

    const hasRequiredTarget =
      (rule.selectionType === 'department' && rule.targetDepartment) ||
      (rule.selectionType === 'departmentStandard' && rule.targetDepartment && rule.targetDepartmentStandard) ||
      (rule.selectionType === 'subDepartment' && rule.targetSubDepartments.length > 0) ||
      (rule.selectionType === 'batch' && rule.targetBatches.length > 0) ||
      (rule.selectionType === 'standard' && rule.targetStandards.length > 0);

    if (!hasRequiredTarget) {
      setMessage({ type: 'warning', text: 'Select the required Veda, Shakha, Batch, or Standard before adding a rule.' });
      return;
    }

    setCustomAudienceRules(prev => [...prev, rule]);
    setStudentPreview(null);
  };

  const handleSearchCustomStudents = async () => {
    const search = customStudentSearch.trim();
    if (search.length < 2) {
      setCustomStudentResults([]);
      return;
    }

    try {
      setCustomStudentSearchLoading(true);
      const response = await studentsAPI.getStudents({
        search,
        status: 'active',
        page: 1,
        limit: 20
      });
      setCustomStudentResults(response.students || response.data?.students || []);
    } catch (error) {
      console.error('❌ Error searching students:', error);
      setMessage({ type: 'danger', text: 'Could not search students. Please try again.' });
    } finally {
      setCustomStudentSearchLoading(false);
    }
  };

  const addCustomStudent = (student) => {
    const studentId = getStudentId(student);
    if (!studentId) return;
    setExamFormData(prev => ({
      ...prev,
      customStudents: prev.customStudents.includes(studentId)
        ? prev.customStudents
        : [...prev.customStudents, studentId]
    }));
    setStudentPreview(null);
  };

  const removeCustomStudent = (studentId) => {
    setExamFormData(prev => ({
      ...prev,
      customStudents: prev.customStudents.filter(id => id !== studentId)
    }));
    setStudentPreview(null);
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
      if (response.exam?.subjects) {
        setSelectedExam(current => current ? { ...current, subjects: response.exam.subjects } : current);
        setSelectedSubjectForEntry(current => response.exam.subjects.some(item => getSubjectId(item)?.toString() === current?.toString())
          ? current
          : getSubjectId(response.exam.subjects[0]) || '');
      }
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
    
    if (name === 'targetSubDepartments' || name === 'targetBatches' || name === 'targetDepartments' || name === 'targetStandards' || name === 'customStudents' || name === 'accessTeachers') {
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
        targetDepartmentStandard: '',
        customStudents: []
      }));
      setStudentPreview(null);
    }

    if (name === 'targetDepartment') {
      loadSubDepartments(value);
      loadBatches(value);
      setExamFormData(prev => ({
        ...prev,
        targetSubDepartments: [],
        targetBatches: [],
        targetDepartmentStandard: ''
      }));
      setStudentPreview(null);
    }

    if (['targetDepartments', 'targetSubDepartments', 'targetBatches', 'targetStandards', 'targetDepartmentStandard', 'customStudents'].includes(name)) {
      setStudentPreview(null);
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

      const hasAudience =
        (examFormData.selectionType === 'department' && examFormData.targetDepartments.length > 0) ||
        (examFormData.selectionType === 'departmentStandard' && examFormData.targetDepartment && examFormData.targetDepartmentStandard) ||
        (examFormData.selectionType === 'subDepartment' && examFormData.targetSubDepartments.length > 0) ||
        (examFormData.selectionType === 'batch' && examFormData.targetBatches.length > 0) ||
        (examFormData.selectionType === 'standard' && examFormData.targetStandards.length > 0) ||
        (examFormData.selectionType === 'custom' && (examFormData.customStudents.length > 0 || customAudienceRules.length > 0));

      if (!hasAudience) {
        setMessage({ type: 'warning', text: 'Please select the exam audience before saving.' });
        setLoading(false);
        return;
      }

      if (examFormData.subjects.length === 0) {
        setMessage({ type: 'warning', text: 'Please select at least one subject before saving.' });
        setLoading(false);
        return;
      }
      
      // Prepare exam data
      const examData = {
        ...examFormData,
        // Map selection type to correct field names
        examScope: examFormData.selectionType,
        selectionType: examFormData.selectionType,
        department: (examFormData.selectionType === 'department' || examFormData.selectionType === 'departmentStandard') ? examFormData.targetDepartment : undefined,
        targetDepartmentStandard: examFormData.selectionType === 'departmentStandard' ? examFormData.targetDepartmentStandard : undefined,
        subDepartments: examFormData.selectionType === 'subDepartment' ? examFormData.targetSubDepartments : undefined,
        batches: examFormData.selectionType === 'batch' ? examFormData.targetBatches : undefined,
        targetStandards: examFormData.selectionType === 'standard' ? examFormData.targetStandards : undefined,
        customStudents: examFormData.selectionType === 'custom' ? examFormData.customStudents : undefined,
        audienceCriteria: examFormData.selectionType === 'custom' ? customAudienceRules : undefined,
        // Standard field for Basic Info tab (not linked to student selection)
        standard: examFormData.standard || undefined,
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
          : undefined,
        accessTeachers: examFormData.accessTeachers || []
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

  const handlePreviewStudents = async () => {
    try {
      setPreviewLoading(true);
      setStudentPreview(null);

      const previewPayload = {
        selectionType: examFormData.selectionType,
        department: (examFormData.selectionType === 'department' || examFormData.selectionType === 'departmentStandard' || examFormData.selectionType === 'subDepartment' || examFormData.selectionType === 'batch')
          ? examFormData.targetDepartment
          : undefined,
        targetDepartments: examFormData.selectionType === 'department' ? examFormData.targetDepartments : undefined,
        targetSubDepartments: examFormData.selectionType === 'subDepartment' ? examFormData.targetSubDepartments : undefined,
        targetBatches: examFormData.selectionType === 'batch' ? examFormData.targetBatches : undefined,
        targetStandards: examFormData.selectionType === 'standard' ? examFormData.targetStandards : undefined,
        targetDepartmentStandard: examFormData.selectionType === 'departmentStandard' ? examFormData.targetDepartmentStandard : undefined,
        customStudents: examFormData.selectionType === 'custom' ? examFormData.customStudents : undefined,
        audienceCriteria: examFormData.selectionType === 'custom' ? customAudienceRules : undefined,
        limit: examFormData.selectionType === 'custom' ? 25 : 8
      };

      const response = await examsAPI.previewStudents(previewPayload);
      setStudentPreview({
        totalStudents: response.totalStudents || 0,
        students: response.students || []
      });
    } catch (error) {
      console.error('❌ Error previewing students:', error);
      setStudentPreview({
        totalStudents: 0,
        students: [],
        error: error.response?.data?.message || 'Could not preview students'
      });
    } finally {
      setPreviewLoading(false);
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
      standard: exam.standard || exam.semester || '', // Support both standard and semester for backward compatibility
      selectionType: exam.examScope || exam.selectionType || 'department',
      targetDepartment: exam.targetDepartment?._id || exam.department?._id || '',
      targetDepartments: exam.targetDepartments?.map(dept => dept._id || dept) || [],
      targetSubDepartments: exam.subDepartments?.map(sd => sd._id) || exam.targetSubDepartments?.map(sd => sd._id || sd) || [],
      targetBatches: exam.batches?.map(b => b._id) || exam.targetBatches?.map(b => b._id || b) || [],
      targetStandards: exam.targetStandards || [],
      targetDepartmentStandard: exam.targetDepartmentStandard || '',
      customStudents: exam.customStudents?.map(s => s._id) || [],
      accessTeachers: exam.invigilators?.map(t => t._id || t) || [],
      subjects: exam.subjects || [],
      instructions: exam.instructions || '',
      venue: exam.venue || '',
      remarks: exam.remarks || '',
      useDivisions
    });
    setCustomAudienceRules([]);
    setCustomStudentResults(exam.customStudents || []);

    // Load related data
    const examDepartmentId = exam.targetDepartment?._id || exam.department?._id;
    if (examDepartmentId) {
      loadSubDepartments(examDepartmentId);
      loadBatches(examDepartmentId);
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
    const firstSubjectId = getSubjectId(exam.subjects?.[0]) || '';
    setSelectedSubjectForEntry(firstSubjectId);
    setMarksSearch('');
    await loadEligibleStudents(exam._id);
    await loadExamMarks(exam._id);
    setShowMarksModal(true);
  };

  const handleSubjectGridChange = (studentId, field, value) => {
    setSubjectMarksGrid(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { marksObtained: '', remarks: '', isPresent: true }),
        [field]: field === 'isPresent' ? value === true || value === 'true' : value
      }
    }));
  };

  const handleSaveSubjectMarks = async () => {
    if (!selectedExam || !selectedSubjectForEntry) return;

    try {
      setSavingSubjectMarks(true);
      const marksRows = eligibleStudents
        .map(student => ({
          student: student._id,
          marksObtained: subjectMarksGrid[student._id]?.marksObtained,
          remarks: subjectMarksGrid[student._id]?.remarks,
          isPresent: subjectMarksGrid[student._id]?.isPresent !== false
        }))
        .filter(row => row.marksObtained !== '' && row.marksObtained !== null && row.marksObtained !== undefined);

      if (marksRows.length === 0) {
        setMessage({ type: 'warning', text: 'Enter marks for at least one student before saving.' });
        return;
      }

      const response = await examMarksAPI.bulkSaveSubjectMarks(selectedExam._id, selectedSubjectForEntry, marksRows);
      setMessage({ type: response.results?.errors?.length ? 'warning' : 'success', text: response.message || 'Subject marks saved.' });
      await loadExamMarks(selectedExam._id);
    } catch (error) {
      console.error('❌ Error saving subject marks:', error);
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Error saving subject marks'
      });
    } finally {
      setSavingSubjectMarks(false);
    }
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
      standard: '',
      selectionType: 'department',
      targetDepartment: '',
      targetDepartments: [],
        targetSubDepartments: [],
        targetBatches: [],
        targetStandards: [],
        targetDepartmentStandard: '',
        customStudents: [],
      accessTeachers: [],
      subjects: [],
      instructions: '',
      venue: '',
      remarks: '',
      useDivisions: false
    });
    setEditingExam(null);
    setSubDepartments([]);
    setBatches([]);
    setCustomAudienceRules([]);
    setCustomRuleForm({
      selectionType: 'department',
      targetDepartment: '',
      targetSubDepartments: [],
      targetBatches: [],
      targetStandards: [],
      targetDepartmentStandard: ''
    });
    setCustomSubDepartments([]);
    setCustomBatches([]);
    setCustomStudentSearch('');
    setCustomStudentResults([]);
    setStudentPreview(null);
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

  const resultSummary = getResultSummary();
  const selectedSubjectConfig = selectedExam?.subjects?.find(subjectConfig => getSubjectId(subjectConfig)?.toString() === selectedSubjectForEntry?.toString());
  const selectedSubjectPermission = selectedSubjectConfig?.teacherAccess?.find(link =>
    (link.teacher?._id || link.teacher)?.toString() === (user?._id || user?.id)?.toString()
  )?.permission;
  const canEditSelectedSubject = [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PRINCIPAL].includes(user?.role) || selectedSubjectPermission === 'edit';
  const selectedSubjectMaxMarks = selectedSubjectConfig?.maxMarks || 100;
  const filteredEligibleStudents = eligibleStudents.filter(student => {
    const searchText = marksSearch.trim().toLowerCase();
    if (!searchText) return true;
    return [
      student.fullName,
      student.admissionNo,
      student.department?.name,
      student.currentStandard
    ].filter(Boolean).some(value => value.toLowerCase().includes(searchText));
  });

  return (
    <Container fluid className="exam-management-page py-3 py-md-4 px-2 px-sm-3">
      <Row>
        <Col>
          {/* Header */}
          <div className="exam-page-header mb-4">
            <div className="exam-title-block">
              <span className="exam-page-kicker">Academic exams</span>
              <h2>Exam Management</h2>
              <p className="text-muted mb-0">Create Veda-wise exams, assign standards, and manage marks.</p>
            </div>
            <div className="exam-header-actions">
              {/* View Subjects - Available to all users who can manage exams */}
              {canManage && (
                <Button 
                  variant="outline-info" 
                  onClick={() => navigate('/subjects')}
                  disabled={loading}
                  className="exam-action-btn"
                >
                  Manage Subjects
                </Button>
              )}
              {canCreate && (
                <>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => navigate('/subjects')}
                    disabled={loading}
                    className="exam-action-btn"
                  >
                    Subjects
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => { resetExamForm(); setShowExamModal(true); }}
                    disabled={loading}
                    className="exam-action-btn"
                  >
                    Create Exam
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
          <Card className="filter-panel exam-filter-card mb-4">
            <Card.Header className="filter-panel-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Filters & Search</h6>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={loadExams}
                disabled={loading}
                className="exam-refresh-btn"
              >
                Refresh
              </Button>
            </Card.Header>
            <Card.Body>
              <Row className="filter-grid g-3 align-items-end">
                <Col xs={12} md={6} xl={3}>
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
                <Col xs={12} md={6} xl={3}>
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
                <Col xs={12} sm={6} xl={2}>
                  <Form.Group>
                    <Form.Label>Veda / Department</Form.Label>
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
                <Col xs={12} sm={6} xl={2}>
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
                <Col xs={12} sm={6} xl={2}>
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
              </Row>
            </Card.Body>
          </Card>

          {/* Exams Table */}
          <Card className="exam-list-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Exams List</h6>
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
                <>
                <div className="exam-mobile-list d-lg-none">
                  {exams.map(exam => (
                    <Card key={exam._id} className="exam-mobile-card">
                      <Card.Body>
                        <div className="d-flex justify-content-between gap-3 mb-3">
                          <div className="min-w-0">
                            <h6 className="exam-mobile-title">{exam.name}</h6>
                            {exam.description && (
                              <p className="exam-mobile-description">{exam.description}</p>
                            )}
                          </div>
                          <Badge bg={getStatusVariant(exam.status)} className="exam-status-badge">
                            {exam.status || 'draft'}
                          </Badge>
                        </div>

                        <div className="exam-mobile-meta">
                          <div>
                            <span>Type</span>
                            <strong>{getExamTypeLabel(exam.examType)}</strong>
                          </div>
                          <div>
                            <span>Date</span>
                            <strong>{new Date(exam.examDate).toLocaleDateString()}</strong>
                          </div>
                          <div>
                            <span>Time</span>
                            <strong>{exam.startTime} - {exam.endTime}</strong>
                          </div>
                          <div>
                            <span>Students</span>
                            <strong>{getEligibleLabel(exam)}</strong>
                          </div>
                        </div>

                        <div className="exam-mobile-section">
                          <span className="exam-mobile-label">{getScopeLabel(exam.selectionType)}</span>
                          <p>{getScopeDetail(exam)}</p>
                        </div>

                        <div className="exam-mobile-subjects">
                          {exam.subjects?.length > 0 ? (
                            exam.subjects.slice(0, 3).map(subj => (
                              <Badge key={subj.subject._id || subj.subject} bg="info">
                                {subj.subject.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted">No subjects</span>
                          )}
                          {exam.subjects?.length > 3 && (
                            <Badge bg="secondary">+{exam.subjects.length - 3}</Badge>
                          )}
                        </div>

                        {canManage && (
                          <>
                            <Form.Select
                              size="sm"
                              value={exam.status || 'draft'}
                              onChange={(e) => handleStatusChange(exam._id, e.target.value)}
                              className="mt-3"
                            >
                              <option value="draft">Draft</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="ongoing">Ongoing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </Form.Select>
                            <div className="exam-mobile-actions">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => navigate(`/reports/exam/${exam._id || exam.id || exam.examId}`)}
                              >
                                Results
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleEdit(exam)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleManageMarks(exam)}
                              >
                                Marks
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(exam._id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                </div>

                <div className="table-responsive d-none d-lg-block">
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
                                {getExamTypeLabel(exam.examType)}
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
                                {getScopeLabel(exam.selectionType)}
                              </Badge>
                              <br />
                              <small className="text-muted">
                                {getScopeDetail(exam)}
                              </small>
                              <br />
                              <small className="text-info">
                                {getEligibleLabel(exam)}
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
	                                <option value="draft">Draft</option>
	                                <option value="scheduled">Scheduled</option>
	                                <option value="ongoing">Ongoing</option>
	                                <option value="completed">Completed</option>
	                                <option value="cancelled">Cancelled</option>
                              </Form.Select>
                            ) : (
                            <Badge 
	                              bg={getStatusVariant(exam.status)}
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
	                                  Results
                                </Button>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(exam)}
                                  title="Edit exam"
                                >
	                                  Edit
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleManageMarks(exam)}
                                  title="Manage marks"
                                >
	                                  Marks
                                </Button>
                                {canDelete && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDelete(exam._id)}
                                    title="Delete exam"
                                  >
	                                    Delete
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
                </>
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
      <Modal show={showExamModal} onHide={() => setShowExamModal(false)} size="xl" fullscreen="sm-down" scrollable dialogClassName="exam-modal-shell">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingExam ? 'Edit Exam' : 'Create New Exam'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleExamSubmit}>
          <Modal.Body>
            <Tabs defaultActiveKey="basic" className="exam-form-tabs mb-3" justify>
              {/* Basic Information Tab */}
              <Tab eventKey="basic" title="Basic Info">
                <Row className="g-3">
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
                      <Form.Label>Standard</Form.Label>
                      <Form.Select
                        name="standard"
                        value={examFormData.standard}
                        onChange={handleExamFormChange}
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
              <Tab eventKey="students" title="Students">
                <div className="exam-wizard-panel">
                  <div className="exam-wizard-heading">
                    <div>
                      <span>Step 2</span>
                      <h5>Audience Selection</h5>
                      <p>Choose who this exam is announced for. Use custom selection when you need mixed Veda, Shakha, Batch, or manual students.</p>
                    </div>
                  </div>

                  <div className="selection-mode-grid">
                    {[
                      { value: 'department', label: 'Entire Veda', meta: 'One or more Vedas' },
                      { value: 'departmentStandard', label: 'Veda + Standard', meta: 'One Veda, one class level' },
                      { value: 'subDepartment', label: 'Shakha(s)', meta: 'One Veda, multiple Shakhas' },
                      { value: 'batch', label: 'Batch(es)', meta: 'One Veda, multiple batches' },
                      { value: 'standard', label: 'Standard(s)', meta: 'Across Vedas by standard' },
                      { value: 'custom', label: 'Custom Audience', meta: 'Mix rules and manual students' }
                    ].map(mode => (
                      <button
                        type="button"
                        key={mode.value}
                        className={`selection-mode-card ${examFormData.selectionType === mode.value ? 'selected' : ''}`}
                        onClick={() => {
                          setSingleExamField('selectionType', mode.value, {
                            targetDepartment: '',
                            targetSubDepartments: [],
                            targetBatches: [],
                            targetStandards: [],
                            targetDepartmentStandard: '',
                            customStudents: []
                          });
                        }}
                      >
                        <strong>{mode.label}</strong>
                        <span>{mode.meta}</span>
                      </button>
                    ))}
                  </div>

                  <Row className="g-3 mt-1">
                  {examFormData.selectionType === 'department' && (
                    <Col md={12}>
                      <div className="exam-field-card">
                        <div className="field-card-header">
                          <div>
                            <h6>Veda</h6>
                            <p>Select one or more Vedas, or choose all.</p>
                          </div>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setSingleExamField('targetDepartments', ['__all__'])}
                          >
                            Select All
                          </Button>
                        </div>
                        <OptionTileGrid
                          items={[{ value: '__all__', name: 'All Vedas', code: 'ALL' }, ...departments]}
                          selected={examFormData.targetDepartments}
                          onToggle={(value) => {
                            if (value === '__all__') {
                              setSingleExamField('targetDepartments', examFormData.targetDepartments.includes('__all__') ? [] : ['__all__']);
                              return;
                            }
                            setExamFormData(prev => {
                              const current = (prev.targetDepartments || []).filter(id => id !== '__all__');
                              const next = current.includes(value)
                                ? current.filter(id => id !== value)
                                : [...current, value];
                              return { ...prev, targetDepartments: next };
                            });
                            setStudentPreview(null);
                          }}
                          getLabel={(dept) => dept.name}
                          getMeta={(dept) => dept.code}
                          columns="veda"
                        />
                      </div>
                    </Col>
                  )}

                  {examFormData.selectionType === 'departmentStandard' && (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
	                          <Form.Label>Veda *</Form.Label>
                          <Form.Select
                            name="targetDepartment"
                            value={examFormData.targetDepartment}
                            onChange={handleExamFormChange}
                            required
                          >
	                            <option value="">Select Veda</option>
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
                          <Form.Label>Standard *</Form.Label>
                          <Form.Select
                            name="targetDepartmentStandard"
                            value={examFormData.targetDepartmentStandard}
                            onChange={handleExamFormChange}
                            required
                          >
                            <option value="">Select Standard</option>
                            {STANDARD_OPTIONS.map(standard => (
                              <option key={standard} value={standard}>
                                {standard}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted">
	                            Only students in this Veda and standard will be included.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </>
                  )}

                  {examFormData.selectionType === 'subDepartment' && (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
	                          <Form.Label>Veda *</Form.Label>
                          <Form.Select
                            name="targetDepartment"
                            value={examFormData.targetDepartment}
                            onChange={handleExamFormChange}
                            required
                          >
	                            <option value="">Select Veda</option>
                            {departments.map(dept => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <div className="exam-field-card h-100">
                          <div className="field-card-header">
                            <div>
                              <h6>Shakha</h6>
                              <p>Select one or more Shakhas inside the selected Veda.</p>
                            </div>
                          </div>
                          <OptionTileGrid
                            items={subDepartments}
                            selected={examFormData.targetSubDepartments}
                            onToggle={(value) => toggleArrayValue('targetSubDepartments', value)}
                            getLabel={(subDept) => subDept.name}
                            getMeta={(subDept) => subDept.code}
                            emptyText={examFormData.targetDepartment ? 'No Shakhas found for this Veda.' : 'Select a Veda first.'}
                            disabled={!examFormData.targetDepartment}
                          />
                        </div>
                      </Col>
                    </>
                  )}

                  {examFormData.selectionType === 'batch' && (
                    <>
                      <Col md={6}>
                        <Form.Group className="mb-3">
	                          <Form.Label>Veda *</Form.Label>
                          <Form.Select
                            name="targetDepartment"
                            value={examFormData.targetDepartment}
                            onChange={handleExamFormChange}
                            required
                          >
	                            <option value="">Select Veda</option>
                            {departments.map(dept => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name} ({dept.code})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <div className="exam-field-card h-100">
                          <div className="field-card-header">
                            <div>
                              <h6>Batches</h6>
                              <p>Select one or more batches.</p>
                            </div>
                          </div>
                          <OptionTileGrid
                            items={batches}
                            selected={examFormData.targetBatches}
                            onToggle={(value) => toggleArrayValue('targetBatches', value)}
                            getLabel={(batch) => batch.name}
                            getMeta={(batch) => `${batch.code || 'Batch'} - ${batch.academicYear || 'Year not set'}`}
                            emptyText={examFormData.targetDepartment ? 'No batches found for this Veda.' : 'Select a Veda first.'}
                            disabled={!examFormData.targetDepartment}
                          />
                        </div>
                      </Col>
                    </>
                  )}

                  {examFormData.selectionType === 'standard' && (
                    <Col md={12}>
                      <div className="exam-field-card">
                        <div className="field-card-header">
                          <div>
                            <h6>Standards</h6>
                            <p>Select one or more standards. Students with matching current standard will be included.</p>
                          </div>
                        </div>
                        <OptionTileGrid
                          items={STANDARD_OPTIONS.map(standard => ({ value: standard, name: standard }))}
                          selected={examFormData.targetStandards}
                          onToggle={(value) => toggleArrayValue('targetStandards', value)}
                          getLabel={(standard) => standard.name}
                          columns="standard"
                        />
                      </div>
                    </Col>
                  )}

                  {examFormData.selectionType === 'custom' && (
                    <Col md={12}>
                      <div className="custom-audience-builder">
                        <div className="custom-audience-header">
                          <div>
                            <h6>Custom Audience Builder</h6>
                            <p>Mix Veda, Shakha, Batch, Standard, and manually selected students in one exam.</p>
                          </div>
                          <Badge bg="primary">
                            {customAudienceRules.length} rules + {examFormData.customStudents.length} manual
                          </Badge>
                        </div>

                        <Row className="g-3">
                          <Col lg={7}>
                            <div className="audience-builder-panel">
                              <div className="audience-panel-title">Add students by rule</div>
                              <Row className="g-2">
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label>Rule Type</Form.Label>
                                    <Form.Select
                                      name="selectionType"
                                      value={customRuleForm.selectionType}
                                      onChange={handleCustomRuleChange}
                                    >
                                      <option value="department">Entire Veda</option>
                                      <option value="departmentStandard">Veda + Standard</option>
                                      <option value="subDepartment">Shakha(s)</option>
                                      <option value="batch">Batch(es)</option>
                                      <option value="standard">Standard(s)</option>
                                    </Form.Select>
                                  </Form.Group>
                                </Col>

                                {customRuleForm.selectionType !== 'standard' && (
                                  <Col md={6}>
                                    <Form.Group>
                                      <Form.Label>Veda</Form.Label>
                                      <Form.Select
                                        name="targetDepartment"
                                        value={customRuleForm.targetDepartment}
                                        onChange={handleCustomRuleChange}
                                      >
                                        <option value="">Select Veda</option>
                                        {departments.map(dept => (
                                          <option key={dept._id} value={dept._id}>
                                            {dept.name} ({dept.code})
                                          </option>
                                        ))}
                                      </Form.Select>
                                    </Form.Group>
                                  </Col>
                                )}

                                {customRuleForm.selectionType === 'subDepartment' && (
                                  <Col md={12}>
                                    <div className="mini-option-block">
                                      <Form.Label>Shakha</Form.Label>
                                      <OptionTileGrid
                                        items={customSubDepartments}
                                        selected={customRuleForm.targetSubDepartments}
                                        onToggle={(value) => {
                                          setCustomRuleForm(prev => ({
                                            ...prev,
                                            targetSubDepartments: prev.targetSubDepartments.includes(value)
                                              ? prev.targetSubDepartments.filter(id => id !== value)
                                              : [...prev.targetSubDepartments, value]
                                          }));
                                        }}
                                        getLabel={(subDept) => subDept.name}
                                        getMeta={(subDept) => subDept.code}
                                        emptyText={customRuleForm.targetDepartment ? 'No Shakhas found.' : 'Select a Veda first.'}
                                        disabled={!customRuleForm.targetDepartment}
                                      />
                                    </div>
                                  </Col>
                                )}

                                {customRuleForm.selectionType === 'batch' && (
                                  <Col md={12}>
                                    <div className="mini-option-block">
                                      <Form.Label>Batch</Form.Label>
                                      <OptionTileGrid
                                        items={customBatches}
                                        selected={customRuleForm.targetBatches}
                                        onToggle={(value) => {
                                          setCustomRuleForm(prev => ({
                                            ...prev,
                                            targetBatches: prev.targetBatches.includes(value)
                                              ? prev.targetBatches.filter(id => id !== value)
                                              : [...prev.targetBatches, value]
                                          }));
                                        }}
                                        getLabel={(batch) => batch.name}
                                        getMeta={(batch) => `${batch.code || 'Batch'} - ${batch.academicYear || 'Year not set'}`}
                                        emptyText={customRuleForm.targetDepartment ? 'No batches found.' : 'Select a Veda first.'}
                                        disabled={!customRuleForm.targetDepartment}
                                      />
                                    </div>
                                  </Col>
                                )}

                                {customRuleForm.selectionType === 'departmentStandard' && (
                                  <Col md={6}>
                                    <Form.Group>
                                      <Form.Label>Standard</Form.Label>
                                      <Form.Select
                                        name="targetDepartmentStandard"
                                        value={customRuleForm.targetDepartmentStandard}
                                        onChange={handleCustomRuleChange}
                                      >
                                        <option value="">Select Standard</option>
                                        {STANDARD_OPTIONS.map(standard => (
                                          <option key={standard} value={standard}>{standard}</option>
                                        ))}
                                      </Form.Select>
                                    </Form.Group>
                                  </Col>
                                )}

                                {customRuleForm.selectionType === 'standard' && (
                                  <Col md={12}>
                                    <div className="mini-option-block">
                                      <Form.Label>Standard</Form.Label>
                                      <OptionTileGrid
                                        items={STANDARD_OPTIONS.map(standard => ({ value: standard, name: standard }))}
                                        selected={customRuleForm.targetStandards}
                                        onToggle={(value) => {
                                          setCustomRuleForm(prev => ({
                                            ...prev,
                                            targetStandards: prev.targetStandards.includes(value)
                                              ? prev.targetStandards.filter(id => id !== value)
                                              : [...prev.targetStandards, value]
                                          }));
                                        }}
                                        getLabel={(standard) => standard.name}
                                        columns="standard"
                                      />
                                    </div>
                                  </Col>
                                )}

                                <Col md={12}>
                                  <Button variant="outline-primary" onClick={handleAddCustomRule}>
                                    Add Rule
                                  </Button>
                                </Col>
                              </Row>

                              <div className="audience-rule-list">
                                {customAudienceRules.length === 0 ? (
                                  <p className="text-muted mb-0">No rules added yet.</p>
                                ) : (
                                  customAudienceRules.map((rule, index) => (
                                    <div key={`${rule.selectionType}-${index}`} className="audience-rule-chip">
                                      <span>{getRuleLabel(rule)}</span>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => {
                                          setCustomAudienceRules(prev => prev.filter((_, ruleIndex) => ruleIndex !== index));
                                          setStudentPreview(null);
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </Col>

                          <Col lg={5}>
                            <div className="audience-builder-panel">
                              <div className="audience-panel-title">Manual student add</div>
                              <div className="student-search-row">
                                <Form.Control
                                  value={customStudentSearch}
                                  onChange={(e) => setCustomStudentSearch(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSearchCustomStudents();
                                    }
                                  }}
                                  placeholder="Search name or admission no"
                                />
                                <Button
                                  variant="outline-secondary"
                                  onClick={handleSearchCustomStudents}
                                  disabled={customStudentSearchLoading}
                                >
                                  {customStudentSearchLoading ? '...' : 'Search'}
                                </Button>
                              </div>

                              <div className="student-picker-results">
                                {customStudentResults.length === 0 ? (
                                  <p className="text-muted mb-0">Search to add specific students.</p>
                                ) : (
                                  customStudentResults.map(student => {
                                    const studentId = getStudentId(student);
                                    const selected = examFormData.customStudents.includes(studentId);
                                    return (
                                      <div key={studentId} className="student-picker-row">
                                        <div>
                                          <strong>{getStudentName(student)}</strong>
                                          <span>{getStudentMeta(student) || 'No academic details'}</span>
                                        </div>
                                        <Button
                                          variant={selected ? 'success' : 'outline-primary'}
                                          size="sm"
                                          onClick={() => selected ? removeCustomStudent(studentId) : addCustomStudent(student)}
                                        >
                                          {selected ? 'Added' : 'Add'}
                                        </Button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </Col>

                          <Col md={12}>
                            <div className="selected-students-panel">
                              <div className="audience-panel-title">Manually selected students</div>
                              {selectedCustomStudents.length === 0 ? (
                                <p className="text-muted mb-0">No manual students selected.</p>
                              ) : (
                                <div className="selected-student-grid">
                                  {selectedCustomStudents.map(student => {
                                    const studentId = getStudentId(student);
                                    return (
                                      <div key={studentId} className="selected-student-chip">
                                        <span>
                                          <strong>{getStudentName(student)}</strong>
                                          <small>{getStudentMeta(student)}</small>
                                        </span>
                                        <Button variant="link" size="sm" onClick={() => removeCustomStudent(studentId)}>
                                          Remove
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  )}

                  <Col md={12}>
                    <Card className="exam-audience-preview">
                      <Card.Body>
                        <div className="exam-preview-header">
                          <div>
                            <h6>Audience Preview</h6>
                            <p>Check the exact student group before announcing the exam.</p>
                          </div>
                          <Button
                            variant="outline-primary"
                            onClick={handlePreviewStudents}
                            disabled={previewLoading}
                          >
                            {previewLoading ? 'Checking...' : 'Preview Students'}
                          </Button>
                        </div>

                        {studentPreview?.error && (
                          <Alert variant="danger" className="mb-0 mt-3">
                            {studentPreview.error}
                          </Alert>
                        )}

                        {studentPreview && !studentPreview.error && (
                          <div className="exam-preview-results">
                            <div className="exam-preview-count">
                              <strong>{studentPreview.totalStudents}</strong>
                              <span>students matched</span>
                            </div>
                            <div className="exam-preview-list">
                              {studentPreview.students.length > 0 ? (
                                studentPreview.students.map(student => (
                                  <div key={student._id} className="exam-preview-student">
                                    <strong>{student.fullName}</strong>
                                    <span>
                                      {student.admissionNo || 'No admission no'}
                                      {student.currentStandard ? ` | ${student.currentStandard}` : ''}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted mb-0">No active students match this selection.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </Card.Body>
	                    </Card>
	                  </Col>
	                </Row>
                </div>
              </Tab>

              {/* Subjects Tab */}
              <Tab eventKey="subjects" title="Subjects">
                <div className="exam-wizard-panel">
                  <div className="exam-wizard-heading">
                    <div>
                      <span>Step 3</span>
                      <h5>Subjects & Marking</h5>
                      <p>Select subjects with one click. The marks configuration appears immediately below.</p>
                    </div>
                    <Badge bg="primary">{examFormData.subjects.length} selected</Badge>
                  </div>

                  <Row className="g-3">
                  <Col md={12}>
                    <div className="subject-picker-grid">
                      {subjects.length === 0 ? (
                        <div className="option-empty-state">No subjects available. Add subjects first.</div>
                      ) : (
                        subjects.map(subject => {
                          const selected = examFormData.subjects.some(item => item.subject === subject._id);
                          return (
                            <button
                              type="button"
                              key={subject._id}
                              className={`subject-picker-card ${selected ? 'selected' : ''}`}
                              onClick={() => toggleSubject(subject._id)}
                            >
                              <span className="option-check">{selected ? 'Selected' : ''}</span>
                              <strong>{subject.name}</strong>
                              <small>{subject.code}</small>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </Col>

                  {examFormData.subjects.length > 0 && (
                    <Col md={12}>
	                      <h6>Selected Subjects</h6>
                      <ListGroup>
                        {examFormData.subjects.map((subj, index) => {
                          const subject = subjects.find(s => s._id === subj.subject);
                          return (
                            <ListGroup.Item key={index} className="exam-subject-item exam-subject-config">
                              <div className="exam-subject-config-main">
                                <strong>{subject?.name}</strong> ({subject?.code})
                                <div className="exam-subject-number-grid">
                                  <Form.Group><Form.Label>Full marks</Form.Label><Form.Control type="number" min="1" value={subj.maxMarks} onChange={e => updateSubjectConfig(subj.subject, { maxMarks: Number(e.target.value) })} /></Form.Group>
                                  <Form.Group><Form.Label>Pass marks</Form.Label><Form.Control type="number" min="0" max={subj.maxMarks} value={subj.passingMarks} onChange={e => updateSubjectConfig(subj.subject, { passingMarks: Number(e.target.value) })} /></Form.Group>
                                </div>
                                <label className={`exam-toggle-card compact ${subj.useDivisions ? 'is-selected' : ''}`}>
                                  <Form.Check type="switch" checked={Boolean(subj.useDivisions)} onChange={e => updateSubjectConfig(subj.subject, {
                                    useDivisions: e.target.checked,
                                    maxMarks: e.target.checked ? 100 : subj.maxMarks,
                                    divisions: e.target.checked ? Array.from({ length: 10 }, (_, i) => ({ name: `Division ${i + 1}`, maxMarks: 10, order: i + 1 })) : []
                                  })} />
                                  <span className="exam-toggle-copy"><strong>10-division marking</strong><small>10 divisions, 10 marks each</small></span>
                                </label>
                                <details className="subject-access-details">
                                  <summary>Teacher access ({subj.teacherAccess?.length || 0})</summary>
                                  <p>Choose Edit marks, View only, or No access for this subject.</p>
                                  <div className="subject-access-grid">{teachers.map(teacher => {
                                    const id = getTeacherUserId(teacher);
                                    const assigned = subj.teacherAccess?.find(link => (link.teacher?._id || link.teacher) === id)?.permission || '';
                                    return <label key={id}><span>{getTeacherName(teacher)}</span><Form.Select size="sm" value={assigned} onChange={e => setSubjectTeacherPermission(subj.subject, id, e.target.value)}><option value="">No access</option><option value="view">View only</option><option value="edit">Edit marks</option></Form.Select></label>;
                                  })}</div>
                                </details>
                              </div>
                              <Badge bg={subj.useDivisions ? 'info' : 'light'} text={subj.useDivisions ? undefined : 'dark'}>{subj.useDivisions ? '10 divisions' : `${subj.maxMarks} marks`}</Badge>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </Col>
                  )}
                  </Row>
                </div>
              </Tab>

              {/* Additional Info Tab */}
              <Tab eventKey="access" title="Teacher Access">
                <Row className="g-3">
                  <Col md={12}>
                    <Card className="exam-option-card">
                      <Card.Body>
                        <h6 className="mb-2">Automatic Access</h6>
                        <p className="text-muted mb-0">
                          Admin, Principal, Coordinator, Veda/Shakha assigned teachers, and subject teachers should get exam access automatically based on the selected audience and subjects.
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={12}>
                    <div className="exam-field-card">
                      <div className="field-card-header">
                        <div>
                          <h6>Extra Teachers With Access</h6>
                          <p>Use this for external examiners, substitute teachers, or anyone who needs direct access beyond normal assignments.</p>
                        </div>
                        <Badge bg="primary">{examFormData.accessTeachers.length} selected</Badge>
                      </div>
                      <OptionTileGrid
                        items={teachers.map(teacher => ({
                          ...teacher,
                          value: getTeacherUserId(teacher),
                          label: getTeacherName(teacher),
                          meta: teacher.user?.email || teacher.email || teacher.role || 'Teacher'
                        }))}
                        selected={examFormData.accessTeachers}
                        onToggle={(value) => toggleArrayValue('accessTeachers', value)}
                        getLabel={(teacher) => teacher.label}
                        getMeta={(teacher) => teacher.meta}
                        emptyText="No active teachers found."
                        columns="teacher"
                      />
                    </div>
                  </Col>
                </Row>
              </Tab>

              {/* Additional Info Tab */}
              <Tab eventKey="additional" title="Additional">
                <Row className="g-3">
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
      <Modal show={showSubjectModal} onHide={() => setShowSubjectModal(false)} scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Add New Subject</Modal.Title>
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
      <Modal show={showSubjectsListModal} onHide={() => setShowSubjectsListModal(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>All Subjects</Modal.Title>
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
                            Delete
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
              Add New Subject
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Manage Marks Modal */}
      <Modal show={showMarksModal} onHide={() => setShowMarksModal(false)} size="xl" fullscreen="sm-down" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Manage Marks - {selectedExam?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="marks-summary-grid mb-3">
            <div className="marks-summary-card">
              <span>Total Students</span>
              <strong>{resultSummary.totalStudents}</strong>
            </div>
            <div className="marks-summary-card">
              <span>Marks Entered</span>
              <strong>{resultSummary.enteredCount}</strong>
            </div>
            <div className="marks-summary-card">
              <span>Passed</span>
              <strong>{resultSummary.passedCount}</strong>
            </div>
            <div className="marks-summary-card">
              <span>Average</span>
              <strong>{resultSummary.average.toFixed(1)}%</strong>
            </div>
          </div>

          <Tabs defaultActiveKey="subject-entry" className="mb-3">
            <Tab eventKey="overview" title="Result Overview">
              <Row className="g-3">
                <Col lg={7}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Subject Performance</h6>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <Table hover className="mb-0">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Entered</th>
                              <th>Average</th>
                              <th>Passed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultSummary.subjectSummaries.map(subject => (
                              <tr key={subject.id}>
                                <td><strong>{subject.name}</strong></td>
                                <td>{subject.entered}/{resultSummary.totalStudents}</td>
                                <td>{subject.average.toFixed(1)}%</td>
                                <td>{subject.passCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col lg={5}>
                  <Card>
                    <Card.Header>
                      <h6 className="mb-0">Top Students</h6>
                    </Card.Header>
                    <Card.Body>
                      <div className="marks-rank-list">
                        {resultSummary.topStudents.length > 0 ? (
                          resultSummary.topStudents.map((mark, index) => (
                            <div key={mark._id} className="marks-rank-row">
                              <span>{index + 1}</span>
                              <div>
                                <strong>{mark.student?.fullName}</strong>
                                <small>{mark.student?.admissionNo}</small>
                              </div>
                              <Badge bg={mark.isPassed ? 'success' : 'danger'}>
                                {mark.overallPercentage?.toFixed(1)}%
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted mb-0">Marks have not been entered yet.</p>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab>

            <Tab eventKey="subject-entry" title="Subject Entry">
              <Card className="marks-entry-panel">
                <Card.Body>
                  <Row className="g-3 align-items-end mb-3">
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label>Subject</Form.Label>
                        <Form.Select
                          value={selectedSubjectForEntry}
                          onChange={(e) => setSelectedSubjectForEntry(e.target.value)}
                        >
                          {selectedExam?.subjects?.map(subjectConfig => {
                            const subjectId = getSubjectId(subjectConfig);
                            return (
                              <option key={subjectId} value={subjectId}>
                                {getSubjectName(subjectConfig)} ({subjectConfig.maxMarks || 100} marks)
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Search Students</Form.Label>
                        <Form.Control
                          value={marksSearch}
                          onChange={(e) => setMarksSearch(e.target.value)}
                          placeholder="Name or admission no..."
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Button
                        variant="primary"
                        className="w-100"
                        onClick={handleSaveSubjectMarks}
                        disabled={savingSubjectMarks || !selectedSubjectForEntry || !canEditSelectedSubject}
                      >
                        {savingSubjectMarks ? 'Saving...' : canEditSelectedSubject ? 'Save Subject Marks' : 'View only'}
                      </Button>
                    </Col>
                  </Row>

                  <div className="marks-grid-table">
                    <Table hover className="mb-0">
                      <thead>
                        <tr>
                          <th>Admission</th>
                          <th>Student</th>
                          <th>Veda / Shakha</th>
                          <th style={{ width: '150px' }}>Marks</th>
                          <th style={{ width: '130px' }}>Present</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEligibleStudents.map(student => (
                          <tr key={student._id}>
                            <td><strong>{student.admissionNo}</strong></td>
                            <td>
                              <strong>{student.fullName}</strong>
                              {student.currentStandard && <small className="d-block text-muted">{student.currentStandard}</small>}
                            </td>
                            <td>
                              <Badge bg="primary" className="me-1">{student.department?.name || 'N/A'}</Badge>
                              {student.subDepartments?.slice(0, 1).map(sd => (
                                <Badge key={sd._id} bg="secondary">{sd.name}</Badge>
                              ))}
                            </td>
                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                max={selectedSubjectMaxMarks}
                                value={subjectMarksGrid[student._id]?.marksObtained ?? ''}
                                disabled={!canEditSelectedSubject}
                                onChange={(e) => handleSubjectGridChange(student._id, 'marksObtained', e.target.value)}
                                placeholder={`/${selectedSubjectMaxMarks}`}
                              />
                            </td>
                            <td>
                              <Form.Check
                                type="switch"
                                label={subjectMarksGrid[student._id]?.isPresent === false ? 'Absent' : 'Present'}
                                checked={subjectMarksGrid[student._id]?.isPresent !== false}
                                disabled={!canEditSelectedSubject}
                                onChange={(e) => handleSubjectGridChange(student._id, 'isPresent', e.target.checked)}
                                className="presence-switch"
                              />
                            </td>
                            <td>
                              <Form.Control
                                value={subjectMarksGrid[student._id]?.remarks || ''}
                                disabled={!canEditSelectedSubject}
                                onChange={(e) => handleSubjectGridChange(student._id, 'remarks', e.target.value)}
                                placeholder="Optional"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="students" title={`Students (${eligibleStudents.length})`}>
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
                              {hasMarks ? 'Entered' : 'Pending'}
                            </Badge>
                            <Button
                              variant={hasMarks ? 'outline-primary' : 'primary'}
                              size="sm"
                              onClick={() => handleEnterMarks(student)}
                            >
                              {hasMarks ? 'Edit' : 'Enter'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Tab>
            <Tab eventKey="marks" title={`Entered Marks (${examMarks.length})`}>
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
      <Modal show={showMarksEntryModal} onHide={() => setShowMarksEntryModal(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            Enter Marks - {selectedStudent?.fullName}
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
                  className="presence-switch presence-switch-card"
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
                                    <Badge bg="success" className="ms-2">Pass</Badge>
                                  ) : (
                                    <Badge bg="danger" className="ms-2">Fail</Badge>
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
                                    <Badge bg="success">Pass</Badge>
                                  ) : (
                                    <Badge bg="danger">Fail</Badge>
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
