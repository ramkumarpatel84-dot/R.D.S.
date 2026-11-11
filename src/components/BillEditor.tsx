/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BillData, BillItem, DEFAULT_ITEMS_LIST, DEFAULT_TERMS, PaymentMode, BookingStatus, RDS_STUDIO_QR_IMAGE_URL } from '../types';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Percent, 
  Sparkles, 
  RefreshCw, 
  Store, 
  User, 
  Camera, 
  CreditCard, 
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Printer,
  Download
} from 'lucide-react';

interface BillEditorProps {
  bill: BillData;
  onChange: (updatedBill: BillData) => void;
  onSave: () => void;
  onNew: () => void;
  onFillSample: () => void;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
  isGeneratingPDF?: boolean;
}

export const BillEditor: React.FC<BillEditorProps> = ({
  bill,
  onChange,
  onSave,
  onNew,
  onFillSample,
  onPrint,
  onDownloadPDF,
  isGeneratingPDF = false,
}) => {
  const [activeSection, setActiveSection] = useState<'customer' | 'items' | 'payment' | 'studio' | 'terms'>('customer');
  const [saveToast, setSaveToast] = useState(false);

  // Recalculate totals whenever items or discount change
  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    const updatedItems = bill.items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const rate = Number(field === 'rate' ? value : updated.rate) || 0;
          updated.amount = qty * rate;
        }
        return updated;
      }
      return item;
    });

    const newSubtotal = updatedItems
      .filter((it) => it.isActive)
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    const newTotal = Math.max(0, newSubtotal - (bill.discount || 0));
    const newBalance = Math.max(0, newTotal - (bill.advancePaid || 0));

    onChange({
      ...bill,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal,
      balanceDue: newBalance,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddNewItem = () => {
    const newSrNo = bill.items.length + 1;
    const newItem: BillItem = {
      id: 'custom-' + Date.now(),
      srNo: newSrNo,
      name: '',
      program: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      isActive: true,
    };

    const updatedItems = [...bill.items, newItem];
    onChange({
      ...bill,
      items: updatedItems,
    });
  };

  const handleRemoveItem = (id: string) => {
    const updatedItems = bill.items.filter((it) => it.id !== id);
    // re-index srNo
    const reindexed = updatedItems.map((item, idx) => ({ ...item, srNo: idx + 1 }));

    const newSubtotal = reindexed
      .filter((it) => it.isActive)
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const newTotal = Math.max(0, newSubtotal - (bill.discount || 0));
    const newBalance = Math.max(0, newTotal - (bill.advancePaid || 0));

    onChange({
      ...bill,
      items: reindexed,
      subtotal: newSubtotal,
      total: newTotal,
      balanceDue: newBalance,
    });
  };

  // Advance percentage calculation helpers
  const applyAdvancePercentage = (percent: number) => {
    const calcAdvance = Math.round((bill.total * percent) / 100);
    const newBalance = Math.max(0, bill.total - calcAdvance);
    onChange({
      ...bill,
      advancePaid: calcAdvance,
      balanceDue: newBalance,
      status: calcAdvance >= bill.total && bill.total > 0
        ? 'डिलीवर हो गया (Completed)'
        : 'एडवांस जमा (Booked)',
    });
  };

  // 30% advance quick button (from terms: 30% advance at booking)
  const applyThirtyPercentAdvance = () => {
    applyAdvancePercentage(30);
  };

  // Discount percentage helper
  const applyDiscountPercentage = (percent: number) => {
    const calcDiscount = Math.round((bill.subtotal * percent) / 100);
    const newTotal = Math.max(0, bill.subtotal - calcDiscount);
    const newBalance = Math.max(0, newTotal - bill.advancePaid);
    onChange({
      ...bill,
      discount: calcDiscount,
      total: newTotal,
      balanceDue: newBalance,
    });
  };

  // Full Payment button (100%)
  const applyFullPayment = () => {
    applyAdvancePercentage(100);
  };

  // Preset package loader
  const applyPackagePreset = (type: 'wedding' | 'tilak' | 'prewedding' | 'reset') => {
    if (type === 'reset') {
      const resetItems: BillItem[] = DEFAULT_ITEMS_LIST.map((it, idx) => ({
        ...it,
        id: 'default-' + (idx + 1),
      }));
      const subtotal = resetItems.filter(i => i.isActive).reduce((sum, i) => sum + i.amount, 0);
      const advance = Math.round(subtotal * 0.3);
      onChange({
        ...bill,
        items: resetItems,
        subtotal,
        discount: 0,
        total: subtotal,
        advancePaid: advance,
        balanceDue: subtotal - advance,
      });
      return;
    }

    if (type === 'wedding') {
      const weddingItems: BillItem[] = [
        { id: 'w1', srNo: 1, name: 'फोटो कैमरा', program: 'विवाह व जयमाला (2 दिन)', quantity: 2, rate: 6000, amount: 12000, isActive: true },
        { id: 'w2', srNo: 2, name: 'एल्बम करिज्मा', program: '12x36 (40 शीट्स लेदर कवर)', quantity: 1, rate: 10500, amount: 10500, isActive: true },
        { id: 'w3', srNo: 3, name: 'वीडियो कैमरा', program: 'सोनी 4K लाइव कवरेज', quantity: 2, rate: 7000, amount: 14000, isActive: true },
        { id: 'w4', srNo: 4, name: 'ड्रोन कैमरा', program: 'एरियल एंट्री व विदाई', quantity: 1, rate: 6000, amount: 6000, isActive: true },
        { id: 'w5', srNo: 5, name: 'छतरी लाइट', program: 'स्टेज व मंडप लाइटिंग', quantity: 4, rate: 800, amount: 3200, isActive: true },
        { id: 'w6', srNo: 6, name: 'फ्लैश लाइट', program: 'पोर्ट्रेट व कैंडिड लाइटिंग', quantity: 2, rate: 600, amount: 1200, isActive: true },
        { id: 'w7', srNo: 7, name: 'पेन ड्राइव', program: '128 GB 3.0 फुल डाटा', quantity: 1, rate: 1200, amount: 1200, isActive: true },
        { id: 'w8', srNo: 8, name: 'एलईडी फ्रेम', program: '20x30 ब्राइडल फ्रेम', quantity: 1, rate: 3000, amount: 3000, isActive: true },
        { id: 'w9', srNo: 9, name: 'ट्राइपॉड', program: 'जिम्बाल स्टेबलाइजर', quantity: 1, rate: 1500, amount: 1500, isActive: true },
        { id: 'w10', srNo: 10, name: 'कैमरा लेंस', program: 'सिग्मा 24-70mm f/2.8', quantity: 1, rate: 2000, amount: 2000, isActive: true },
      ];
      const subtotal = weddingItems.reduce((s, i) => s + i.amount, 0);
      const discount = 2600;
      const total = subtotal - discount;
      const advance = Math.round(total * 0.3);
      onChange({
        ...bill,
        customer: {
          ...bill.customer,
          partyName: bill.customer.partyName || 'श्री सतीश चंदेल जी',
          eventType: 'शुभ विवाह समारोह',
        },
        items: weddingItems,
        subtotal,
        discount,
        total,
        advancePaid: advance,
        balanceDue: total - advance,
      });
    }

    if (type === 'tilak') {
      const tilakItems: BillItem[] = [
        { id: 't1', srNo: 1, name: 'फोटो कैमरा', program: 'तिलक एवं रिंग सेरेमनी', quantity: 1, rate: 5000, amount: 5000, isActive: true },
        { id: 't2', srNo: 2, name: 'एल्बम करिज्मा', program: '12x30 (25 शीट्स)', quantity: 1, rate: 6500, amount: 6500, isActive: true },
        { id: 't3', srNo: 3, name: 'वीडियो कैमरा', program: 'HD रिकॉर्डिंग', quantity: 1, rate: 6000, amount: 6000, isActive: true },
        { id: 't4', srNo: 4, name: 'ड्रोन कैमरा', program: '', quantity: 0, rate: 5000, amount: 0, isActive: false },
        { id: 't5', srNo: 5, name: 'छतरी लाइट', program: 'स्टेज लाइटिंग', quantity: 2, rate: 800, amount: 1600, isActive: true },
        { id: 't6', srNo: 6, name: 'फ्लैश लाइट', program: '', quantity: 0, rate: 500, amount: 0, isActive: false },
        { id: 't7', srNo: 7, name: 'पेन ड्राइव', program: '64 GB स्टोरेज', quantity: 1, rate: 900, amount: 900, isActive: true },
        { id: 't8', srNo: 8, name: 'एलईडी फ्रेम', program: '', quantity: 0, rate: 2000, amount: 0, isActive: false },
        { id: 't9', srNo: 9, name: 'ट्राइपॉड', program: 'स्टैंड', quantity: 1, rate: 400, amount: 400, isActive: true },
        { id: 't10', srNo: 10, name: 'कैमरा लेंस', program: '', quantity: 0, rate: 1500, amount: 0, isActive: false },
      ];
      const subtotal = tilakItems.filter(i => i.isActive).reduce((s, i) => s + i.amount, 0);
      const advance = Math.round(subtotal * 0.3);
      onChange({
        ...bill,
        customer: {
          ...bill.customer,
          eventType: 'तिलक / सगाई समारोह',
        },
        items: tilakItems,
        subtotal,
        discount: 0,
        total: subtotal,
        advancePaid: advance,
        balanceDue: subtotal - advance,
      });
    }

    if (type === 'prewedding') {
      const pwItems: BillItem[] = [
        { id: 'p1', srNo: 1, name: 'फोटो कैमरा', program: 'सिनेमैटिक प्री-वेडिंग शूट', quantity: 1, rate: 10000, amount: 10000, isActive: true },
        { id: 'p2', srNo: 2, name: 'एल्बम करिज्मा', program: 'मिनी टीज़र फोटोबुक', quantity: 1, rate: 4500, amount: 4500, isActive: true },
        { id: 'p3', srNo: 3, name: 'वीडियो कैमरा', program: 'सिनेमैटिक 4K टीज़र रील', quantity: 1, rate: 8000, amount: 8000, isActive: true },
        { id: 'p4', srNo: 4, name: 'ड्रोन कैमरा', program: 'आउटडोर एरियल शॉट्स', quantity: 1, rate: 6000, amount: 6000, isActive: true },
        { id: 'p5', srNo: 5, name: 'छतरी लाइट', program: 'रिफ्लेक्टर व पोर्टेबल लाइट', quantity: 1, rate: 1000, amount: 1000, isActive: true },
        { id: 'p6', srNo: 6, name: 'फ्लैश लाइट', program: 'हाई स्पीड सिंक फ्लैश', quantity: 1, rate: 800, amount: 800, isActive: true },
        { id: 'p7', srNo: 7, name: 'पेन ड्राइव', program: '64 GB', quantity: 1, rate: 900, amount: 900, isActive: true },
        { id: 'p8', srNo: 8, name: 'एलईडी फ्रेम', program: '', quantity: 0, rate: 2500, amount: 0, isActive: false },
        { id: 'p9', srNo: 9, name: 'ट्राइपॉड', program: 'गिम्बल', quantity: 1, rate: 1500, amount: 1500, isActive: true },
        { id: 'p10', srNo: 10, name: 'कैमरा लेंस', program: 'प्राइम लेंस 50mm f/1.4', quantity: 1, rate: 1800, amount: 1800, isActive: true },
      ];
      const subtotal = pwItems.filter(i => i.isActive).reduce((s, i) => s + i.amount, 0);
      const advance = Math.round(subtotal * 0.3);
      onChange({
        ...bill,
        customer: {
          ...bill.customer,
          eventType: 'प्री-वेडिंग शूट',
        },
        items: pwItems,
        subtotal,
        discount: 0,
        total: subtotal,
        advancePaid: advance,
        balanceDue: subtotal - advance,
      });
    }
  };

  const handleSaveClick = () => {
    onSave();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden font-devanagari">
      {/* Quick Actions Header */}
      <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-base md:text-lg">बिल एवं बुकिंग प्रविष्टि (Bill Form)</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onFillSample}
            type="button"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
            title="लोड डेमो डेटा"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>सैंपल डेटा</span>
          </button>

          <button
            onClick={onNew}
            type="button"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
            title="नया खाली बिल बनाएँ"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>नया बिल</span>
          </button>

          <button
            onClick={handleSaveClick}
            type="button"
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>सेव करें</span>
          </button>

          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              disabled={isGeneratingPDF}
              type="button"
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
              title="रसीद सीधे PDF के रूप में डाउनलोड करें"
            >
              <Download className={`w-4 h-4 text-emerald-200 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
              <span>{isGeneratingPDF ? 'PDF बन रहा है...' : 'PDF डाउनलोड'}</span>
            </button>
          )}

          {onPrint && (
            <button
              onClick={onPrint}
              type="button"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition-all"
              title="रसीद प्रिंट करें"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>प्रिंट</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      {saveToast && (
        <div className="bg-emerald-100 text-emerald-900 px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-emerald-200 transition-all">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            बुकिंग रसीद सफलतापूर्वक रजिस्टर में सुरक्षित कर ली गई है!
          </span>
          <span className="text-[11px] font-mono text-emerald-800">#{bill.customer.billNo}</span>
        </div>
      )}

      {/* Package Presets Row */}
      <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-amber-900 font-bold whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          क्विक पैकेज:
        </span>
        <button
          onClick={() => applyPackagePreset('wedding')}
          className="bg-white hover:bg-amber-100 text-slate-800 px-2.5 py-1 rounded-md border border-amber-300 font-medium whitespace-nowrap shadow-2xs transition-colors"
        >
          💍 विवाह सम्पूर्ण पैकेज
        </button>
        <button
          onClick={() => applyPackagePreset('tilak')}
          className="bg-white hover:bg-amber-100 text-slate-800 px-2.5 py-1 rounded-md border border-amber-300 font-medium whitespace-nowrap shadow-2xs transition-colors"
        >
          🪔 तिलक / सगाई
        </button>
        <button
          onClick={() => applyPackagePreset('prewedding')}
          className="bg-white hover:bg-amber-100 text-slate-800 px-2.5 py-1 rounded-md border border-amber-300 font-medium whitespace-nowrap shadow-2xs transition-colors"
        >
          🎬 प्री-वेडिंग शूट
        </button>
        <button
          onClick={() => applyPackagePreset('reset')}
          className="bg-white hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-300 font-medium whitespace-nowrap shadow-2xs transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          मूल 10 सेवाएँ
        </button>
      </div>

      {/* Tabs for Form Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 text-xs font-semibold">
        <button
          onClick={() => setActiveSection('customer')}
          className={`px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'customer'
              ? 'border-red-700 text-red-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-red-600" />
          <span>ग्राहक व बुकिंग विवरण</span>
        </button>

        <button
          onClick={() => setActiveSection('items')}
          className={`px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'items'
              ? 'border-red-700 text-red-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4 text-red-600" />
          <span>कैमरा व सेवाएँ ({bill.items.filter(i => i.isActive).length})</span>
        </button>

        <button
          onClick={() => setActiveSection('payment')}
          className={`px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'payment'
              ? 'border-red-700 text-red-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-red-600" />
          <span>भुगतान (टोटल / जमा / बाकी)</span>
        </button>

        <button
          onClick={() => setActiveSection('studio')}
          className={`px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'studio'
              ? 'border-red-700 text-red-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4 text-red-600" />
          <span>स्टूडियो प्रोफाइल</span>
        </button>

        <button
          onClick={() => setActiveSection('terms')}
          className={`px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-all ${
            activeSection === 'terms'
              ? 'border-red-700 text-red-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-red-600" />
          <span>नियम व शर्तें</span>
        </button>
      </div>

      <div className="p-4">
        {/* SECTION 1: Customer & Booking Info */}
        {activeSection === 'customer' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  बिल / रसीद नं०
                </label>
                <input
                  type="text"
                  value={bill.customer.billNo}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, billNo: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  placeholder="RDS-2026-101"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  रसीद दिनांक
                </label>
                <input
                  type="date"
                  value={bill.customer.billDate}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, billDate: e.target.value },
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  बुकिंग स्थिति (Status)
                </label>
                <select
                  value={bill.status}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      status: e.target.value as BookingStatus,
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                >
                  <option value="एडवांस जमा (Booked)">एडवांस जमा (Booked)</option>
                  <option value="शूट पूर्ण (Shoot Done)">शूट पूर्ण (Shoot Done)</option>
                  <option value="एडिटिंग जारी (In Progress)">एडिटिंग जारी (In Progress)</option>
                  <option value="डिलीवर हो गया (Completed)">डिलीवर हो गया (Completed)</option>
                  <option value="रद्द (Cancelled)">रद्द (Cancelled)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पार्टी का नाम (Customer / Party Name) *
                </label>
                <input
                  type="text"
                  value={bill.customer.partyName}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, partyName: e.target.value },
                    })
                  }
                  placeholder="उदा० श्री प्रमोद कुमार शर्मा / राजेश जी"
                  className="w-full text-sm font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मोबाइल नं० (Mobile Number) *
                </label>
                <input
                  type="text"
                  value={bill.customer.mobile}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, mobile: e.target.value },
                    })
                  }
                  placeholder="9876543210"
                  className="w-full text-sm font-mono font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पता (गांव / मोहल्ला / कालोनी)
                </label>
                <input
                  type="text"
                  value={bill.customer.address}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, address: e.target.value },
                    })
                  }
                  placeholder="ग्राम - रामपुर, गली नं० 4"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पोस्ट (Post Office)
                </label>
                <input
                  type="text"
                  value={bill.customer.post}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, post: e.target.value },
                    })
                  }
                  placeholder="शांति नगर"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  थाना (Police Station)
                </label>
                <input
                  type="text"
                  value={bill.customer.thana}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, thana: e.target.value },
                    })
                  }
                  placeholder="कोतवाली देहात"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  बुकिंग दिनांक (Booking / Start Date)
                </label>
                <input
                  type="date"
                  value={bill.customer.bookingDate}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, bookingDate: e.target.value },
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  वापसी दिनांक (Return / Event Completion Date)
                </label>
                <input
                  type="date"
                  value={bill.customer.returnDate}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      customer: { ...bill.customer, returnDate: e.target.value },
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveSection('items')}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"
              >
                <span>अगला: कैमरा व सेवाएँ</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: Items & Services */}
        {activeSection === 'items' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <p className="text-slate-600">
                रसीद के लिए आवश्यक कैमरा व सेवाएँ चेक करें एवं दर/विवरण भरें:
              </p>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="text-xs bg-red-50 text-red-800 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-lg border border-red-200 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नई सेवा जोड़ें</span>
              </button>
            </div>

            {/* Table of items */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-2 px-2 text-center w-10">शामिल</th>
                    <th className="py-2 px-1 text-center w-10">क्र.</th>
                    <th className="py-2 px-3">कैमरा एण्ड सर्विस</th>
                    <th className="py-2 px-3">कार्यक्रम (Event/Detail)</th>
                    <th className="py-2 px-2 text-center w-16">संख्या</th>
                    <th className="py-2 px-2 text-right w-20">दर (₹)</th>
                    <th className="py-2 px-3 text-right w-24">रूपया (₹)</th>
                    <th className="py-2 px-2 text-center w-10">हटाएं</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bill.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        item.isActive ? 'bg-white' : 'bg-slate-50 opacity-60'
                      }`}
                    >
                      {/* Active toggle */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={(e) =>
                            handleItemChange(item.id, 'isActive', e.target.checked)
                          }
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                        />
                      </td>

                      {/* Sr No */}
                      <td className="py-2 px-1 text-center font-bold text-slate-600">
                        ({item.srNo})
                      </td>

                      {/* Service Name */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(item.id, 'name', e.target.value)
                          }
                          placeholder="सेवा का नाम"
                          className="w-full text-xs font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-600 focus:outline-hidden px-1 py-0.5"
                        />
                      </td>

                      {/* Program detail */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.program}
                          onChange={(e) =>
                            handleItemChange(item.id, 'program', e.target.value)
                          }
                          placeholder="उदा० जयमाला, मंडप, 35 शीट"
                          className="w-full text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-red-600 focus:outline-hidden px-1 py-0.5 text-slate-700"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', e.target.value)
                          }
                          className="w-14 text-center font-mono text-xs bg-slate-50 border border-slate-200 rounded px-1 py-1 focus:ring-1 focus:ring-red-600"
                        />
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={item.rate || ''}
                          onChange={(e) =>
                            handleItemChange(item.id, 'rate', e.target.value)
                          }
                          placeholder="0"
                          className="w-20 text-right font-mono text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-red-600"
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal Banner */}
            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">
                सक्रिय सेवाएँ: {bill.items.filter((i) => i.isActive).length} / {bill.items.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-slate-600">कुल योग (Subtotal):</span>
                <span className="font-mono text-sm font-extrabold text-slate-900">
                  ₹{Number(bill.subtotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveSection('customer')}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-lg"
              >
                ← पिछला
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('payment')}
                className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"
              >
                <span>अगला: भुगतान (जमा/बाकी)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: Payment & Calculation */}
        {activeSection === 'payment' && (() => {
          const advancePercent = bill.total > 0 ? Math.round((bill.advancePaid / bill.total) * 100) : 0;
          const balancePercent = bill.total > 0 ? Math.max(0, 100 - advancePercent) : 0;
          const discountPercent = (bill.subtotal || 0) > 0 && (bill.discount || 0) > 0
            ? Math.round(((bill.discount || 0) / (bill.subtotal || 1)) * 100)
            : 0;

          return (
            <div className="space-y-4">
              {/* Visual Percentage & Payment Progress Bar */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-amber-400/20 text-amber-400 rounded-md">
                      <Percent className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-amber-300">भुगतान अनुपात एवं प्रतिशत (Payment %)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      जमा: {advancePercent}% (₹{bill.advancePaid.toLocaleString('en-IN')})
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                      बाकी: {balancePercent}% (₹{bill.balanceDue.toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>

                {/* Dual Color Progress Bar */}
                <div className="w-full h-3 bg-red-900/60 rounded-full overflow-hidden flex shadow-inner border border-slate-700">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, advancePercent))}%` }}
                    title={`जमा राशि: ${advancePercent}%`}
                  />
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, balancePercent))}%` }}
                    title={`बाकी राशि: ${balancePercent}%`}
                  />
                </div>
              </div>

              {/* Three Main Financial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Total Calculation with Discount % Presets */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block mb-1">कुल राशि (Total)</span>
                    <div className="text-2xl font-mono font-extrabold text-slate-900">
                      ₹{Number(bill.total || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600 flex justify-between">
                      <span>उप-योग (Subtotal):</span>
                      <span className="font-mono font-bold">₹{bill.subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Discount Input & % presets */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-700 font-bold">विशेष छूट (Discount):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono font-bold text-amber-800">
                            {discountPercent > 0 ? `(${discountPercent}%)` : ''}
                          </span>
                          <span className="text-slate-600">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={bill.discount || ''}
                            onChange={(e) => {
                              const disc = Number(e.target.value) || 0;
                              const newTot = Math.max(0, bill.subtotal - disc);
                              const newBal = Math.max(0, newTot - bill.advancePaid);
                              onChange({
                                ...bill,
                                discount: disc,
                                total: newTot,
                                balanceDue: newBal,
                              });
                            }}
                            placeholder="0"
                            className="w-20 text-right font-mono font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-red-600 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Quick Discount % Presets */}
                      <div className="flex items-center gap-1 flex-wrap mt-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold">छूट %:</span>
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyDiscountPercentage(pct)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                              discountPercent === pct
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        {bill.discount > 0 && (
                          <button
                            type="button"
                            onClick={() => applyDiscountPercentage(0)}
                            className="text-[10px] font-bold px-1 py-0.5 rounded text-red-600 hover:bg-red-50"
                            title="छूट हटाएं"
                          >
                            0%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Advance Paid with Direct % Input and Presets */}
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-emerald-800 font-bold">जमा राशि (Advance Paid)</span>
                      <span className="text-[10px] font-mono font-extrabold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                        {advancePercent}%
                      </span>
                    </div>

                    {/* Dual input: Rupees (₹) and Percentage (%) */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">रुपये (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={bill.advancePaid || ''}
                          onChange={(e) => {
                            const adv = Number(e.target.value) || 0;
                            const bal = Math.max(0, bill.total - adv);
                            onChange({
                              ...bill,
                              advancePaid: adv,
                              balanceDue: bal,
                            });
                          }}
                          placeholder="0"
                          className="w-full text-base font-mono font-extrabold text-emerald-950 bg-white border border-emerald-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">प्रतिशत (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={advancePercent || ''}
                            onChange={(e) => {
                              const pct = Number(e.target.value) || 0;
                              applyAdvancePercentage(pct);
                            }}
                            placeholder="0"
                            className="w-full text-base font-mono font-extrabold text-emerald-950 bg-white border border-emerald-300 rounded-lg px-2 pr-6 py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                          <span className="absolute right-2 top-1.5 text-xs font-bold text-emerald-700">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Advance Percentage Quick Preset Buttons */}
                    <div className="mt-2 pt-2 border-t border-emerald-200/80">
                      <div className="text-[10px] font-bold text-emerald-800 mb-1">त्वरित प्रतिशत (Quick % Presets):</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[20, 25, 30, 40, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyAdvancePercentage(pct)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                              advancePercent === pct
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                            title={pct === 30 ? 'स्टूडियो नियम अनुसार 30% एडवांस' : `${pct}% एडवांस`}
                          >
                            {pct === 30 ? '30% (नियम)' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Balance Due */}
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-red-800 font-bold">बाकी राशि (Balance Due)</span>
                      <button
                        type="button"
                        onClick={applyFullPayment}
                        className="text-[10px] bg-red-700 hover:bg-red-800 text-white font-bold px-2 py-0.5 rounded shadow-2xs"
                      >
                        100% पूर्ण
                      </button>
                    </div>
                    <div className="text-2xl font-mono font-extrabold text-red-900">
                      ₹{Number(bill.balanceDue || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-2 text-[11px] text-red-700 flex justify-between items-center">
                      <span>शेष प्रतिशत:</span>
                      <span className="font-mono font-bold bg-red-100 text-red-800 px-1.5 py-0.2 rounded border border-red-300">
                        {balancePercent}%
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-red-700">
                      {bill.balanceDue === 0 ? (
                        <span className="text-emerald-700 font-bold">✓ पूर्ण भुगतान प्राप्त</span>
                      ) : (
                        <span>शूट / डिलीवरी के बाद देय</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Show Percentage on Slip Toggle */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bill.showPercentage !== false}
                    onChange={(e) => onChange({ ...bill, showPercentage: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      बिल पर्ची पर प्रतिशत (%) अनुपात दिखाएं (Show % on Bill Slip)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      प्रिंट पर्ची में 'जमा ({advancePercent}%)' एवं 'बाकी ({balancePercent}%)' का प्रतिशत प्रदर्शित करता है।
                    </span>
                  </div>
                </label>
                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {bill.showPercentage !== false ? 'चालू (ON)' : 'बंद (OFF)'}
                </span>
              </div>
              {/* Payment Mode & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    भुगतान माध्यम (Payment Method)
                  </label>
                  <select
                    value={bill.paymentMode}
                    onChange={(e) =>
                      onChange({
                        ...bill,
                        paymentMode: e.target.value as PaymentMode,
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  >
                    <option value="नकद (Cash)">नकद (Cash)</option>
                    <option value="UPI (PhonePe/GPay)">UPI (PhonePe / Google Pay / Paytm)</option>
                    <option value="बैंक ट्रांसफर (Bank)">बैंक ट्रांसफर (IMPS / NEFT)</option>
                    <option value="चेक (Cheque)">चेक (Cheque)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    अतिरिक्त टिप्पणी / नोट्स (Optional Notes)
                  </label>
                  <input
                    type="text"
                    value={bill.notes || ''}
                    onChange={(e) =>
                      onChange({
                        ...bill,
                        notes: e.target.value,
                      })
                    }
                    placeholder="उदा० 2 अतिरिक्त पेन ड्राइव पेनल्टी या स्पेशल रिक्वेस्ट"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('items')}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-lg"
                >
                  ← पिछला
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('terms')}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"
                >
                  <span>अगला: नियम व शर्तें</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* SECTION 4: Studio Profile (Editable) */}
        {activeSection === 'studio' && (
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">नोट: </span>
              यहाँ आप स्टूडियो का नाम, प्रोप्राइटर, मोबाइल नंबर, पता व UPI विवरण बदल सकते हैं। यह जानकारी सभी बिलों पर प्रदर्शित होगी।
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दुकान / स्टूडियो का नाम
                </label>
                <input
                  type="text"
                  value={bill.studio.shopName}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, shopName: e.target.value },
                    })
                  }
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्रो० (Proprietor) का नाम
                </label>
                <input
                  type="text"
                  value={bill.studio.proprietor}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, proprietor: e.target.value },
                    })
                  }
                  placeholder="रामकुमार पटेल"
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मोबाइल नं० (Mobile No.)
                </label>
                <input
                  type="text"
                  value={bill.studio.mobile}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, mobile: e.target.value },
                    })
                  }
                  placeholder="8719070472"
                  className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  अतिरिक्त मोबाइल नं० (Alt Mobile)
                </label>
                <input
                  type="text"
                  value={bill.studio.altMobile || ''}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, altMobile: e.target.value },
                    })
                  }
                  placeholder="वैकल्पिक संपर्क सूत्र"
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                विवरण / टैगलाइन (Services Tagline)
              </label>
              <textarea
                rows={2}
                value={bill.studio.description}
                onChange={(e) =>
                  onChange({
                    ...bill,
                    studio: { ...bill.studio, description: e.target.value },
                  })
                }
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दुकान का पता (Address)
                </label>
                <input
                  type="text"
                  value={bill.studio.address}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, address: e.target.value },
                    })
                  }
                  placeholder="ग्राम - खमतरा, दादा महाराज मार्ग, जिला - नरसिंहपुर"
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  पोस्ट (Post)
                </label>
                <input
                  type="text"
                  value={bill.studio.post}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, post: e.target.value },
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  थाना (Thana)
                </label>
                <input
                  type="text"
                  value={bill.studio.thana}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, thana: e.target.value },
                    })
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI आईडी (QR भुगतान के लिए)
                </label>
                <input
                  type="text"
                  value={bill.studio.upiId || ''}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, upiId: e.target.value },
                    })
                  }
                  placeholder="name@upi या 9876543210@paytm"
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="showQr"
                  checked={bill.studio.showUpiQr}
                  onChange={(e) =>
                    onChange({
                      ...bill,
                      studio: { ...bill.studio, showUpiQr: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <label htmlFor="showQr" className="text-xs font-bold text-slate-700 cursor-pointer">
                  बिल पर्ची पर PhonePe / UPI QR कोड दिखाएं
                </label>
                <img
                  src={bill.studio.qrImageUrl || RDS_STUDIO_QR_IMAGE_URL}
                  alt="QR Code Preview"
                  className="w-10 h-10 object-contain rounded border border-slate-300 ml-auto bg-white p-0.5 shadow-2xs"
                  title="PhonePe QR Code Preview"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Terms & Conditions */}
        {activeSection === 'terms' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              रसीद के नीचे छपने वाले नियम व शर्तें (इन्हें अपनी इच्छानुसार बदल सकते हैं):
            </p>

            <div className="space-y-2">
              {bill.terms.map((term, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-5 text-right">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => {
                      const updatedTerms = [...bill.terms];
                      updatedTerms[index] = e.target.value;
                      onChange({ ...bill, terms: updatedTerms });
                    }}
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-600 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updatedTerms = bill.terms.filter((_, idx) => idx !== index);
                      onChange({ ...bill, terms: updatedTerms });
                    }}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="शर्त हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...bill,
                    terms: [...bill.terms, 'नया नियम यहाँ लिखें...'],
                  });
                }}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नया नियम जोड़ें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...bill,
                    terms: [...DEFAULT_TERMS],
                  });
                }}
                className="text-xs text-slate-500 hover:text-red-700 underline"
              >
                मूल नियम रीसेट करें
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
