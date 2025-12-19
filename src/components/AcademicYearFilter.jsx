import React, { useState, useEffect } from 'react';
import { getCurrentAcademicYear, getAcademicYearList } from '../api/academicYear';

const AcademicYearFilter = ({ 
  value, 
  onChange, 
  showAllOption = true,
  size = 'md'
}) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAcademicYearData();
  }, []);

  const loadAcademicYearData = async () => {
    try {
      const currentYearResponse = await getCurrentAcademicYear();
      if (currentYearResponse.success) {
        const currentYearValue = currentYearResponse.data.academicYear;
        setCurrentYear(currentYearValue);
        if (!value && onChange) {
          onChange(currentYearValue);
        }
      }
      
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
      <select disabled className="w-full sm:w-auto px-4 py-3 text-base sm:text-sm border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-400 min-h-[48px] sm:min-h-[44px]">
        <option>Loading...</option>
      </select>
    );
  }

  return (
    <select
      value={value || (showAllOption ? 'all' : currentYear)}
      onChange={handleChange}
      className={`w-full sm:w-auto px-4 py-3 text-base sm:text-sm border-2 border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-500 cursor-pointer transition-all min-h-[48px] sm:min-h-[44px] font-medium ${
        size === 'sm' ? 'text-sm py-2 px-3' : ''
      }`}
    >
      {showAllOption && <option value="all">All Years</option>}
      {academicYears.map(year => (
        <option key={year.value} value={year.value}>
          {year.isCurrent ? `${year.value} (Current)` : year.value}
        </option>
      ))}
    </select>
  );
};

export default AcademicYearFilter;
