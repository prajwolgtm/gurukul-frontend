import api from './client';

// Student Management API Service
export const studentManagementAPI = {
  // Create a new student
  createStudent: async (studentData) => {
    const response = await api.post('/student-management/students', studentData);
    return response.data;
  },

  // Assign student to department and batch
  assignStudent: async (assignmentData) => {
    const response = await api.post('/student-management/assign', assignmentData);
    return response.data;
  },

  // Get all students with assignments
  getStudents: async () => {
    const response = await api.get('/student-management/students');
    return response.data;
  },

  // Get all departments
  getDepartments: async () => {
    const response = await api.get('/student-management/departments');
    return response.data;
  },

  // Get sub-departments for a department
  getSubDepartments: async (departmentId) => {
    const response = await api.get(`/student-management/departments/${departmentId}/sub-departments`);
    return response.data;
  },

  // Get batches for a department
  getDepartmentBatches: async (departmentId) => {
    const response = await api.get(`/student-management/departments/${departmentId}/batches`);
    return response.data;
  },

  // Get batches for a sub-department
  getSubDepartmentBatches: async (subDepartmentId) => {
    const response = await api.get(`/student-management/sub-departments/${subDepartmentId}/batches`);
    return response.data;
  }
};

export default studentManagementAPI;
