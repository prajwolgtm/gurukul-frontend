import api from './client';

// Academic Structure API Service
export const academicAPI = {
  // Departments
  getDepartments: async () => {
    const response = await api.get('/academic/departments');
    return response.data;
  },

  createDepartment: async (departmentData) => {
    const response = await api.post('/academic/departments', departmentData);
    return response.data;
  },

  // Sub-Departments
  getSubDepartments: async (departmentId) => {
    const response = await api.get(`/academic/departments/${departmentId}/sub-departments`);
    return response.data;
  },

  createSubDepartment: async (departmentId, subDepartmentData) => {
    const response = await api.post(`/academic/departments/${departmentId}/sub-departments`, subDepartmentData);
    return response.data;
  },

  // Batches
  getDepartmentBatches: async (departmentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/academic/departments/${departmentId}/batches?${queryString}`);
    return response.data;
  },

  getSubDepartmentBatches: async (subDepartmentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/academic/sub-departments/${subDepartmentId}/batches?${queryString}`);
    return response.data;
  },

  createBatch: async (batchData) => {
    const response = await api.post('/academic/batches', batchData);
    return response.data;
  },

  // Complete Structure
  getAcademicStructure: async () => {
    const response = await api.get('/academic/structure');
    return response.data;
  }
};

export default academicAPI;
