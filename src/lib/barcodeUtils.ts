// Barcode utility functions

export const isValidBarcodeCharacter = (char: string): boolean => {
  // CODE128 supports ASCII characters 0-127
  const code = char.charCodeAt(0);
  return code >= 32 && code <= 126;
};

export const validateBarcodeValue = (value: string): { isValid: boolean; error?: string } => {
  if (!value || value.length === 0) {
    return { isValid: false, error: 'Barcode value is empty' };
  }
  
  if (value.length > 48) {
    return { isValid: false, error: 'Barcode value too long (max 48 characters)' };
  }
  
  // Check for invalid characters
  for (let i = 0; i < value.length; i++) {
    if (!isValidBarcodeCharacter(value[i])) {
      return { isValid: false, error: `Invalid character '${value[i]}' at position ${i}` };
    }
  }
  
  return { isValid: true };
};

export const sanitizeBarcodeValue = (value: string): string => {
  // Remove any characters that are not valid for CODE128
  return value.split('').filter(char => isValidBarcodeCharacter(char)).join('');
};

export const generateBarcodeOptions = () => {
  return {
    format: "CODE128",
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14,
    textAlign: "center" as const,
    textPosition: "bottom" as const,
    textMargin: 2,
    fontOptions: "bold",
    font: "monospace",
    background: "#ffffff",
    lineColor: "#000000",
    margin: 10
  };
};