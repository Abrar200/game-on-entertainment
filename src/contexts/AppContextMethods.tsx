import { supabase } from '@/lib/supabase';

interface Machine {
  id: string;
  name: string;
  type: string;
  venue_id?: string | null;
  status: string;
  image_url?: string;
  earnings?: number;
  venue?: any;
  current_prize_id?: string | null;
  current_prize?: any;
  serial_number?: string;
  barcode?: string;
}

// Enhanced machine finding with barcode generation and matching
export const findMachineByBarcode = async (barcode: string): Promise<Machine> => {
  console.log('🔍 Finding machine for barcode:', barcode);
  
  try {
    // Step 1: Try exact barcode match first
    const { data: exactMatch, error: exactError } = await supabase
      .from('machines')
      .select('*, venues(*), prizes(*)')
      .eq('barcode', barcode)
      .maybeSingle();
    
    if (exactMatch) {
      console.log('✅ Exact barcode match found:', exactMatch.name);
      return formatMachine(exactMatch);
    }
    
    // Step 2: Get all machines for comprehensive matching
    const { data: allMachines, error: allError } = await supabase
      .from('machines')
      .select('*, venues(*), prizes(*)');
    
    if (allError) {
      console.error('Database error:', allError);
      throw new Error('Database error: ' + allError.message);
    }
    
    if (!allMachines || allMachines.length === 0) {
      throw new Error('No machines found in database');
    }
    
    console.log('📊 Searching through', allMachines.length, 'machines');
    
    // Step 3: Enhanced matching with multiple strategies
    const searchTerm = barcode.toLowerCase().trim();
    let foundMachine = null;
    let matchScore = 0;
    
    for (const machine of allMachines) {
      let currentScore = 0;
      
      // Generate the expected barcode for this machine
      const expectedBarcode = generateMachineBarcode(machine);
      
      console.log(`🔍 Machine: ${machine.name}, Expected: ${expectedBarcode}, Scanned: ${searchTerm}`);
      
      // Exact matches (highest priority)
      if (machine.barcode?.toLowerCase() === searchTerm) currentScore += 100;
      if (expectedBarcode.toLowerCase() === searchTerm) currentScore += 95;
      if (machine.serial_number?.toLowerCase() === searchTerm) currentScore += 90;
      if (machine.name.toLowerCase().replace(/\s+/g, '') === searchTerm.replace(/\s+/g, '')) currentScore += 85;
      if (machine.id.toLowerCase() === searchTerm) currentScore += 80;
      
      // Partial matches (medium priority)
      if (machine.name.toLowerCase().includes(searchTerm)) currentScore += 50;
      if (searchTerm.includes(machine.name.toLowerCase().replace(/\s+/g, ''))) currentScore += 45;
      if (machine.barcode?.toLowerCase().includes(searchTerm)) currentScore += 40;
      if (expectedBarcode.toLowerCase().includes(searchTerm)) currentScore += 35;
      
      // Pattern matching for common barcode formats
      const barcodePatterns = [
        /^(machine|device|unit|equip|arcade|game|claw|prize)_/i,
        /^mac[a-z0-9]{4,}/i,
        /^[a-z]{3,}_[0-9]{3,}/i
      ];
      
      for (const pattern of barcodePatterns) {
        if (pattern.test(searchTerm)) {
          currentScore += 30;
          break;
        }
      }
      
      // Fuzzy matching for similar names
      const similarity = calculateStringSimilarity(machine.name.toLowerCase(), searchTerm);
      if (similarity > 0.7) {
        currentScore += Math.floor(similarity * 25);
      }
      
      if (currentScore > matchScore) {
        matchScore = currentScore;
        foundMachine = machine;
      }
    }
    
    // Accept matches with score >= 30
    if (!foundMachine || matchScore < 30) {
      throw new Error(`No machine found matching barcode: ${barcode}`);
    }
    
    console.log('✅ Best match found:', foundMachine.name, 'Score:', matchScore);
    
    // Update the machine's barcode if it doesn't have one
    if (!foundMachine.barcode) {
      const newBarcode = generateMachineBarcode(foundMachine);
      await supabase
        .from('machines')
        .update({ barcode: newBarcode })
        .eq('id', foundMachine.id);
      
      foundMachine.barcode = newBarcode;
      console.log('📝 Updated machine barcode:', newBarcode);
    }
    
    return formatMachine(foundMachine);
    
  } catch (error: any) {
    console.error('❌ findMachineByBarcode error:', error);
    throw error;
  }
};

// Calculate string similarity using Levenshtein distance
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  return 1 - distance / Math.max(len1, len2);
};

// Generate a consistent barcode for a machine
const generateMachineBarcode = (machine: Machine): string => {
  // Use existing barcode if available
  if (machine.barcode) {
    return machine.barcode;
  }
  
  // Generate barcode based on machine properties
  const prefix = 'MAC';
  const machineId = machine.id.slice(-6).toUpperCase();
  const nameCode = machine.name
    .replace(/[^A-Z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, '0');
  
  return `${prefix}${nameCode}${machineId}`;
};

// Format machine object consistently
const formatMachine = (machine: any): Machine => {
  return {
    ...machine,
    venue: Array.isArray(machine.venues) ? machine.venues[0] : machine.venues,
    current_prize: Array.isArray(machine.prizes) ? machine.prizes[0] : machine.prizes
  };
};