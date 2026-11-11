/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BillData } from '../types';
import { 
  X, 
  Search, 
  Trash2, 
  FolderOpen, 
  Download, 
  Upload, 
  Calendar, 
  Phone, 
  CheckCircle,
  FileSpreadsheet,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LogOut,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  TrendingUp,
  Wallet,
  CalendarDays,
  Clock
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken 
} from '../services/firebaseAuth';
import { 
  findDriveBackup, 
  uploadBackupToDrive, 
  downloadBackupFromDrive, 
  DriveFileInfo,
  BACKUP_FILE_NAME
} from '../services/googleDriveService';
import { exportRecordsToGoogleSheets } from '../services/googleSheetsService';
import { User } from 'firebase/auth';

interface BookingRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BillData[];
  onSelectRecord: (bill: BillData) => void;
  onDeleteRecord: (id: string) => void;
  onImportRecords: (imported: BillData[]) => void;
  studioName?: string;
  defaultTab?: 'records' | 'drive';
}

export const BookingRecordsModal: React.FC<BookingRecordsModalProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onDeleteRecord,
  onImportRecords,
  studioName = 'RDS STUDIO Mixing Point',
  defaultTab = 'records',
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'drive'>(defaultTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<'all' | 'current'>('all');

  // Google Drive & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [cloudFileInfo, setCloudFileInfo] = useState<DriveFileInfo | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Google Sheets Export State
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetExportResult, setSheetExportResult] = useState<{ spreadsheetId: string; spreadsheetUrl: string; spreadsheetTitle: string } | null>(null);

  // Destructive / Mutating Operation Confirmation Modals (Mandatory for Workspace Integration)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'backup' | 'restore' | 'sheets';
    title: string;
    description: string;
    itemCount: number;
    actionLabel: string;
    isDestructive: boolean;
  } | null>(null);

  // Synchronize defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setFeedbackMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Firebase Auth listener initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        checkDriveFile(token);
      },
      () => {
        setCurrentUser(null);
        setCloudFileInfo(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check Drive File
  const checkDriveFile = async (tokenOverride?: string) => {
    try {
      setIsCheckingCloud(true);
      const token = tokenOverride || (await getAccessToken());
      if (!token) return;
      const file = await findDriveBackup(token);
      setCloudFileInfo(file);
    } catch (err: any) {
      console.error('Failed to query Google Drive backup:', err);
    } finally {
      setIsCheckingCloud(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setFeedbackMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setFeedbackMessage({
          type: 'success',
          text: `Google खाते (${res.user.email}) से सफलतापूर्वक जुड़ गए!`,
        });
        await checkDriveFile(res.accessToken);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Google साइन इन में त्रुटि आई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Sign Out
  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setCloudFileInfo(null);
      setFeedbackMessage({
        type: 'info',
        text: 'Google खाते से साइन आउट हो गए।',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Trigger Backup to Google Drive with Mandatory Confirmation Dialog
  const requestBackupToDrive = () => {
    if (!currentUser) {
      setFeedbackMessage({
        type: 'error',
        text: 'कृपया पहले अपने Google खाते से साइन इन करें।',
      });
      return;
    }

    const isUpdate = !!cloudFileInfo;
    setConfirmDialog({
      isOpen: true,
      type: 'backup',
      title: isUpdate ? 'Google Drive बैकअप अपडेट करें' : 'Google Drive पर नया बैकअप सुरक्षित करें',
      description: isUpdate
        ? `Google Drive पर पहले से '${BACKUP_FILE_NAME}' फाइल मौजूद है। क्या आप इसे वर्तमान ${records.length} बुकिंग रिकॉर्ड्स के साथ ओवरराइट/अपडेट करना चाहते हैं?`
        : `क्या आप अपने सभी ${records.length} बुकिंग रिकॉर्ड्स को Google Drive पर '${BACKUP_FILE_NAME}' के रूप में सुरक्षित करना चाहते हैं?`,
      itemCount: records.length,
      actionLabel: isUpdate ? 'हाँ, बैकअप अपडेट करें' : 'हाँ, बैकअप अपलोड करें',
      isDestructive: false,
    });
  };

  // Execute Backup after explicit user confirmation
  const executeBackupToDrive = async () => {
    setConfirmDialog(null);
    setIsBackingUp(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('सत्र समाप्त हो गया। कृपया पुनः साइन इन करें।');
      
      const res = await uploadBackupToDrive(token, records, studioName);
      await checkDriveFile(token);
      setFeedbackMessage({
        type: 'success',
        text: `सफलतापूर्वक Google Drive पर ${records.length} रिकॉर्ड्स का बैकअप सुरक्षित हो गया! (${new Date(res.modifiedTime).toLocaleTimeString('hi-IN')})`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Google Drive पर अपलोड करने में त्रुटि आई।',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Trigger Restore from Google Drive with Mandatory Confirmation Dialog
  // Trigger Google Sheets Export with Mandatory Confirmation Dialog
  const requestExportToGoogleSheets = () => {
    if (!currentUser) {
      setFeedbackMessage({
        type: 'error',
        text: 'कृपया पहले अपने Google खाते से साइन इन करें।',
      });
      return;
    }
    if (records.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Google Sheets में निर्यात करने के लिए कोई बुकिंग रिकॉर्ड नहीं है।',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'sheets',
      title: 'Google Sheets में नई स्प्रेडशीट बनाएं',
      description: `आपके सभी ${records.length} बुकिंग रिकॉर्ड्स को Google Sheets में एक नई स्प्रेडशीट ('RDS_Studio_Booking_Ledger_...') के रूप में सिंक व निर्यात किया जाएगा। क्या आप आगे बढ़ना चाहते हैं?`,
      itemCount: records.length,
      actionLabel: 'हाँ, Google Sheet बनाएं',
      isDestructive: false,
    });
  };

  // Execute Google Sheets Export after explicit confirmation
  const executeExportToGoogleSheets = async () => {
    setConfirmDialog(null);
    setIsExportingSheets(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('सत्र समाप्त हो गया। कृपया पुनः साइन इन करें।');

      const result = await exportRecordsToGoogleSheets(token, records, studioName);
      setSheetExportResult(result);
      setFeedbackMessage({
        type: 'success',
        text: `सफलतापूर्वक Google Sheet '${result.spreadsheetTitle}' बनाई गई और ${records.length} रिकॉर्ड्स सिंक हो गए!`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Google Sheets में निर्यात करने में त्रुटि आई।',
      });
    } finally {
      setIsExportingSheets(false);
    }
  };
  // Trigger Restore from Google Drive with Mandatory Confirmation Dialog
  const requestRestoreFromDrive = () => {
    if (!currentUser) {
      setFeedbackMessage({
        type: 'error',
        text: 'कृपया पहले अपने Google खाते से साइन इन करें।',
      });
      return;
    }
    if (!cloudFileInfo) {
      setFeedbackMessage({
        type: 'error',
        text: 'Google Drive पर कोई पिछला बैकअप नहीं मिला।',
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      title: 'Google Drive से रिकॉर्ड्स रिस्टोर करें',
      description: `Google Drive की फाइल '${BACKUP_FILE_NAME}' से बुकिंग रिकॉर्ड्स इस डिवाइस पर लोड किए जाएंगे। आपके मौजूदा स्थानीय ${records.length} रिकॉर्ड्स क्लाउड डाटा से अपडेट/रिप्लेस हो जाएंगे। क्या आप आगे बढ़ना चाहते हैं?`,
      itemCount: cloudFileInfo.recordCount || 0,
      actionLabel: 'हाँ, रिस्टोर करें',
      isDestructive: true,
    });
  };

  // Execute Restore after explicit user confirmation
  const executeRestoreFromDrive = async () => {
    setConfirmDialog(null);
    setIsRestoring(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('सत्र समाप्त हो गया। कृपया पुनः साइन इन करें।');
      if (!cloudFileInfo) throw new Error('Google Drive फाइल नहीं मिली।');

      const result = await downloadBackupFromDrive(token, cloudFileInfo.id);
      if (result.records && Array.isArray(result.records)) {
        onImportRecords(result.records);
        setFeedbackMessage({
          type: 'success',
          text: `सफलतापूर्वक Google Drive से ${result.records.length} रिकॉर्ड्स इस डिवाइस पर रिस्टोर कर लिए गए!`,
        });
      } else {
        throw new Error('बैकअप फाइल में कोई वैध रिकॉर्ड्स नहीं मिले।');
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Google Drive से रिस्टोर करने में त्रुटि आई।',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Export records as local JSON file
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rds-studio-records-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import local JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportRecords(parsed);
          alert(`${parsed.length} बुकिंग रिकॉर्ड सफलतापूर्वक इंपोर्ट किए गए!`);
        } else if (parsed && Array.isArray(parsed.records)) {
          onImportRecords(parsed.records);
          alert(`${parsed.records.length} बुकिंग रिकॉर्ड सफलतापूर्वक इंपोर्ट किए गए!`);
        } else {
          alert('अमान्य फाइल फॉर्मेट। कृपया मान्य बैकअप JSON चुनें।');
        }
      } catch (err) {
        alert('फाइल पढ़ने में त्रुटि।');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  // Current Month calculation (e.g. November 2026 / 2026-11)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  const monthNamesHindi = [
    'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
  ];
  const currentMonthLabel = `${monthNamesHindi[currentMonthIdx]} ${currentYear}`;

  const isRecordInCurrentMonth = (rec: BillData) => {
    const dates = [rec.customer.billDate, rec.createdAt, rec.customer.bookingDate].filter(Boolean);
    for (const d of dates) {
      if (typeof d === 'string') {
        if (d.startsWith(currentMonthKey)) return true;
        try {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            if (parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonthIdx) {
              return true;
            }
          }
        } catch {}
      }
    }
    return false;
  };

  // Current Month Summary Metrics
  const currentMonthRecords = records.filter(isRecordInCurrentMonth);
  const currentMonthBookingsCount = currentMonthRecords.length;
  const currentMonthEarnings = currentMonthRecords.reduce((sum, r) => sum + (Number(r.advancePaid) || 0), 0);
  const currentMonthTotalBilling = currentMonthRecords.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const currentMonthBalanceDue = currentMonthRecords.reduce((sum, r) => sum + (Number(r.balanceDue) || 0), 0);
  const currentMonthCompleted = currentMonthRecords.filter(r => r.status.includes('Completed')).length;

  const cleanSearch = searchTerm.trim().toLowerCase();

  const filteredRecords = records.filter((rec) => {
    const partyName = (rec.customer?.partyName || '').toLowerCase();
    const mobile = (rec.customer?.mobile || '').replace(/\s+/g, '');
    const altMobile = (rec.customer?.altMobile || '').replace(/\s+/g, '');
    const billNo = (rec.customer?.billNo || '').toLowerCase();
    const recordId = (rec.id || '').toLowerCase();
    const address = (rec.customer?.address || '').toLowerCase();

    // Filter by customer name, mobile number, bill ID, or address
    const matchesSearch =
      !cleanSearch ||
      partyName.includes(cleanSearch) ||
      mobile.includes(cleanSearch) ||
      altMobile.includes(cleanSearch) ||
      billNo.includes(cleanSearch) ||
      recordId.includes(cleanSearch) ||
      address.includes(cleanSearch);

    const matchesStatus =
      statusFilter === 'all' || rec.status === statusFilter;

    const matchesMonth =
      monthFilter === 'all' || isRecordInCurrentMonth(rec);

    return matchesSearch && matchesStatus && matchesMonth;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-devanagari">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 rounded-xl border border-amber-400/30">
              <FolderOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>बुकिंग रजिस्टर व क्लाउड बैकअप</span>
                {currentUser && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>Drive Connected</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">कुल सुरक्षित रिकॉर्ड्स: {records.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Records List vs Google Drive */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('records')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'records'
                ? 'border-red-600 text-red-700 bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-red-600" />
            <span>रजिस्टर रिकॉर्ड्स ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'drive'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-lg shadow-2xs font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>Google Drive क्लाउड बैकअप</span>
            {currentUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : feedbackMessage.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Records Register */}
        {activeTab === 'records' && (
          <>
            {/* Current Month Earnings & Bookings Summary View */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 border-b border-slate-700 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-white">
                        मासिक सारांश: <span className="text-amber-300 font-extrabold">{currentMonthLabel}</span>
                      </h4>
                      <span className="text-[10px] bg-red-800 text-red-100 font-mono px-2 py-0.5 rounded-full font-bold">
                        चालू माह (Current Month)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      इस माह की कुल कमाई (जमा राशि) एवं कुल बुकिंग्स का विवरण
                    </p>
                  </div>
                </div>

                {/* Quick Month Filter Selector */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
                  <button
                    onClick={() => setMonthFilter('current')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      monthFilter === 'current'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>केवल {monthNamesHindi[currentMonthIdx]} ({currentMonthBookingsCount})</span>
                  </button>

                  <button
                    onClick={() => setMonthFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      monthFilter === 'all'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>सभी रिकॉर्ड्स ({records.length})</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Total Number of Bookings this month */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-semibold">इस माह बुकिंग्स</span>
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-extrabold text-white">
                      {currentMonthBookingsCount}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">बुकिंग्स</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓ {currentMonthCompleted} पूर्ण</span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">{currentMonthBookingsCount - currentMonthCompleted} सक्रिय</span>
                  </div>
                </div>

                {/* 2. Total Earnings (Advance / Realized Money this month) */}
                <div className="bg-emerald-950/70 border border-emerald-600/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-emerald-300 text-xs mb-1 font-bold">
                    <span>कुल कमाई (Total Earnings)</span>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-emerald-300">
                    ₹{currentMonthEarnings.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 mt-1 font-medium">
                    ✓ वास्तविक जमा / प्राप्त राशि (Advance)
                  </div>
                </div>

                {/* 3. Total Billing Value (Total Business this month) */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                    <span className="font-semibold">कुल व्यापार (Billing Value)</span>
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-slate-100">
                    ₹{currentMonthTotalBilling.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    इस माह के कुल बिलों का योग
                  </div>
                </div>

                {/* 4. Pending Balance Due this month */}
                <div className="bg-red-950/50 border border-red-700/60 rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-red-300 text-xs mb-1 font-bold">
                    <span>बाकी देय राशि (Balance Due)</span>
                    <Clock className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-red-300">
                    ₹{currentMonthBalanceDue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-red-400/90 mt-1">
                    शूट / डिलीवरी के बाद प्राप्त होगी
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Input Field */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ग्राहक का नाम, मोबाइल नंबर, या बिल ID (उदा० RDS-2026-...) से खोजें..."
                    className="w-full text-xs pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-hidden font-medium placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="खोज साफ़ करें (Clear Search)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter and Cloud Action Controls */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-red-600 focus:outline-hidden shadow-2xs"
                  >
                    <option value="all">सभी स्थितियाँ ({records.length})</option>
                    <option value="एडवांस जमा (Booked)">एडवांस जमा</option>
                    <option value="शूट पूर्ण (Shoot Done)">शूट पूर्ण</option>
                    <option value="एडिटिंग जारी (In Progress)">एडिटिंग जारी</option>
                    <option value="डिलीवर हो गया (Completed)">डिलीवर हो गया</option>
                    <option value="रद्द (Cancelled)">रद्द</option>
                  </select>

                  <button
                    onClick={() => setActiveTab('drive')}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Google Drive पर सुरक्षित करें"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">क्लाउड बैकअप</span>
                  </button>
                </div>
              </div>

              {/* Active Search / Filter Feedback Strip */}
              {(cleanSearch || statusFilter !== 'all' || monthFilter === 'current') && (
                <div className="flex items-center justify-between text-xs bg-amber-50/80 border border-amber-200/90 rounded-lg px-3 py-1.5 text-amber-900">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-amber-700" />
                      खोज परिणाम:
                    </span>
                    {cleanSearch && (
                      <span className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono font-semibold">
                        "{searchTerm}"
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="bg-white px-2 py-0.5 rounded border border-amber-300">
                        स्थिति: {statusFilter}
                      </span>
                    )}
                    {monthFilter === 'current' && (
                      <span className="bg-white px-2 py-0.5 rounded border border-amber-300">
                        माह: {currentMonthLabel}
                      </span>
                    )}
                    <span className="text-slate-600 font-medium">
                      (कुल <strong>{filteredRecords.length}</strong> रिकॉर्ड्स मिले)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setMonthFilter('all');
                    }}
                    className="text-[11px] text-red-700 hover:text-red-900 font-bold underline ml-2 shrink-0 cursor-pointer"
                  >
                    सभी फ़िल्टर हटाएं (Reset)
                  </button>
                </div>
              )}
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">
                    {cleanSearch
                      ? `"${searchTerm}" के नाम, मोबाइल नंबर या बिल ID से कोई रिकॉर्ड नहीं मिला।`
                      : monthFilter === 'current'
                      ? `इस माह (${currentMonthLabel}) में कोई बुकिंग रिकॉर्ड नहीं मिला।`
                      : 'कोई बुकिंग रिकॉर्ड नहीं मिला।'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {cleanSearch ? (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-xs text-red-700 hover:text-red-800 font-bold underline mt-1 cursor-pointer"
                      >
                        खोज शब्द हटाएं और सभी {records.length} रिकॉर्ड्स देखें
                      </button>
                    ) : monthFilter === 'current' ? (
                      <button
                        onClick={() => setMonthFilter('all')}
                        className="text-xs text-amber-600 hover:text-amber-700 underline font-semibold mt-1"
                      >
                        सभी पिछले {records.length} रिकॉर्ड्स देखें
                      </button>
                    ) : (
                      'नया बिल बनाकर "सेव करें" बटन दबाएं ताकि वह इस रजिस्टर में सुरक्षित हो सके।'
                    )}
                  </p>
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const advancePercent = rec.total > 0 ? Math.round((rec.advancePaid / rec.total) * 100) : 0;
                  return (
                    <div
                      key={rec.id}
                      className="bg-white border border-slate-200 hover:border-red-300 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded border transition-colors ${
                              cleanSearch && (rec.customer.billNo || '').toLowerCase().includes(cleanSearch)
                                ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            #{rec.customer.billNo || 'N/A'}
                          </span>
                          <h4
                            className={`font-bold text-sm ${
                              cleanSearch && (rec.customer.partyName || '').toLowerCase().includes(cleanSearch)
                                ? 'text-red-700 bg-amber-50 px-1 rounded'
                                : 'text-slate-900'
                            }`}
                          >
                            {rec.customer.partyName || 'अनाम पार्टी'}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.status.includes('Completed')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : rec.status.includes('Booked')
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                          <span
                            className={`flex items-center gap-1 font-mono ${
                              cleanSearch && (rec.customer.mobile || '').includes(cleanSearch)
                                ? 'bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded ring-1 ring-amber-300'
                                : ''
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {rec.customer.mobile || 'मो० अनुपलब्ध'}
                          </span>
                          {rec.customer.bookingDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              बुकिंग: {rec.customer.bookingDate}
                            </span>
                          )}
                          {rec.customer.address && (
                            <span className="text-slate-500 truncate max-w-[200px]">
                              पता: {rec.customer.address}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financials & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-semibold">
                            टोटल: <span className="font-mono font-bold text-slate-900">₹{Number(rec.total).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            जमा: <span className="font-mono font-bold text-emerald-700">₹{rec.advancePaid}</span> ({advancePercent}%) | बाकी: <span className="font-mono font-bold text-red-700">₹{rec.balanceDue}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onSelectRecord(rec);
                              onClose();
                            }}
                            className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>खोलें</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`क्या आप ${rec.customer.partyName || rec.customer.billNo} का रिकॉर्ड हटाना चाहते हैं?`)) {
                                onDeleteRecord(rec.id);
                              }
                            }}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
                            title="रिकॉर्ड हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Tab 2: Google Drive Cloud Backup */}
        {activeTab === 'drive' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Cloud Info Banner */}
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-400/30">
                      <Cloud className="w-5 h-5" />
                    </span>
                    <h4 className="font-bold text-base sm:text-lg text-white">
                      Google Drive क्लाउड सुरक्षित बैकअप
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    अपने स्टूडियो के सभी {records.length} बुकिंग रिकॉर्ड्स को सीधे अपने निजी Google Drive खाते में सुरक्षित (Backup) करें।
                    नया लैपटॉप, कंप्यूटर या मोबाइल इस्तेमाल करने पर एक क्लिक में सभी रिकॉर्ड्स वापस लोड (Restore) किए जा सकते हैं।
                  </p>
                </div>

                {/* Account Status / Login Button */}
                <div className="shrink-0">
                  {!currentUser ? (
                    /* Official "Sign in with Google" Button */
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isLoggingIn}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 shadow-md flex items-center gap-2.5 transition-all hover:shadow-lg disabled:opacity-60 cursor-pointer"
                    >
                      {/* Official Google SVG G */}
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                      </svg>
                      <span>{isLoggingIn ? 'साइन इन हो रहा है...' : 'Google से साइन इन करें'}</span>
                    </button>
                  ) : (
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-2.5 flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'Google User'}
                          className="w-8 h-8 rounded-full border border-emerald-400"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                          {currentUser.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-tight">
                          {currentUser.displayName || 'Google उपयोगकर्ता'}
                        </p>
                        <p className="text-[10px] text-slate-300 font-mono truncate max-w-[150px]">
                          {currentUser.email}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg border border-slate-700 hover:border-red-400/50 transition-colors"
                        title="साइन आउट करें"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drive Backup & Restore Actions Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Backup to Google Drive */}
              <div className="bg-white border-2 border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                      <CloudUpload className="w-6 h-6" />
                    </span>
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                      लोकल रिकॉर्ड्स: {records.length}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                      Google Drive पर बैकअप सुरक्षित करें
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      इस डिवाइस में सुरक्षित सभी {records.length} बुकिंग्स का नया बैकअप Google Drive पर सुरक्षित करें।
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={requestBackupToDrive}
                    disabled={!currentUser || isBackingUp || records.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Google Drive पर अपलोड हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="w-4 h-4" />
                        <span>Google Drive पर बैकअप करें</span>
                      </>
                    )}
                  </button>
                  {!currentUser && (
                    <p className="text-[10px] text-amber-700 text-center mt-2">
                      * बैकअप करने के लिए ऊपर दिए गए बटन से Google साइन-इन आवश्यक है।
                    </p>
                  )}
                </div>
              </div>

              {/* Box 2: Restore from Google Drive */}
              <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                      <CloudDownload className="w-6 h-6" />
                    </span>

                    {currentUser && (
                      <button
                        onClick={() => checkDriveFile()}
                        disabled={isCheckingCloud}
                        className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200 transition-colors"
                        title="क्लाउड स्थिति रिफ्रेश करें"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCheckingCloud ? 'animate-spin' : ''}`} />
                        <span>चेक करें</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                      Google Drive से रिस्टोर करें
                    </h5>
                    {cloudFileInfo ? (
                      <div className="mt-2 bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-900 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            फाइल मिली:
                          </span>
                          <span className="font-mono">{cloudFileInfo.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          अंतिम संशोधन: {new Date(cloudFileInfo.modifiedTime).toLocaleDateString('hi-IN')} {new Date(cloudFileInfo.modifiedTime).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {cloudFileInfo.recordCount !== undefined && (
                          <div className="text-[11px] font-bold text-emerald-700">
                            सुरक्षित रिकॉर्ड्स: {cloudFileInfo.recordCount}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {currentUser
                          ? 'Google Drive पर अभी कोई बैकअप फाइल नहीं मिली है। पहले बैकअप बटन दबाएं।'
                          : 'Google Drive पर पहले से सुरक्षित रिकॉर्ड्स को इस डिवाइस पर पुनः प्राप्त करें।'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={requestRestoreFromDrive}
                    disabled={!currentUser || !cloudFileInfo || isRestoring}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Google Drive से डाउनलोड हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <CloudDownload className="w-4 h-4" />
                        <span>Google Drive से रिस्टोर करें</span>
                      </>
                    )}
                  </button>
                  {!cloudFileInfo && currentUser && (
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      * Drive पर कोई बैकअप मिलने के बाद यह बटन सक्रिय होगा।
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Google Sheets Export Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                      Google Sheets में रिकॉर्ड्स निर्यात (Export to Google Sheets)
                    </h5>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    अपने सभी {records.length} बुकिंग रिकॉर्ड्स को Google Sheets में एक नई स्प्रेडशीट के रूप में सिंक करें। आप ऑनलाइन एक्सेल की तरह सभी रिकॉर्ड्स देख, सॉर्ट और शेयर कर सकेंगे।
                  </p>

                  {sheetExportResult && (
                    <div className="mt-2 bg-white border border-emerald-300 rounded-xl p-3 text-xs flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{sheetExportResult.spreadsheetTitle}</span>
                      </div>
                      <a
                        href={sheetExportResult.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <span>Google Sheet खोलें</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <button
                    onClick={requestExportToGoogleSheets}
                    disabled={!currentUser || isExportingSheets || records.length === 0}
                    className="w-full md:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isExportingSheets ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Google Sheet बनाई जा रही है...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Google Sheet में एक्सपोर्ट करें</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Local Backup Options (JSON file download/upload) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <h6 className="font-bold text-xs text-slate-800">
                    ऑफ़लाइन फाइल बैकअप (वैकल्पिक कंप्यूटर फाइल सेव)
                  </h6>
                </div>
                <span className="text-[10px] text-slate-500">बिना इंटरनेट फाइल सेव करने हेतु</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>कंप्यूटर में JSON बैकअप डाउनलोड करें</span>
                </button>

                <label className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>कंप्यूटर से JSON बैकअप फाइल खोलें</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Google Drive API v3 (अधिकार: केवल इस ऐप की फाइल्स)</span>
          </div>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-1.5 rounded-lg transition-colors"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Mutating / Destructive Operations */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-devanagari">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-300 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmDialog.isDestructive
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <AlertCircle className="w-6 h-6 text-amber-700" />
                ) : (
                  <CloudUpload className="w-6 h-6 text-emerald-700" />
                )}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base text-slate-900">
                  {confirmDialog.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">प्रभावित रिकॉर्ड्स की संख्या:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                {confirmDialog.itemCount} बुकिंग्स
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="text-xs font-bold px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                रद्द करें (Cancel)
              </button>

              <button
                onClick={() => {
                  if (confirmDialog.type === 'backup') {
                    executeBackupToDrive();
                  } else if (confirmDialog.type === 'sheets') {
                    executeExportToGoogleSheets();
                  } else {
                    executeRestoreFromDrive();
                  }
                }}
                className={`text-xs font-bold px-4 py-2 rounded-xl text-white shadow-xs transition-colors ${
                  confirmDialog.isDestructive
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
