import * as XLSX from 'xlsx';

/**
 * Generate and download Excel template for student bulk upload
 * Matches user's exact field names
 */
export const downloadStudentTemplate = () => {
  // Sample data for template - matching user's exact column names
  const templateData = [
    {
      'Admission no': 'ADM001',
      'Full Name': 'Sample Student Name',
      'D O B': '2005-01-15',
      'Age': '', // Calculated field, leave empty
      'Blood Group': 'A+',
      'Shaakha': 'Department Name Here', // This maps to department name
      'Gothra': 'Bharadwaja',
      'Telephone / Mobile No': '9876543210',
      'Father Name': "Father's Name",
      'Mother Name': "Mother's Name",
      'Occupation': 'Engineer',
      'Nationality': 'Indian',
      'Religion': 'Hindu',
      'Caste': 'Brahmin',
      'Mother Tongue': 'Sanskrit',
      'Present Address': '123 Main Street, City, State',
      'Permanent Address': '123 Main Street, City, State',
      'Last School Attended': 'Previous School Name',
      'Last Standard Studied': '9th',
      'T C details': 'TC-12345',
      'Admitted to Standard': '10th',
      'Date of Admission': '2023-04-01',
      'Stay Duration': '', // Calculated field, leave empty
      'Current Standard': '10th',
      'Remarks': 'Sample remarks'
    }
  ];

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // Admission no
    { wch: 25 }, // Full Name
    { wch: 12 }, // D O B
    { wch: 8 },  // Age
    { wch: 12 }, // Blood Group
    { wch: 25 }, // Shaakha (Department)
    { wch: 15 }, // Gothra
    { wch: 18 }, // Telephone / Mobile No
    { wch: 20 }, // Father Name
    { wch: 20 }, // Mother Name
    { wch: 15 }, // Occupation
    { wch: 12 }, // Nationality
    { wch: 12 }, // Religion
    { wch: 15 }, // Caste
    { wch: 15 }, // Mother Tongue
    { wch: 35 }, // Present Address
    { wch: 35 }, // Permanent Address
    { wch: 22 }, // Last School Attended
    { wch: 20 }, // Last Standard Studied
    { wch: 15 }, // T C details
    { wch: 20 }, // Admitted to Standard
    { wch: 18 }, // Date of Admission
    { wch: 15 }, // Stay Duration
    { wch: 15 }, // Current Standard
    { wch: 30 }  // Remarks
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Download
  XLSX.writeFile(workbook, 'student_upload_template.xlsx');
};

/**
 * Validate Excel file structure before upload
 */
export const validateExcelStructure = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'));
          return;
        }
        
        const headers = jsonData[0].map(h => h?.toString() || '').filter(h => h);
        
        // Helper function to normalize strings for comparison (same as backend)
        const normalize = (str) => {
          if (!str) return '';
          return str.toString().toLowerCase()
            .replace(/[\s\t\n\r]+/g, ' ')
            .replace(/[\/\_\-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        };
        
        const normalizeNoSpaces = (str) => {
          if (!str) return '';
          return normalize(str).replace(/\s/g, '');
        };
        
        // Helper to check if a header matches a required column
        const headerMatches = (header, requiredColumn) => {
          const normalizedHeader = normalize(header);
          const normalizedRequired = normalize(requiredColumn);
          const normalizedHeaderNoSpaces = normalizeNoSpaces(header);
          const normalizedRequiredNoSpaces = normalizeNoSpaces(requiredColumn);
          
          // Exact match
          if (normalizedHeader === normalizedRequired) return true;
          
          // Match without spaces
          if (normalizedHeaderNoSpaces === normalizedRequiredNoSpaces) return true;
          
          // One contains the other
          if (normalizedHeader.includes(normalizedRequired) || 
              normalizedRequired.includes(normalizedHeader)) return true;
          
          // Match without spaces (contains)
          if (normalizedHeaderNoSpaces.includes(normalizedRequiredNoSpaces) || 
              normalizedRequiredNoSpaces.includes(normalizedHeaderNoSpaces)) return true;
          
          return false;
        };
        
        // Required columns with all possible variations
        const requiredColumnGroups = [
          ['Admission no', 'admission no', 'admissionno', 'admission_no', 'admission number'],
          ['Full Name', 'full name', 'fullname', 'full_name', 'name'],
          ['D O B', 'd o b', 'DOB', 'dob', 'dateofbirth', 'date of birth'],
          ['Blood Group', 'blood group', 'bloodgroup', 'blood_group', 'blood'],
          ['Shaakha', 'shaakha', 'shakha'],
          ['Gothra', 'gothra', 'gotra'],
          ['Telephone / Mobile No', 'telephone / mobile no', 'telephone/mobile no', 'telephone', 'mobile', 'phone'],
          ['Father Name', 'father name', 'fathername', 'father_name', 'father'],
          ['Occupation', 'occupation'],
          ['Admitted to Standard', 'admitted to standard', 'admittedtostandard', 'admitted_to_standard'],
          ['Date of Admission', 'date of admission', 'dateofadmission', 'date_of_admission', 'doa']
        ];
        
        // Check if at least one variation of each required column exists
        const missingColumns = [];
        
        requiredColumnGroups.forEach((group, index) => {
          const found = headers.some(header => 
            group.some(required => headerMatches(header, required))
          );
          
          if (!found) {
            // Use the first (most common) name for error message
            missingColumns.push(group[0]);
          }
        });
        
        if (missingColumns.length > 0) {
          reject(new Error(`Missing required columns: ${missingColumns.join(', ')}. Found columns: ${headers.join(', ')}`));
          return;
        }
        
        resolve({
          valid: true,
          rowCount: jsonData.length - 1, // Exclude header
          headers
        });
      } catch (error) {
        reject(new Error(`Invalid Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

