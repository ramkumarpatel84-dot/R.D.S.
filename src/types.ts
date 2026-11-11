/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudioInfo {
  proprietor: string;
  prayer: string;
  mobile: string;
  altMobile?: string;
  shopName: string;
  description: string;
  address: string;
  post: string;
  thana: string;
  email?: string;
  upiId?: string;
  showUpiQr: boolean;
  logoUrl?: string;
  qrImageUrl?: string;
}

export const RDS_STUDIO_LOGO_URL = '/assets/aistudio/file_00000000fe8c820795ead3f4c536704b_f1426764.png';
export const RDS_STUDIO_QR_IMAGE_URL = '/assets/aistudio/WhatsApp_Image_2026-11-11_at_8.11.49_AM_beb3bca3.jpeg';

export interface CustomerInfo {
  billNo: string;
  billDate: string;
  partyName: string;
  address: string;
  post: string;
  thana: string;
  mobile: string;
  altMobile?: string;
  bookingDate: string;
  returnDate: string; // वापसी दिनांक / कार्यक्रम दिनांक
  eventVenue?: string;
  eventType?: string;
}

export interface BillItem {
  id: string;
  srNo: number;
  name: string;
  program: string; // कार्यक्रम
  quantity: number | string; // संख्या
  rate: number; // दर
  amount: number; // रूपया
  isActive: boolean; // included in bill
}

export type PaymentMode = 'नकद (Cash)' | 'UPI (PhonePe/GPay)' | 'बैंक ट्रांसफर (Bank)' | 'चेक (Cheque)';

export type BookingStatus = 'एडवांस जमा (Booked)' | 'शूट पूर्ण (Shoot Done)' | 'एडिटिंग जारी (In Progress)' | 'डिलीवर हो गया (Completed)' | 'रद्द (Cancelled)';

export interface BillData {
  id: string;
  studio: StudioInfo;
  customer: CustomerInfo;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number; // टोटल
  advancePaid: number; // जमा
  balanceDue: number; // बाकी
  paymentMode: PaymentMode;
  notes: string;
  terms: string[];
  status: BookingStatus;
  showPercentage?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ColorTheme = 'crimson' | 'royal-blue' | 'black-white' | 'forest-green';

export type PrintLayout = 'a4-single' | 'a5-dual' | 'thermal-80mm';

export const DEFAULT_STUDIO_INFO: StudioInfo = {
  proprietor: 'रामकुमार पटेल',
  prayer: '।। श्री गणेशाय नमः ।।',
  mobile: '8719070472',
  altMobile: '',
  shopName: 'RDS STUDIO Mixing Point',
  description: 'हमारे यहाँ: शादी-विवाह, तिलक, मुण्डन एवं अन्य सभी अवसरों पर वीडियोग्राफी, फोटोग्राफी, करिज्मा एलबम, ड्रोन कैमरा, वीडियो मिक्सिंग व लाइव टेलीकास्ट के लिए संपर्क करें।',
  address: 'ग्राम - खमतरा, दादा महाराज मार्ग, जिला - नरसिंहपुर',
  post: 'खमतरा',
  thana: '',
  email: 'rdsstudio.mixing@gmail.com',
  upiId: '8719070472@upi',
  showUpiQr: true,
  logoUrl: RDS_STUDIO_LOGO_URL,
  qrImageUrl: RDS_STUDIO_QR_IMAGE_URL,
};

export const DEFAULT_TERMS: string[] = [
  '30 प्रतिशत एडवांस भुगतान बुकिंग के समय – 70 प्रतिशत भुगतान शूट के बाद।',
  'शादी समाप्त हो जाने के बाद 1 माह के अंदर अपना फोटो और वीडियो का कलेक्शन कर लें अन्यथा वीडियो डिलीट हो जाने के बाद स्टूडियो वाले की कोई जिम्मेदारी नहीं होगी।',
  'वीडियो / फोटो 7-10 दिनों में डिलीवर किए जाएंगे।'
];

export const DEFAULT_ITEMS_LIST: Omit<BillItem, 'id'>[] = [
  { srNo: 1, name: 'फोटो कैमरा', program: 'जयमाला व फेरे', quantity: 1, rate: 6000, amount: 6000, isActive: true },
  { srNo: 2, name: 'एल्बम करिज्मा', program: '12x36 (35 शीट्स)', quantity: 1, rate: 8500, amount: 8500, isActive: true },
  { srNo: 3, name: 'वीडियो कैमरा', program: 'फुल HD लाइव कवरेज', quantity: 1, rate: 7000, amount: 7000, isActive: true },
  { srNo: 4, name: 'ड्रोन कैमरा', program: 'एरियल एंट्री व जयमाला', quantity: 1, rate: 5000, amount: 5000, isActive: true },
  { srNo: 5, name: 'छतरी लाइट', program: 'स्टेज व मंडप सेटअप', quantity: 2, rate: 800, amount: 1600, isActive: true },
  { srNo: 6, name: 'फ्लैश लाइट', program: 'पोर्ट्रेट व कैंडिड', quantity: 2, rate: 500, amount: 1000, isActive: false },
  { srNo: 7, name: 'पेन ड्राइव', program: '64 GB हाई-स्पीड रॉ डाटा', quantity: 1, rate: 900, amount: 900, isActive: true },
  { srNo: 8, name: 'एलईडी फ्रेम', program: '16x24 कस्टमाइज्ड गिफ्ट', quantity: 1, rate: 2500, amount: 2500, isActive: false },
  { srNo: 9, name: 'ट्राइपॉड', program: 'हैवी ड्यूटी स्टैंड', quantity: 2, rate: 300, amount: 600, isActive: false },
  { srNo: 10, name: 'कैमरा लेंस', program: 'प्राइम 85mm / 70-200mm', quantity: 1, rate: 1500, amount: 1500, isActive: false },
];
