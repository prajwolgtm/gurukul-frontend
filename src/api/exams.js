import api from './client';

// Exam Management API Service
export const examsAPI = {
  // Subjects
  getSubjects: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/exam-management/subjects?${queryString}` : '/exam-management/subjects';
    const response = await api.get(url);
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/exam-management/subjects', subjectData);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/exam-management/subjects/${id}`);
    return response.data;
  },

  // Exams
  getExams: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/exam-management?${queryString}`);
    return response.data;
  },

  getExam: async (id) => {
    const response = await api.get(`/exam-management/${id}`);
    return response.data;
  },

  createExam: async (examData) => {
    const response = await api.post('/exam-management', examData);
    return response.data;
  },

  updateExam: async (id, examData) => {
    const response = await api.put(`/exam-management/${id}`, examData);
    return response.data;
  },

  deleteExam: async (id) => {
    const response = await api.delete(`/exam-management/${id}`);
    return response.data;
  },

  // Get students by entity (department, sub-department, batch, standard)
  getStudentsByEntity: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
    if (filters.subDepartmentId) queryParams.append('subDepartmentId', filters.subDepartmentId);
    if (filters.batchId) queryParams.append('batchId', filters.batchId);
    if (filters.standard) {
      // Support both single standard and array
      if (Array.isArray(filters.standard)) {
        filters.standard.forEach(s => queryParams.append('standard', s));
      } else {
        queryParams.append('standard', filters.standard);
      }
    }
    if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
    if (filters.search) queryParams.append('search', filters.search);
    
    const response = await api.get(`/classes/helpers/students-by-entity?${queryParams.toString()}`);
    return response.data;
  },

  // Get academic entities (departments, sub-departments, batches)
  getAcademicEntities: async () => {
    const response = await api.get('/academic/entities');
    return response.data;
  },

  // Get available teachers
  getAvailableTeachers: async () => {
    const response = await api.get('/users/teachers');
    return response.data;
  },

  // Get exam groups
  getExamGroups: async (examId) => {
    const response = await api.get(`/exam-management/${examId}/groups`);
    return response.data;
  },

  // Create exam group
  createExamGroup: async (examId, groupData) => {
    const response = await api.post(`/exam-management/${examId}/groups`, groupData);
    return response.data;
  },

  // Assign teachers to group
  assignGroupTeachers: async (examId, groupId, teacherIds) => {
    const response = await api.post(`/exam-management/${examId}/groups/${groupId}/teachers`, { teacherIds });
    return response.data;
  },

  // Manage group students
  manageGroupStudents: async (examId, groupId, studentIds) => {
    const response = await api.put(`/exam-management/${examId}/groups/${groupId}/students`, { studentIds });
    return response.data;
  }
};

// Exam Marks API Service
export const examMarksAPI = {
  // Get marks for an exam
  getExamMarks: async (examId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/exam-marks/exam/${examId}?${queryString}`);
    return response.data;
  },

  // Get marks for a student
  getStudentMarks: async (studentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/exam-marks-management/student/${studentId}?${queryString}`);
    return response.data;
  },

  // Get specific exam marks for student
  getExamStudentMarks: async (examId, studentId) => {
    const response = await api.get(`/exam-marks-management/${examId}/${studentId}`);
    return response.data;
  },

  // Create/Update exam marks
  saveExamMarks: async (marksData) => {
    const response = await api.post('/exam-marks-management', marksData);
    return response.data;
  },

  // Bulk save exam marks
  bulkSaveExamMarks: async (examId, marksData) => {
    const response = await api.post('/exam-marks-management/bulk', { examId, marksData });
    return response.data;
  },

  // Verify exam marks
  verifyExamMarks: async (id) => {
    const response = await api.put(`/exam-marks-management/${id}/verify`);
    return response.data;
  },

  // Publish exam marks
  publishExamMarks: async (id) => {
    const response = await api.put(`/exam-marks-management/${id}/publish`);
    return response.data;
  },

  // Delete exam marks
  deleteExamMarks: async (id) => {
    const response = await api.delete(`/exam-marks-management/${id}`);
    return response.data;
  },

  // Get exam statistics
  getExamStats: async (examId) => {
    const response = await api.get(`/exam-marks-management/stats/${examId}`);
    return response.data;
  },

  // Download PDF - Subject-wise marksheet
  downloadSubjectMarksheet: async (examId, subjectId) => {
    try {
      const response = await api.get(`/exam-reports/pdf/subject/${examId}/${subjectId}`, {
        responseType: 'blob'
      });
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `marksheet_subject_${examId}_${subjectId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  // Download PDF - Student-wise marksheet
  downloadStudentMarksheet: async (studentId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? 
        `/exam-reports/pdf/student/${studentId}?${queryString}` : 
        `/exam-reports/pdf/student/${studentId}`;
      const response = await api.get(url, {
        responseType: 'blob'
      });
      // Create download link
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      const filename = `marksheet_student_${studentId}${params.academicYear ? `_${params.academicYear}` : ''}${params.term ? `_${params.term}` : ''}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  // Download PDF - Complete exam report (all students, all subjects)
  downloadCompleteExamReport: async (examId) => {
    try {
      const response = await api.get(`/exam-reports/pdf/exam/${examId}`, {
        responseType: 'blob'
      });
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complete_exam_report_${examId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }
};

// Named exports for convenience
export const {
  getExams,
  createExam,
  getExam,
  getStudentsByEntity,
  getAcademicEntities,
  getAvailableTeachers,
  getExamGroups,
  createExamGroup,
  assignGroupTeachers,
  manageGroupStudents
} = examsAPI;

export default examsAPI;