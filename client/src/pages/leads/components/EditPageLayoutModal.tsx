import React, { useState } from 'react';
import {
  X,
  Sliders,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Check,
  Lock,
  RefreshCw,
  Sparkles,
  Save,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../../api/client';

export interface LayoutFieldConfig {
  id: string;
  label: string;
  visible: boolean;
  required: boolean;
  order: number;
  isSystemRequired?: boolean;
}

export interface LayoutSectionConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  fields: LayoutFieldConfig[];
}

export interface LayoutConfig {
  sections: LayoutSectionConfig[];
}

interface EditPageLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: LayoutConfig;
  onLayoutSaved: (newLayout: LayoutConfig) => void;
}

export const EditPageLayoutModal: React.FC<EditPageLayoutModalProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onLayoutSaved,
}) => {
  const [layout, setLayout] = useState<LayoutConfig>(() =>
    JSON.parse(JSON.stringify(currentLayout))
  );
  const [activeTab, setActiveTab] = useState<'DESIGNER' | 'PREVIEW'>('DESIGNER');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Reorder sections
  const moveSection = (index: number, direction: 'UP' | 'DOWN') => {
    const newSections = [...layout.sections];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    newSections.forEach((sec, idx) => {
      sec.order = idx + 1;
    });

    setLayout({ sections: newSections });
  };

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    const newSections = layout.sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, visible: !sec.visible };
      }
      return sec;
    });
    setLayout({ sections: newSections });
  };

  // Move field within a section
  const moveField = (sectionId: string, fieldIndex: number, direction: 'UP' | 'DOWN') => {
    const newSections = layout.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;

      const newFields = [...sec.fields];
      const targetIndex = direction === 'UP' ? fieldIndex - 1 : fieldIndex + 1;
      if (targetIndex < 0 || targetIndex >= newFields.length) return sec;

      const temp = newFields[fieldIndex];
      newFields[fieldIndex] = newFields[targetIndex];
      newFields[targetIndex] = temp;

      newFields.forEach((f, idx) => {
        f.order = idx + 1;
      });

      return { ...sec, fields: newFields };
    });

    setLayout({ sections: newSections });
  };

  // Toggle field visibility
  const toggleFieldVisibility = (sectionId: string, fieldId: string) => {
    const newSections = layout.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;

      const newFields = sec.fields.map((f) => {
        if (f.id === fieldId) {
          if (f.isSystemRequired || f.id === 'firstName' || f.id === 'lastName') {
            return f; // System mandatory
          }
          const nextVisible = !f.visible;
          return {
            ...f,
            visible: nextVisible,
            required: nextVisible ? f.required : false,
          };
        }
        return f;
      });

      return { ...sec, fields: newFields };
    });

    setLayout({ sections: newSections });
  };

  // Toggle field required
  const toggleFieldRequired = (sectionId: string, fieldId: string) => {
    const newSections = layout.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;

      const newFields = sec.fields.map((f) => {
        if (f.id === fieldId) {
          if (f.isSystemRequired || f.id === 'firstName' || f.id === 'lastName') {
            return f; // System mandatory
          }
          return { ...f, required: !f.required };
        }
        return f;
      });

      return { ...sec, fields: newFields };
    });

    setLayout({ sections: newSections });
  };

  // Save layout to backend
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await apiClient.put('/leads/layout/config', {
        sections: layout.sections,
      });

      if (res.success) {
        setSaveSuccess(true);
        onLayoutSaved(layout);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        throw new Error(res.error || 'Failed to save layout configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Error persisting layout to organization settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = () => {
    if (confirm('Reset layout to standard SwordNex system defaults?')) {
      const defaultSections = [
        {
          id: 'lead_info',
          title: 'Lead Information',
          visible: true,
          order: 1,
          fields: [
            { id: 'ownerId', label: 'Lead Owner', visible: true, required: false, order: 1, isSystemRequired: false },
            { id: 'firstName', label: 'First Name', visible: true, required: true, order: 2, isSystemRequired: true },
            { id: 'lastName', label: 'Last Name', visible: true, required: true, order: 3, isSystemRequired: true },
            { id: 'title', label: 'Title / Job Title', visible: true, required: false, order: 4, isSystemRequired: false },
            { id: 'company', label: 'Company', visible: true, required: false, order: 5, isSystemRequired: false },
            { id: 'email', label: 'Email', visible: true, required: false, order: 6, isSystemRequired: false },
            { id: 'secondaryEmail', label: 'Secondary Email', visible: true, required: false, order: 7, isSystemRequired: false },
            { id: 'phone', label: 'Phone', visible: true, required: false, order: 8, isSystemRequired: false },
            { id: 'mobile', label: 'Mobile', visible: true, required: false, order: 9, isSystemRequired: false },
            { id: 'fax', label: 'Fax', visible: true, required: false, order: 10, isSystemRequired: false },
            { id: 'website', label: 'Website', visible: true, required: false, order: 11, isSystemRequired: false },
            { id: 'skypeId', label: 'Skype ID', visible: true, required: false, order: 12, isSystemRequired: false },
            { id: 'twitterHandle', label: 'Twitter Handle', visible: true, required: false, order: 13, isSystemRequired: false },
            { id: 'source', label: 'Lead Source', visible: true, required: false, order: 14, isSystemRequired: false },
            { id: 'status', label: 'Lead Status', visible: true, required: false, order: 15, isSystemRequired: false },
            { id: 'industry', label: 'Industry', visible: true, required: false, order: 16, isSystemRequired: false },
            { id: 'annualRevenue', label: 'Annual Revenue (₹)', visible: true, required: false, order: 17, isSystemRequired: false },
            { id: 'numberOfEmployees', label: 'Number of Employees', visible: true, required: false, order: 18, isSystemRequired: false },
            { id: 'rating', label: 'Rating', visible: true, required: false, order: 19, isSystemRequired: false },
            { id: 'emailOptOut', label: 'Email Opt Out', visible: true, required: false, order: 20, isSystemRequired: false },
          ],
        },
        {
          id: 'address_info',
          title: 'Address Information',
          visible: true,
          order: 2,
          fields: [
            { id: 'address', label: 'Flat / House No. / Building / Apartment Name', visible: true, required: false, order: 1, isSystemRequired: false },
            { id: 'street', label: 'Street Address', visible: true, required: false, order: 2, isSystemRequired: false },
            { id: 'country', label: 'Country / Region', visible: true, required: false, order: 3, isSystemRequired: false },
            { id: 'state', label: 'State / Province', visible: true, required: false, order: 4, isSystemRequired: false },
            { id: 'city', label: 'City', visible: true, required: false, order: 5, isSystemRequired: false },
            { id: 'zipCode', label: 'ZIP / Postal Code', visible: true, required: false, order: 6, isSystemRequired: false },
            { id: 'latitude', label: 'Latitude', visible: true, required: false, order: 7, isSystemRequired: false },
            { id: 'longitude', label: 'Longitude', visible: true, required: false, order: 8, isSystemRequired: false },
          ],
        },
        {
          id: 'description_info',
          title: 'Description Information',
          visible: true,
          order: 3,
          fields: [
            { id: 'description', label: 'Description Notes & Conversation Details', visible: true, required: false, order: 1, isSystemRequired: false },
          ],
        },
      ];
      setLayout({ sections: defaultSections });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden glass-panel flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Edit Lead Page Layout</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  TENANT ADMIN
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Customize section ordering, visibility, and field requirements for this organization.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('DESIGNER')}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  activeTab === 'DESIGNER'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Designer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  activeTab === 'PREVIEW'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          {activeTab === 'DESIGNER' ? (
            <div className="space-y-6">
              {layout.sections.map((section, sIdx) => (
                <div
                  key={section.id}
                  className={`rounded-xl border transition ${
                    section.visible
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  {/* Section Title Bar */}
                  <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 rounded-t-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-cyan-400 text-xs font-bold">
                        #{section.order}
                      </span>
                      <h3 className="text-xs font-bold text-white tracking-wide">
                        {section.title}
                      </h3>
                      {!section.visible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          Hidden
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => moveSection(sIdx, 'UP')}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400"
                        title="Move section up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={sIdx === layout.sections.length - 1}
                        onClick={() => moveSection(sIdx, 'DOWN')}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:text-slate-400"
                        title="Move section down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(section.id)}
                        className={`p-1 rounded transition ${
                          section.visible
                            ? 'text-cyan-400 hover:bg-slate-800'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={section.visible ? 'Hide section' : 'Show section'}
                      >
                        {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Section Field List */}
                  {section.visible && (
                    <div className="p-3 divide-y divide-slate-800/40">
                      <div className="px-2 py-1.5 grid grid-cols-12 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800/60">
                        <span className="col-span-5">Field Name</span>
                        <span className="col-span-3 text-center">Required</span>
                        <span className="col-span-2 text-center">Visible</span>
                        <span className="col-span-2 text-right">Order</span>
                      </div>

                      {section.fields.map((field, fIdx) => {
                        const isSystemMandatory =
                          field.isSystemRequired || field.id === 'firstName' || field.id === 'lastName';

                        return (
                          <div
                            key={field.id}
                            className={`px-2 py-2 grid grid-cols-12 items-center text-xs transition ${
                              field.visible ? 'text-slate-200' : 'text-slate-500 opacity-50'
                            }`}
                          >
                            {/* Field Name */}
                            <div className="col-span-5 flex items-center space-x-2 truncate">
                              <span className="font-medium truncate">{field.label}</span>
                              {isSystemMandatory && (
                                <span
                                  className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono flex items-center space-x-0.5 flex-shrink-0"
                                  title="System mandatory field required by core CRM engine"
                                >
                                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                                  <span>Core</span>
                                </span>
                              )}
                            </div>

                            {/* Required Toggle */}
                            <div className="col-span-3 flex justify-center">
                              {isSystemMandatory ? (
                                <span className="text-[10px] text-amber-400 font-mono flex items-center space-x-1">
                                  <Lock className="w-3 h-3 mr-0.5" />
                                  <span>Always</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!field.visible}
                                  onClick={() => toggleFieldRequired(section.id, field.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                                    field.required
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                                  } ${!field.visible ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  {field.required ? 'Mandatory' : 'Optional'}
                                </button>
                              )}
                            </div>

                            {/* Visibility Toggle */}
                            <div className="col-span-2 flex justify-center">
                              {isSystemMandatory ? (
                                <span className="text-[10px] text-slate-500 font-mono">Locked</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleFieldVisibility(section.id, field.id)}
                                  className={`p-1 rounded transition ${
                                    field.visible
                                      ? 'text-cyan-400 hover:bg-slate-800'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                  title={field.visible ? 'Hide field' : 'Show field'}
                                >
                                  {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                                </button>
                              )}
                            </div>

                            {/* Reorder Buttons */}
                            <div className="col-span-2 flex items-center justify-end space-x-1">
                              <button
                                type="button"
                                disabled={fIdx === 0}
                                onClick={() => moveField(section.id, fIdx, 'UP')}
                                className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-20"
                                title="Move up"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={fIdx === section.fields.length - 1}
                                onClick={() => moveField(section.id, fIdx, 'DOWN')}
                                className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 disabled:opacity-20"
                                title="Move down"
                              >
                                <MoveDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Live Preview Mode */
            <div className="space-y-6 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Previewing Customized Form Output</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Non-interactive mock</span>
              </div>

              {layout.sections
                .filter((s) => s.visible)
                .map((section) => (
                  <div key={section.id} className="space-y-3">
                    <h4 className="text-xs font-bold text-white tracking-wide uppercase font-mono pb-1 border-b border-slate-800/60 flex items-center justify-between">
                      <span>{section.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {section.fields.filter((f) => f.visible).length} Visible Fields
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {section.fields
                        .filter((f) => f.visible)
                        .map((field) => (
                          <div
                            key={field.id}
                            className={`p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 ${
                              field.id === 'description' ? 'md:col-span-2' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-slate-300">
                                {field.label}
                                {field.required && <span className="text-rose-400 ml-1">*</span>}
                              </span>
                              {field.required && (
                                <span className="text-[9px] font-mono text-rose-400">Required</span>
                              )}
                            </div>
                            <div className="h-7 bg-slate-950/80 rounded border border-slate-800 px-2 flex items-center text-[11px] text-slate-500">
                              Placeholder for {field.label}...
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Published!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Publish Layout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
