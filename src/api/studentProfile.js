import api from './client';

const studentProfileAPI = {
  getProfile: (studentId) => api.get(`/student-profile/${studentId}`),
  addNote: (studentId, payload) => api.post(`/student-profile/${studentId}/notes`, payload),
  updateNote: (studentId, noteId, payload) => api.put(`/student-profile/${studentId}/notes/${noteId}`, payload),
  deleteNote: (studentId, noteId) => api.delete(`/student-profile/${studentId}/notes/${noteId}`),
  addWalletTransaction: (studentId, payload) =>
    api.post(`/student-profile/${studentId}/wallet/transactions`, payload),
  updateWalletTransaction: (studentId, txId, payload) =>
    api.put(`/student-profile/${studentId}/wallet/transactions/${txId}`, payload),
  getAttendanceReport: (studentId, params) =>
    api.get(`/student-profile/${studentId}/attendance-report`, { params })
};

export default studentProfileAPI;

