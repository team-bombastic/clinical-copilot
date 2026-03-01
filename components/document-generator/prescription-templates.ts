export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailColor: string;
  accentColor: string;
}

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean blue header with stethoscope accent, traditional medical layout',
    thumbnailColor: '#3B82F6',
    accentColor: '#2563EB',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Monochrome sans-serif design with generous whitespace',
    thumbnailColor: '#64748B',
    accentColor: '#475569',
  },
  {
    id: 'clinical',
    name: 'Clinical',
    description: 'Dense table-heavy layout optimized for hospitals and clinics',
    thumbnailColor: '#059669',
    accentColor: '#047857',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Single-column smaller font, fits more data per page',
    thumbnailColor: '#7C3AED',
    accentColor: '#6D28D9',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Serif fonts with gold and dark accents, formal letterhead style',
    thumbnailColor: '#B45309',
    accentColor: '#92400E',
  },
];
