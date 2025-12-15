import api from './client';

// Get all departments
export const getDepartments = async () => {
  const { data } = await api.get('/departments');
  return data;
};

// Get department structure (departments + sub-departments + batches)
export const getDepartmentStructure = async () => {
  const { data } = await api.get('/departments/structure');
  return data;
};

// Get all sub-departments (optional: filter by departmentId)
export const getSubDepartments = async (departmentId = null) => {
  const url = departmentId 
    ? `/departments/sub-departments?departmentId=${departmentId}`
    : '/departments/sub-departments';
  const { data } = await api.get(url);
  return data;
};

// Create new department
export const createDepartment = async (departmentData) => {
  const { data } = await api.post('/departments', departmentData);
  return data;
};

// Update department
export const updateDepartment = async (id, departmentData) => {
  const { data } = await api.put(`/departments/${id}`, departmentData);
  return data;
};

// Delete department
export const deleteDepartment = async (id) => {
  const { data } = await api.delete(`/departments/${id}`);
  return data;
};

// Create sub-department
export const createSubDepartment = async (subDepartmentData) => {
  // Extract departmentId from the data and include it in the URL path
  const { department: departmentId, ...restData } = subDepartmentData;
  if (!departmentId) {
    throw new Error('Department ID is required to create a sub-department');
  }
  const { data } = await api.post(`/departments/${departmentId}/sub-departments`, restData);
  return data;
};

// Update sub-department
export const updateSubDepartment = async (id, subDepartmentData) => {
  // Extract departmentId from the data and include it in the URL path
  const { department: departmentId, ...restData } = subDepartmentData;
  if (!departmentId) {
    throw new Error('Department ID is required to update a sub-department');
  }
  const { data } = await api.put(`/departments/${departmentId}/sub-departments/${id}`, restData);
  return data;
};

// Delete sub-department
export const deleteSubDepartment = async (id) => {
  const { data } = await api.delete(`/departments/sub-departments/${id}`);
  return data;
};

// Get all batches (optional: filter by departmentId, subDepartmentId, academicYear)
export const getBatches = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.subDepartmentId) params.append('subDepartmentId', filters.subDepartmentId);
  if (filters.academicYear) params.append('academicYear', filters.academicYear);
  if (filters.status) params.append('status', filters.status);
  
  const url = `/departments/batches${params.toString() ? `?${params.toString()}` : ''}`;
  const { data } = await api.get(url);
  return data;
};

// Create batch
export const createBatch = async (batchData) => {
  // Extract departmentId from the data and include it in the URL path
  const { department: departmentId, ...restData } = batchData;
  if (!departmentId) {
    throw new Error('Department ID is required to create a batch');
  }
  const { data } = await api.post(`/departments/${departmentId}/batches`, restData);
  return data;
};

// Update batch
export const updateBatch = async (id, batchData) => {
  // Extract departmentId from the data and include it in the URL path
  const { department: departmentId, ...restData } = batchData;
  if (!departmentId) {
    throw new Error('Department ID is required to update a batch');
  }
  const { data } = await api.put(`/departments/${departmentId}/batches/${id}`, restData);
  return data;
};

// Delete batch
export const deleteBatch = async (batchId, departmentId) => {
  if (!departmentId) {
    throw new Error('Department ID is required to delete a batch');
  }
  const { data } = await api.delete(`/departments/${departmentId}/batches/${batchId}`);
  return data;
};
