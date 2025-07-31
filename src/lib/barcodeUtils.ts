// src/lib/barcodeUtils.ts

export interface BarcodeValidation {
  isValid: boolean;
  error?: string;
}

export const validateBarcodeValue = (value: string): BarcodeValidation => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Barcode value is required' };
  }

  if (value.length < 3) {
    return { isValid: false, error: 'Barcode must be at least 3 characters long' };
  }

  if (value.length > 48) {
    return { isValid: false, error: 'Barcode cannot exceed 48 characters' };
  }

  // Check for valid Code 128 characters
  const validCode128Regex = /^[\x20-\x7E]+$/; // Printable ASCII characters
  if (!validCode128Regex.test(value)) {
    return { isValid: false, error: 'Barcode contains invalid characters' };
  }

  return { isValid: true };
};

export const generateBarcodeOptions = () => {
  return {
    format: "CODE128",
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 12,
    textAlign: "center" as const,
    textPosition: "bottom" as const,
    background: "#ffffff",
    lineColor: "#000000",
    margin: 10,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10
  };
};

export const formatBarcodeForDisplay = (barcode: string): string => {
  if (!barcode) return '';

  // Add spaces every 4 characters for better readability
  return barcode.replace(/(.{4})/g, '$1 ').trim();
};

export const generateMachineBarcode = (name: string, serialNumber: string): string => {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  const cleanSerial = serialNumber?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || '';
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}_${cleanSerial}_${timestamp}_${random}`;
};

export const parseBarcodeData = (barcode: string): { name?: string, serial?: string, timestamp?: string } => {
  const parts = barcode.split('_');

  if (parts.length >= 3) {
    return {
      name: parts[0],
      serial: parts[1],
      timestamp: parts[2]
    };
  }

  return {};
};