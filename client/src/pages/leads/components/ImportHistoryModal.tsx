import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { apiClient } from '../../../api/client';

export interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportHistoryModal: React.FC<ImportHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/leads/import/history');
      if (res.success) {
        setJobs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch import history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadErrorReport = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.download(
        `/leads/import/jobs/${jobId}/error-report?format=csv`,
        `import-errors-${jobId}.csv`
      );
    } catch (err: any) {
      alert(`Failed to download error report: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'COMPLETED_WITH_ERRORS':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>Completed with Errors</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-4xl bg-[#0F172A] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Lead Import History</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {jobs.length} Jobs
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit past CSV and Excel lead uploads, inspect error reports, and track processing metrics.
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

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-400" />
              <span>Fetching import records...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="font-semibold text-slate-300">No import jobs recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload your first CSV or Excel file using the Import Leads button.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-3 px-4">File Name / Job ID</th>
                      <th className="py-3 px-4">Initiated By</th>
                      <th className="py-3 px-4">Timestamps</th>
                      <th className="py-3 px-4">Counts</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="hover:bg-slate-800/30 cursor-pointer transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{job.fileName}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            ID: {job.id.slice(0, 13)}...
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5 text-slate-300">
                            <UserIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <span>
                              {job.user ? `${job.user.firstName} ${job.user.lastName}` : 'System User'}
                            </span>
                          </div>
                          {job.user && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                              {job.user.email}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 text-[11px] font-mono">
                          <div>{new Date(job.startedAt || job.createdAt).toLocaleDateString()}</div>
                          <div className="text-slate-500 text-[10px]">
                            {new Date(job.startedAt || job.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="flex items-center space-x-2">
                            <span className="text-emerald-400">+{job.createdCount}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-blue-400">~{job.updatedCount}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-rose-400">-{job.failedCount}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Total: {job.totalRows} rows
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(job.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {job.failedCount > 0 ? (
                            <button
                              onClick={(e) => handleDownloadErrorReport(job.id, e)}
                              className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition inline-flex items-center space-x-1"
                              title="Download error report CSV"
                            >
                              <Download className="w-3 h-3" />
                              <span>Errors</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No errors</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Job Details Modal Drawer */}
          {selectedJob && (
            <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-xl p-5 text-slate-100 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Import Job Details</span>
                  </h3>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500">File: </span>
                      <span className="text-slate-200">{selectedJob.fileName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Job ID: </span>
                      <span className="text-cyan-300">{selectedJob.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Strategy: </span>
                      <span className="text-slate-200">{selectedJob.strategy}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Started: </span>
                      <span className="text-slate-200">
                        {new Date(selectedJob.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedJob.completedAt && (
                      <div>
                        <span className="text-slate-500">Completed: </span>
                        <span className="text-slate-200">
                          {new Date(selectedJob.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedJob.errorReport && selectedJob.errorReport.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                        Error Diagnostic Sample ({selectedJob.errorReport.length} total)
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {selectedJob.errorReport.slice(0, 5).map((err: any, i: number) => (
                          <div
                            key={i}
                            className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-[11px]"
                          >
                            <div className="font-semibold text-rose-300">
                              Row {err.rowNumber}: {err.error}
                            </div>
                            {err.data && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                Name: {err.data.firstName} {err.data.lastName} • Email:{' '}
                                {err.data.email || '—'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                  {selectedJob.failedCount > 0 ? (
                    <button
                      onClick={(e) => handleDownloadErrorReport(selectedJob.id, e)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Error Report</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
