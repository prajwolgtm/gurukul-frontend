import api from './client';

// Account Management API
export const resetPassword = async (email, newPassword) => {
  const { data } = await api.post('/account-management/reset-password', {
    email,
    newPassword
  });
  return data;
};

export const fixDoubleHashedPassword = async (email, newPassword) => {
  const { data } = await api.post('/account-management/fix-double-hashed-passwords', {
    email,
    newPassword
  });
  return data;
};

export const verifyAccountByEmail = async (email) => {
  const { data } = await api.post('/account-management/verify-by-email', {
    email
  });
  return data;
};

export const getPendingAccounts = async () => {
  const { data } = await api.get('/account-management/pending-accounts');
  return data;
};

export const getAllAccounts = async (filters = {}) => {
  const { data } = await api.get('/account-management/all-accounts', { params: filters });
  return data;
};

export const syncTeacherVerification = async () => {
  const { data } = await api.post('/account-management/sync-teacher-verification');
  return data;
};
