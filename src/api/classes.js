import api from './client';

// ==================== CLASS MANAGEMENT API ====================

// Get all classes with filtering
export const getClasses = async (params = {}) => {
  try {
    const response = await api.get('/classes', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get specific class details
export const getClass = async (classId) => {
  try {
    const response = await api.get(`/classes/${classId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create new class
export const createClass = async (classData) => {
  try {
    const response = await api.post('/classes', classData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update class
export const updateClass = async (classId, classData) => {
  try {
    const response = await api.put(`/classes/${classId}`, classData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete class
export const deleteClass = async (classId) => {
  try {
    const response = await api.delete(`/classes/${classId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add students to class
export const addStudentsToClass = async (classId, students) => {
  try {
    const response = await api.post(`/classes/${classId}/students`, { students });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Remove student from class
export const removeStudentFromClass = async (classId, studentId) => {
  try {
    const response = await api.delete(`/classes/${classId}/students/${studentId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ==================== CLASS ATTENDANCE API ====================

// Start attendance session
export const startAttendanceSession = async (sessionData) => {
  try {
    const response = await api.post('/class-attendance/start-session', sessionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Mark attendance for session
export const markAttendance = async (sessionId, attendanceData) => {
  try {
    const response = await api.post(`/class-attendance/${sessionId}/mark`, attendanceData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get class attendance sessions
export const getClassAttendanceSessions = async (classId, params = {}) => {
  try {
    const response = await api.get(`/class-attendance/class/${classId}`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get attendance session details
export const getAttendanceSession = async (sessionId) => {
  try {
    const response = await api.get(`/class-attendance/${sessionId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update attendance session
export const updateAttendanceSession = async (sessionId, sessionData) => {
  try {
    const response = await api.put(`/class-attendance/${sessionId}`, sessionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Finalize attendance session
export const finalizeAttendanceSession = async (sessionId) => {
  try {
    const response = await api.post(`/class-attendance/${sessionId}/finalize`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get attendance statistics
export const getAttendanceStatistics = async (classId, params = {}) => {
  try {
    const response = await api.get(`/class-attendance/statistics/${classId}`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  addStudentsToClass,
  removeStudentFromClass,
  startAttendanceSession,
  markAttendance,
  getClassAttendanceSessions,
  getAttendanceSession,
  updateAttendanceSession,
  finalizeAttendanceSession,
  getAttendanceStatistics
};
