import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { AuditService } from './audit.service';
import { EntitlementService } from './entitlement.service';
import { AiGateway } from './ai/ai.gateway';
import { WorkflowEngine } from './automation/workflow.engine';

export interface ColumnMapping {
  crmField: string;
  sourceColumn: string;
}

export interface ImportOptions {
  defaultOwnerId?: string | null;
  defaultSource?: string;
  defaultStatus?: string;
  duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_ALL';
  duplicateCriteria: ('email' | 'phone')[];
}

export interface FieldDefinition {
  id: string;
  label: string;
  required?: boolean;
  aliases: string[];
  type: 'string' | 'number' | 'boolean' | 'enum';
  validValues?: string[];
  description?: string;
}

export const SUPPORTED_LEAD_FIELDS: FieldDefinition[] = [
  { id: 'firstName', label: 'First Name', required: true, aliases: ['first name', 'firstname', 'first_name', 'fname', 'given name', 'givenname'], type: 'string' },
  { id: 'lastName', label: 'Last Name', required: true, aliases: ['last name', 'lastname', 'last_name', 'lname', 'surname', 'family name'], type: 'string' },
  { id: 'company', label: 'Company', aliases: ['company', 'company name', 'organization', 'account', 'business', 'employer'], type: 'string' },
  { id: 'title', label: 'Title / Job Title', aliases: ['title', 'job title', 'designation', 'position', 'role', 'occupation'], type: 'string' },
  { id: 'email', label: 'Email', aliases: ['email', 'email address', 'e-mail', 'mail', 'work email', 'primary email'], type: 'string' },
  { id: 'secondaryEmail', label: 'Secondary Email', aliases: ['secondary email', 'alt email', 'alternate email', 'other email', 'personal email'], type: 'string' },
  { id: 'phone', label: 'Phone', aliases: ['phone', 'telephone', 'phone number', 'tel', 'work phone', 'office phone'], type: 'string' },
  { id: 'mobile', label: 'Mobile', aliases: ['mobile', 'cell', 'mobile phone', 'cell phone', 'cellular'], type: 'string' },
  { id: 'fax', label: 'Fax', aliases: ['fax', 'facsimile', 'fax number'], type: 'string' },
  { id: 'website', label: 'Website', aliases: ['website', 'url', 'web', 'site', 'homepage', 'domain'], type: 'string' },
  { id: 'ownerId', label: 'Lead Owner', aliases: ['lead owner', 'owner', 'assigned to', 'assignee', 'sales rep', 'agent'], type: 'string' },
  { id: 'source', label: 'Lead Source', aliases: ['lead source', 'source', 'channel', 'origin', 'acquisition channel'], type: 'enum', validValues: ['ADVERTISEMENT', 'WEBSITE', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'SOCIAL_MEDIA', 'PARTNER', 'EMAIL_CAMPAIGN', 'CAMPAIGN', 'LINKEDIN', 'API', 'EVENT', 'OTHER'] },
  { id: 'status', label: 'Lead Status', aliases: ['lead status', 'status', 'stage', 'lead state'], type: 'enum', validValues: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] },
  { id: 'priority', label: 'Lead Priority', aliases: ['priority', 'lead priority', 'urgency'], type: 'enum', validValues: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
  { id: 'industry', label: 'Industry', aliases: ['industry', 'sector', 'vertical', 'business category'], type: 'string' },
  { id: 'annualRevenue', label: 'Annual Revenue', aliases: ['annual revenue', 'revenue', 'turnover', 'annual turnover', 'arr'], type: 'number' },
  { id: 'numberOfEmployees', label: 'Number of Employees', aliases: ['number of employees', 'employees', 'employee count', 'team size', 'staff', 'headcount'], type: 'number' },
  { id: 'rating', label: 'Rating', aliases: ['rating', 'lead rating', 'tier', 'temperature'], type: 'enum', validValues: ['HOT', 'WARM', 'COLD'] },
  { id: 'emailOptOut', label: 'Email Opt Out', aliases: ['email opt out', 'email opt-out', 'opt out', 'unsubscribed', 'do not email'], type: 'boolean' },
  { id: 'skypeId', label: 'Skype ID', aliases: ['skype id', 'skype', 'skype name', 'skype handle'], type: 'string' },
  { id: 'twitterHandle', label: 'Twitter Handle', aliases: ['twitter handle', 'twitter', 'x handle', 'x username', 'twitter username'], type: 'string' },
  { id: 'address', label: 'Flat / House / Building', aliases: ['address', 'flat', 'house', 'building', 'apartment', 'suite', 'address line 1', 'line 1'], type: 'string' },
  { id: 'street', label: 'Street Address', aliases: ['street', 'street address', 'address line 2', 'road', 'avenue'], type: 'string' },
  { id: 'country', label: 'Country / Region', aliases: ['country', 'country / region', 'region', 'nation'], type: 'string' },
  { id: 'state', label: 'State / Province', aliases: ['state', 'state / province', 'province', 'territory'], type: 'string' },
  { id: 'city', label: 'City', aliases: ['city', 'town', 'municipality'], type: 'string' },
  { id: 'zipCode', label: 'ZIP / Postal Code', aliases: ['zip', 'zip code', 'postal code', 'zip / postal code', 'postcode', 'pin', 'pincode'], type: 'string' },
  { id: 'latitude', label: 'Latitude', aliases: ['latitude', 'lat'], type: 'number' },
  { id: 'longitude', label: 'Longitude', aliases: ['longitude', 'long', 'lng'], type: 'number' },
  { id: 'description', label: 'Description', aliases: ['description', 'notes', 'comments', 'details', 'summary', 'remark'], type: 'string' },
];

export function sanitizeFormulaInjection(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+@\-\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  return clean.length > 0 ? clean : null;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.trim().replace(/[^\d+]/g, '');
  return clean.length > 0 ? clean : null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class LeadImportExportService {
  private static tempDir = path.join(process.cwd(), 'uploads', 'temp-imports');

  static ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file to temp directory and parse metadata + preview rows
   */
  static parseUploadedBuffer(buffer: Buffer, originalName: string, mimeType: string) {
    this.ensureTempDir();

    // 1. Validate file extension & mime type
    const ext = path.extname(originalName).toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      throw new Error('Unsupported file extension. Please upload a CSV (.csv) or Excel (.xlsx) file.');
    }

    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('File size exceeds maximum permitted limit of 10MB.');
    }

    if (buffer.length === 0) {
      throw new Error('Uploaded file is empty.');
    }

    // 2. Parse workbook with XLSX
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
        raw: false,
        sheetRows: 10005, // enforce max row limit
      });
    } catch (err: any) {
      throw new Error(`Failed to parse spreadsheet file: ${err.message || 'Corrupted or invalid spreadsheet content'}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Spreadsheet contains no worksheets.');
    }

    if (workbook.SheetNames.length > 5) {
      throw new Error('Spreadsheet contains too many worksheets (maximum 5 permitted).');
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      throw new Error('Spreadsheet worksheet is missing or unreadable.');
    }

    // Convert sheet to JSON rows
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      blankrows: false,
      header: 1, // array of arrays to safely read headers
    }) as any[][];

    if (!rawData || rawData.length === 0) {
      throw new Error('The uploaded spreadsheet contains no data or headers.');
    }

    const rawHeaders = (rawData[0] || []).map((h) => String(h || '').trim()).filter((h) => h.length > 0);
    if (rawHeaders.length === 0) {
      throw new Error('No valid column headers detected in the first row.');
    }

    if (rawHeaders.length > 100) {
      throw new Error('Too many columns detected (maximum 100 columns allowed).');
    }

    const dataRows = rawData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''));
    if (dataRows.length === 0) {
      throw new Error('The spreadsheet contains column headers but no lead data rows.');
    }

    if (dataRows.length > 10000) {
      throw new Error(`File contains ${dataRows.length} rows. Maximum allowed rows per import is 10,000.`);
    }

    // Convert into objects with header keys
    const rowObjects: Record<string, any>[] = dataRows.map((row) => {
      const obj: Record<string, any> = {};
      rawHeaders.forEach((header, idx) => {
        let val = row[idx];
        if (typeof val === 'string') {
          val = val.trim();
          if (val.length > 10000) {
            val = val.substring(0, 10000);
          }
        }
        obj[header] = val !== undefined && val !== null ? val : '';
      });
      return obj;
    });

    // 3. Auto-map columns with high confidence
    const suggestedMapping: Record<string, string> = {};
    const usedCrmFields = new Set<string>();

    rawHeaders.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      for (const field of SUPPORTED_LEAD_FIELDS) {
        if (usedCrmFields.has(field.id)) continue;
        const matchesExact = field.aliases.some((alias) => alias === normalizedHeader);
        if (matchesExact) {
          suggestedMapping[field.id] = header;
          usedCrmFields.add(field.id);
          break;
        }
      }
    });

    // Secondary pass: substring matching for remaining unmapped fields
    rawHeaders.forEach((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      for (const field of SUPPORTED_LEAD_FIELDS) {
        if (usedCrmFields.has(field.id)) continue;
        const matchesSub = field.aliases.some((alias) => normalizedHeader.includes(alias) || alias.includes(normalizedHeader));
        if (matchesSub) {
          suggestedMapping[field.id] = header;
          usedCrmFields.add(field.id);
          break;
        }
      }
    });

    // 4. Save parsed payload to temp file
    const fileToken = uuidv4();
    const tempFilePath = path.join(this.tempDir, `${fileToken}.json`);
    const tempMeta = {
      fileToken,
      originalName,
      fileSize: buffer.length,
      fileType: ext.replace('.', '').toUpperCase(),
      mimeType,
      headers: rawHeaders,
      suggestedMapping,
      totalRows: rowObjects.length,
      rows: rowObjects,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(tempFilePath, JSON.stringify(tempMeta), 'utf8');

    return {
      fileToken,
      originalName,
      fileSize: buffer.length,
      fileType: ext.replace('.', '').toUpperCase(),
      totalRows: rowObjects.length,
      headers: rawHeaders,
      suggestedMapping,
      previewRows: rowObjects.slice(0, 20),
    };
  }

  /**
   * Retrieve cached upload data
   */
  static getTempFileData(fileToken: string) {
    const tempFilePath = path.join(this.tempDir, `${fileToken}.json`);
    if (!fs.existsSync(tempFilePath)) {
      throw new Error('Uploaded file session expired or not found. Please upload your file again.');
    }
    const raw = fs.readFileSync(tempFilePath, 'utf8');
    return JSON.parse(raw);
  }

  /**
   * Clean up temp file
   */
  static cleanupTempFile(fileToken: string) {
    try {
      const tempFilePath = path.join(this.tempDir, `${fileToken}.json`);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (err) {
      console.warn(`Failed to clean up temp file ${fileToken}:`, err);
    }
  }

  /**
   * Validate mapped row against CRM lead rules
   */
  static validateRow(
    mappedData: Record<string, any>,
    options: ImportOptions,
    validMemberUserIds: Set<string>
  ): { isValid: boolean; errors: string[]; sanitized: Record<string, any> } {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    // 1. Required First & Last Name
    const firstName = String(mappedData.firstName || '').trim();
    const lastName = String(mappedData.lastName || '').trim();

    if (!firstName) {
      errors.push('First Name is required');
    } else {
      sanitized.firstName = firstName;
    }

    if (!lastName) {
      errors.push('Last Name is required');
    } else {
      sanitized.lastName = lastName;
    }

    // 2. Email & Secondary Email
    if (mappedData.email !== undefined && mappedData.email !== null && String(mappedData.email).trim() !== '') {
      const em = String(mappedData.email).trim().toLowerCase();
      if (!isValidEmail(em)) {
        errors.push(`Invalid email format: "${mappedData.email}"`);
      } else {
        sanitized.email = em;
      }
    } else {
      sanitized.email = null;
    }

    if (mappedData.secondaryEmail !== undefined && mappedData.secondaryEmail !== null && String(mappedData.secondaryEmail).trim() !== '') {
      const em = String(mappedData.secondaryEmail).trim().toLowerCase();
      if (!isValidEmail(em)) {
        errors.push(`Invalid secondary email format: "${mappedData.secondaryEmail}"`);
      } else {
        sanitized.secondaryEmail = em;
      }
    } else {
      sanitized.secondaryEmail = null;
    }

    // 3. Phone & Mobile
    if (mappedData.phone !== undefined && mappedData.phone !== null && String(mappedData.phone).trim() !== '') {
      sanitized.phone = String(mappedData.phone).trim();
    } else {
      sanitized.phone = null;
    }

    if (mappedData.mobile !== undefined && mappedData.mobile !== null && String(mappedData.mobile).trim() !== '') {
      sanitized.mobile = String(mappedData.mobile).trim();
    } else {
      sanitized.mobile = null;
    }

    // 4. Company, Title, Website, Skype, Twitter, Fax
    sanitized.company = mappedData.company ? String(mappedData.company).trim() : null;
    sanitized.title = mappedData.title ? String(mappedData.title).trim() : null;
    sanitized.website = mappedData.website ? String(mappedData.website).trim() : null;
    sanitized.skypeId = mappedData.skypeId ? String(mappedData.skypeId).trim() : null;
    sanitized.twitterHandle = mappedData.twitterHandle ? String(mappedData.twitterHandle).trim() : null;
    sanitized.fax = mappedData.fax ? String(mappedData.fax).trim() : null;

    // 5. Enums: Status, Source, Priority, Rating
    const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'];
    if (mappedData.status) {
      const normStatus = String(mappedData.status).trim().toUpperCase();
      if (validStatuses.includes(normStatus)) {
        sanitized.status = normStatus;
      } else {
        errors.push(`Invalid Lead Status: "${mappedData.status}". Allowed: ${validStatuses.join(', ')}`);
      }
    } else {
      sanitized.status = options.defaultStatus || 'NEW';
    }

    const validSources = [
      'ADVERTISEMENT', 'WEBSITE', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW',
      'SOCIAL_MEDIA', 'PARTNER', 'EMAIL_CAMPAIGN', 'CAMPAIGN', 'LINKEDIN', 'API', 'EVENT', 'OTHER'
    ];
    if (mappedData.source) {
      const normSource = String(mappedData.source).trim().toUpperCase().replace(/\s+/g, '_');
      if (validSources.includes(normSource)) {
        sanitized.source = normSource;
      } else {
        errors.push(`Invalid Lead Source: "${mappedData.source}". Allowed: ${validSources.join(', ')}`);
      }
    } else {
      sanitized.source = options.defaultSource || 'WEBSITE';
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (mappedData.priority) {
      const normPri = String(mappedData.priority).trim().toUpperCase();
      if (validPriorities.includes(normPri)) {
        sanitized.priority = normPri;
      } else {
        sanitized.priority = 'MEDIUM';
      }
    } else {
      sanitized.priority = 'MEDIUM';
    }

    const validRatings = ['HOT', 'WARM', 'COLD'];
    if (mappedData.rating) {
      const normRating = String(mappedData.rating).trim().toUpperCase();
      if (validRatings.includes(normRating)) {
        sanitized.rating = normRating;
      } else {
        sanitized.rating = null;
      }
    } else {
      sanitized.rating = null;
    }

    // 6. Numbers: annualRevenue, numberOfEmployees, latitude, longitude
    if (mappedData.annualRevenue !== undefined && mappedData.annualRevenue !== null && String(mappedData.annualRevenue).trim() !== '') {
      const rev = Number(String(mappedData.annualRevenue).replace(/[^\d.-]/g, ''));
      if (isNaN(rev) || rev < 0) {
        errors.push(`Annual Revenue must be a non-negative number: "${mappedData.annualRevenue}"`);
      } else {
        sanitized.annualRevenue = rev;
      }
    } else {
      sanitized.annualRevenue = null;
    }

    if (mappedData.numberOfEmployees !== undefined && mappedData.numberOfEmployees !== null && String(mappedData.numberOfEmployees).trim() !== '') {
      const emp = parseInt(String(mappedData.numberOfEmployees).replace(/[^\d]/g, ''), 10);
      if (isNaN(emp) || emp < 0) {
        errors.push(`Number of employees must be a non-negative integer: "${mappedData.numberOfEmployees}"`);
      } else {
        sanitized.numberOfEmployees = emp;
      }
    } else {
      sanitized.numberOfEmployees = null;
    }

    if (mappedData.latitude !== undefined && mappedData.latitude !== null && String(mappedData.latitude).trim() !== '') {
      const lat = Number(mappedData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(`Latitude must be between -90 and 90: "${mappedData.latitude}"`);
      } else {
        sanitized.latitude = lat;
      }
    } else {
      sanitized.latitude = null;
    }

    if (mappedData.longitude !== undefined && mappedData.longitude !== null && String(mappedData.longitude).trim() !== '') {
      const lng = Number(mappedData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push(`Longitude must be between -180 and 180: "${mappedData.longitude}"`);
      } else {
        sanitized.longitude = lng;
      }
    } else {
      sanitized.longitude = null;
    }

    // 7. Boolean emailOptOut
    if (mappedData.emailOptOut !== undefined && mappedData.emailOptOut !== null && String(mappedData.emailOptOut).trim() !== '') {
      const valStr = String(mappedData.emailOptOut).trim().toLowerCase();
      sanitized.emailOptOut = ['true', '1', 'yes', 'y'].includes(valStr);
    } else {
      sanitized.emailOptOut = false;
    }

    // 8. Addresses & Description
    sanitized.address = mappedData.address ? String(mappedData.address).trim() : null;
    sanitized.street = mappedData.street ? String(mappedData.street).trim() : null;
    sanitized.country = mappedData.country ? String(mappedData.country).trim() : null;
    sanitized.state = mappedData.state ? String(mappedData.state).trim() : null;
    sanitized.city = mappedData.city ? String(mappedData.city).trim() : null;
    sanitized.zipCode = mappedData.zipCode ? String(mappedData.zipCode).trim() : null;
    sanitized.industry = mappedData.industry ? String(mappedData.industry).trim() : null;
    sanitized.description = mappedData.description ? String(mappedData.description).trim().substring(0, 5000) : null;

    // 9. Lead Owner Validation (must belong to active organization)
    let assignedOwnerId = mappedData.ownerId ? String(mappedData.ownerId).trim() : (options.defaultOwnerId || null);
    if (assignedOwnerId) {
      if (!validMemberUserIds.has(assignedOwnerId)) {
        // If ownerId is provided by name or email, check if any member matches
        // Otherwise record validation error
        errors.push(`Assigned Lead Owner (${assignedOwnerId}) is not an active member of this organization.`);
        assignedOwnerId = null;
      }
    }
    sanitized.ownerId = assignedOwnerId;

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Preview mapping and detect duplicates before final import execution
   */
  static async previewAndValidate(
    organizationId: string,
    fileToken: string,
    mapping: Record<string, string>,
    options: ImportOptions
  ) {
    const fileData = this.getTempFileData(fileToken);
    const rows: Record<string, any>[] = fileData.rows;

    // Check required mappings
    if (!mapping.firstName) {
      throw new Error('Mapping for required field "First Name" is missing.');
    }
    if (!mapping.lastName) {
      throw new Error('Mapping for required field "Last Name" is missing.');
    }

    // Fetch active tenant members for owner validation
    const members = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    const validMemberUserIds = new Set(members.map((m) => m.userId));
    const memberNameOrEmailMap = new Map<string, string>();
    members.forEach((m) => {
      memberNameOrEmailMap.set(m.userId, m.userId);
      memberNameOrEmailMap.set(m.user.email.toLowerCase(), m.userId);
      memberNameOrEmailMap.set(`${m.user.firstName} ${m.user.lastName}`.toLowerCase().trim(), m.userId);
    });

    // Resolve default owner
    let resolvedDefaultOwnerId = options.defaultOwnerId || null;
    if (resolvedDefaultOwnerId && !validMemberUserIds.has(resolvedDefaultOwnerId)) {
      resolvedDefaultOwnerId = null;
    }

    // Fetch existing leads for duplicate detection
    const existingLeads = await prisma.lead.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        phone: true,
        mobile: true,
        firstName: true,
        lastName: true,
        company: true,
      },
    });

    const existingEmailMap = new Map<string, any>();
    const existingPhoneMap = new Map<string, any>();

    existingLeads.forEach((l) => {
      if (l.email) {
        existingEmailMap.set(l.email.toLowerCase().trim(), l);
      }
      if (l.phone) {
        const norm = normalizePhone(l.phone);
        if (norm) existingPhoneMap.set(norm, l);
      }
      if (l.mobile) {
        const norm = normalizePhone(l.mobile);
        if (norm) existingPhoneMap.set(norm, l);
      }
    });

    let validRowsCount = 0;
    let invalidRowsCount = 0;
    let duplicateRowsCount = 0;

    const previewList: any[] = [];

    // Analyze rows
    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNumber = i + 2; // header is row 1, data starts row 2

      // Map raw columns to CRM fields
      const mappedData: Record<string, any> = {};
      for (const [crmField, fileCol] of Object.entries(mapping)) {
        if (fileCol && rawRow[fileCol] !== undefined) {
          mappedData[crmField] = rawRow[fileCol];
        }
      }

      // If mapped ownerId is a name or email, resolve to user ID
      if (mappedData.ownerId && typeof mappedData.ownerId === 'string') {
        const resolved = memberNameOrEmailMap.get(mappedData.ownerId.toLowerCase().trim());
        if (resolved) mappedData.ownerId = resolved;
      }

      const { isValid, errors, sanitized } = this.validateRow(
        mappedData,
        { ...options, defaultOwnerId: resolvedDefaultOwnerId },
        validMemberUserIds
      );

      // Duplicate detection
      let isDuplicate = false;
      let duplicateReason: string | undefined;
      let existingLeadMatch: any = null;

      if (isValid) {
        const checkEmail = options.duplicateCriteria.includes('email') && sanitized.email;
        const checkPhone = options.duplicateCriteria.includes('phone') && (sanitized.phone || sanitized.mobile);

        if (checkEmail && existingEmailMap.has(sanitized.email)) {
          isDuplicate = true;
          existingLeadMatch = existingEmailMap.get(sanitized.email);
          duplicateReason = `Duplicate Email: ${sanitized.email} (Matches existing: ${existingLeadMatch.firstName} ${existingLeadMatch.lastName})`;
        } else if (checkPhone) {
          const normPhone = normalizePhone(sanitized.phone);
          const normMobile = normalizePhone(sanitized.mobile);

          if (normPhone && existingPhoneMap.has(normPhone)) {
            isDuplicate = true;
            existingLeadMatch = existingPhoneMap.get(normPhone);
            duplicateReason = `Duplicate Phone: ${sanitized.phone} (Matches existing: ${existingLeadMatch.firstName} ${existingLeadMatch.lastName})`;
          } else if (normMobile && existingPhoneMap.has(normMobile)) {
            isDuplicate = true;
            existingLeadMatch = existingPhoneMap.get(normMobile);
            duplicateReason = `Duplicate Mobile: ${sanitized.mobile} (Matches existing: ${existingLeadMatch.firstName} ${existingLeadMatch.lastName})`;
          }
        }
      }

      if (!isValid) {
        invalidRowsCount++;
      } else {
        validRowsCount++;
        if (isDuplicate) {
          duplicateRowsCount++;
        }
      }

      if (i < 20) {
        previewList.push({
          rowNumber,
          isValid,
          errors,
          isDuplicate,
          duplicateReason,
          existingLeadId: existingLeadMatch?.id,
          mappedData: sanitized,
          rawRow,
        });
      }
    }

    let estimatedNew = 0;
    let estimatedUpdates = 0;

    if (options.duplicateStrategy === 'SKIP') {
      estimatedNew = validRowsCount - duplicateRowsCount;
      estimatedUpdates = 0;
    } else if (options.duplicateStrategy === 'UPDATE') {
      estimatedNew = validRowsCount - duplicateRowsCount;
      estimatedUpdates = duplicateRowsCount;
    } else {
      // IMPORT_ALL
      estimatedNew = validRowsCount;
      estimatedUpdates = 0;
    }

    return {
      totalRows: rows.length,
      validRows: validRowsCount,
      invalidRows: invalidRowsCount,
      potentialDuplicates: duplicateRowsCount,
      estimatedNew,
      estimatedUpdates,
      previewSample: previewList,
    };
  }

  /**
   * Execute lead import in controlled batches with transaction safety,
   * quota enforcement, duplicate strategy handling, error report tracking and audit logging.
   */
  static async executeImport(params: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    fileToken: string;
    mapping: Record<string, string>;
    options: ImportOptions;
  }) {
    const { organizationId, userId, ipAddress, userAgent, fileToken, mapping, options } = params;

    const fileData = this.getTempFileData(fileToken);
    const rows: Record<string, any>[] = fileData.rows;

    // 1. Enforce Subscription Quota Limits
    const quota = await EntitlementService.checkLeadLimit(organizationId);
    if (!quota.allowed) {
      throw new Error(`Lead import blocked by subscription limit: ${quota.message}`);
    }

    // 2. Fetch active members for owner validation
    const members = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    const validMemberUserIds = new Set(members.map((m) => m.userId));
    const memberNameOrEmailMap = new Map<string, string>();
    members.forEach((m) => {
      memberNameOrEmailMap.set(m.userId, m.userId);
      memberNameOrEmailMap.set(m.user.email.toLowerCase(), m.userId);
      memberNameOrEmailMap.set(`${m.user.firstName} ${m.user.lastName}`.toLowerCase().trim(), m.userId);
    });

    const resolvedDefaultOwnerId = options.defaultOwnerId && validMemberUserIds.has(options.defaultOwnerId)
      ? options.defaultOwnerId
      : userId;

    // 3. Create ImportJob record
    const importJob = await prisma.importJob.create({
      data: {
        organizationId,
        userId,
        fileName: fileData.originalName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
        status: 'PROCESSING',
        totalRows: rows.length,
        strategy: options.duplicateStrategy,
        mapping,
        options: options as any,
        startedAt: new Date(),
      },
    });

    // 4. Fetch existing leads index
    const existingLeads = await prisma.lead.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        phone: true,
        mobile: true,
        firstName: true,
        lastName: true,
      },
    });

    const existingEmailMap = new Map<string, string>(); // email -> leadId
    const existingPhoneMap = new Map<string, string>(); // phone -> leadId

    existingLeads.forEach((l) => {
      if (l.email) existingEmailMap.set(l.email.toLowerCase().trim(), l.id);
      if (l.phone) {
        const norm = normalizePhone(l.phone);
        if (norm) existingPhoneMap.set(norm, l.id);
      }
      if (l.mobile) {
        const norm = normalizePhone(l.mobile);
        if (norm) existingPhoneMap.set(norm, l.id);
      }
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let validRowsCount = 0;
    let invalidRowsCount = 0;

    const errorReport: any[] = [];
    const createdLeadIds: string[] = [];

    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const rawRow = batch[j];
        const rowNumber = i + j + 2;

        try {
          // Map fields
          const mappedData: Record<string, any> = {};
          for (const [crmField, fileCol] of Object.entries(mapping)) {
            if (fileCol && rawRow[fileCol] !== undefined) {
              mappedData[crmField] = rawRow[fileCol];
            }
          }

          if (mappedData.ownerId && typeof mappedData.ownerId === 'string') {
            const resolved = memberNameOrEmailMap.get(mappedData.ownerId.toLowerCase().trim());
            if (resolved) mappedData.ownerId = resolved;
          }

          const { isValid, errors, sanitized } = this.validateRow(
            mappedData,
            { ...options, defaultOwnerId: resolvedDefaultOwnerId },
            validMemberUserIds
          );

          if (!isValid) {
            invalidRowsCount++;
            failedCount++;
            errorReport.push({
              rowNumber,
              error: errors.join('; '),
              field: 'Validation',
              data: {
                firstName: rawRow[mapping.firstName || ''] || '',
                lastName: rawRow[mapping.lastName || ''] || '',
                email: rawRow[mapping.email || ''] || '',
                company: rawRow[mapping.company || ''] || '',
              },
            });
            continue;
          }

          validRowsCount++;

          // Duplicate match
          let existingLeadId: string | null = null;
          if (options.duplicateCriteria.includes('email') && sanitized.email && existingEmailMap.has(sanitized.email)) {
            existingLeadId = existingEmailMap.get(sanitized.email)!;
          } else if (options.duplicateCriteria.includes('phone')) {
            const pNorm = normalizePhone(sanitized.phone);
            const mNorm = normalizePhone(sanitized.mobile);
            if (pNorm && existingPhoneMap.has(pNorm)) {
              existingLeadId = existingPhoneMap.get(pNorm)!;
            } else if (mNorm && existingPhoneMap.has(mNorm)) {
              existingLeadId = existingPhoneMap.get(mNorm)!;
            }
          }

          if (existingLeadId) {
            if (options.duplicateStrategy === 'SKIP') {
              skippedCount++;
              continue;
            } else if (options.duplicateStrategy === 'UPDATE') {
              // Update existing lead (prevent mass assignment of protected fields)
              const updateData: any = {
                firstName: sanitized.firstName,
                lastName: sanitized.lastName,
                updatedAt: new Date(),
              };

              if (sanitized.company) updateData.company = sanitized.company;
              if (sanitized.title) updateData.title = sanitized.title;
              if (sanitized.phone) updateData.phone = sanitized.phone;
              if (sanitized.mobile) updateData.mobile = sanitized.mobile;
              if (sanitized.fax) updateData.fax = sanitized.fax;
              if (sanitized.website) updateData.website = sanitized.website;
              if (sanitized.status) updateData.status = sanitized.status;
              if (sanitized.source) updateData.source = sanitized.source;
              if (sanitized.priority) updateData.priority = sanitized.priority;
              if (sanitized.industry) updateData.industry = sanitized.industry;
              if (sanitized.annualRevenue !== null) updateData.annualRevenue = sanitized.annualRevenue;
              if (sanitized.numberOfEmployees !== null) updateData.numberOfEmployees = sanitized.numberOfEmployees;
              if (sanitized.rating) updateData.rating = sanitized.rating;
              if (sanitized.address) updateData.address = sanitized.address;
              if (sanitized.street) updateData.street = sanitized.street;
              if (sanitized.city) updateData.city = sanitized.city;
              if (sanitized.state) updateData.state = sanitized.state;
              if (sanitized.country) updateData.country = sanitized.country;
              if (sanitized.zipCode) updateData.zipCode = sanitized.zipCode;
              if (sanitized.latitude !== null) updateData.latitude = sanitized.latitude;
              if (sanitized.longitude !== null) updateData.longitude = sanitized.longitude;
              if (sanitized.description) updateData.description = sanitized.description;
              if (sanitized.ownerId) updateData.ownerId = sanitized.ownerId;

              await prisma.lead.update({
                where: { id: existingLeadId },
                data: updateData,
              });

              updatedCount++;
              continue;
            }
          }

          // Check if quota allows another lead creation
          if (quota.limit && (quota.currentUsage || 0) + createdCount >= quota.limit) {
            failedCount++;
            errorReport.push({
              rowNumber,
              error: `Lead creation quota limit reached (${quota.limit} leads). Upgrade subscription to import more leads.`,
              field: 'Quota',
              data: {
                firstName: sanitized.firstName,
                lastName: sanitized.lastName,
                email: sanitized.email,
              },
            });
            continue;
          }

          // Initial score computation
          const initialScore = sanitized.title && sanitized.company ? 60 : 50;

          // Create lead
          const newLead = await prisma.lead.create({
            data: {
              organizationId,
              firstName: sanitized.firstName,
              lastName: sanitized.lastName,
              email: sanitized.email,
              secondaryEmail: sanitized.secondaryEmail,
              phone: sanitized.phone,
              mobile: sanitized.mobile,
              fax: sanitized.fax,
              company: sanitized.company,
              title: sanitized.title,
              website: sanitized.website,
              skypeId: sanitized.skypeId,
              twitterHandle: sanitized.twitterHandle,
              status: sanitized.status,
              source: sanitized.source,
              priority: sanitized.priority,
              industry: sanitized.industry,
              annualRevenue: sanitized.annualRevenue,
              numberOfEmployees: sanitized.numberOfEmployees,
              rating: sanitized.rating,
              emailOptOut: sanitized.emailOptOut,
              address: sanitized.address,
              street: sanitized.street,
              city: sanitized.city,
              state: sanitized.state,
              country: sanitized.country,
              zipCode: sanitized.zipCode,
              latitude: sanitized.latitude,
              longitude: sanitized.longitude,
              description: sanitized.description,
              score: initialScore,
              ownerId: sanitized.ownerId || resolvedDefaultOwnerId,
            },
          });

          createdCount++;
          createdLeadIds.push(newLead.id);

          // Update index maps
          if (newLead.email) existingEmailMap.set(newLead.email.toLowerCase().trim(), newLead.id);
          if (newLead.phone) {
            const pNorm = normalizePhone(newLead.phone);
            if (pNorm) existingPhoneMap.set(pNorm, newLead.id);
          }
          if (newLead.mobile) {
            const mNorm = normalizePhone(newLead.mobile);
            if (mNorm) existingPhoneMap.set(mNorm, newLead.id);
          }

          // Sync ConsentRecord if email opt-out is requested
          if (newLead.emailOptOut && newLead.email) {
            prisma.consentRecord.create({
              data: {
                organizationId,
                email: newLead.email.toLowerCase(),
                phone: newLead.phone || null,
                consentType: 'MARKETING_EMAIL',
                status: 'REVOKED',
                source: 'LEAD_IMPORT_OPT_OUT',
                revokedAt: new Date(),
              },
            }).catch(console.error);
          }
        } catch (rowErr: any) {
          failedCount++;
          errorReport.push({
            rowNumber,
            error: rowErr.message || 'Database error during record insertion',
            field: 'System',
            data: {
              raw: rawRow,
            },
          });
        }
      }
    }

    // Determine final job status
    const finalStatus =
      failedCount === 0
        ? 'COMPLETED'
        : createdCount > 0 || updatedCount > 0
        ? 'COMPLETED_WITH_ERRORS'
        : 'FAILED';

    const completedJob = await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: finalStatus,
        totalRows: rows.length,
        validRows: validRowsCount,
        invalidRows: invalidRowsCount,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        errorReport: errorReport as any,
        summary: {
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: failedCount,
        },
        completedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Cleanup temp file
    this.cleanupTempFile(fileToken);

    // Audit log
    await AuditService.log({
      organizationId,
      userId,
      action: 'IMPORT_LEADS',
      entity: 'LEADS',
      entityId: importJob.id,
      ipAddress,
      userAgent,
      details: {
        fileName: fileData.originalName,
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        status: finalStatus,
      },
    });

    return completedJob;
  }

  /**
   * Fetch tenant import history
   */
  static async getImportHistory(organizationId: string) {
    return prisma.importJob.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Fetch single import job details
   */
  static async getImportJob(organizationId: string, jobId: string) {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, organizationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!job) {
      throw new Error('Import job not found or access denied');
    }

    return job;
  }

  /**
   * Generate downloadable error report file for an import job
   */
  static async generateErrorReport(organizationId: string, jobId: string, format: 'csv' | 'xlsx' = 'csv') {
    const job = await this.getImportJob(organizationId, jobId);
    const errors: any[] = (job.errorReport as any[]) || [];

    const headers = ['Row Number', 'Field', 'Error Reason', 'First Name', 'Last Name', 'Email', 'Company'];
    const rows = errors.map((err) => [
      err.rowNumber || '',
      err.field || '',
      err.error || '',
      sanitizeFormulaInjection(err.data?.firstName || ''),
      sanitizeFormulaInjection(err.data?.lastName || ''),
      sanitizeFormulaInjection(err.data?.email || ''),
      sanitizeFormulaInjection(err.data?.company || ''),
    ]);

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    // CSV format with UTF-8 BOM
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    return Buffer.from(csvContent, 'utf8');
  }

  /**
   * Generate downloadable sample template file
   */
  static generateSampleTemplate(format: 'csv' | 'xlsx' = 'csv') {
    const headers = [
      'First Name',
      'Last Name',
      'Company',
      'Title',
      'Email',
      'Secondary Email',
      'Phone',
      'Mobile',
      'Fax',
      'Website',
      'Lead Source',
      'Lead Status',
      'Lead Priority',
      'Industry',
      'Annual Revenue',
      'Number of Employees',
      'Rating',
      'Email Opt Out',
      'Skype ID',
      'Twitter Handle',
      'Address',
      'Street Address',
      'Country',
      'State',
      'City',
      'Postal Code',
      'Description',
    ];

    const sampleRows = [
      [
        'John',
        'Doe',
        'Acme Technologies Ltd',
        'Vice President of Engineering',
        'john.doe@acmetech.io',
        'j.doe@personal.me',
        '+1 555-0199',
        '+1 555-0200',
        '+1 555-0201',
        'https://acmetech.io',
        'WEBSITE',
        'NEW',
        'HIGH',
        'Technology',
        '2500000',
        '85',
        'HOT',
        'false',
        'live:johndoe_acme',
        '@johndoe_tech',
        'Suite 400',
        '100 Innovation Way',
        'United States',
        'California',
        'San Francisco',
        '94105',
        'Enterprise client interested in Cloud CRM automated sales pipeline.',
      ],
      [
        'Sarah',
        'Connor',
        'Cyberdyne Solutions',
        'Chief Operating Officer',
        'sarah.c@cyberdyne.ai',
        '',
        '+44 20 7946 0912',
        '+44 7700 900077',
        '',
        'https://cyberdyne.ai',
        'TRADE_SHOW',
        'CONTACTED',
        'URGENT',
        'Artificial Intelligence',
        '15000000',
        '320',
        'HOT',
        'false',
        'sarah.connor.ops',
        '@sarah_connor_ai',
        'Cyberdyne Tower, 12th Floor',
        '45 Tech Park Boulevard',
        'United Kingdom',
        'Greater London',
        'London',
        'EC2A 4NE',
        'Met at London AI Summit 2026. Needs multi-tenant security architecture.',
      ],
    ];

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    const csvContent =
      '\uFEFF' +
      [headers, ...sampleRows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    return Buffer.from(csvContent, 'utf8');
  }

  /**
   * Export Leads with security filter isolation, field selection,
   * Unicode BOM, date formatting, and formula injection defense.
   */
  static async exportLeads(params: {
    organizationId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    scope: 'ALL' | 'FILTERED' | 'SELECTED' | 'DATE_RANGE';
    selectedIds?: string[];
    filters?: {
      search?: string;
      status?: string;
      priority?: string;
      source?: string;
      ownerId?: string;
    };
    dateRange?: {
      startDate?: string;
      endDate?: string;
    };
    fields?: string[];
    format: 'csv' | 'xlsx';
  }) {
    const { organizationId, userId, ipAddress, userAgent, scope, selectedIds, filters, dateRange, fields, format } = params;

    const where: any = { organizationId };

    if (scope === 'SELECTED') {
      if (!selectedIds || selectedIds.length === 0) {
        throw new Error('No leads selected for export.');
      }
      where.id = { in: selectedIds };
    } else if (scope === 'FILTERED') {
      if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
      if (filters?.priority && filters.priority !== 'ALL') where.priority = filters.priority;
      if (filters?.source && filters.source !== 'ALL') where.source = filters.source;
      if (filters?.ownerId && filters.ownerId !== 'ALL') where.ownerId = filters.ownerId;
      if (filters?.search) {
        where.OR = [
          { firstName: { contains: String(filters.search), mode: 'insensitive' } },
          { lastName: { contains: String(filters.search), mode: 'insensitive' } },
          { email: { contains: String(filters.search), mode: 'insensitive' } },
          { company: { contains: String(filters.search), mode: 'insensitive' } },
        ];
      }
    } else if (scope === 'DATE_RANGE') {
      if (dateRange?.startDate || dateRange?.endDate) {
        where.createdAt = {};
        if (dateRange.startDate) where.createdAt.gte = new Date(dateRange.startDate);
        if (dateRange.endDate) {
          const end = new Date(dateRange.endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20000, // safety ceiling
    });

    // Default export fields if none specified
    const selectedFieldKeys = fields && fields.length > 0
      ? fields
      : [
          'name',
          'company',
          'title',
          'email',
          'phone',
          'mobile',
          'status',
          'priority',
          'source',
          'score',
          'owner',
          'rating',
          'annualRevenue',
          'numberOfEmployees',
          'industry',
          'website',
          'city',
          'state',
          'country',
          'createdAt',
        ];

    const FIELD_MAP: Record<string, { label: string; extract: (l: any) => string }> = {
      id: { label: 'Lead ID', extract: (l) => l.id },
      name: { label: 'Lead Name', extract: (l) => `${l.firstName} ${l.lastName}`.trim() },
      firstName: { label: 'First Name', extract: (l) => l.firstName },
      lastName: { label: 'Last Name', extract: (l) => l.lastName },
      company: { label: 'Company', extract: (l) => l.company || '' },
      title: { label: 'Title', extract: (l) => l.title || '' },
      email: { label: 'Email', extract: (l) => l.email || '' },
      secondaryEmail: { label: 'Secondary Email', extract: (l) => l.secondaryEmail || '' },
      phone: { label: 'Phone', extract: (l) => l.phone || '' },
      mobile: { label: 'Mobile', extract: (l) => l.mobile || '' },
      fax: { label: 'Fax', extract: (l) => l.fax || '' },
      website: { label: 'Website', extract: (l) => l.website || '' },
      status: { label: 'Lead Status', extract: (l) => l.status },
      priority: { label: 'Lead Priority', extract: (l) => l.priority },
      source: { label: 'Lead Source', extract: (l) => l.source },
      score: { label: 'AI Score', extract: (l) => String(l.score ?? 50) },
      owner: { label: 'Lead Owner', extract: (l) => l.owner ? `${l.owner.firstName} ${l.owner.lastName}` : 'Unassigned' },
      ownerEmail: { label: 'Owner Email', extract: (l) => l.owner ? l.owner.email : '' },
      rating: { label: 'Rating', extract: (l) => l.rating || '' },
      annualRevenue: { label: 'Annual Revenue', extract: (l) => l.annualRevenue !== null && l.annualRevenue !== undefined ? String(l.annualRevenue) : '' },
      numberOfEmployees: { label: 'Number of Employees', extract: (l) => l.numberOfEmployees !== null && l.numberOfEmployees !== undefined ? String(l.numberOfEmployees) : '' },
      industry: { label: 'Industry', extract: (l) => l.industry || '' },
      emailOptOut: { label: 'Email Opt Out', extract: (l) => l.emailOptOut ? 'Yes' : 'No' },
      skypeId: { label: 'Skype ID', extract: (l) => l.skypeId || '' },
      twitterHandle: { label: 'Twitter Handle', extract: (l) => l.twitterHandle || '' },
      address: { label: 'Address', extract: (l) => l.address || '' },
      street: { label: 'Street', extract: (l) => l.street || '' },
      city: { label: 'City', extract: (l) => l.city || '' },
      state: { label: 'State / Province', extract: (l) => l.state || '' },
      country: { label: 'Country / Region', extract: (l) => l.country || '' },
      zipCode: { label: 'ZIP / Postal Code', extract: (l) => l.zipCode || '' },
      latitude: { label: 'Latitude', extract: (l) => l.latitude !== null && l.latitude !== undefined ? String(l.latitude) : '' },
      longitude: { label: 'Longitude', extract: (l) => l.longitude !== null && l.longitude !== undefined ? String(l.longitude) : '' },
      description: { label: 'Description', extract: (l) => l.description || '' },
      createdAt: { label: 'Created Date', extract: (l) => l.createdAt.toISOString() },
      updatedAt: { label: 'Last Updated Date', extract: (l) => l.updatedAt.toISOString() },
    };

    const validFieldKeys = selectedFieldKeys.filter((k) => FIELD_MAP[k]);
    const headers = validFieldKeys.map((k) => FIELD_MAP[k].label);

    const rows = leads.map((l) =>
      validFieldKeys.map((k) => {
        const rawValue = FIELD_MAP[k].extract(l);
        return sanitizeFormulaInjection(rawValue);
      })
    );

    // Audit log
    await AuditService.log({
      organizationId,
      userId,
      action: 'EXPORT_LEADS',
      entity: 'LEADS',
      ipAddress,
      userAgent,
      details: {
        format,
        scope,
        count: leads.length,
        fields: validFieldKeys,
      },
    });

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'Leads Export');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `leads-export-${Date.now()}.xlsx`,
        count: leads.length,
      };
    }

    // CSV format with UTF-8 BOM
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    return {
      buffer: Buffer.from(csvContent, 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: `leads-export-${Date.now()}.csv`,
      count: leads.length,
    };
  }
}
