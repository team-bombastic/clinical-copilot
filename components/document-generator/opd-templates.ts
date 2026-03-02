export interface OpdTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailColor: string;
  accentColor: string;
}

export const OPD_TEMPLATES: OpdTemplate[] = [
  {
    id: 'soap',
    name: 'SOAP Format',
    description: 'Standard Subjective–Objective–Assessment–Plan clinical layout',
    thumbnailColor: '#0369A1',
    accentColor: '#075985',
  },
  {
    id: 'two-column',
    name: 'Two-Column',
    description: 'Split layout: history on left, examination and plan on right',
    thumbnailColor: '#4338CA',
    accentColor: '#3730A3',
  },
  {
    id: 'structured-form',
    name: 'Structured Form',
    description: 'Numbered fields with bordered boxes, hospital OPD register style',
    thumbnailColor: '#047857',
    accentColor: '#065F46',
  },
  {
    id: 'systems-based',
    name: 'Systems Review',
    description: 'Body-systems organized examination with review-of-systems grid',
    thumbnailColor: '#B91C1C',
    accentColor: '#991B1B',
  },
  {
    id: 'progress-note',
    name: 'Progress Note',
    description: 'EMR-style running narrative with timestamped entries',
    thumbnailColor: '#6D28D9',
    accentColor: '#5B21B6',
  },
];
