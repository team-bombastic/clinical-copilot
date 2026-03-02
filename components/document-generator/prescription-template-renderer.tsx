'use client';

import { forwardRef } from 'react';
import { medicationsTable, listItems } from './template-utils';

interface PrescriptionData {
	patientName?: string;
	age?: string;
	sex?: string;
	date?: string;
	address?: string;
	chiefComplaints?: string[];
	diagnosis?: string;
	medications?: Array<{
		name: string;
		dosage: string;
		frequency: string;
		duration: string;
		instructions?: string;
	}>;
	investigations?: string[];
	instructions?: string[];
	followUp?: string;
}

export interface DoctorInfo {
	name: string;
	specialty: string;
	tagline: string;
	clinic: string;
	phone: string;
	email: string;
	website: string;
	address: string;
}

export const DEFAULT_DOCTOR_INFO: DoctorInfo = {
	name: 'Dr. XXXXX',
	specialty: 'General Medicine',
	tagline: 'MBBS, MD — Reg. No. XXXXX',
	clinic: 'XXXXX Hospital & Clinic',
	phone: '+XX XXX XXX XXXX',
	email: 'doctor@xxxxx.com',
	website: 'www.xxxxx.com',
	address: 'XXXXX, City, State — XXXXXX',
};

interface Props {
	templateId: string;
	prescriptionData?: PrescriptionData;
	doctorInfo?: DoctorInfo;
}

const d = (val: string | undefined, fallback: string) => val || fallback;
const today = () =>
	new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Template: Classic ───
function classicTemplate(data: PrescriptionData, doc: DoctorInfo) {
	return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;padding:0;background:#fff;color:#1a1a1a;">
      <div style="background:linear-gradient(135deg,#2563EB,#3B82F6);padding:24px 32px;color:#fff;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">${doc.name}</div>
              <div style="font-size:12px;opacity:0.9;margin-top:2px;">${doc.tagline}</div>
              <div style="font-size:12px;opacity:0.85;margin-top:1px;">${doc.specialty}</div>
            </td>
            <td style="vertical-align:top;text-align:right;">
              <div style="font-size:14px;font-weight:600;">${doc.clinic}</div>
              <div style="font-size:11px;opacity:0.85;margin-top:2px;">${doc.phone}</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:14px 32px;background:#F0F4FF;font-size:12px;border-bottom:1px solid #DBEAFE;">
        <b>Patient:</b> ${d(data.patientName, 'N/A')} &nbsp;&nbsp; <b>Age/Sex:</b> ${d(data.age, '—')} / ${d(data.sex, '—')} &nbsp;&nbsp; <b>Date:</b> ${d(data.date, today())} &nbsp;&nbsp; <b>Address:</b> ${d(data.address, '—')}
      </div>

      <div style="padding:20px 32px;">
        ${data.chiefComplaints?.length ? `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">Chief Complaints</div><div style="font-size:12px;">${listItems(data.chiefComplaints)}</div></div>` : ''}
        ${data.diagnosis ? `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">Diagnosis</div><div style="font-size:12px;">${data.diagnosis}</div></div>` : ''}
        <div style="margin-bottom:14px;">
          <div style="font-size:13px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">℞ Medications</div>
          ${medicationsTable(data.medications, '#EFF6FF', '#1E40AF', '#DBEAFE')}
        </div>
        ${data.investigations?.length ? `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">Investigations</div><div style="font-size:12px;">${listItems(data.investigations)}</div></div>` : ''}
        ${data.instructions?.length ? `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">Instructions</div><div style="font-size:12px;">${listItems(data.instructions)}</div></div>` : ''}
        ${data.followUp ? `<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;color:#2563EB;text-transform:uppercase;margin-bottom:4px;">Follow-up</div><div style="font-size:12px;">${data.followUp}</div></div>` : ''}
        <div style="margin-top:48px;text-align:right;">
          <div style="border-top:1px solid #ccc;display:inline-block;padding-top:6px;min-width:200px;text-align:center;">
            <div style="font-size:12px;font-weight:600;">${doc.name}</div>
            <div style="font-size:10px;color:#666;">${doc.specialty}</div>
          </div>
        </div>
      </div>

      <div style="background:#2563EB;padding:12px 32px;color:#fff;font-size:10px;">
        <table style="width:100%;border-collapse:collapse;color:#fff;">
          <tr>
            <td>${doc.phone} | ${doc.email}</td>
            <td style="text-align:right;">${doc.address}</td>
          </tr>
        </table>
      </div>
    </div>`;
}

// ─── Template: Modern Minimal ───
function modernMinimalTemplate(data: PrescriptionData, doc: DoctorInfo) {
	return `
    <div style="font-family:'Inter','Helvetica Neue',Arial,sans-serif;width:100%;box-sizing:border-box;padding:36px 40px;background:#fff;color:#1a1a1a;">
      <table style="width:100%;border-collapse:collapse;padding-bottom:16px;">
        <tr>
          <td style="vertical-align:top;border-bottom:1px solid #E5E7EB;padding-bottom:16px;">
            <div style="font-size:20px;font-weight:700;color:#111;">${doc.name}</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px;">${doc.tagline}</div>
            <div style="font-size:11px;color:#6B7280;">${doc.specialty}</div>
          </td>
          <td style="vertical-align:top;text-align:right;border-bottom:1px solid #E5E7EB;padding-bottom:16px;font-size:11px;color:#6B7280;">
            <div style="font-weight:600;color:#111;font-size:12px;">${doc.clinic}</div>
            <div>${doc.phone}</div>
            <div>${doc.email}</div>
          </td>
        </tr>
      </table>

      <div style="padding:14px 0;font-size:12px;color:#374151;border-bottom:1px solid #F3F4F6;">
        <b>Patient:</b> ${d(data.patientName, 'N/A')} &nbsp;&nbsp; <b>Age/Sex:</b> ${d(data.age, '—')} / ${d(data.sex, '—')} &nbsp;&nbsp; <b>Date:</b> ${d(data.date, today())} &nbsp;&nbsp; <b>Address:</b> ${d(data.address, '—')}
      </div>

      <div style="padding-top:18px;">
        ${data.chiefComplaints?.length ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Chief Complaints</div><div style="font-size:12px;color:#374151;">${listItems(data.chiefComplaints)}</div></div>` : ''}
        ${data.diagnosis ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Diagnosis</div><div style="font-size:12px;color:#374151;">${data.diagnosis}</div></div>` : ''}
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">℞ Medications</div>
          ${medicationsTable(data.medications, '#F9FAFB', '#374151', '#E5E7EB')}
        </div>
        ${data.investigations?.length ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Investigations</div><div style="font-size:12px;color:#374151;">${listItems(data.investigations)}</div></div>` : ''}
        ${data.instructions?.length ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Instructions</div><div style="font-size:12px;color:#374151;">${listItems(data.instructions)}</div></div>` : ''}
        ${data.followUp ? `<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Follow-up</div><div style="font-size:12px;color:#374151;">${data.followUp}</div></div>` : ''}
        <div style="margin-top:48px;text-align:right;">
          <div style="border-top:1px solid #E5E7EB;display:inline-block;padding-top:8px;min-width:180px;text-align:center;">
            <div style="font-size:12px;font-weight:600;">${doc.name}</div>
            <div style="font-size:10px;color:#9CA3AF;">${doc.specialty}</div>
          </div>
        </div>
      </div>

      <div style="padding-top:12px;border-top:1px solid #E5E7EB;font-size:10px;color:#9CA3AF;">
        <table style="width:100%;border-collapse:collapse;color:#9CA3AF;">
          <tr>
            <td>${doc.phone} | ${doc.email}</td>
            <td style="text-align:right;">${doc.address}</td>
          </tr>
        </table>
      </div>
    </div>`;
}

// ─── Template: Clinical ───
function clinicalTemplate(data: PrescriptionData, doc: DoctorInfo) {
	return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;padding:0;background:#fff;color:#1a1a1a;">
      <div style="background:#047857;padding:16px 32px;color:#fff;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:18px;font-weight:700;">${doc.clinic}</div>
              <div style="font-size:11px;opacity:0.9;margin-top:1px;">${doc.address}</div>
            </td>
            <td style="vertical-align:top;text-align:right;">
              <div style="font-size:14px;font-weight:600;">${doc.name}</div>
              <div style="font-size:10px;opacity:0.9;">${doc.tagline}</div>
            </td>
          </tr>
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <tr>
          <td style="padding:8px 16px;border:1px solid #D1FAE5;background:#ECFDF5;width:50%;"><b>Patient Name:</b> ${d(data.patientName, 'N/A')}</td>
          <td style="padding:8px 16px;border:1px solid #D1FAE5;background:#ECFDF5;width:25%;"><b>Age/Sex:</b> ${d(data.age, '—')} / ${d(data.sex, '—')}</td>
          <td style="padding:8px 16px;border:1px solid #D1FAE5;background:#ECFDF5;width:25%;"><b>Date:</b> ${d(data.date, today())}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:8px 16px;border:1px solid #D1FAE5;"><b>Address:</b> ${d(data.address, '—')}</td>
          <td style="padding:8px 16px;border:1px solid #D1FAE5;"><b>Insurance:</b> —</td>
        </tr>
      </table>

      <div style="padding:16px 32px;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">
          <tr>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;width:30%;vertical-align:top;background:#F9FAFB;"><b>Chief Complaints</b></td>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;">${data.chiefComplaints?.join(', ') || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;background:#F9FAFB;"><b>Diagnosis</b></td>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;">${d(data.diagnosis, '—')}</td>
          </tr>
        </table>
        <div style="font-size:12px;font-weight:700;color:#047857;margin-bottom:4px;">℞ Medications</div>
        ${medicationsTable(data.medications, '#ECFDF5', '#065F46', '#D1FAE5')}
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
          <tr>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;width:30%;vertical-align:top;background:#F9FAFB;"><b>Investigations</b></td>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;">${data.investigations?.join(', ') || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;background:#F9FAFB;"><b>Instructions</b></td>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;">${data.instructions?.join(', ') || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;background:#F9FAFB;"><b>Follow-up</b></td>
            <td style="padding:8px 10px;border:1px solid #E5E7EB;">${d(data.followUp, '—')}</td>
          </tr>
        </table>
        <div style="margin-top:40px;text-align:right;">
          <div style="border-top:1px solid #ccc;display:inline-block;padding-top:6px;min-width:180px;text-align:center;">
            <div style="font-size:11px;font-weight:600;">${doc.name}</div>
            <div style="font-size:9px;color:#666;">${doc.tagline}</div>
          </div>
        </div>
      </div>

      <div style="background:#047857;padding:10px 32px;color:#fff;font-size:9px;">
        <table style="width:100%;border-collapse:collapse;color:#fff;">
          <tr>
            <td>Tel: ${doc.phone} | Email: ${doc.email}</td>
            <td style="text-align:right;">Web: ${doc.website}</td>
          </tr>
        </table>
      </div>
    </div>`;
}

// ─── Template: Compact ───
function compactTemplate(data: PrescriptionData, doc: DoctorInfo) {
	return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;padding:24px 32px;background:#fff;color:#1a1a1a;font-size:11px;">
      <table style="width:100%;border-collapse:collapse;padding-bottom:10px;">
        <tr>
          <td style="vertical-align:top;border-bottom:2px solid #7C3AED;padding-bottom:10px;">
            <div style="font-size:16px;font-weight:700;color:#7C3AED;">${doc.name}</div>
            <div style="font-size:10px;color:#666;">${doc.tagline} | ${doc.specialty}</div>
          </td>
          <td style="vertical-align:top;text-align:right;border-bottom:2px solid #7C3AED;padding-bottom:10px;font-size:10px;color:#666;">
            <div style="font-weight:600;color:#333;">${doc.clinic}</div>
            <div>${doc.phone}</div>
          </td>
        </tr>
      </table>

      <div style="padding:10px 0;font-size:11px;border-bottom:1px solid #EDE9FE;">
        <b>Patient:</b> ${d(data.patientName, 'N/A')} &nbsp;|&nbsp; <b>Age/Sex:</b> ${d(data.age, '—')}/${d(data.sex, '—')} &nbsp;|&nbsp; <b>Date:</b> ${d(data.date, today())} &nbsp;|&nbsp; <b>Addr:</b> ${d(data.address, '—')}
      </div>

      <div style="padding-top:12px;">
        ${data.chiefComplaints?.length ? `<div style="margin-bottom:8px;"><b style="color:#7C3AED;">C/C:</b> ${data.chiefComplaints.join('; ')}</div>` : ''}
        ${data.diagnosis ? `<div style="margin-bottom:8px;"><b style="color:#7C3AED;">Dx:</b> ${data.diagnosis}</div>` : ''}
        <div style="margin-bottom:8px;">
          <b style="color:#7C3AED;">℞ Medications</b>
          ${medicationsTable(data.medications, '#F5F3FF', '#5B21B6', '#EDE9FE')}
        </div>
        ${data.investigations?.length ? `<div style="margin-bottom:6px;"><b style="color:#7C3AED;">Ix:</b> ${data.investigations.join('; ')}</div>` : ''}
        ${data.instructions?.length ? `<div style="margin-bottom:6px;"><b style="color:#7C3AED;">Advice:</b> ${data.instructions.join('; ')}</div>` : ''}
        ${data.followUp ? `<div style="margin-bottom:6px;"><b style="color:#7C3AED;">F/U:</b> ${data.followUp}</div>` : ''}
        <div style="margin-top:36px;text-align:right;">
          <div style="border-top:1px solid #ccc;display:inline-block;padding-top:4px;min-width:160px;text-align:center;">
            <div style="font-size:11px;font-weight:600;">${doc.name}</div>
          </div>
        </div>
      </div>

      <div style="padding-top:8px;border-top:1px solid #EDE9FE;font-size:9px;color:#999;">
        <table style="width:100%;border-collapse:collapse;color:#999;">
          <tr>
            <td>${doc.phone} | ${doc.email}</td>
            <td style="text-align:right;">${doc.address}</td>
          </tr>
        </table>
      </div>
    </div>`;
}

// ─── Template: Elegant ───
function elegantTemplate(data: PrescriptionData, doc: DoctorInfo) {
	return `
    <div style="font-family:Georgia,'Times New Roman',serif;width:100%;box-sizing:border-box;padding:0;background:#fff;color:#1a1a1a;">
      <div style="padding:28px 36px 18px;border-bottom:3px double #92400E;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#78350F;letter-spacing:1px;">${doc.name}</div>
        <div style="font-size:11px;color:#92400E;margin-top:4px;letter-spacing:0.5px;">${doc.tagline}</div>
        <div style="font-size:11px;color:#A16207;margin-top:2px;">${doc.specialty} — ${doc.clinic}</div>
      </div>

      <div style="padding:14px 36px;font-size:12px;border-bottom:1px solid #FDE68A;background:#FFFBEB;">
        <b>Patient:</b> ${d(data.patientName, 'N/A')} &nbsp;&nbsp; <b>Age/Sex:</b> ${d(data.age, '—')} / ${d(data.sex, '—')} &nbsp;&nbsp; <b>Date:</b> ${d(data.date, today())} &nbsp;&nbsp; <b>Address:</b> ${d(data.address, '—')}
      </div>

      <div style="padding:22px 36px;">
        ${data.chiefComplaints?.length ? `<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">Chief Complaints</div><div style="font-size:12px;">${listItems(data.chiefComplaints)}</div></div>` : ''}
        ${data.diagnosis ? `<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">Diagnosis</div><div style="font-size:12px;">${data.diagnosis}</div></div>` : ''}
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">℞ Medications</div>
          ${medicationsTable(data.medications, '#FFFBEB', '#78350F', '#FDE68A')}
        </div>
        ${data.investigations?.length ? `<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">Investigations</div><div style="font-size:12px;">${listItems(data.investigations)}</div></div>` : ''}
        ${data.instructions?.length ? `<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">Instructions</div><div style="font-size:12px;">${listItems(data.instructions)}</div></div>` : ''}
        ${data.followUp ? `<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;color:#92400E;border-bottom:1px solid #FDE68A;padding-bottom:3px;margin-bottom:6px;">Follow-up</div><div style="font-size:12px;">${data.followUp}</div></div>` : ''}
        <div style="margin-top:48px;text-align:right;">
          <div style="border-top:1px solid #D97706;display:inline-block;padding-top:6px;min-width:200px;text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#78350F;">${doc.name}</div>
            <div style="font-size:10px;color:#92400E;">${doc.specialty}</div>
          </div>
        </div>
      </div>

      <div style="background:#78350F;padding:12px 36px;color:#FDE68A;font-size:10px;">
        <table style="width:100%;border-collapse:collapse;color:#FDE68A;">
          <tr>
            <td>${doc.phone} | ${doc.email} | ${doc.website}</td>
            <td style="text-align:right;">${doc.address}</td>
          </tr>
        </table>
      </div>
    </div>`;
}

const templateRenderers: Record<string, (data: PrescriptionData, doc: DoctorInfo) => string> = {
	classic: classicTemplate,
	'modern-minimal': modernMinimalTemplate,
	clinical: clinicalTemplate,
	compact: compactTemplate,
	elegant: elegantTemplate,
};

const PrescriptionTemplateRenderer = forwardRef<HTMLDivElement, Props>(
	({ templateId, prescriptionData, doctorInfo }, ref) => {
		const render = templateRenderers[templateId] || classicTemplate;
		const data: PrescriptionData = prescriptionData || {};
		const doc = doctorInfo || DEFAULT_DOCTOR_INFO;

		return (
			<div
				ref={ref}
				style={{ position: 'absolute', left: '-9999px', top: 0 }}
				dangerouslySetInnerHTML={{ __html: render(data, doc) }}
			/>
		);
	}
);

PrescriptionTemplateRenderer.displayName = 'PrescriptionTemplateRenderer';

export default PrescriptionTemplateRenderer;
export { templateRenderers };
