import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  PlusCircle,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Building,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  DollarSign,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { SearchableSelect, SelectOption } from './components/SearchableSelect';
import { LeadImageUpload } from './components/LeadImageUpload';
import {
  EditPageLayoutModal,
  LayoutConfig,
  LayoutSectionConfig,
  LayoutFieldConfig,
} from './components/EditPageLayoutModal';

interface LeadFormPageProps {
  mode: 'create' | 'edit';
}

const LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'CAMPAIGN', label: 'Marketing Campaign' },
  { value: 'LINKEDIN', label: 'LinkedIn Inbound' },
  { value: 'API', label: 'API / Ingestion' },
  { value: 'EVENT', label: 'Conference / Event' },
  { value: 'OTHER', label: 'Other' },
];

const LEAD_STATUS_OPTIONS: SelectOption[] = [
  { value: 'NEW', label: 'New', badge: 'NEW', badgeColor: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'CONTACTED', label: 'Contacted', badge: 'OUTREACH', badgeColor: 'bg-blue-500/20 text-blue-300' },
  { value: 'QUALIFIED', label: 'Qualified', badge: 'SQL', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'UNQUALIFIED', label: 'Unqualified', badge: 'NURTURE', badgeColor: 'bg-slate-700 text-slate-300' },
  { value: 'CONVERTED', label: 'Converted', badge: 'WON', badgeColor: 'bg-purple-500/20 text-purple-300' },
];

const LEAD_RATING_OPTIONS: SelectOption[] = [
  { value: 'HOT', label: 'Hot', badge: '🔥 HOT', badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
  { value: 'WARM', label: 'Warm', badge: '⚡ WARM', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  { value: 'COLD', label: 'Cold', badge: '❄️ COLD', badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
];

const INDUSTRY_OPTIONS: SelectOption[] = [
  { value: 'Technology', label: 'Technology / SaaS / IT' },
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
  { value: 'India', label: 'India', sublabel: 'IN (+91)' },
  { value: 'United States', label: 'United States', sublabel: 'US (+1)' },
  { value: 'United Kingdom', label: 'United Kingdom', sublabel: 'UK (+44)' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates', sublabel: 'UAE (+971)' },
  { value: 'Singapore', label: 'Singapore', sublabel: 'SG (+65)' },
  { value: 'Canada', label: 'Canada', sublabel: 'CA (+1)' },
  { value: 'Australia', label: 'Australia', sublabel: 'AU (+61)' },
  { value: 'Germany', label: 'Germany', sublabel: 'DE (+49)' },
  { value: 'France', label: 'France', sublabel: 'FR (+33)' },
  { value: 'Japan', label: 'Japan', sublabel: 'JP (+81)' },
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
        { id: 'description', label: 'Description Notes & Initial Conversation Details', visible: true, required: false, order: 1, isSystemRequired: false },
      ],
    },
  ],
};

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
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
            setBannerMessage({ type: 'error', text: 'Lead record not found or access denied.' });
          }
        } catch (err: any) {
          setBannerMessage({ type: 'error', text: err.message || 'Failed to load lead details.' });
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

    // 1. Mandatory core checks
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (formData.secondaryEmail.trim() && !emailRegex.test(formData.secondaryEmail.trim())) {
      errors.secondaryEmail = 'Please enter a valid secondary email address';
    }

    // 3. Coordinate validation
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

    // 4. Numeric fields validation
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

    // 5. Layout-configured required fields validation
    layoutConfig.sections.forEach((sec) => {
      if (sec.visible) {
        sec.fields.forEach((field) => {
          if (field.visible && field.required) {
            const val = (formData as any)[field.id];
            if (val === undefined || val === null || String(val).trim() === '') {
              if (!errors[field.id]) {
                errors[field.id] = `${field.label} is marked as required by organization policy`;
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
      setBannerMessage({
        type: 'error',
        text: 'Please correct the highlighted fields before saving.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setBannerMessage(null);

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
            setBannerMessage({
              type: 'success',
              text: `Lead "${res.data.firstName} ${res.data.lastName}" created successfully! Form reset for next entry.`,
            });
            // Reset form but preserve owner preference
            setFormData({
              ...initialFormValues,
              ownerId: formData.ownerId || user?.id || '',
            });
            setIsDirty(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            navigate(`/leads/${res.data.id}`, {
              state: { notification: 'Lead created successfully with AI intelligence scoring.' },
            });
          }
        }
      } else {
        // Edit mode
        const res = await apiClient.patch(`/leads/${id}`, payload);
        if (res.success && res.data) {
          navigate(`/leads/${id}`, {
            state: { notification: 'Lead profile updated successfully.' },
          });
        }
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.message || 'Failed to save lead record. Please check the inputs.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Handler
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
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center font-mono text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-3" />
        <span>Loading lead profile parameters...</span>
      </div>
    );
  }

  // Format INR helper for revenue display
  const formatInrHelper = (val: string | number) => {
    if (!val || isNaN(Number(val))) return '';
    const num = Number(val);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Crore`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakh`;
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {mode === 'edit' ? 'Lead Profile' : 'Leads'}</span>
        </button>

        {canEditLayout && (
          <button
            type="button"
            onClick={() => setIsLayoutModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            title="Configure layout fields, ordering, and required rules"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Page Layout</span>
          </button>
        )}
      </div>

      {/* Page Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {mode === 'create' ? 'Create Lead' : `Edit Lead: ${formData.firstName} ${formData.lastName}`}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                {mode === 'create' ? 'Ingestion' : 'Modification'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'create'
                ? 'Capture buyer inquiry, assign organization owner, configure address details, and initiate AI qualification.'
                : 'Modify contact details, qualification rating, address coordinates, and audit trail records.'}
            </p>
          </div>

          {/* Action Buttons Top Bar */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>

            {mode === 'create' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Save and New</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{mode === 'create' ? 'Save Lead' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lead Profile Image Upload Banner */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <LeadImageUpload
            value={formData.avatarUrl}
            onChange={(url) => handleFieldChange('avatarUrl', url)}
            firstName={formData.firstName}
            lastName={formData.lastName}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs transition ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {bannerMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="flex-1 font-medium">{bannerMessage.text}</div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Form Body dynamically structured by Layout Config */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-6">
        {layoutConfig.sections
          .filter((section) => section.visible)
          .map((section) => (
            <div
              key={section.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-glow-cyan" />
                  <span>{section.title}</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-mono">
                  Section #{section.order}
                </span>
              </div>

              {/* Dynamic Field Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {section.fields
                  .filter((field) => field.visible)
                  .map((field) => {
                    const isFullWidth = field.id === 'description';
                    const hasError = formErrors[field.id];

                    return (
                      <div
                        key={field.id}
                        className={`space-y-1.5 ${isFullWidth ? 'md:col-span-2' : ''}`}
                      >
                        {/* Field Label */}
                        <label
                          htmlFor={`lead-field-${field.id}`}
                          className="text-xs font-semibold text-slate-300 flex items-center justify-between"
                        >
                          <span className="flex items-center space-x-1">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-rose-400 font-bold" title="Required field">*</span>
                            )}
                          </span>

                          {field.id === 'annualRevenue' && formData.annualRevenue && (
                            <span className="text-[10px] font-mono text-cyan-400">
                              {formatInrHelper(formData.annualRevenue)}
                            </span>
                          )}
                        </label>

                        {/* Render Field Input based on ID */}
                        {(() => {
                          // 1. Lead Owner Searchable Dropdown
                          if (field.id === 'ownerId') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={teamMembers}
                                value={formData.ownerId}
                                onChange={(val) => handleFieldChange('ownerId', val)}
                                placeholder="Select assigned Lead Owner..."
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 2. Lead Source Dropdown
                          if (field.id === 'source') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={LEAD_SOURCE_OPTIONS}
                                value={formData.source}
                                onChange={(val) => handleFieldChange('source', val)}
                                placeholder="Select Lead Source..."
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 3. Lead Status Dropdown
                          if (field.id === 'status') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={LEAD_STATUS_OPTIONS}
                                value={formData.status}
                                onChange={(val) => handleFieldChange('status', val)}
                                placeholder="Select Status..."
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 4. Industry Dropdown
                          if (field.id === 'industry') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={INDUSTRY_OPTIONS}
                                value={formData.industry}
                                onChange={(val) => handleFieldChange('industry', val)}
                                placeholder="Select Industry..."
                                allowCustom={true}
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 5. Rating Dropdown
                          if (field.id === 'rating') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={LEAD_RATING_OPTIONS}
                                value={formData.rating}
                                onChange={(val) => handleFieldChange('rating', val)}
                                placeholder="Select Rating..."
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 6. Country Dropdown
                          if (field.id === 'country') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={COUNTRY_OPTIONS}
                                value={formData.country}
                                onChange={(val) => handleFieldChange('country', val)}
                                placeholder="Select Country..."
                                allowCustom={true}
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 7. State Dropdown
                          if (field.id === 'state') {
                            return (
                              <SearchableSelect
                                id={`lead-field-${field.id}`}
                                options={INDIAN_STATES}
                                value={formData.state}
                                onChange={(val) => handleFieldChange('state', val)}
                                placeholder="Select State or Province..."
                                allowCustom={true}
                                disabled={isSubmitting}
                                error={hasError}
                              />
                            );
                          }

                          // 8. Email Opt Out Checkbox
                          if (field.id === 'emailOptOut') {
                            return (
                              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
                                <input
                                  id={`lead-field-${field.id}`}
                                  type="checkbox"
                                  checked={formData.emailOptOut}
                                  onChange={(e) => handleFieldChange('emailOptOut', e.target.checked)}
                                  disabled={isSubmitting}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-400 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                />
                                <div>
                                  <label
                                    htmlFor={`lead-field-${field.id}`}
                                    className="text-xs font-semibold text-slate-200 cursor-pointer flex items-center space-x-1.5"
                                  >
                                    <span>Email Opt Out</span>
                                    {formData.emailOptOut && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                                        RESTRICTED
                                      </span>
                                    )}
                                  </label>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    When checked, marketing campaign emails will be strictly suppressed for this lead in compliance with privacy regulations.
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          // 9. Multiline Description Field
                          if (field.id === 'description') {
                            return (
                              <div>
                                <textarea
                                  id={`lead-field-${field.id}`}
                                  rows={4}
                                  maxLength={5000}
                                  value={formData.description}
                                  onChange={(e) => handleFieldChange('description', e.target.value)}
                                  disabled={isSubmitting}
                                  placeholder="Enter lead requirements, conversation notes, initial pain points, budget remarks, or meeting details..."
                                  className={`w-full bg-slate-900/90 border rounded-lg p-3 text-xs text-slate-100 outline-none transition resize-y ${
                                    hasError
                                      ? 'border-rose-500 focus:border-rose-500'
                                      : 'border-slate-800 focus:border-cyan-400'
                                  }`}
                                />
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                                  <span>Server validated. Maximum 5,000 characters.</span>
                                  <span>{formData.description.length} / 5000</span>
                                </div>
                                {hasError && <p className="text-[11px] text-rose-400 mt-1">{hasError}</p>}
                              </div>
                            );
                          }

                          // 10. Annual Revenue Currency Input
                          if (field.id === 'annualRevenue') {
                            return (
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-cyan-400">
                                  ₹
                                </span>
                                <input
                                  id={`lead-field-${field.id}`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={formData.annualRevenue}
                                  onChange={(e) => handleFieldChange('annualRevenue', e.target.value)}
                                  disabled={isSubmitting}
                                  placeholder="e.g. 50000000"
                                  className={`w-full bg-slate-900/90 border rounded-lg pl-7 pr-3 py-2 text-xs text-slate-100 outline-none transition font-mono ${
                                    hasError
                                      ? 'border-rose-500 focus:border-rose-500'
                                      : 'border-slate-800 focus:border-cyan-400'
                                  }`}
                                />
                                {hasError && <p className="text-[11px] text-rose-400 mt-1">{hasError}</p>}
                              </div>
                            );
                          }

                          // 11. Generic Text / Number / Email / Phone Inputs
                          const inputType =
                            field.id === 'email' || field.id === 'secondaryEmail'
                              ? 'email'
                              : field.id === 'phone' || field.id === 'mobile' || field.id === 'fax'
                              ? 'tel'
                              : field.id === 'numberOfEmployees' || field.id === 'latitude' || field.id === 'longitude'
                              ? 'number'
                              : field.id === 'website'
                              ? 'url'
                              : 'text';

                          return (
                            <div>
                              <input
                                id={`lead-field-${field.id}`}
                                type={inputType}
                                value={(formData as any)[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                disabled={isSubmitting}
                                step={field.id === 'latitude' || field.id === 'longitude' ? 'any' : undefined}
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                className={`w-full bg-slate-900/90 border rounded-lg px-3 py-2 text-xs text-slate-100 outline-none transition ${
                                  hasError
                                    ? 'border-rose-500 focus:border-rose-500'
                                    : 'border-slate-800 focus:border-cyan-400'
                                }`}
                              />
                              {hasError && <p className="text-[11px] text-rose-400 mt-1">{hasError}</p>}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

        {/* Bottom Action Bar */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Database persistence: Multi-tenant isolated in PostgreSQL</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>

            {mode === 'create' && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Save and New</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-glow-cyan transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Lead...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{mode === 'create' ? 'Save Lead' : 'Save Changes'}</span>
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
