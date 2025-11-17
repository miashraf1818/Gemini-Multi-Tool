export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
export type AspectRatio = typeof ASPECT_RATIOS[number];

// New types for BillScanner
export interface BillItem {
  name: string;
  quantity: number | string;
  price: number | string;
  // Formatting for name
  nameBold?: boolean;
  nameItalic?: boolean;
  nameUnderline?: boolean;
  // Formatting for quantity
  quantityBold?: boolean;
  quantityItalic?: boolean;
  quantityUnderline?: boolean;
  // Formatting for price
  priceBold?: boolean;
  priceItalic?: boolean;
  priceUnderline?: boolean;
}

export interface BillData {
  items: BillItem[];
  total: number | string;
  // Formatting for total
  totalBold?: boolean;
  totalItalic?: boolean;
  totalUnderline?: boolean;
}

export interface ScanHistoryItem {
  id: string;
  imageDataUrl: string;
  billData: BillData;
  timestamp: number;
}
