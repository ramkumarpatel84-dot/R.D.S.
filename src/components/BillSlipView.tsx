/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BillData, ColorTheme, PrintLayout, RDS_STUDIO_LOGO_URL, RDS_STUDIO_QR_IMAGE_URL } from '../types';
import { GaneshHeader } from './GaneshHeader';
import { numberToHindiWords } from '../utils/numberToHindiWords';
import { QRCodeSVG } from 'qrcode.react';

interface BillSlipViewProps {
  bill: BillData;
  theme: ColorTheme;
  layout: PrintLayout;
  isBlankMode?: boolean; // If true, prints blank dotted template for manual writing
  copyLabel?: string; // e.g. "ग्राहक प्रति / Customer Copy" or "ऑफिस प्रति / Studio Copy"
}

export const BillSlipView: React.FC<BillSlipViewProps> = ({
  bill,
  theme,
  layout,
  isBlankMode = false,
  copyLabel
}) => {
  const { studio, customer, items, total, advancePaid, balanceDue, terms, subtotal, discount, showPercentage } = bill;

  // Percentage calculations
  const isPercentageVisible = showPercentage !== false;
  const advancePercent = total > 0 ? Math.round((advancePaid / total) * 100) : 0;
  const balancePercent = total > 0 ? Math.max(0, 100 - advancePercent) : 0;
  const discountPercent = (subtotal || 0) > 0 && (discount || 0) > 0 ? Math.round(((discount || 0) / (subtotal || 1)) * 100) : 0;
  const hasDiscount = Boolean(!isBlankMode && discount && discount > 0);

  // Theme styling configurations
  const themeClasses: Record<ColorTheme, {
    primaryText: string;
    borderThick: string;
    borderThin: string;
    bgHeader: string;
    bgMuted: string;
    tableHeadBg: string;
    tableHeadText: string;
    accentBadge: string;
  }> = {
    crimson: {
      primaryText: 'text-red-900',
      borderThick: 'border-red-800',
      borderThin: 'border-red-700',
      bgHeader: 'bg-red-50',
      bgMuted: 'bg-red-50/40',
      tableHeadBg: 'bg-red-800',
      tableHeadText: 'text-white',
      accentBadge: 'bg-red-100 text-red-900 border-red-300',
    },
    'royal-blue': {
      primaryText: 'text-blue-900',
      borderThick: 'border-blue-800',
      borderThin: 'border-blue-700',
      bgHeader: 'bg-blue-50',
      bgMuted: 'bg-blue-50/40',
      tableHeadBg: 'bg-blue-800',
      tableHeadText: 'text-white',
      accentBadge: 'bg-blue-100 text-blue-900 border-blue-300',
    },
    'black-white': {
      primaryText: 'text-neutral-900',
      borderThick: 'border-neutral-900',
      borderThin: 'border-neutral-700',
      bgHeader: 'bg-neutral-100',
      bgMuted: 'bg-neutral-50',
      tableHeadBg: 'bg-neutral-900',
      tableHeadText: 'text-white',
      accentBadge: 'bg-neutral-200 text-neutral-900 border-neutral-400',
    },
    'forest-green': {
      primaryText: 'text-emerald-950',
      borderThick: 'border-emerald-900',
      borderThin: 'border-emerald-800',
      bgHeader: 'bg-emerald-50',
      bgMuted: 'bg-emerald-50/40',
      tableHeadBg: 'bg-emerald-900',
      tableHeadText: 'text-white',
      accentBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    },
  };

  const currentTheme = themeClasses[theme];

  // UPI payment link
  const upiLink = studio.upiId && total > 0
    ? `upi://pay?pa=${encodeURIComponent(studio.upiId)}&pn=${encodeURIComponent(studio.shopName)}&am=${advancePaid > 0 ? advancePaid : total}&cu=INR&tn=${encodeURIComponent(`Booking Bill ${customer.billNo}`)}`
    : '';

  // Render a single bill slip unit
  const renderSingleSlip = (labelTag?: string) => {
    return (
      <div
        className={`bill-container relative bg-white mx-auto text-slate-900 font-devanagari transition-all ${
          layout === 'thermal-80mm'
            ? 'w-full max-w-[380px] p-3 text-xs border border-dashed border-slate-400'
            : 'w-full p-4 md:p-6 border-4 md:border-[6px] border-double ' + currentTheme.borderThick
        }`}
        style={{
          boxShadow: layout === 'thermal-80mm' ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Decorative corner accents for classic bill book */}
        {layout !== 'thermal-80mm' && (
          <>
            <div className={`absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 ${currentTheme.borderThin}`} />
            <div className={`absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 ${currentTheme.borderThin}`} />
            <div className={`absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 ${currentTheme.borderThin}`} />
            <div className={`absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 ${currentTheme.borderThin}`} />
          </>
        )}

        {/* Copy Label Badge (e.g. ग्राहक प्रति / ऑफिस प्रति) */}
        {(labelTag || copyLabel) && (
          <div className="flex justify-between items-center mb-1 no-print">
            <span className={`text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded border ${currentTheme.accentBadge}`}>
              {labelTag || copyLabel}
            </span>
            <span className="text-xs text-slate-500">
              रसीद क्र०: <span className="font-bold text-slate-800">{customer.billNo || '_____'}</span>
            </span>
          </div>
        )}

        {/* 1. Header Details (शीर्षक एवं संपर्क) */}
        <header className="border-b-2 border-current pb-2 mb-3">
          <div className="flex justify-between items-center text-xs md:text-sm font-semibold mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold">प्रो०:</span>
              <span
                className="font-extrabold text-slate-900 tracking-wide font-devanagari px-1 border border-slate-700/70"
                style={{
                  marginLeft: '0px',
                  paddingTop: '0px',
                  paddingLeft: '0px',
                  borderStyle: 'outset',
                }}
              >
                {studio.proprietor && !studio.proprietor.includes('प्रमोद')
                  ? studio.proprietor.replace(/\s*\(RAMKUMAR PATEL\)/i, '').trim()
                  : 'रामकुमार पटेल'}
              </span>
            </div>

            {/* ।। श्री गणेशाय नमः ।। */}
            <GaneshHeader title={studio.prayer} themeColorClass={currentTheme.primaryText} />

            <div className="flex items-center gap-1.5 text-right">
              <span className="font-bold">मो०:</span>
              <span className="font-mono font-extrabold tracking-wider text-slate-900">
                {studio.mobile && studio.mobile !== '0000000000' && studio.mobile !== '9876543210'
                  ? studio.mobile
                  : '8719070472'}
                {studio.altMobile && studio.altMobile !== '9123456780' ? `, ${studio.altMobile}` : ''}
              </span>
            </div>
          </div>

          {/* Shop Name Header with Official Logo */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 my-2 text-center sm:text-left">
            <img
              src={studio.logoUrl || RDS_STUDIO_LOGO_URL}
              alt="RDS STUDIO Official Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-xs shrink-0"
            />
            <div>
              <h1
                className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-wide font-rozha uppercase ${currentTheme.primaryText}`}
                style={{ textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.12)' }}
              >
                {studio.shopName && !studio.shopName.includes('निशा')
                  ? studio.shopName.replace(/\s*\(राम डिजिटल स्टूडियो\)/i, '').trim()
                  : 'RDS STUDIO Mixing Point'}
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-700 font-medium max-w-2xl mt-0.5 leading-snug">
                {studio.description || 'हमारे यहाँ: शादी-विवाह, तिलक, मुण्डन एवं अन्य सभी अवसरों पर वीडियोग्राफी, फोटोग्राफी, करिज्मा एलबम, ड्रोन कैमरा, वीडियो मिक्सिंग व लाइव टेलीकास्ट के लिए संपर्क करें।'}
              </p>
              <div className="mt-1 text-xs text-slate-800 font-medium flex items-baseline">
                <span className="font-bold text-slate-900 mr-1.5 whitespace-nowrap">पता:</span>
                <span className="font-bold text-slate-950 font-devanagari tracking-wide">
                  {studio.address && !studio.address.includes('सिनेमा रोड') && studio.address !== 'दादामहाराज रोड'
                    ? studio.address
                    : 'ग्राम - खमतरा, दादा महाराज मार्ग, जिला - नरसिंहपुर'}
                  {studio.post && studio.post !== 'खमतरा' ? `, पोस्ट: ${studio.post}` : ''}
                  {studio.thana ? `, थाना: ${studio.thana}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Bill No & Date Line */}
          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 mt-1 font-medium">
            <div>
              <span className="font-bold">बिल / बुकिंग नं०: </span>
              <span className="font-mono font-bold text-slate-900 bg-amber-50 px-1.5 py-0.5 border border-amber-200 rounded">
                {isBlankMode ? '........................' : customer.billNo || 'RDS-2026-001'}
              </span>
            </div>
            <div>
              <span className="font-bold">दिनांक: </span>
              <span className="font-medium text-slate-900">
                {isBlankMode ? '........................' : customer.billDate || new Date().toLocaleDateString('hi-IN')}
              </span>
            </div>
          </div>
        </header>

        {/* 2. Customer & Booking Info (ग्राहक / बुकिंग विवरण) */}
        <section className={`p-2.5 rounded-sm mb-3 border ${currentTheme.borderThin} ${currentTheme.bgMuted} text-xs md:text-sm leading-relaxed`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-2">
            {/* Party Name */}
            <div className="md:col-span-8 flex items-baseline">
              <span className="font-bold whitespace-nowrap mr-1">पार्टी का नाम:</span>
              <span className="flex-1 font-semibold text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.partyName || ''}
                {!isBlankMode && !customer.partyName && <span className="text-slate-400 italic">............................................................................</span>}
              </span>
            </div>

            {/* Mobile */}
            <div className="md:col-span-4 flex items-baseline">
              <span className="font-bold whitespace-nowrap mr-1">मोबाइल नं०:</span>
              <span className="flex-1 font-mono font-semibold text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.mobile || ''}
                {!isBlankMode && !customer.mobile && <span className="text-slate-400 italic">........................</span>}
              </span>
            </div>

            {/* Address, Post, Thana */}
            <div className="md:col-span-12 flex flex-wrap items-baseline gap-y-1">
              <span className="font-bold whitespace-nowrap mr-1">पता:</span>
              <span className="min-w-[120px] flex-1 font-medium text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.address || ''}
              </span>

              <span className="font-bold whitespace-nowrap ml-2 mr-1">पोस्ट:</span>
              <span className="min-w-[80px] font-medium text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.post || ''}
              </span>

              <span className="font-bold whitespace-nowrap ml-2 mr-1">थाना:</span>
              <span className="min-w-[80px] font-medium text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.thana || ''}
              </span>
            </div>

            {/* Booking & Return Date */}
            <div className="md:col-span-6 flex items-baseline">
              <span className="font-bold whitespace-nowrap mr-1">बुकिंग दिनांक:</span>
              <span className="flex-1 font-medium text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.bookingDate || ''}
              </span>
            </div>

            <div className="md:col-span-6 flex items-baseline">
              <span className="font-bold whitespace-nowrap mr-1">वापसी दिनांक:</span>
              <span className="flex-1 font-medium text-slate-900 border-b border-dotted border-slate-500 px-1 pb-0.5">
                {isBlankMode ? '' : customer.returnDate || ''}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Itemized Table (तालिका) */}
        <section className="mb-3 overflow-x-auto">
          <table className="w-full text-xs md:text-sm border-collapse border border-slate-800">
            <thead>
              <tr className={`${currentTheme.tableHeadBg} ${currentTheme.tableHeadText} text-center font-bold`}>
                <th className="border border-slate-700 py-1.5 px-1 w-10">क्र.सं.</th>
                <th className="border border-slate-700 py-1.5 px-2 text-left">कैमरा एण्ड सर्विस</th>
                <th className="border border-slate-700 py-1.5 px-2 text-left">कार्यक्रम</th>
                <th className="border border-slate-700 py-1.5 px-1.5 w-14">संख्या</th>
                <th className="border border-slate-700 py-1.5 px-2 text-right w-24">रूपया</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const isRowActive = !isBlankMode && item.isActive;
                return (
                  <tr
                    key={item.id || idx}
                    className={`border-b border-slate-700 text-slate-900 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    <td className="border-r border-slate-700 py-1 px-1 text-center font-medium">
                      ({item.srNo})
                    </td>
                    <td className="border-r border-slate-700 py-1 px-2 font-semibold">
                      {item.name}
                    </td>
                    <td className="border-r border-slate-700 py-1 px-2 text-slate-700">
                      {isBlankMode ? '' : (isRowActive ? item.program : '')}
                    </td>
                    <td className="border-r border-slate-700 py-1 px-1.5 text-center font-mono font-medium">
                      {isBlankMode ? '' : (isRowActive && item.quantity ? item.quantity : '')}
                    </td>
                    <td className="border-slate-700 py-1 px-2 text-right font-mono font-bold">
                      {isBlankMode
                        ? ''
                        : isRowActive && item.amount > 0
                        ? `₹${Number(item.amount).toLocaleString('en-IN')}`
                        : ''}
                    </td>
                  </tr>
                );
              })}

              {/* Totals Section directly in the table footer as per authentic Indian bill book:
                  (8) एलईडी फ्रेम    बाकी:
                  (9) ट्राइपॉड       जमा:
                  (10) कैमरा लेंस    टोटल:
              */}
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                <td colSpan={3} rowSpan={hasDiscount ? 5 : 3} className="border-r border-slate-800 p-2 align-top text-xs bg-slate-50">
                  <div className="font-semibold text-slate-800 mb-1">शब्दों में (In Words):</div>
                  <div className="text-slate-900 font-bold italic pl-1 border-l-2 border-red-700">
                    {isBlankMode ? '....................................................................................' : numberToHindiWords(total)}
                  </div>
                  {/* Payment Mode & Percentage Note */}
                  {!isBlankMode && (
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                      {bill.paymentMode && (
                        <div>
                          भुगतान माध्यम: <span className="font-semibold text-slate-800">{bill.paymentMode}</span>
                        </div>
                      )}
                      {isPercentageVisible && total > 0 && (
                        <div className="text-[10px] text-slate-700 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>भुगतान अनुपात:</span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            जमा {advancePercent}%
                          </span>
                          <span className="text-red-700 font-bold bg-red-50 px-1 py-0.2 rounded border border-red-200">
                            बाकी {balancePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="border-r border-slate-800 py-1 px-2 text-right font-bold bg-slate-100">
                  {hasDiscount ? 'उप-योग (Subtotal):' : 'टोटल:'}
                </td>
                <td className="py-1 px-2 text-right font-mono text-base font-extrabold text-slate-900 bg-slate-100">
                  {isBlankMode ? '' : `₹${Number((hasDiscount ? subtotal : total) || 0).toLocaleString('en-IN')}`}
                </td>
              </tr>

              {hasDiscount && (
                <tr className="border-t border-slate-300 font-bold">
                  <td className="border-r border-slate-800 py-1 px-2 text-right text-amber-800 bg-amber-50/50">
                    छूट (Discount {isPercentageVisible && discountPercent > 0 ? `${discountPercent}%` : ''}):
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-sm font-bold text-amber-800 bg-amber-50/50">
                    -₹{Number(discount).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {hasDiscount && (
                <tr className="border-t border-slate-300 font-bold">
                  <td className="border-r border-slate-800 py-1 px-2 text-right font-extrabold text-slate-900 bg-slate-100">
                    शुद्ध टोटल (Total):
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-base font-extrabold text-slate-900 bg-slate-100">
                    ₹{Number(total || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              <tr className="border-t border-slate-300 font-bold">
                <td className="border-r border-slate-800 py-1 px-2 text-right text-emerald-800 bg-emerald-50/50">
                  जमा (Advance {isPercentageVisible && advancePercent > 0 ? `${advancePercent}%` : ''}):
                </td>
                <td className="py-1 px-2 text-right font-mono text-sm font-bold text-emerald-800 bg-emerald-50/50">
                  {isBlankMode ? '' : `₹${Number(advancePaid || 0).toLocaleString('en-IN')}`}
                  {!isBlankMode && isPercentageVisible && advancePercent > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1 py-0.2 rounded print:border-none print:bg-transparent">
                      {advancePercent}%
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-t border-slate-300 font-bold">
                <td className="border-r border-slate-800 py-1 px-2 text-right text-red-800 bg-red-50/50">
                  बाकी (Balance {isPercentageVisible && total > 0 ? `${balancePercent}%` : ''}):
                </td>
                <td className="py-1 px-2 text-right font-mono text-sm font-extrabold text-red-900 bg-red-50/50">
                  {isBlankMode ? '' : `₹${Number(balanceDue || 0).toLocaleString('en-IN')}`}
                  {!isBlankMode && isPercentageVisible && total > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-red-800 bg-red-100 border border-red-300 px-1 py-0.2 rounded print:border-none print:bg-transparent">
                      {balancePercent}%
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 4. Terms & Conditions and QR Section */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2 pb-1 border-t border-slate-300">
          <div className="md:col-span-8 text-[11px] leading-tight text-slate-700">
            <h4 className="font-bold text-slate-900 underline mb-1">नियम एवं शर्तें (Terms & Conditions):</h4>
            <ol className="list-decimal list-inside space-y-0.5">
              {terms.map((term, i) => (
                <li key={i} className="pl-1">
                  <span>{term}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* PhonePe / UPI QR Code for instant payment */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-1.5 bg-slate-50 border border-slate-300 rounded text-center">
            {studio.showUpiQr && !isBlankMode ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-1 rounded border-2 border-slate-800 shadow-xs">
                  <img
                    src={studio.qrImageUrl || RDS_STUDIO_QR_IMAGE_URL}
                    alt="PhonePe / UPI QR Code"
                    className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
                  />
                </div>
                <span className="text-[10px] font-extrabold text-slate-900 mt-1">
                  PhonePe / UPI स्कैन करें
                </span>
                <span className="text-[9px] text-slate-700 font-mono font-bold">
                  {studio.mobile || '8719070472'}
                </span>
              </div>
            ) : (
              <div className="text-center py-1">
                <span className="text-[11px] font-semibold text-slate-600 block">शुभकामनाओं सहित</span>
                <span className="text-[10px] text-slate-500 block">आपकी सेवा में सदैव तत्पर</span>
              </div>
            )}
          </div>
        </section>

        {/* 5. Signatures (हस्ताक्षर) */}
        <footer className="mt-8 pt-2 flex justify-between items-end text-xs md:text-sm font-semibold">
          <div className="text-center w-40">
            <div className="border-b-2 border-dotted border-slate-700 w-full mb-1">&nbsp;</div>
            <span className="text-slate-800">पार्टी हस्ताक्षर</span>
            <span className="block text-[10px] font-normal text-slate-500">(Customer Signature)</span>
          </div>

          {/* Official Stamp / Seal Box with Real Logo */}
          <div className="hidden sm:flex flex-col items-center justify-center border-2 border-dashed border-amber-600/70 rounded-full w-28 h-28 p-2 text-center bg-white shadow-xs relative overflow-hidden">
            <img
              src={studio.logoUrl || RDS_STUDIO_LOGO_URL}
              alt="RDS STUDIO Official Stamp Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-center w-60">
            <div className="border-b-2 border-dotted border-slate-700 w-full mb-1.5">&nbsp;</div>
            <span className="text-slate-900 font-extrabold block text-xs sm:text-sm tracking-wide uppercase leading-snug">
              {studio.shopName
                ? studio.shopName.replace(/\s*\(.*?\)/g, '').replace(/[\u0900-\u097F]/g, '').trim() || 'RDS STUDIO Mixing Point'
                : 'RDS STUDIO Mixing Point'}
            </span>
            <span className="block text-slate-800 font-bold text-xs mt-0.5">मैनेजर / प्रो० हस्ताक्षर</span>
            <span className="block text-[10px] font-normal text-slate-500">(Authorized Signatory)</span>
          </div>
        </footer>
      </div>
    );
  };

  // If A5 Dual layout is selected, render two duplicate copies: "ग्राहक प्रति" & "स्टूडियो प्रति"
  if (layout === 'a5-dual') {
    return (
      <div className="flex flex-col gap-6 print:gap-4 w-full">
        <div className="print-area">
          {renderSingleSlip('ग्राहक प्रति (Customer Copy)')}
        </div>
        <div className="border-t-2 border-dashed border-slate-400 my-2 text-center text-xs text-slate-400 print:block">
          <span className="bg-slate-100 px-3 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-semibold text-slate-600">
            --- यहाँ से फाड़ें (Cut Here) ---
          </span>
        </div>
        <div className="print-area">
          {renderSingleSlip('स्टूडियो / ऑफिस प्रति (Office Record Copy)')}
        </div>
      </div>
    );
  }

  // Standard Single A4 or Thermal slip
  return (
    <div className="print-area w-full">
      {renderSingleSlip(copyLabel)}
    </div>
  );
};
