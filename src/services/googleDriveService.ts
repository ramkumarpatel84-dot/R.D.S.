/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BillData } from '../types';

export const BACKUP_FILE_NAME = 'RDS_Studio_Booking_Records.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  recordCount?: number;
}

export interface BackupPayload {
  version: string;
  appName: string;
  studioName: string;
  createdAt: string;
  recordCount: number;
  records: BillData[];
}

/**
 * Find existing backup file in Google Drive
 */
export async function findDriveBackup(token: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,description)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive query failed with status ${res.status}`);
  }

  const data = await res.json();
  const file = data.files?.[0];
  if (!file) return null;

  let recordCount: number | undefined;
  if (file.description && file.description.includes('records=')) {
    const match = file.description.match(/records=(\d+)/);
    if (match) recordCount = parseInt(match[1], 10);
  }

  return {
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime,
    size: file.size,
    recordCount,
  };
}

/**
 * Upload or Update backup file in Google Drive
 */
export async function uploadBackupToDrive(
  token: string,
  records: BillData[],
  studioName: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const existing = await findDriveBackup(token);

  const payload: BackupPayload = {
    version: '2.0',
    appName: 'RDS STUDIO Mixing Point - बिल बुक',
    studioName: studioName || 'RDS STUDIO Mixing Point',
    createdAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };

  const fileContent = JSON.stringify(payload, null, 2);

  if (existing) {
    // Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Google Drive update failed (${res.status})`);
    }

    const updated = await res.json();
    return {
      fileId: updated.id || existing.id,
      modifiedTime: new Date().toISOString(),
    };
  } else {
    // Create new file with multipart upload (metadata + content)
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: `RDS Studio Cloud Backup (records=${records.length})`,
    };

    const boundary = '-------RDS_STUDIO_MULTIPART_BOUNDARY';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Google Drive file creation failed (${res.status})`);
    }

    const created = await res.json();
    return {
      fileId: created.id,
      modifiedTime: new Date().toISOString(),
    };
  }
}

/**
 * Download and parse backup file from Google Drive
 */
export async function downloadBackupFromDrive(
  token: string,
  fileId: string
): Promise<{ records: BillData[]; modifiedTime: string; recordCount: number; studioName?: string }> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to download file from Google Drive (${res.status})`);
  }

  const data = await res.json();
  let records: BillData[] = [];
  let recordCount = 0;
  let studioName = '';
  let modifiedTime = new Date().toISOString();

  if (Array.isArray(data)) {
    // Simple array format
    records = data;
    recordCount = data.length;
  } else if (data && Array.isArray(data.records)) {
    // Rich payload format
    records = data.records;
    recordCount = data.recordCount || data.records.length;
    studioName = data.studioName;
    modifiedTime = data.createdAt || modifiedTime;
  } else {
    throw new Error('अमान्य बैकअप फाइल। इसमें कोई बुकिंग रिकॉर्ड नहीं मिला।');
  }

  return {
    records,
    recordCount,
    studioName,
    modifiedTime,
  };
}
