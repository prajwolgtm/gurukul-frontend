import api from './client';

export const parentDashboardAPI = {
  // Get student basic information
  getStudentInfo: async () => {
    const response = await api.get('/parent-dashboard/student-info');
    return response.data;
  },

  // Get exam marks
  getExamMarks: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/parent-dashboard/exam-marks?${queryString}`);
    return response.data;
  },

  // Get transactions
  getTransactions: async () => {
    const response = await api.get('/parent-dashboard/transactions');
    return response.data;
  },

  // Get notes
  getNotes: async () => {
    const response = await api.get('/parent-dashboard/notes');
    return response.data;
  }
};

export default parentDashboardAPI;
