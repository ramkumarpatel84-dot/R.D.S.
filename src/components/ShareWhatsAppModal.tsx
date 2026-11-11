/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BillData } from '../types';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';

interface ShareWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillData;
}

export const ShareWhatsAppModal: React.FC<ShareWhatsAppModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState(bill.customer.mobile || '');

  if (!isOpen) return null;

  const activeServices = bill.items.filter((it) => it.isActive);

  const advancePercent = bill.total > 0 ? Math.round((bill.advancePaid / bill.total) * 100) : 0;
  const balancePercent = bill.total > 0 ? Math.max(0, 100 - advancePercent) : 0;
  const discountPercent = (bill.subtotal || 0) > 0 && (bill.discount || 0) > 0
    ? Math.round(((bill.discount || 0) / (bill.subtotal || 1)) * 100)
    : 0;

  // Generate beautiful Hindi WhatsApp text
  const messageText = `📸 *${bill.studio.shopName || 'RDS STUDIO Mixing Point'}* 📸
प्रो० ${bill.studio.proprietor} (मो० ${bill.studio.mobile})
पता: ${bill.studio.address}${bill.studio.post ? ', पोस्ट: ' + bill.studio.post : ''}

।। श्री गणेशाय नमः ।।
━━━━━━━━━━━━━━━━━━━━━━
🧾 *बुकिंग पर्ची / रसीद क्र०:* ${bill.customer.billNo || 'N/A'}
📅 *दिनांक:* ${bill.customer.billDate || new Date().toLocaleDateString('hi-IN')}

👤 *पार्टी का नाम:* ${bill.customer.partyName || 'ग्राहक'}
📱 *मोबाइल:* ${bill.customer.mobile || 'अनुपलब्ध'}
📍 *पता:* ${bill.customer.address || ''} ${bill.customer.post ? 'पोस्ट: ' + bill.customer.post : ''} ${bill.customer.thana ? 'थाना: ' + bill.customer.thana : ''}
🗓️ *बुकिंग दिनांक:* ${bill.customer.bookingDate || 'N/A'}
🔄 *वापसी दिनांक:* ${bill.customer.returnDate || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━
📋 *बुक की गई कैमरा व सेवाएँ:*
${activeServices.map((it, idx) => `${idx + 1}. ${it.name} ${it.program ? '(' + it.program + ')' : ''} × ${it.quantity} = ₹${Number(it.amount).toLocaleString('en-IN')}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━
${bill.discount > 0 ? `💰 *उप-योग (Subtotal):* ₹${Number(bill.subtotal).toLocaleString('en-IN')}\n🎁 *विशेष छूट (Discount ${discountPercent}%):* -₹${Number(bill.discount).toLocaleString('en-IN')}\n` : ''}💵 *कुल योग (Total):* ₹${Number(bill.total).toLocaleString('en-IN')}
✅ *जमा राशि (Advance - ${advancePercent}%):* ₹${Number(bill.advancePaid).toLocaleString('en-IN')}
⚠️ *बाकी राशि (Balance Due - ${balancePercent}%):* ₹${Number(bill.balanceDue).toLocaleString('en-IN')}
💳 *भुगतान माध्यम:* ${bill.paymentMode || 'नकद'}

📜 *नियम एवं शर्तें:*
${bill.terms.map((t, i) => `${i + 1}. ${t}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━
🙏 हमारे स्टूडियो को चुनने के लिए आपका बहुत-बहुत धन्यवाद!
आपकी सेवा में सदैव तत्पर: ${bill.studio.shopName}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const encoded = encodeURIComponent(messageText);
    const url = `https://wa.me/${phoneWithCountry}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-devanagari">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-200" />
            <div>
              <h3 className="font-bold text-lg">व्हाट्सएप पर रसीद भेजें</h3>
              <p className="text-xs text-emerald-100">ग्राहक के मोबाइल पर एक क्लिक में बुकिंग पर्ची भेजें</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Recipient Phone input */}
        <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-col gap-2">
          <label className="text-xs font-bold text-emerald-950">
            प्राप्तकर्ता मोबाइल नंबर (Customer WhatsApp No.)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-emerald-300 rounded-lg overflow-hidden flex-1 px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
              <span className="text-xs font-bold text-emerald-800 pr-2 border-r border-slate-200">+91</span>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="10 अंकों का मोबाइल नंबर"
                className="w-full text-sm font-mono font-bold pl-2 bg-transparent focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleSendWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>व्हाट्सएप खोलें</span>
            </button>
          </div>
        </div>

        {/* Message Preview */}
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-700">मैसेज का प्रारूप (Message Preview):</span>
            <button
              onClick={handleCopy}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-md border border-slate-300 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'कॉपी हो गया!' : 'मैसेज कॉपी करें'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] leading-relaxed rounded-xl font-mono whitespace-pre-wrap select-all max-h-72 overflow-y-auto border border-slate-800">
            {messageText}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg"
          >
            बंद करें
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>भेजें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
