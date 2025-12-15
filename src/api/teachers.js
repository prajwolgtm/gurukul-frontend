import api from './client';

// Teachers API Service
export const teachersAPI = {
  // Get all teachers with filtering
  getTeachers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/teachers?${queryString}`);
    return response.data;
  },

  // Get single teacher by ID
  getTeacher: async (id) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },

  // Create new teacher
  createTeacher: async (teacherData) => {
    const response = await api.post('/teachers', teacherData);
    return response.data;
  },

  // Update teacher
  updateTeacher: async (id, teacherData) => {
    const response = await api.put(`/teachers/${id}`, teacherData);
    return response.data;
  },

  // Verify teacher account
  verifyTeacher: async (id) => {
    const response = await api.put(`/teachers/${id}/verify`);
    return response.data;
  },

  // Update teacher assignments
  updateTeacherAssignments: async (id, assignmentData) => {
    const response = await api.put(`/teachers/${id}/assignments`, assignmentData);
    return response.data;
  },

  // Delete teacher
  deleteTeacher: async (id) => {
    const response = await api.delete(`/teachers/${id}`);
    return response.data;
  }
};

// Teacher Assignments API Service
export const teacherAssignmentsAPI = {
  // Get all teacher assignments
  getAssignments: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/teacher-assignments?${queryString}`);
    return response.data;
  },

  // Get single assignment
  getAssignment: async (id) => {
    const response = await api.get(`/teacher-assignments/${id}`);
    return response.data;
  },

  // Create new assignment
  createAssignment: async (assignmentData) => {
    const response = await api.post('/teacher-assignments', assignmentData);
    return response.data;
  },

  // Update assignment
  updateAssignment: async (id, assignmentData) => {
    const response = await api.put(`/teacher-assignments/${id}`, assignmentData);
    return response.data;
  },

  // Delete assignment
  deleteAssignment: async (id) => {
    const response = await api.delete(`/teacher-assignments/${id}`);
    return response.data;
  },

  // Get assignments for specific teacher
  getTeacherAssignments: async (teacherId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/teacher-assignments/teacher/${teacherId}?${queryString}`);
    return response.data;
  },

  // Get assignment statistics
  getAssignmentStats: async () => {
    const response = await api.get('/teacher-assignments/stats/overview');
    return response.data;
  }
};

export default teachersAPI;
