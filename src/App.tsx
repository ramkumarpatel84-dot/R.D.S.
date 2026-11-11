/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BillData, 
  ColorTheme, 
  PrintLayout, 
  DEFAULT_STUDIO_INFO, 
  DEFAULT_ITEMS_LIST, 
  DEFAULT_TERMS, 
  BillItem,
  RDS_STUDIO_LOGO_URL,
  RDS_STUDIO_QR_IMAGE_URL
} from './types';
import { BillSlipView } from './components/BillSlipView';
import { BillEditor } from './components/BillEditor';
import { BookingRecordsModal } from './components/BookingRecordsModal';
import { ShareWhatsAppModal } from './components/ShareWhatsAppModal';
import { 
  Printer, 
  Share2, 
  FolderClock, 
  Plus, 
  Sparkles, 
  Palette, 
  FileText, 
  Check, 
  Camera, 
  Edit3, 
  Eye, 
  Smartphone,
  Copy,
  Receipt,
  Cloud,
  Download
} from 'lucide-react';
import { downloadBillAsPDF } from './utils/pdfGenerator';

const STORAGE_KEY_CURRENT = 'nisha_photo_current_bill';
const STORAGE_KEY_RECORDS = 'nisha_photo_saved_records';

export default function App() {
  // Generate a clean default bill
  const createFreshBill = (): BillData => {
    const freshItems: BillItem[] = DEFAULT_ITEMS_LIST.map((it, idx) => ({
      ...it,
      id: 'item-' + (idx + 1),
    }));

    const activeSubtotal = freshItems
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + i.amount, 0);

    const advance = Math.round(activeSubtotal * 0.3);

    return {
      id: 'bill-' + Date.now(),
      studio: { ...DEFAULT_STUDIO_INFO },
      customer: {
        billNo: 'RDS-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
        billDate: new Date().toISOString().slice(0, 10),
        partyName: 'श्री राजेश कुमार पटेल',
        address: 'ग्राम - रामपुर, निकट शिव मन्दिर',
        post: 'शांति नगर',
        thana: 'नगर कोतवाली',
        mobile: '9823456789',
        altMobile: '',
        bookingDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
        returnDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
        eventVenue: 'कमला वाटिका मैरिज हॉल',
      },
      items: freshItems,
      subtotal: activeSubtotal,
      discount: 0,
      total: activeSubtotal,
      advancePaid: advance,
      balanceDue: activeSubtotal - advance,
      paymentMode: 'नकद (Cash)',
      notes: '',
      terms: [...DEFAULT_TERMS],
      status: 'एडवांस जमा (Booked)',
      showPercentage: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // State
  const [bill, setBill] = useState<BillData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically migrate legacy placeholder studio name and proprietor
        if (parsed.studio) {
          if (!parsed.studio.shopName || parsed.studio.shopName.includes('निशा') || parsed.studio.shopName.includes('राम डिजिटल')) {
            parsed.studio.shopName = 'RDS STUDIO Mixing Point';
            parsed.studio.description = DEFAULT_STUDIO_INFO.description;
          } else {
            parsed.studio.shopName = parsed.studio.shopName.replace(/\s*\(.*?\)/g, '').replace(/[\u0900-\u097F]/g, '').trim() || 'RDS STUDIO Mixing Point';
          }
          if (!parsed.studio.proprietor || parsed.studio.proprietor.includes('प्रमोद') || parsed.studio.proprietor.includes('RAMKUMAR')) {
            parsed.studio.proprietor = 'रामकुमार पटेल';
          }
          if (!parsed.studio.mobile || parsed.studio.mobile === '9876543210' || parsed.studio.mobile === '0000000000') {
            parsed.studio.mobile = '8719070472';
            parsed.studio.upiId = '8719070472@upi';
          }
          if (parsed.studio.altMobile === '9123456780') {
            parsed.studio.altMobile = '';
          }
          if (!parsed.studio.address || parsed.studio.address.includes('सिनेमा रोड') || parsed.studio.address === 'दादामहाराज रोड') {
            parsed.studio.address = 'ग्राम - खमतरा, दादा महाराज मार्ग, जिला - नरसिंहपुर';
            parsed.studio.post = 'खमतरा';
            parsed.studio.thana = '';
          }
          if (!parsed.studio.logoUrl) {
            parsed.studio.logoUrl = RDS_STUDIO_LOGO_URL;
          }
          if (!parsed.studio.qrImageUrl) {
            parsed.studio.qrImageUrl = RDS_STUDIO_QR_IMAGE_URL;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return createFreshBill();
  });

  const [records, setRecords] = useState<BillData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [theme, setTheme] = useState<ColorTheme>('crimson');
  const [layout, setLayout] = useState<PrintLayout>('a4-single');
  const [isBlankMode, setIsBlankMode] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [recordsModalTab, setRecordsModalTab] = useState<'records' | 'drive'>('records');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

  // Direct PDF Download handler using html2canvas & jsPDF
  const handleDownloadPDF = async () => {
    setMobileTab('preview');
    setTimeout(async () => {
      const el = document.querySelector('.print-area') as HTMLElement;
      await downloadBillAsPDF(
        el,
        bill,
        () => setIsGeneratingPDF(true),
        () => setIsGeneratingPDF(false),
        (err) => {
          setIsGeneratingPDF(false);
          alert('PDF डाउनलोड करने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'));
        }
      );
    }, 200);
  };

  // Sync current draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(bill));
    } catch (e) {
      console.error(e);
    }
  }, [bill]);

  // Sync records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  // Save current bill to records register
  const handleSaveToRegister = () => {
    setRecords((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === bill.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...bill, updatedAt: new Date().toISOString() };
        return updated;
      } else {
        return [{ ...bill, updatedAt: new Date().toISOString() }, ...prev];
      }
    });
  };

  // Create new bill
  const handleNewBill = () => {
    if (confirm('क्या आप नई रसीद प्रविष्टि शुरू करना चाहते हैं?')) {
      const fresh = createFreshBill();
      // Ensure empty customer
      fresh.customer.partyName = '';
      fresh.customer.address = '';
      fresh.customer.post = '';
      fresh.customer.thana = '';
      fresh.customer.mobile = '';
      fresh.customer.bookingDate = '';
      fresh.customer.returnDate = '';
      setBill(fresh);
    }
  };

  // Fill sample wedding data
  const handleFillSample = () => {
    const sample = createFreshBill();
    setBill(sample);
  };

  // Handle printing & PDF generation
  const handlePrint = () => {
    // Switch to preview tab on mobile so slip is mounted and visible
    setMobileTab('preview');

    // Set document title temporarily so browser's 'Save as PDF' uses a clean, descriptive file name
    const originalTitle = document.title;
    const safeParty = (bill.customer.partyName || 'ग्राहक').replace(/[/\\?%*:|"<>]/g, '_');
    const safeBillNo = (bill.customer.billNo || 'Bill').replace(/[/\\?%*:|"<>]/g, '_');
    document.title = `RDS_Studio_${safeBillNo}_${safeParty}`;

    setTimeout(() => {
      window.print();
      // Restore original page title after print dialog closes
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-devanagari text-slate-900">
      {/* 1. App Top Navigation (Hidden in Print) */}
      <header className="no-print bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-white p-1 rounded-xl shadow-xs border border-amber-400/40 flex items-center justify-center shrink-0">
              <img
                src={bill.studio.logoUrl || RDS_STUDIO_LOGO_URL}
                alt="RDS STUDIO Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight font-rozha text-amber-300">
                  {bill.studio.shopName || 'RDS STUDIO Mixing Point'}
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-red-800 text-red-100 px-2 py-0.5 rounded font-mono font-bold">
                  बिल बुक v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-2">
                <span>प्रो० {bill.studio.proprietor || 'रामकुमार पटेल'}</span>
                <span>•</span>
                <span className="font-mono font-bold text-amber-200">{bill.studio.mobile || '8719070472'}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* WhatsApp Share Button */}
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              title="व्हाट्सएप पर भेजें"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">व्हाट्सएप शेयर</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
              title="डायरेक्ट PDF डाउनलोड करें"
            >
              <Download className={`w-4 h-4 text-emerald-200 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isGeneratingPDF ? 'PDF बन रहा है...' : 'PDF डाउनलोड'}</span>
            </button>

            {/* Print / Save PDF Button with Options Menu */}
            <div className="relative">
              <button
                onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                title="प्रिंट एवं PDF विकल्प"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>प्रिंट विकल्प ▼</span>
              </button>

              {isPrintMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs font-medium">
                  <div className="px-3 py-1 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                    प्रिंट एवं डाउनलोड विकल्प
                  </div>
                  <button
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      setLayout('a4-single');
                      setIsBlankMode(false);
                      setTimeout(handlePrint, 100);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-900 flex items-center gap-2 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-red-700" />
                    <span>A4 सिंगल रसीद प्रिंट करें</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      setLayout('a5-dual');
                      setIsBlankMode(false);
                      setTimeout(handlePrint, 100);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-900 flex items-center gap-2 transition-colors"
                  >
                    <Receipt className="w-4 h-4 text-red-700" />
                    <span>A5 डुप्लीकेट (2 कॉपी) प्रिंट</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      setLayout('thermal-80mm');
                      setIsBlankMode(false);
                      setTimeout(handlePrint, 100);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-900 flex items-center gap-2 transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-red-700" />
                    <span>थर्मल 80mm रसीद प्रिंट</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handleDownloadPDF();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2 transition-colors border-t border-slate-100 font-bold text-emerald-800"
                  >
                    <Download className="w-4 h-4 text-emerald-700" />
                    <span>PDF फाइल डाउनलोड करें</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      setIsBlankMode(true);
                      setLayout('a4-single');
                      setTimeout(handlePrint, 100);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 hover:text-amber-900 flex items-center gap-2 transition-colors border-t border-slate-100 text-amber-900"
                  >
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>खाली फॉर्मेट प्रिंट (हाथ से भरें)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Google Drive Cloud Backup Button */}
            <button
              onClick={() => {
                setRecordsModalTab('drive');
                setIsRecordsOpen(true);
              }}
              className="bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-emerald-700/60 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Google Drive क्लाउड बैकअप"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">क्लाउड बैकअप</span>
            </button>

            {/* Saved Register Records Button */}
            <button
              onClick={() => {
                setRecordsModalTab('records');
                setIsRecordsOpen(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors relative"
              title="सुरक्षित बुकिंग रजिस्टर"
            >
              <FolderClock className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">रजिस्टर</span>
              {records.length > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                  {records.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Second Row: Theme, Paper Format, Blank Slip Switcher */}
        <div className="bg-slate-950/70 border-t border-slate-800 px-3 sm:px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Ink Theme */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                स्याही थीम:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
                <button
                  onClick={() => setTheme('crimson')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    theme === 'crimson' ? 'bg-red-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  लाल स्याही
                </button>
                <button
                  onClick={() => setTheme('royal-blue')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    theme === 'royal-blue' ? 'bg-blue-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  शाही नीला
                </button>
                <button
                  onClick={() => setTheme('black-white')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    theme === 'black-white' ? 'bg-neutral-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  लेज़र B&W
                </button>
                <button
                  onClick={() => setTheme('forest-green')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    theme === 'forest-green' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  हरा
                </button>
              </div>
            </div>

            {/* Print Paper Format */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                प्रारूप:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800">
                <button
                  onClick={() => setLayout('a4-single')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    layout === 'a4-single' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  A4 सिंगल
                </button>
                <button
                  onClick={() => setLayout('a5-dual')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    layout === 'a5-dual' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="2 कॉपी: ग्राहक प्रति + ऑफिस प्रति"
                >
                  A5 डुप्लीकेट (2 कॉपी)
                </button>
                <button
                  onClick={() => setLayout('thermal-80mm')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    layout === 'thermal-80mm' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  थर्मल 80mm
                </button>
              </div>
            </div>

            {/* Blank Print Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={isBlankMode}
                  onChange={(e) => setIsBlankMode(e.target.checked)}
                  className="w-3.5 h-3.5 text-red-600 rounded border-slate-700 focus:ring-red-500"
                />
                <span className="text-[11px] font-semibold">
                  खाली फॉर्मेट प्रिंट (हाथ से भरने हेतु)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle Switcher (Edit vs Preview) */}
        <div className="lg:hidden flex border-t border-slate-800 bg-slate-900 text-xs font-bold">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${
              mobileTab === 'editor'
                ? 'bg-red-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>फॉर्म भरें (Edit Bill)</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${
              mobileTab === 'preview'
                ? 'bg-red-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>रसीद पर्ची देखें (Preview)</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 print:p-0 print:m-0 print:max-w-none print:w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block print:w-full">
          {/* Left Column: Form Editor (Always visible on desktop, tabbed on mobile) */}
          <div
            className={`lg:col-span-5 space-y-4 no-print ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            <BillEditor
              bill={bill}
              onChange={setBill}
              onSave={handleSaveToRegister}
              onNew={handleNewBill}
              onFillSample={handleFillSample}
              onPrint={handlePrint}
              onDownloadPDF={handleDownloadPDF}
              isGeneratingPDF={isGeneratingPDF}
            />
          </div>

          {/* Right Column: Live Bill Slip Preview (Printable Area) */}
          <div
            className={`lg:col-span-7 print:block print:w-full ${
              mobileTab === 'editor' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Screen Banner above the preview */}
            <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-2xs mb-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Eye className="w-4 h-4 text-red-600" />
                    लाइव रसीद प्रिव्यू (Print & PDF Preview)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    थीम: <strong className="text-slate-800 capitalize">{theme}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    प्रारूप: <strong className="text-slate-800">{layout}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                    title="रसीद सीधे PDF के रूप में डाउनलोड करें"
                  >
                    <Download className={`w-3.5 h-3.5 text-emerald-200 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                    <span>{isGeneratingPDF ? 'PDF बन रहा है...' : 'PDF डाउनलोड करें'}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                    title="रसीद प्रिंट करें"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>प्रिंट</span>
                  </button>
                </div>
              </div>

              {/* Informative Tip on how to Save as PDF */}
              <div className="bg-emerald-50 text-emerald-950 px-3 py-1.5 rounded-lg border border-emerald-200 text-[11px] flex items-center justify-between">
                <span>
                  💡 <strong>सुझाव:</strong> सीधा PDF डाउनलोड करने के लिए हरे <strong>'PDF डाउनलोड करें'</strong> बटन पर क्लिक करें। रसीद आपके डिवाइस में तुरंत PDF के रूप में सेव हो जाएगी।
                </span>
              </div>
            </div>

            {/* The Actual Bill Slip View */}
            <div className="printable-wrapper bg-slate-200/60 p-2 sm:p-4 rounded-2xl border border-slate-300/80 overflow-x-auto shadow-inner print:p-0 print:m-0 print:bg-transparent print:border-none print:shadow-none print:overflow-visible print:w-full">
              <BillSlipView
                bill={bill}
                theme={theme}
                layout={layout}
                isBlankMode={isBlankMode}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer (Hidden in Print) */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 font-devanagari">
        <p className="font-semibold text-slate-700">
          {bill.studio.shopName} – आधिकारिक बिल बुक एवं बुकिंग पर्ची सॉफ्टवेयर
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          प्रो० {bill.studio.proprietor} | संपर्क: {bill.studio.mobile} | भारतीय फोटोग्राफी व वीडियोग्राफी स्टूडियोज के लिए विशेष रूप से निर्मित
        </p>
      </footer>

      {/* Modals */}
      <BookingRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        records={records}
        onSelectRecord={(selected) => setBill(selected)}
        onDeleteRecord={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
        onImportRecords={(imported) => setRecords(imported)}
        studioName={bill.studio.shopName}
        defaultTab={recordsModalTab}
      />

      <ShareWhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        bill={bill}
      />
    </div>
  );
}
