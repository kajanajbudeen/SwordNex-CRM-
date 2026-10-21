import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Save,
  PlusCircle,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  MapPin,
  FileText,
  User,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { SearchableSelect, SelectOption } from './components/SearchableSelect';
import { LeadImageUpload } from './components/LeadImageUpload';
import {
  EditPageLayoutModal,
  LayoutConfig,
} from './components/EditPageLayoutModal';

interface LeadFormPageProps {
  mode: 'create' | 'edit';
}

const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn Inbound' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'CAMPAIGN', label: 'Marketing Campaign' },
  { value: 'EVENT', label: 'Conference / Event' },
  { value: 'API', label: 'API / Ingestion' },
  { value: 'OTHER', label: 'Other' },
];

const LEAD_STATUS_OPTIONS: SelectOption[] = [
  { value: 'NEW', label: 'New', badge: 'NEW', badgeColor: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'CONTACTED', label: 'Contacted', badge: 'CONTACTED', badgeColor: 'bg-blue-500/20 text-blue-300' },
  { value: 'QUALIFIED', label: 'Qualified', badge: 'SQL', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'UNQUALIFIED', label: 'Unqualified', badge: 'NURTURE', badgeColor: 'bg-slate-700 text-slate-300' },
  { value: 'CONVERTED', label: 'Converted', badge: 'WON', badgeColor: 'bg-purple-500/20 text-purple-300' },
];

const LEAD_RATING_OPTIONS: SelectOption[] = [
  { value: 'HOT', label: 'Hot', badge: 'HOT', badgeColor: 'bg-rose-500/20 text-rose-300' },
  { value: 'WARM', label: 'Warm', badge: 'WARM', badgeColor: 'bg-amber-500/20 text-amber-300' },
  { value: 'COLD', label: 'Cold', badge: 'COLD', badgeColor: 'bg-blue-500/20 text-blue-300' },
];

const INDUSTRY_OPTIONS: SelectOption[] = [
  { value: 'Technology', label: 'Technology / Software / SaaS' },
  { value: 'Finance', label: 'Finance & Banking' },
  { value: 'Healthcare', label: 'Healthcare & Life Sciences' },
  { value: 'Education', label: 'Education & EdTech' },
  { value: 'Manufacturing', label: 'Manufacturing & Industrial' },
  { value: 'Retail', label: 'Retail & E-Commerce' },
  { value: 'Real Estate', label: 'Real Estate & Construction' },
  { value: 'Consulting', label: 'Professional Consulting' },
  { value: 'Other', label: 'Other' },
];

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'India', label: 'India', sublabel: '+91' },
  { value: 'United States', label: 'United States', sublabel: '+1' },
  { value: 'United Kingdom', label: 'United Kingdom', sublabel: '+44' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates', sublabel: '+971' },
  { value: 'Singapore', label: 'Singapore', sublabel: '+65' },
  { value: 'Canada', label: 'Canada', sublabel: '+1' },
  { value: 'Australia', label: 'Australia', sublabel: '+61' },
  { value: 'Germany', label: 'Germany', sublabel: '+49' },
  { value: 'France', label: 'France', sublabel: '+33' },
  { value: 'Japan', label: 'Japan', sublabel: '+81' },
  { value: 'Other', label: 'Other Country' },
];

const INDIAN_STATES: SelectOption[] = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Delhi', label: 'Delhi (NCR)' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Karnataka', label: 'Karnataka (Bengaluru)' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Maharashtra', label: 'Maharashtra (Mumbai/Pune)' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu (Chennai)' },
  { value: 'Telangana', label: 'Telangana (Hyderabad)' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh (Noida)' },
  { value: 'West Bengal', label: 'West Bengal (Kolkata)' },
];

const DEFAULT_LAYOUT_FALLBACK: LayoutConfig = {
  sections: [
    {
      id: 'lead_info',
      title: 'Lead Information',
      visible: true,
      order: 1,
      fields: [
        { id: 'ownerId', label: 'Lead Owner', visible: true, required: false, order: 1, isSystemRequired: false },
        { id: 'status', label: 'Lead Status', visible: true, required: false, order: 2, isSystemRequired: false },
        { id: 'firstName', label: 'First Name', visible: true, required: true, order: 3, isSystemRequired: true },
        { id: 'lastName', label: 'Last Name', visible: true, required: true, order: 4, isSystemRequired: true },
        { id: 'company', label: 'Company', visible: true, required: false, order: 5, isSystemRequired: false },
        { id: 'title', label: 'Title', visible: true, required: false, order: 6, isSystemRequired: false },
        { id: 'email', label: 'Email', visible: true, required: false, order: 7, isSystemRequired: false },
        { id: 'mobile', label: 'Mobile', visible: true, required: false, order: 8, isSystemRequired: false },
        { id: 'phone', label: 'Phone', visible: true, required: false, order: 9, isSystemRequired: false },
        { id: 'fax', label: 'Fax', visible: true, required: false, order: 10, isSystemRequired: false },
        { id: 'source', label: 'Lead Source', visible: true, required: false, order: 11, isSystemRequired: false },
        { id: 'industry', label: 'Industry', visible: true, required: false, order: 12, isSystemRequired: false },
        { id: 'annualRevenue', label: 'Annual Revenue', visible: true, required: false, order: 13, isSystemRequired: false },
        { id: 'numberOfEmployees', label: 'Number of Employees', visible: true, required: false, order: 14, isSystemRequired: false },
        { id: 'rating', label: 'Rating', visible: true, required: false, order: 15, isSystemRequired: false },
        { id: 'website', label: 'Website', visible: true, required: false, order: 16, isSystemRequired: false },
        { id: 'secondaryEmail', label: 'Secondary Email', visible: true, required: false, order: 17, isSystemRequired: false },
        { id: 'twitterHandle', label: 'Twitter Handle', visible: true, required: false, order: 18, isSystemRequired: false },
        { id: 'skypeId', label: 'Skype ID', visible: true, required: false, order: 19, isSystemRequired: false },
        { id: 'emailOptOut', label: 'Email Opt Out', visible: true, required: false, order: 20, isSystemRequired: false },
      ],
    },
    {
      id: 'address_info',
      title: 'Address Information',
      visible: true,
      order: 2,
      fields: [
        { id: 'country', label: 'Country / Region', visible: true, required: false, order: 1, isSystemRequired: false },
        { id: 'state', label: 'State / Province', visible: true, required: false, order: 2, isSystemRequired: false },
        { id: 'city', label: 'City', visible: true, required: false, order: 3, isSystemRequired: false },
        { id: 'zipCode', label: 'ZIP / Postal Code', visible: true, required: false, order: 4, isSystemRequired: false },
        { id: 'address', label: 'Flat / House / Building', visible: true, required: false, order: 5, isSystemRequired: false },
        { id: 'street', label: 'Street Address', visible: true, required: false, order: 6, isSystemRequired: false },
        { id: 'latitude', label: 'Latitude', visible: true, required: false, order: 7, isSystemRequired: false },
        { id: 'longitude', label: 'Longitude', visible: true, required: false, order: 8, isSystemRequired: false },
      ],
    },
    {
      id: 'description_info',
      title: 'Description',
      visible: true,
      order: 3,
      fields: [
        { id: 'description', label: 'Description', visible: true, required: false, order: 1, isSystemRequired: false },
      ],
    },
  ],
};

interface ToastNotification {
  type: 'success' | 'error';
  message: string;
}

export const LeadFormPage: React.FC<LeadFormPageProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, currentMembership, can } = useAuth();

  // Layout Configuration
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_FALLBACK);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

  // Team Members for Lead Owner searchable dropdown
  const [teamMembers, setTeamMembers] = useState<SelectOption[]>([]);

  // Form State
  const initialFormValues = {
    avatarUrl: null as string | null,
    ownerId: user?.id || '',
    firstName: '',
    lastName: '',
    title: '',
    company: '',
    email: '',
    secondaryEmail: '',
    phone: '',
    mobile: '',
    fax: '',
    website: '',
    skypeId: '',
    twitterHandle: '',
    source: 'WEBSITE',
    status: 'NEW',
    industry: '',
    annualRevenue: '' as string | number,
    numberOfEmployees: '' as string | number,
    rating: 'WARM',
    emailOptOut: false,

    // Address
    country: 'India',
    address: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '' as string | number,
    longitude: '' as string | number,

    // Description
    description: '',
  };

  const [formData, setFormData] = useState(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Page States
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Check if current user is an authorized administrator for layout customization
  const canEditLayout = useMemo(() => {
    if (isSuperAdmin) return true;
    if (currentMembership?.role === 'ADMIN') return true;
    return can('LEADS', 'MANAGE') || can('SETTINGS', 'MANAGE');
  }, [isSuperAdmin, currentMembership, can]);

  // Load layout config and team members
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const [layoutRes, membersRes] = await Promise.all([
          apiClient.get('/leads/layout/config').catch(() => null),
          apiClient.get('/organizations/members').catch(() => null),
        ]);

        if (layoutRes?.success && layoutRes.data?.sections) {
          setLayoutConfig(layoutRes.data);
        }

        if (membersRes?.success && Array.isArray(membersRes.data)) {
          const formatted = membersRes.data
            .filter((m: any) => m.user?.isActive)
            .map((m: any) => ({
              value: m.user.id,
              label: `${m.user.firstName} ${m.user.lastName}`.trim(),
              sublabel: m.user.email,
              avatar: m.user.avatarUrl,
              badge: m.role,
              badgeColor: m.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700 text-slate-300',
            }));
          setTeamMembers(formatted);
        }
      } catch (err) {
        console.error('Error fetching layout or members:', err);
      }
    };

    fetchPrerequisites();
  }, []);

  // In edit mode, load existing lead
  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchLead = async () => {
        setIsLoading(true);
        try {
          const res = await apiClient.get(`/leads/${id}`);
          if (res.success && res.data) {
            const l = res.data;
            setFormData({
              avatarUrl: l.avatarUrl || null,
              ownerId: l.ownerId || '',
              firstName: l.firstName || '',
              lastName: l.lastName || '',
              title: l.title || '',
              company: l.company || '',
              email: l.email || '',
              secondaryEmail: l.secondaryEmail || '',
              phone: l.phone || '',
              mobile: l.mobile || '',
              fax: l.fax || '',
              website: l.website || '',
              skypeId: l.skypeId || '',
              twitterHandle: l.twitterHandle || '',
              source: l.source || 'WEBSITE',
              status: l.status || 'NEW',
              industry: l.industry || '',
              annualRevenue: l.annualRevenue !== null && l.annualRevenue !== undefined ? l.annualRevenue : '',
              numberOfEmployees: l.numberOfEmployees !== null && l.numberOfEmployees !== undefined ? l.numberOfEmployees : '',
              rating: l.rating || 'WARM',
              emailOptOut: Boolean(l.emailOptOut),
              country: l.country || 'India',
              address: l.address || '',
              street: l.street || '',
              city: l.city || '',
              state: l.state || '',
              zipCode: l.zipCode || '',
              latitude: l.latitude !== null && l.latitude !== undefined ? l.latitude : '',
              longitude: l.longitude !== null && l.longitude !== undefined ? l.longitude : '',
              description: l.description || '',
            });
          } else {
            showToast('error', 'Lead record not found or access denied.');
          }
        } catch (err: any) {
          showToast('error', err.message || 'Failed to load lead details.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchLead();
    }
  }, [mode, id]);

  // Update a single form field
  const handleFieldChange = (field: string, value: any) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear inline error on change
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Mandatory core checks
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (formData.secondaryEmail.trim() && !emailRegex.test(formData.secondaryEmail.trim())) {
      errors.secondaryEmail = 'Please enter a valid secondary email address';
    }

    // Website URL validation
    if (formData.website.trim()) {
      try {
        const urlStr = formData.website.startsWith('http://') || formData.website.startsWith('https://')
          ? formData.website
          : `https://${formData.website}`;
        new URL(urlStr);
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }

    // Coordinate validation
    if (formData.latitude !== '' && formData.latitude !== null) {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90';
      }
    }
    if (formData.longitude !== '' && formData.longitude !== null) {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    // Numeric fields validation
    if (formData.annualRevenue !== '' && formData.annualRevenue !== null) {
      const rev = Number(formData.annualRevenue);
      if (isNaN(rev) || rev < 0) {
        errors.annualRevenue = 'Annual revenue must be a non-negative number';
      }
    }
    if (formData.numberOfEmployees !== '' && formData.numberOfEmployees !== null) {
      const emp = Number(formData.numberOfEmployees);
      if (isNaN(emp) || emp < 0 || !Number.isInteger(emp)) {
        errors.numberOfEmployees = 'Number of employees must be a non-negative integer';
      }
    }

    // Layout configured required rules
    layoutConfig.sections.forEach((sec) => {
      if (sec.visible) {
        sec.fields.forEach((field) => {
          if (field.visible && field.required) {
            const val = (formData as any)[field.id];
            if (val === undefined || val === null || String(val).trim() === '') {
              if (!errors[field.id]) {
                errors[field.id] = `${field.label} is required`;
              }
            }
          }
        });
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (saveAndNew: boolean = false) => {
    if (!validateForm()) {
      showToast('error', 'Please correct the highlighted fields before saving.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      annualRevenue: formData.annualRevenue === '' ? null : Number(formData.annualRevenue),
      numberOfEmployees: formData.numberOfEmployees === '' ? null : Number(formData.numberOfEmployees),
      latitude: formData.latitude === '' ? null : Number(formData.latitude),
      longitude: formData.longitude === '' ? null : Number(formData.longitude),
      email: formData.email.trim() || null,
      secondaryEmail: formData.secondaryEmail.trim() || null,
      ownerId: formData.ownerId || null,
    };

    try {
      if (mode === 'create') {
        const res = await apiClient.post('/leads', payload);
        if (res.success && res.data) {
          if (saveAndNew) {
            showToast('success', `Lead "${res.data.firstName} ${res.data.lastName}" created successfully.`);
            setFormData({
              ...initialFormValues,
              ownerId: formData.ownerId || user?.id || '',
            });
            setIsDirty(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            navigate(`/leads/${res.data.id}`);
          }
        } else {
          throw new Error(res.error || 'Failed to create lead');
        }
      } else {
        // Edit mode
        const res = await apiClient.patch(`/leads/${id}`, payload);
        if (res.success && res.data) {
          navigate(`/leads/${id}`);
        } else {
          throw new Error(res.error || 'Failed to update lead');
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save lead record. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Handler with unsaved changes confirmation
  const handleCancel = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    if (mode === 'edit' && id) {
      navigate(`/leads/${id}`);
    } else {
      navigate('/leads');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-3" />
        <span>Loading lead profile...</span>
      </div>
    );
  }

  // Helper to check if a field is visible in layout configuration
  const isFieldVisible = (fieldId: string) => {
    for (const section of layoutConfig.sections) {
      if (!section.visible) continue;
      const found = section.fields.find((f) => f.id === fieldId);
      if (found) return found.visible;
    }
    return true;
  };

  // Helper to check if a field is required in layout configuration
  const isFieldRequired = (fieldId: string) => {
    if (fieldId === 'firstName' || fieldId === 'lastName') return true;
    for (const section of layoutConfig.sections) {
      const found = section.fields.find((f) => f.id === fieldId);
      if (found) return found.required;
    }
    return false;
  };

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification (Floating Non-blocking) */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 shadow-2xl text-xs max-w-md animate-in fade-in slide-in-from-top-2">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-slate-200 font-medium flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        {/* Left side: Breadcrumb, Title, Description */}
        <div>
          <nav className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
            <Link to="/leads" className="hover:text-slate-200 transition">
              Leads
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">
              {mode === 'create' ? 'Create Lead' : 'Edit Lead'}
            </span>
          </nav>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {mode === 'create' ? 'Create Lead' : `Edit Lead: ${formData.firstName} ${formData.lastName}`}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'create'
              ? 'Add a new prospect to your sales pipeline.'
              : 'Update prospect details and pipeline qualifications.'}
          </p>
        </div>

        {/* Right side: Top Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {canEditLayout && (
            <button
              type="button"
              onClick={() => setIsLayoutModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition"
              title="Configure lead form fields and rules"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Layout</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
          >
            Cancel
          </button>

          {mode === 'create' && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Save and New</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{mode === 'create' ? 'Save' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="space-y-6"
      >
        {/* ============================================================== */}
        {/* SECTION 1: LEAD INFORMATION */}
        {/* ============================================================== */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          {/* Section Header with Compact Avatar Upload Beside Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>Lead Information</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary contact identity, ownership assignment, and classification.
              </p>
            </div>

            {/* Compact Lead Avatar Upload */}
            <LeadImageUpload
              value={formData.avatarUrl}
              onChange={(url) => handleFieldChange('avatarUrl', url)}
              firstName={formData.firstName}
              lastName={formData.lastName}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Fields: Two-Column Form Grid (Strict 10 Rows on Desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* ROW 1: Lead Owner | Lead Status */}
            {isFieldVisible('ownerId') && (
              <div>
                <label
                  htmlFor="lead-field-ownerId"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Lead Owner
                  {isFieldRequired('ownerId') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-ownerId"
                  options={teamMembers}
                  value={formData.ownerId}
                  onChange={(val) => handleFieldChange('ownerId', val)}
                  placeholder="Select Lead Owner..."
                  disabled={isSubmitting}
                  error={formErrors.ownerId}
                />
              </div>
            )}

            {isFieldVisible('status') && (
              <div>
                <label
                  htmlFor="lead-field-status"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Lead Status
                  {isFieldRequired('status') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-status"
                  options={LEAD_STATUS_OPTIONS}
                  value={formData.status}
                  onChange={(val) => handleFieldChange('status', val)}
                  placeholder="Select Status..."
                  disabled={isSubmitting}
                  error={formErrors.status}
                />
              </div>
            )}

            {/* ROW 2: First Name | Last Name */}
            {isFieldVisible('firstName') && (
              <div>
                <label
                  htmlFor="lead-field-firstName"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  First Name
                  <span className="text-rose-400 ml-0.5">*</span>
                </label>
                <input
                  id="lead-field-firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. John"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.firstName
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.firstName && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.firstName}</p>
                )}
              </div>
            )}

            {isFieldVisible('lastName') && (
              <div>
                <label
                  htmlFor="lead-field-lastName"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Last Name
                  <span className="text-rose-400 ml-0.5">*</span>
                </label>
                <input
                  id="lead-field-lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Doe"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.lastName
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.lastName && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.lastName}</p>
                )}
              </div>
            )}

            {/* ROW 3: Company | Title */}
            {isFieldVisible('company') && (
              <div>
                <label
                  htmlFor="lead-field-company"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Company
                  {isFieldRequired('company') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Acme Corporation"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.company
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.company && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.company}</p>
                )}
              </div>
            )}

            {isFieldVisible('title') && (
              <div>
                <label
                  htmlFor="lead-field-title"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Title
                  {isFieldRequired('title') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. VP of Sales"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.title
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.title}</p>
                )}
              </div>
            )}

            {/* ROW 4: Email | Mobile */}
            {isFieldVisible('email') && (
              <div>
                <label
                  htmlFor="lead-field-email"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Email
                  {isFieldRequired('email') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="john.doe@company.com"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.email
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.email}</p>
                )}
              </div>
            )}

            {isFieldVisible('mobile') && (
              <div>
                <label
                  htmlFor="lead-field-mobile"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Mobile
                  {isFieldRequired('mobile') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleFieldChange('mobile', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.mobile
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.mobile && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.mobile}</p>
                )}
              </div>
            )}

            {/* ROW 5: Phone | Fax */}
            {isFieldVisible('phone') && (
              <div>
                <label
                  htmlFor="lead-field-phone"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Phone
                  {isFieldRequired('phone') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="+1 (555) 123-4567"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.phone
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.phone}</p>
                )}
              </div>
            )}

            {isFieldVisible('fax') && (
              <div>
                <label
                  htmlFor="lead-field-fax"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Fax
                  {isFieldRequired('fax') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-fax"
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => handleFieldChange('fax', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="+1 (555) 987-6543"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.fax
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.fax && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.fax}</p>
                )}
              </div>
            )}

            {/* ROW 6: Lead Source | Industry */}
            {isFieldVisible('source') && (
              <div>
                <label
                  htmlFor="lead-field-source"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Lead Source
                  {isFieldRequired('source') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-source"
                  options={LEAD_SOURCE_OPTIONS}
                  value={formData.source}
                  onChange={(val) => handleFieldChange('source', val)}
                  placeholder="Select Lead Source..."
                  disabled={isSubmitting}
                  error={formErrors.source}
                />
              </div>
            )}

            {isFieldVisible('industry') && (
              <div>
                <label
                  htmlFor="lead-field-industry"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Industry
                  {isFieldRequired('industry') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-industry"
                  options={INDUSTRY_OPTIONS}
                  value={formData.industry}
                  onChange={(val) => handleFieldChange('industry', val)}
                  placeholder="Select Industry..."
                  allowCustom={true}
                  disabled={isSubmitting}
                  error={formErrors.industry}
                />
              </div>
            )}

            {/* ROW 7: Annual Revenue | Number of Employees */}
            {isFieldVisible('annualRevenue') && (
              <div>
                <label
                  htmlFor="lead-field-annualRevenue"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Annual Revenue
                  {isFieldRequired('annualRevenue') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-medium text-slate-400">
                    ₹
                  </span>
                  <input
                    id="lead-field-annualRevenue"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.annualRevenue}
                    onChange={(e) => handleFieldChange('annualRevenue', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="0"
                    className={`w-full h-10 bg-slate-900/60 border rounded-lg pl-7 pr-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                      formErrors.annualRevenue
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                    }`}
                  />
                </div>
                {formErrors.annualRevenue && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.annualRevenue}</p>
                )}
              </div>
            )}

            {isFieldVisible('numberOfEmployees') && (
              <div>
                <label
                  htmlFor="lead-field-numberOfEmployees"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Number of Employees
                  {isFieldRequired('numberOfEmployees') && (
                    <span className="text-rose-400 ml-0.5">*</span>
                  )}
                </label>
                <input
                  id="lead-field-numberOfEmployees"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.numberOfEmployees}
                  onChange={(e) => handleFieldChange('numberOfEmployees', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 50"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.numberOfEmployees
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.numberOfEmployees && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.numberOfEmployees}</p>
                )}
              </div>
            )}

            {/* ROW 8: Rating | Website */}
            {isFieldVisible('rating') && (
              <div>
                <label
                  htmlFor="lead-field-rating"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Rating
                  {isFieldRequired('rating') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-rating"
                  options={LEAD_RATING_OPTIONS}
                  value={formData.rating}
                  onChange={(val) => handleFieldChange('rating', val)}
                  placeholder="Select Rating..."
                  disabled={isSubmitting}
                  error={formErrors.rating}
                />
              </div>
            )}

            {isFieldVisible('website') && (
              <div>
                <label
                  htmlFor="lead-field-website"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Website
                  {isFieldRequired('website') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://example.com"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.website
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.website && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.website}</p>
                )}
              </div>
            )}

            {/* ROW 9: Secondary Email | Twitter Handle */}
            {isFieldVisible('secondaryEmail') && (
              <div>
                <label
                  htmlFor="lead-field-secondaryEmail"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Secondary Email
                  {isFieldRequired('secondaryEmail') && (
                    <span className="text-rose-400 ml-0.5">*</span>
                  )}
                </label>
                <input
                  id="lead-field-secondaryEmail"
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => handleFieldChange('secondaryEmail', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="alternate@company.com"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.secondaryEmail
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.secondaryEmail && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.secondaryEmail}</p>
                )}
              </div>
            )}

            {isFieldVisible('twitterHandle') && (
              <div>
                <label
                  htmlFor="lead-field-twitterHandle"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Twitter Handle
                  {isFieldRequired('twitterHandle') && (
                    <span className="text-rose-400 ml-0.5">*</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-medium text-slate-500">
                    @
                  </span>
                  <input
                    id="lead-field-twitterHandle"
                    type="text"
                    value={formData.twitterHandle}
                    onChange={(e) => handleFieldChange('twitterHandle', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="username"
                    className={`w-full h-10 bg-slate-900/60 border rounded-lg pl-7 pr-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                      formErrors.twitterHandle
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                    }`}
                  />
                </div>
                {formErrors.twitterHandle && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.twitterHandle}</p>
                )}
              </div>
            )}

            {/* ROW 10: Skype ID | Email Opt Out */}
            {isFieldVisible('skypeId') && (
              <div>
                <label
                  htmlFor="lead-field-skypeId"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Skype ID
                  {isFieldRequired('skypeId') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-skypeId"
                  type="text"
                  value={formData.skypeId}
                  onChange={(e) => handleFieldChange('skypeId', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="live:username"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.skypeId
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.skypeId && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.skypeId}</p>
                )}
              </div>
            )}

            {isFieldVisible('emailOptOut') && (
              <div>
                <span className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5">
                  Email Communication
                </span>
                <label className="flex items-center space-x-3 h-10 px-3.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition select-none">
                  <input
                    id="lead-field-emailOptOut"
                    type="checkbox"
                    checked={formData.emailOptOut}
                    onChange={(e) => handleFieldChange('emailOptOut', e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer"
                  />
                  <div className="flex items-center justify-between flex-1">
                    <span className="text-xs sm:text-sm text-slate-200">Email Opt Out</span>
                    {formData.emailOptOut ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Suppressed
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">Subscribed</span>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 2: ADDRESS INFORMATION */}
        {/* ============================================================== */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center space-x-2">
              <span>Address Information</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Physical location and geographic coordinates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* ROW 1: Country / Region | State / Province */}
            {isFieldVisible('country') && (
              <div>
                <label
                  htmlFor="lead-field-country"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Country / Region
                  {isFieldRequired('country') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-country"
                  options={COUNTRY_OPTIONS}
                  value={formData.country}
                  onChange={(val) => handleFieldChange('country', val)}
                  placeholder="Select Country..."
                  allowCustom={true}
                  disabled={isSubmitting}
                  error={formErrors.country}
                />
              </div>
            )}

            {isFieldVisible('state') && (
              <div>
                <label
                  htmlFor="lead-field-state"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  State / Province
                  {isFieldRequired('state') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <SearchableSelect
                  id="lead-field-state"
                  options={INDIAN_STATES}
                  value={formData.state}
                  onChange={(val) => handleFieldChange('state', val)}
                  placeholder="Select or enter state..."
                  allowCustom={true}
                  disabled={isSubmitting}
                  error={formErrors.state}
                />
              </div>
            )}

            {/* ROW 2: City | ZIP / Postal Code */}
            {isFieldVisible('city') && (
              <div>
                <label
                  htmlFor="lead-field-city"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  City
                  {isFieldRequired('city') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Mumbai"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.city
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.city && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.city}</p>
                )}
              </div>
            )}

            {isFieldVisible('zipCode') && (
              <div>
                <label
                  htmlFor="lead-field-zipCode"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  ZIP / Postal Code
                  {isFieldRequired('zipCode') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 400001"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.zipCode
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.zipCode && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.zipCode}</p>
                )}
              </div>
            )}

            {/* ROW 3: Flat / House / Building | Street Address */}
            {isFieldVisible('address') && (
              <div>
                <label
                  htmlFor="lead-field-address"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Flat / House / Building
                  {isFieldRequired('address') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Suite, unit, floor, building name"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.address
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.address && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.address}</p>
                )}
              </div>
            )}

            {isFieldVisible('street') && (
              <div>
                <label
                  htmlFor="lead-field-street"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Street Address
                  {isFieldRequired('street') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-street"
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleFieldChange('street', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Street name and number"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.street
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.street && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.street}</p>
                )}
              </div>
            )}

            {/* ROW 4: Latitude | Longitude */}
            {isFieldVisible('latitude') && (
              <div>
                <label
                  htmlFor="lead-field-latitude"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Latitude
                  {isFieldRequired('latitude') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleFieldChange('latitude', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 19.0760"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.latitude
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.latitude && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.latitude}</p>
                )}
              </div>
            )}

            {isFieldVisible('longitude') && (
              <div>
                <label
                  htmlFor="lead-field-longitude"
                  className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
                >
                  Longitude
                  {isFieldRequired('longitude') && <span className="text-rose-400 ml-0.5">*</span>}
                </label>
                <input
                  id="lead-field-longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleFieldChange('longitude', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. 72.8777"
                  className={`w-full h-10 bg-slate-900/60 border rounded-lg px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 ${
                    formErrors.longitude
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                  }`}
                />
                {formErrors.longitude && (
                  <p className="mt-1 text-xs text-rose-400 font-normal">{formErrors.longitude}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 3: DESCRIPTION */}
        {/* ============================================================== */}
        {isFieldVisible('description') && (
          <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>Description</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Initial conversation notes, prospect requirements, or qualification details.
              </p>
            </div>

            <div>
              <label
                htmlFor="lead-field-description"
                className="block text-xs sm:text-[13px] font-medium text-slate-300 mb-1.5"
              >
                Description
                {isFieldRequired('description') && <span className="text-rose-400 ml-0.5">*</span>}
              </label>
              <textarea
                id="lead-field-description"
                rows={4}
                maxLength={5000}
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={isSubmitting}
                placeholder="Add notes about the lead, requirements or initial conversation..."
                className={`w-full bg-slate-900/60 border rounded-lg p-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 resize-y ${
                  formErrors.description
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <span>{formErrors.description ? (
                  <span className="text-rose-400 font-normal">{formErrors.description}</span>
                ) : 'Optional notes for team collaboration'}</span>
                <span>{formData.description.length} / 5,000</span>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STICKY FOOTER ACTIONS */}
        {/* ============================================================== */}
        <div className="sticky bottom-0 z-20 bg-[#080C16]/95 backdrop-blur-md border border-slate-800 rounded-xl py-3.5 px-4 sm:px-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {isDirty ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="text-slate-500">All changes up to date</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
            >
              Cancel
            </button>

            {mode === 'create' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-lg bg-transparent hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Save and New</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{mode === 'create' ? 'Save' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Edit Page Layout Modal for Authorized Admins */}
      <EditPageLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        currentLayout={layoutConfig}
        onLayoutSaved={(newLayout) => setLayoutConfig(newLayout)}
      />
    </div>
  );
};
