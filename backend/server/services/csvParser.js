// CSV Parser Utility - Handles exact template structure
export const parseCSVString = (csvContent) => {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header - handle exact template columns
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV values
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    if (values.length < 3) continue; // Skip if too few columns

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Skip if row has no name or email
    if (!row['name'] || !row['email']) continue;

    data.push(row);
  }

  return data;
};

export const mapCandidateColumns = (csvRow) => {
  // Normalize header keys for flexible matching
  const normalizeKey = (key) => key.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
  const normalizedRow = {};
  
  for (const [key, value] of Object.entries(csvRow)) {
    normalizedRow[normalizeKey(key)] = value;
  }

  // Map CSV columns to database columns with exact template handling
  return {
    role: normalizedRow['role'] || '',
    name: normalizedRow['name'] || '',
    contact: normalizedRow['contact'] || '',
    email: normalizedRow['email'] || '',
    experience: normalizedRow['experience'] || '',
    skills: normalizedRow['skills'] || '',
    current_ctc: normalizedRow['cctc'] || '',
    expected_ctc: normalizedRow['ectc'] || '',
    current_location: normalizedRow['current_location'] || '',
    preferred_location: normalizedRow['preferred_location'] || '',
    notice_period: normalizedRow['notice_period'] || '',
    offer_in_hand: normalizedRow['offer_in_hand'] || '',
    reason_for_change: normalizedRow['reason_for_change'] || '',
    current_company_name: normalizedRow['current_company_name'] || '',
    highest_qualification: normalizedRow['highest_qualification'] || '',
    address: normalizedRow['address_as_per_aadhaar'] || normalizedRow['address'] || '',
    technical_skills: normalizedRow['technical_skills'] || '',
    soft_skills: normalizedRow['soft_skills'] || '',
    linkedin: normalizedRow['linkedin'] || '',
    resume_link: normalizedRow['resume_link'] || '',
    other_1: normalizedRow['other_1'] || '',
    other_2: normalizedRow['other_2'] || ''
  };
};
