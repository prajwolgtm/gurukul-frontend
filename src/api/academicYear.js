import api from './client';

/**
 * Academic Year API
 */

// Get current academic year
export const getCurrentAcademicYear = async () => {
  try {
    const { data } = await api.get('/academic-year/current');
    return data;
  } catch (error) {
    console.error('Error fetching current academic year:', error);
    throw error;
  }
};

// Get list of academic years
export const getAcademicYearList = async (yearsBack = 5, yearsForward = 2) => {
  try {
    const { data } = await api.get(`/academic-year/list?yearsBack=${yearsBack}&yearsForward=${yearsForward}`);
    return data;
  } catch (error) {
    console.error('Error fetching academic year list:', error);
    throw error;
  }
};

// Validate academic year format
export const validateAcademicYear = async (year) => {
  try {
    const { data } = await api.get(`/academic-year/${year}/validate`);
    return data;
  } catch (error) {
    console.error('Error validating academic year:', error);
    throw error;
  }
};
