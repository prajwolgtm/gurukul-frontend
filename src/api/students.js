import api from './client';

// Students API Service
export const studentsAPI = {
  // Get all students with filtering and pagination
  getStudents: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/students?${queryString}`);
    return response.data;
  },

  // Get single student by ID
  getStudent: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  // Create new student
  createStudent: async (studentData) => {
    const response = await api.post('/students', studentData);
    return response.data;
  },

  // Update student
  updateStudent: async (id, studentData) => {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data;
  },

  // Delete student (soft delete)
  deleteStudent: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // Bulk upload students
  bulkUploadStudents: async (studentsData) => {
    const response = await api.post('/students/bulk-upload', { students: studentsData });
    return response.data;
  },

  // Get student statistics
  getStudentStats: async () => {
    const response = await api.get('/students/stats/overview');
    return response.data;
  }
};

export default studentsAPI;