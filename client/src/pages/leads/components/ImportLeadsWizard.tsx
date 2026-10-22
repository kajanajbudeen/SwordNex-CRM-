import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Info,
  X,
  Sparkles,
  Users,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../../api/client';
import { SearchableSelect, SelectOption } from './SearchableSelect';

export interface ImportLeadsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

const CRM_FIELDS: { id: string; label: string; required?: boolean; category: string }[] = [
  { id: 'firstName', label: 'First Name', required: true, category: 'Basic Details' },
  { id: 'lastName', label: 'Last Name', required: true, category: 'Basic Details' },
  { id: 'company', label: 'Company', category: 'Basic Details' },
  { id: 'title', label: 'Title / Job Title', category: 'Basic Details' },
  { id: 'email', label: 'Email', category: 'Contact' },
  { id: 'secondaryEmail', label: 'Secondary Email', category: 'Contact' },
  { id: 'phone', label: 'Phone', category: 'Contact' },
  { id: 'mobile', label: 'Mobile', category: 'Contact' },
  { id: 'fax', label: 'Fax', category: 'Contact' },
  { id: 'website', label: 'Website', category: 'Contact' },
  { id: 'ownerId', label: 'Lead Owner', category: 'Ownership & Status' },
  { id: 'source', label: 'Lead Source', category: 'Ownership & Status' },
  { id: 'status', label: 'Lead Status', category: 'Ownership & Status' },
  { id: 'priority', label: 'Lead Priority', category: 'Ownership & Status' },
  { id: 'industry', label: 'Industry', category: 'Business Details' },
  { id: 'annualRevenue', label: 'Annual Revenue', category: 'Business Details' },
  { id: 'numberOfEmployees', label: 'Number of Employees', category: 'Business Details' },
  { id: 'rating', label: 'Rating (Hot/Warm/Cold)', category: 'Business Details' },
  { id: 'emailOptOut', label: 'Email Opt Out', category: 'Contact' },
  { id: 'skypeId', label: 'Skype ID', category: 'Contact' },
  { id: 'twitterHandle', label: 'Twitter Handle', category: 'Contact' },
  { id: 'address', label: 'Flat / House / Building', category: 'Address' },
  { id: 'street', label: 'Street Address', category: 'Address' },
  { id: 'country', label: 'Country / Region', category: 'Address' },
  { id: 'state', label: 'State / Province', category: 'Address' },
  { id: 'city', label: 'City', category: 'Address' },
  { id: 'zipCode', label: 'ZIP / Postal Code', category: 'Address' },
  { id: 'latitude', label: 'Latitude', category: 'Address' },
  { id: 'longitude', label: 'Longitude', category: 'Address' },
  { id: 'description', label: 'Description Notes', category: 'Other' },
];

export const ImportLeadsWizard: React.FC<ImportLeadsWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedToken, setUploadedToken] = useState<string | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawPreviewRows, setRawPreviewRows] = useState<Record<string, any>[]>([]);
  const [totalFileRows, setTotalFileRows] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping state (CRM Field -> File Column Name)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Step 3 & 4: Duplicate & Default Options
  const [duplicateCriteria, setDuplicateCriteria] = useState<('email' | 'phone')[]>(['email', 'phone']);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE' | 'IMPORT_ALL'>('SKIP');
  const [defaultOwnerId, setDefaultOwnerId] = useState<string>('');
  const [defaultSource, setDefaultSource] = useState<string>('WEBSITE');
  const [defaultStatus, setDefaultStatus] = useState<string>('NEW');

  // Organization members for owner selection
  const [orgMembers, setOrgMembers] = useState<{ id: string; name: string; email: string }[]>([]);

  // Step 5: Preview & Validation results
  const [validationSummary, setValidationSummary] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    potentialDuplicates: number;
    estimatedNew: number;
    estimatedUpdates: number;
    previewSample: any[];
  } | null>(null);

  // Step 6: Import Results
  const [importResult, setImportResult] = useState<any | null>(null);

  // Fetch org members on mount
  useEffect(() => {
    if (isOpen) {
      apiClient
        .get('/organizations/current')
        .then((res) => {
          if (res.success && res.data?.memberships) {
            const members = res.data.memberships.map((m: any) => ({
              id: m.user?.id || m.userId,
              name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email,
              email: m.user?.email || '',
            }));
            setOrgMembers(members);
            const currentUserStr = localStorage.getItem('sn_user');
            if (currentUserStr) {
              const u = JSON.parse(currentUserStr);
              setDefaultOwnerId(u.id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage(null);
    const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      setErrorMessage('Unsupported file type. Please upload a CSV (.csv) or Excel (.xlsx) file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  // Upload and parse file
  const handleUploadAndProceed = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.upload('/leads/import/upload', formData);
      if (res.success) {
        setUploadedToken(res.data.fileToken);
        setDetectedHeaders(res.data.headers);
        setRawPreviewRows(res.data.previewRows);
        setTotalFileRows(res.data.totalRows);
        setColumnMapping(res.data.suggestedMapping || {});
        setCurrentStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2 -> Step 3: Validate column mapping
  const handleMappingProceed = async () => {
    setErrorMessage(null);
    if (!columnMapping.firstName) {
      setErrorMessage('First Name is required. Please map a file column to First Name.');
      return;
    }
    if (!columnMapping.lastName) {
      setErrorMessage('Last Name is required. Please map a file column to Last Name.');
      return;
    }

    setCurrentStep(3);
  };

  // Step 3 & 4 -> Step 5: Run validation and preview duplicates
  const handleRunValidationPreview = async () => {
    if (!uploadedToken) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/leads/import/preview', {
        fileToken: uploadedToken,
        mapping: columnMapping,
        options: {
          defaultOwnerId: defaultOwnerId || null,
          defaultSource,
          defaultStatus,
          duplicateStrategy,
          duplicateCriteria,
        },
      });

      if (res.success) {
        setValidationSummary(res.data);
        setCurrentStep(5);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation preview failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 5 -> Step 6: Confirm and Execute
  const handleConfirmImport = async () => {
    if (!uploadedToken) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/leads/import/execute', {
        fileToken: uploadedToken,
        mapping: columnMapping,
        options: {
          defaultOwnerId: defaultOwnerId || null,
          defaultSource,
          defaultStatus,
          duplicateStrategy,
          duplicateCriteria,
        },
      });

      if (res.success) {
        setImportResult(res.data);
        setCurrentStep(6);
        onImportComplete();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Import failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      await apiClient.download(
        `/leads/import/template?format=${format}`,
        `swordnex-leads-template.${format}`
      );
    } catch (err: any) {
      alert(`Error downloading template: ${err.message}`);
    }
  };

  // Download Error Report
  const handleDownloadErrorReport = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (!importResult?.id) return;
    try {
      await apiClient.download(
        `/leads/import/jobs/${importResult.id}/error-report?format=${format}`,
        `import-errors-${importResult.id}.${format}`
      );
    } catch (err: any) {
      alert(`Error downloading error report: ${err.message}`);
    }
  };

  const steps = [
    { number: 1, title: 'Upload File' },
    { number: 2, title: 'Map Columns' },
    { number: 3, title: 'Duplicates' },
    { number: 4, title: 'Options' },
    { number: 5, title: 'Confirmation' },
    { number: 6, title: 'Results' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header & Step Tracker */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Lead Import Wizard
                </h2>
                <p className="text-xs text-slate-400">
                  Import CSV or Excel files with duplicate detection, validation & tenant isolation.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {steps.map((s) => {
              const isCurrent = currentStep === s.number;
              const isDone = currentStep > s.number;
              return (
                <div key={s.number} className="flex flex-col space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isDone
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-cyan-500 shadow-glow-cyan'
                        : 'bg-slate-800'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono truncate text-center ${
                      isDone
                        ? 'text-emerald-400 font-semibold'
                        : isCurrent
                        ? 'text-cyan-300 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {s.number}. {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload File */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {file ? file.name : 'Choose a file or drag and drop here'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports <span className="font-mono text-cyan-300">.CSV</span> and{' '}
                    <span className="font-mono text-cyan-300">.XLSX</span> files up to 10MB
                  </p>
                </div>

                {file && (
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[11px]">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="ml-1 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Sample Templates & Download */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300">
                    Need the formatted schema template? Download our official sample files:
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sample CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sample Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Map Columns */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Column Field Mapping ({Object.keys(columnMapping).length} Mapped)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Match file columns to CRM fields. Required fields:{' '}
                    <span className="text-cyan-400 font-semibold">First Name</span> &{' '}
                    <span className="text-cyan-400 font-semibold">Last Name</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setColumnMapping({})}
                  className="text-xs text-slate-400 hover:text-slate-200 underline font-medium"
                >
                  Clear All Mappings
                </button>
              </div>

              {/* Column Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {CRM_FIELDS.map((crmField) => {
                  const mappedCol = columnMapping[crmField.id] || '';
                  const options: SelectOption[] = [
                    { value: '', label: '— Ignore Column —' },
                    ...detectedHeaders.map((h) => ({
                      value: h,
                      label: h,
                      sublabel: rawPreviewRows[0] ? `e.g. "${rawPreviewRows[0][h] || ''}"` : undefined,
                    })),
                  ];

                  return (
                    <div
                      key={crmField.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                        crmField.required && !mappedCol
                          ? 'border-rose-500/50 bg-rose-950/10'
                          : mappedCol
                          ? 'border-cyan-500/40 bg-slate-900/80'
                          : 'border-slate-800/80 bg-slate-900/40'
                      }`}
                    >
                      <div className="min-w-[140px] truncate">
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {crmField.label}
                          </span>
                          {crmField.required && (
                            <span className="text-rose-400 font-bold">*</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {crmField.category}
                        </span>
                      </div>

                      <div className="w-[180px]">
                        <SearchableSelect
                          options={options}
                          value={mappedCol}
                          onChange={(val) => {
                            setColumnMapping((prev) => {
                              const next = { ...prev };
                              if (!val) {
                                delete next[crmField.id];
                              } else {
                                next[crmField.id] = val;
                              }
                              return next;
                            });
                          }}
                          placeholder="Select Column..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Preview Table */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-slate-400 mb-2">
                  Live Upload Preview (First 5 Rows)
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60 max-h-40">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase">
                      <tr>
                        <th className="p-2">#</th>
                        {detectedHeaders.slice(0, 6).map((h) => (
                          <th key={h} className="p-2 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {rawPreviewRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                          {detectedHeaders.slice(0, 6).map((h) => (
                            <td key={h} className="p-2 truncate max-w-[150px]">
                              {String(row[h] || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Duplicate Detection */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-1">
                  Duplicate Matching Criteria
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Select which attributes to compare with your existing organization leads.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <label className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center space-x-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={duplicateCriteria.includes('email')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDuplicateCriteria([...duplicateCriteria, 'email']);
                        } else {
                          setDuplicateCriteria(duplicateCriteria.filter((c) => c !== 'email'));
                        }
                      }}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-white">Email Address</div>
                      <div className="text-[11px] text-slate-400">
                        Normalized lowercase comparison
                      </div>
                    </div>
                  </label>

                  <label className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center space-x-3 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={duplicateCriteria.includes('phone')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDuplicateCriteria([...duplicateCriteria, 'phone']);
                        } else {
                          setDuplicateCriteria(duplicateCriteria.filter((c) => c !== 'phone'));
                        }
                      }}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-white">Phone / Mobile</div>
                      <div className="text-[11px] text-slate-400">
                        E.164 and numeric digit normalization
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-1">
                  Duplicate Handling Strategy
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Choose how SwordNex should handle rows matching existing CRM records.
                </p>

                <div className="space-y-2.5">
                  <label
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                      duplicateStrategy === 'SKIP'
                        ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-glow-cyan'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={duplicateStrategy === 'SKIP'}
                      onChange={() => setDuplicateStrategy('SKIP')}
                      className="mt-0.5 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-100">
                        1. Skip Duplicates (Recommended)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Existing leads remain unchanged. Only completely new leads will be added to the CRM database.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                      duplicateStrategy === 'UPDATE'
                        ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-glow-cyan'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={duplicateStrategy === 'UPDATE'}
                      onChange={() => setDuplicateStrategy('UPDATE')}
                      className="mt-0.5 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-100">
                        2. Update Existing Leads
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Matching leads will be updated with new non-empty values from the uploaded spreadsheet.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition ${
                      duplicateStrategy === 'IMPORT_ALL'
                        ? 'border-cyan-500 bg-cyan-950/20 text-white shadow-glow-cyan'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      checked={duplicateStrategy === 'IMPORT_ALL'}
                      onChange={() => setDuplicateStrategy('IMPORT_ALL')}
                      className="mt-0.5 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-100">
                        3. Import All Records (Allow Duplicates)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Creates new records for every valid row without checking for existing matches.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Import Options */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-1">
                  Default Fallback Values
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Configure default values to apply when a spreadsheet cell is empty.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Default Owner */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Default Lead Owner
                  </label>
                  <SearchableSelect
                    options={orgMembers.map((m) => ({
                      value: m.id,
                      label: m.name,
                      sublabel: m.email,
                    }))}
                    value={defaultOwnerId}
                    onChange={(val) => setDefaultOwnerId(val)}
                    placeholder="Select Lead Owner..."
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only authorized active members of your organization are permitted.
                  </p>
                </div>

                {/* Default Source */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Default Lead Source
                  </label>
                  <select
                    value={defaultSource}
                    onChange={(e) => setDefaultSource(e.target.value)}
                    className="w-full h-10 bg-slate-900 border border-slate-800 rounded-lg px-3 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="COLD_CALL">Cold Outreach</option>
                    <option value="TRADE_SHOW">Trade Show</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="PARTNER">Partner</option>
                    <option value="CAMPAIGN">Marketing Campaign</option>
                    <option value="EVENT">Event</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Default Status */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Default Lead Status
                  </label>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value)}
                    className="w-full h-10 bg-slate-900 border border-slate-800 rounded-lg px-3 text-xs text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="UNQUALIFIED">Unqualified</option>
                  </select>
                </div>

                {/* Security Note */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2.5">
                  <ShieldAlert className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200">Tenant Protection: </span>
                    Spreadsheet files cannot alter organization IDs, system roles, permissions, or system metadata.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Import Confirmation */}
          {currentStep === 5 && validationSummary && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-1">
                  Import Validation Summary
                </h3>
                <p className="text-[11px] text-slate-400">
                  Review calculated rows and potential duplicates before committing changes to the database.
                </p>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase">Total Rows</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {validationSummary.totalRows}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-400 font-mono uppercase">Valid Records</div>
                  <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                    {validationSummary.validRows}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="text-[11px] text-amber-400 font-mono uppercase">Duplicates Detected</div>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                    {validationSummary.potentialDuplicates}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <div className="text-[11px] text-rose-400 font-mono uppercase">Invalid Rows</div>
                  <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                    {validationSummary.invalidRows}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
                  <div className="text-[11px] text-cyan-400 font-mono uppercase">Estimated New Leads</div>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    +{validationSummary.estimatedNew}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30">
                  <div className="text-[11px] text-blue-400 font-mono uppercase">Estimated Updates</div>
                  <div className="text-xl font-bold font-mono text-blue-300 mt-1">
                    ~{validationSummary.estimatedUpdates}
                  </div>
                </div>
              </div>

              {/* Sample preview validation rows */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-slate-400 mb-2">
                  Sample Inspection (First {validationSummary.previewSample.length} Records)
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60 max-h-52">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Company</th>
                        <th className="p-2">Diagnostic Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {validationSummary.previewSample.map((sample) => (
                        <tr
                          key={sample.rowNumber}
                          className={
                            !sample.isValid
                              ? 'bg-rose-950/15'
                              : sample.isDuplicate
                              ? 'bg-amber-950/15'
                              : ''
                          }
                        >
                          <td className="p-2 font-mono text-slate-400">{sample.rowNumber}</td>
                          <td className="p-2 whitespace-nowrap">
                            {!sample.isValid ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30">
                                Invalid
                              </span>
                            ) : sample.isDuplicate ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                                Duplicate ({duplicateStrategy})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-slate-200 font-medium">
                            {sample.mappedData?.firstName} {sample.mappedData?.lastName}
                          </td>
                          <td className="p-2 text-slate-300 font-mono">
                            {sample.mappedData?.email || '—'}
                          </td>
                          <td className="p-2 text-slate-300">
                            {sample.mappedData?.company || '—'}
                          </td>
                          <td className="p-2 text-[10px]">
                            {!sample.isValid ? (
                              <span className="text-rose-400 font-mono">
                                {sample.errors?.join('; ')}
                              </span>
                            ) : sample.isDuplicate ? (
                              <span className="text-amber-400 font-mono">
                                {sample.duplicateReason}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-mono">Valid lead</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Import Results */}
          {currentStep === 6 && importResult && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {importResult.failedCount === 0 ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {importResult.failedCount === 0
                    ? 'Import Completed Successfully!'
                    : 'Import Completed with Some Warnings'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  File: <span className="text-cyan-300 font-mono">{importResult.fileName}</span> • Job ID:{' '}
                  <span className="text-slate-300 font-mono">{importResult.id.slice(0, 8)}...</span>
                </p>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Total Rows</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">
                    {importResult.totalRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="text-[10px] font-mono uppercase text-emerald-400">Created</div>
                  <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
                    {importResult.createdCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30">
                  <div className="text-[10px] font-mono uppercase text-blue-400">Updated</div>
                  <div className="text-lg font-bold text-blue-300 font-mono mt-0.5">
                    {importResult.updatedCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400">Skipped</div>
                  <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">
                    {importResult.skippedCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <div className="text-[10px] font-mono uppercase text-rose-400">Failed</div>
                  <div className="text-lg font-bold text-rose-300 font-mono mt-0.5">
                    {importResult.failedCount}
                  </div>
                </div>
              </div>

              {/* Action buttons if failed rows exist */}
              {importResult.failedCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 max-w-2xl mx-auto">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Download error report with exact row numbers and correction guidance:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadErrorReport('csv')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Error Report (CSV)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div>
            {currentStep > 1 && currentStep < 6 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {currentStep < 6 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium text-xs transition"
              >
                Cancel
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleUploadAndProceed}
                disabled={!file || isProcessing}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Inspecting Spreadsheet...</span>
                  </>
                ) : (
                  <>
                    <span>Next: Map Columns</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleMappingProceed}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
              >
                <span>Next: Duplicates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition"
              >
                <span>Next: Options</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleRunValidationPreview}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Duplicates...</span>
                  </>
                ) : (
                  <>
                    <span>Review & Confirm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}

            {currentStep === 5 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-emerald transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Leads...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Execute Import</span>
                  </>
                )}
              </button>
            )}

            {currentStep === 6 && (
              <div className="flex items-center space-x-2">
                {importResult?.failedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setFile(null);
                      setUploadedToken(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center space-x-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Failed Rows</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-glow-cyan"
                >
                  Done & View Leads
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
