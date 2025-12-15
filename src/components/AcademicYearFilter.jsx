import React, { useState, useEffect } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { getCurrentAcademicYear, getAcademicYearList } from '../api/academicYear';

/**
 * Reusable Academic Year Filter Component
 * @param {Object} props
 * @param {string} props.value - Current selected academic year
 * @param {function} props.onChange - Callback when academic year changes
 * @param {boolean} props.showAllOption - Show "Show All Years" option (default: true)
 * @param {boolean} props.includeCurrentLabel - Include "(Current)" label (default: true)
 */
const AcademicYearFilter = ({ 
  value, 
  onChange, 
  showAllOption = true,
  includeCurrentLabel = true,
  size = 'md',
  label = 'Academic Year'
}) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAcademicYearData();
  }, []);

  const loadAcademicYearData = async () => {
    try {
      // Load current academic year
      const currentYearResponse = await getCurrentAcademicYear();
      if (currentYearResponse.success) {
        const currentYearValue = currentYearResponse.data.academicYear;
        setCurrentYear(currentYearValue);
        
        // If no value is set, default to current year
        if (!value && onChange) {
          onChange(currentYearValue);
        }
      }
      
      // Load academic year list
      const yearsResponse = await getAcademicYearList(5, 2);
      if (yearsResponse.success) {
        setAcademicYears(yearsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading academic year data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    if (onChange) {
      onChange(selectedValue === 'all' ? '' : selectedValue);
    }
  };

  if (loading) {
    return (
      <Form.Group>
        <Form.Label>{label}</Form.Label>
        <Form.Select size={size} disabled>
          <option>Loading...</option>
        </Form.Select>
      </Form.Group>
    );
  }

  return (
    <Form.Group>
      <Form.Label>{label}</Form.Label>
      <InputGroup>
        <Form.Select
          size={size}
          value={value || (showAllOption ? 'all' : currentYear)}
          onChange={handleChange}
        >
          {showAllOption && (
            <option value="all">Show All Years</option>
          )}
          {academicYears.map(year => (
            <option key={year.value} value={year.value}>
              {includeCurrentLabel ? year.label : year.value}
            </option>
          ))}
        </Form.Select>
      </InputGroup>
    </Form.Group>
  );
};

export default AcademicYearFilter;
