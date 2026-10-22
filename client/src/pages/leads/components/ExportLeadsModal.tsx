import React, { useState } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  Square,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../../api/client';

export interface ExportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalLeadsCount: number;
  filteredLeadsCount: number;
  selectedLeadIds: string[];
  activeFilters: {
    search?: string;
    status?: string;
    priority?: string;
    source?: string;
    ownerId?: string;
  };
}

interface ExportField {
  id: string;
  label: string;
  group: 'Core Info' | 'Contact' | 'Address' | 'System';
}

const AVAILABLE_FIELDS: ExportField[] = [
  // Core Info
  { id: 'name', label: 'Lead Full Name', group: 'Core Info' },
  { id: 'firstName', label: 'First Name', group: 'Core Info' },
  { id: 'lastName', label: 'Last Name', group: 'Core Info' },
  { id: 'company', label: 'Company', group: 'Core Info' },
  { id: 'title', label: 'Title / Job Title', group: 'Core Info' },
  { id: 'status', label: 'Lead Status', group: 'Core Info' },
  { id: 'priority', label: 'Lead Priority', group: 'Core Info' },
  { id: 'source', label: 'Lead Source', group: 'Core Info' },
  { id: 'rating', label: 'Rating (Hot/Warm/Cold)', group: 'Core Info' },
  { id: 'score', label: 'AI Intelligence Score', group: 'Core Info' },
  { id: 'owner', label: 'Lead Owner Name', group: 'Core Info' },
  { id: 'industry', label: 'Industry', group: 'Core Info' },
  { id: 'annualRevenue', label: 'Annual Revenue', group: 'Core Info' },
  { id: 'numberOfEmployees', label: 'Number of Employees', group: 'Core Info' },

  // Contact
  { id: 'email', label: 'Primary Email', group: 'Contact' },
  { id: 'secondaryEmail', label: 'Secondary Email', group: 'Contact' },
  { id: 'phone', label: 'Phone', group: 'Contact' },
  { id: 'mobile', label: 'Mobile', group: 'Contact' },
  { id: 'fax', label: 'Fax', group: 'Contact' },
  { id: 'website', label: 'Website', group: 'Contact' },
  { id: 'skypeId', label: 'Skype ID', group: 'Contact' },
  { id: 'twitterHandle', label: 'Twitter Handle', group: 'Contact' },
  { id: 'emailOptOut', label: 'Email Opt Out Status', group: 'Contact' },

  // Address
  { id: 'address', label: 'Flat / House / Building', group: 'Address' },
  { id: 'street', label: 'Street Address', group: 'Address' },
  { id: 'city', label: 'City', group: 'Address' },
  { id: 'state', label: 'State / Province', group: 'Address' },
  { id: 'country', label: 'Country / Region', group: 'Address' },
  { id: 'zipCode', label: 'ZIP / Postal Code', group: 'Address' },
  { id: 'latitude', label: 'Latitude', group: 'Address' },
  { id: 'longitude', label: 'Longitude', group: 'Address' },

  // System
  { id: 'id', label: 'CRM Record ID', group: 'System' },
  { id: 'createdAt', label: 'Created Date', group: 'System' },
  { id: 'updatedAt', label: 'Last Updated Date', group: 'System' },
  { id: 'description', label: 'Description Notes', group: 'System' },
];

export const ExportLeadsModal: React.FC<ExportLeadsModalProps> = ({
  isOpen,
  onClose,
  totalLeadsCount,
  filteredLeadsCount,
  selectedLeadIds,
  activeFilters,
}) => {
  const [scope, setScope] = useState<'FILTERED' | 'ALL' | 'SELECTED' | 'DATE_RANGE'>(
    selectedLeadIds.length > 0 ? 'SELECTED' : 'FILTERED'
  );
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected fields state
  const defaultSelectedFields = [
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
    'industry',
    'city',
    'country',
    'createdAt',
  ];
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultSelectedFields);

  if (!isOpen) return null;

  const handleToggleField = (id: string) => {
    if (selectedFields.includes(id)) {
      if (selectedFields.length === 1) return; // Keep at least one field
      setSelectedFields(selectedFields.filter((f) => f !== id));
    } else {
      setSelectedFields([...selectedFields, id]);
    }
  };

  const handleSelectAllFields = () => {
    setSelectedFields(AVAILABLE_FIELDS.map((f) => f.id));
  };

  const handleClearFields = () => {
    setSelectedFields(['name', 'email']);
  };

  const getEstimatedCount = () => {
    if (scope === 'SELECTED') return selectedLeadIds.length;
    if (scope === 'FILTERED') return filteredLeadsCount;
    if (scope === 'ALL') return totalLeadsCount;
    return filteredLeadsCount; // estimate for date range
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      if (scope === 'SELECTED' && selectedLeadIds.length === 0) {
        throw new Error('Please select at least one lead from the table to export.');
      }

      if (scope === 'DATE_RANGE' && !startDate && !endDate) {
        throw new Error('Please specify at least a start date or end date.');
      }

      const payload = {
        scope,
        selectedIds: scope === 'SELECTED' ? selectedLeadIds : undefined,
        filters: scope === 'FILTERED' ? activeFilters : undefined,
        dateRange: scope === 'DATE_RANGE' ? { startDate, endDate } : undefined,
        fields: selectedFields,
        format,
      };

      const fallbackExt = format === 'xlsx' ? 'xlsx' : 'csv';
      const fallbackFilename = `swordnex-leads-export-${Date.now()}.${fallbackExt}`;

      await apiClient.downloadPost('/leads/export', payload, fallbackFilename);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export leads');
    } finally {
      setIsExporting(false);
    }
  };

  const groups = ['Core Info', 'Contact', 'Address', 'System'] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Export Leads Dataset</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {getEstimatedCount()} Records
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Download filtered, selected, or organization lead data with formula injection protection.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Export Scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
              1. Export Scope
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('FILTERED')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === 'FILTERED'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-xs">Filtered Leads</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {filteredLeadsCount} records
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('SELECTED')}
                disabled={selectedLeadIds.length === 0}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === 'SELECTED'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-glow-cyan'
                    : selectedLeadIds.length === 0
                    ? 'bg-slate-900/30 border-slate-800/50 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-xs">Selected Leads</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedLeadIds.length} checked
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('ALL')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === 'ALL'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-xs">All Leads</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {totalLeadsCount} total
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope('DATE_RANGE')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  scope === 'DATE_RANGE'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-xs">Date Range</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Custom Dates
                </span>
              </button>
            </div>

            {/* Date Range Pickers if scope is DATE_RANGE */}
            {scope === 'DATE_RANGE' && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Created From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Created To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. File Format */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
              2. Download Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                  format === 'csv'
                    ? 'bg-cyan-950/30 border-cyan-500/80 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="hidden"
                />
                <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">CSV (.csv)</div>
                  <div className="text-[11px] text-slate-400">
                    RFC 4180 compliant with UTF-8 BOM for Excel compatibility
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                  format === 'xlsx'
                    ? 'bg-cyan-950/30 border-cyan-500/80 text-white shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                  className="hidden"
                />
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-xs text-white">Excel Spreadsheet (.xlsx)</div>
                  <div className="text-[11px] text-slate-400">
                    Microsoft Excel & Google Sheets formatted workbook
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                3. Permitted Export Columns ({selectedFields.length} selected)
              </label>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFields}
                  className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClearFields}
                  className="text-slate-400 hover:text-slate-200 underline font-medium"
                >
                  Reset Core
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4 max-h-56 overflow-y-auto">
              {groups.map((group) => {
                const fieldsInGroup = AVAILABLE_FIELDS.filter((f) => f.group === group);
                return (
                  <div key={group}>
                    <div className="text-[11px] font-mono uppercase text-slate-400 mb-1.5 pb-1 border-b border-slate-800/80">
                      {group}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {fieldsInGroup.map((field) => {
                        const isChecked = selectedFields.includes(field.id);
                        return (
                          <label
                            key={field.id}
                            className={`flex items-center space-x-2 p-1.5 rounded-lg cursor-pointer transition select-none ${
                              isChecked
                                ? 'bg-cyan-950/20 text-slate-200'
                                : 'text-slate-400 hover:bg-slate-800/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleField(field.id)}
                              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs truncate">{field.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Security: CSV Formula Injection Escaping enabled
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedFields.length === 0}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
