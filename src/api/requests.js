import api from './client';

// Leave Requests
export const getLeaveRequests = async (params = {}) => {
  const { data } = await api.get('/requests/leave', { params });
  return data;
};

export const createLeaveRequest = async (leaveData) => {
  const { data } = await api.post('/requests/leave', leaveData);
  return data;
};

export const updateLeaveRequest = async (id, leaveData) => {
  const { data } = await api.put(`/requests/leave/${id}`, leaveData);
  return data;
};

export const deleteLeaveRequest = async (id) => {
  const { data } = await api.delete(`/requests/leave/${id}`);
  return data;
};

export const reviewLeaveRequest = async (id, reviewData) => {
  const { data } = await api.put(`/requests/leave/${id}/review`, reviewData);
  return data;
};

// Visit Requests
export const getVisitRequests = async (params = {}) => {
  const { data } = await api.get('/requests/visit', { params });
  return data;
};

export const createVisitRequest = async (visitData) => {
  const { data } = await api.post('/requests/visit', visitData);
  return data;
};

export const updateVisitRequest = async (id, visitData) => {
  const { data } = await api.put(`/requests/visit/${id}`, visitData);
  return data;
};

export const deleteVisitRequest = async (id) => {
  const { data } = await api.delete(`/requests/visit/${id}`);
  return data;
};

export const reviewVisitRequest = async (id, reviewData) => {
  const { data } = await api.put(`/requests/visit/${id}/review`, reviewData);
  return data;
};

export const rescheduleLeaveRequest = async (id, rescheduleData) => {
  const { data } = await api.put(`/requests/leave/${id}/reschedule`, rescheduleData);
  return data;
};

export const rescheduleVisitRequest = async (id, rescheduleData) => {
  const { data } = await api.put(`/requests/visit/${id}/reschedule`, rescheduleData);
  return data;
};

// Dashboard summary
export const getRequestsDashboard = async () => {
  const { data } = await api.get('/requests/dashboard');
  return data;
};
