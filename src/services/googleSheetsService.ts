/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BillData } from '../types';

export interface SheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
}

/**
 * Create a new Google Sheet and export all booking records to it
 */
export async function exportRecordsToGoogleSheets(
  token: string,
  records: BillData[],
  studioName: string
): Promise<SheetExportResult> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const title = `RDS_Studio_Booking_Ledger_${dateStr}`;

  // Step 1: Create a new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google Sheet creation failed with status ${createRes.status}`);
  }

  const sheetInfo = await createRes.json();
  const spreadsheetId = sheetInfo.spreadsheetId;
  const spreadsheetUrl = sheetInfo.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  if (!spreadsheetId) {
    throw new Error('Google Spreadsheet ID प्राप्त नहीं हुआ।');
  }

  // Step 2: Prepare rows for values
  const headers = [
    'रसीद क्र० (Bill No)',
    'दिनांक (Date)',
    'पार्टी का नाम (Party Name)',
    'मोबाइल (Mobile)',
    'पता (Address)',
    'कार्यक्रम (Event Type)',
    'कुल राशि (Total ₹)',
    'जमा राशि (Advance ₹)',
    'बाकी राशि (Balance ₹)',
    'स्थिति (Status)',
    'भुगतान माध्यम (Payment Mode)',
  ];

  const rows: any[][] = records.map((rec) => [
    rec.customer.billNo || 'N/A',
    rec.customer.billDate || rec.createdAt?.slice(0, 10) || '',
    rec.customer.partyName || 'अनाम पार्टी',
    rec.customer.mobile || '',
    [rec.customer.address, rec.customer.post, rec.customer.thana].filter(Boolean).join(', '),
    rec.customer.eventType || 'वीडियोग्राफी बुकिंग',
    Number(rec.total) || 0,
    Number(rec.advancePaid) || 0,
    Number(rec.balanceDue) || 0,
    rec.status || 'Booked',
    rec.paymentMode || 'Cash',
  ]);

  const allValues = [headers, ...rows];

  // Step 3: Write values to Sheet1!A1
  const updateRes = await fetch(
    `https://sheets.googleapis.com/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Sheet1!A1',
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google Sheet values update failed (${updateRes.status})`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: title,
  };
}
