'use client';

import { forwardRef } from 'react';
import { medicationsTable, listItems } from './template-utils';
import type { DoctorInfo } from './prescription-template-renderer';
import { DEFAULT_DOCTOR_INFO } from './prescription-template-renderer';
import type { OpdNoteData } from '@/types/clinical-analysis';

interface Props {
	templateId: string;
	opdNoteData?: OpdNoteData;
	doctorInfo?: DoctorInfo;
}

const d = (val: string | undefined, fallback: string) => val || fallback;
const today = () =>
	new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeNow = () =>
	new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

function vitalsGrid(data: OpdNoteData, bgColor: string, borderColor: string, labelColor: string) {
	const v = data.vitalSigns;
	if (!v) return '';
	const cells = [
		{ label: 'BP', val: v.bloodPressure },
		{ label: 'Pulse', val: v.pulse },
		{ label: 'Temp', val: v.temperature },
		{ label: 'RR', val: v.respiratoryRate },
		{ label: 'SpO2', val: v.spO2 },
		{ label: 'Weight', val: v.weight },
		{ label: 'Height', val: v.height },
		{ label: 'BMI', val: v.bmi },
	].filter((c) => c.val);
	if (cells.length === 0) return '';
	return `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
		<tr>${cells.map((c) => `<td style="padding:6px 8px;border:1px solid ${borderColor};background:${bgColor};text-align:center;font-size:10px;">
			<div style="font-weight:700;color:${labelColor};text-transform:uppercase;font-size:9px;letter-spacing:0.3px;">${c.label}</div>
			<div style="font-size:12px;font-weight:600;margin-top:2px;">${c.val}</div>
		</td>`).join('')}</tr>
	</table>`;
}

function vitalsInline(data: OpdNoteData) {
	const v = data.vitalSigns;
	if (!v) return '—';
	const items = [
		v.bloodPressure && `BP: ${v.bloodPressure}`,
		v.pulse && `P: ${v.pulse}`,
		v.temperature && `T: ${v.temperature}`,
		v.respiratoryRate && `RR: ${v.respiratoryRate}`,
		v.spO2 && `SpO2: ${v.spO2}`,
		v.weight && `Wt: ${v.weight}`,
		v.height && `Ht: ${v.height}`,
		v.bmi && `BMI: ${v.bmi}`,
	].filter(Boolean);
	return items.length > 0 ? items.join(' | ') : '—';
}

// ────────────────────────────────────────────────────
// Template 1: SOAP Format
// Standard Subjective–Objective–Assessment–Plan
// ────────────────────────────────────────────────────
function soapTemplate(data: OpdNoteData, doc: DoctorInfo) {
	return `
	<div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;background:#fff;color:#1a1a1a;">
		<!-- Thin clinic bar -->
		<div style="background:#075985;padding:10px 28px;color:#fff;font-size:10px;">
			<table style="width:100%;border-collapse:collapse;color:#fff;">
				<tr>
					<td><b>${doc.clinic}</b> &nbsp; ${doc.address}</td>
					<td style="text-align:right;">${doc.phone} | ${doc.email}</td>
				</tr>
			</table>
		</div>

		<!-- Doctor + OPD banner -->
		<div style="padding:14px 28px;border-bottom:3px solid #0369A1;">
			<table style="width:100%;border-collapse:collapse;">
				<tr>
					<td style="vertical-align:middle;">
						<div style="font-size:17px;font-weight:700;color:#0C4A6E;">${doc.name}</div>
						<div style="font-size:10px;color:#64748B;">${doc.tagline} &nbsp;|&nbsp; ${doc.specialty}</div>
					</td>
					<td style="text-align:right;vertical-align:middle;">
						<div style="display:inline-block;background:#0369A1;color:#fff;padding:5px 16px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:1px;">OPD RECORD</div>
					</td>
				</tr>
			</table>
		</div>

		<!-- Patient demographics row -->
		<table style="width:100%;border-collapse:collapse;font-size:11px;">
			<tr>
				<td style="padding:7px 14px;border-bottom:1px solid #E2E8F0;width:40%;"><b>Patient:</b> ${d(data.patientName, 'N/A')}</td>
				<td style="padding:7px 14px;border-bottom:1px solid #E2E8F0;width:20%;"><b>Age/Sex:</b> ${d(data.age, '—')}/${d(data.sex, '—')}</td>
				<td style="padding:7px 14px;border-bottom:1px solid #E2E8F0;width:20%;"><b>Date:</b> ${d(data.date, today())}</td>
				<td style="padding:7px 14px;border-bottom:1px solid #E2E8F0;width:20%;"><b>Address:</b> ${d(data.address, '—')}</td>
			</tr>
		</table>

		<!-- SOAP Sections -->
		<div style="padding:16px 28px;">

			<!-- S — Subjective -->
			<div style="margin-bottom:18px;">
				<div style="background:#0369A1;color:#fff;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:0.5px;border-radius:3px 3px 0 0;">S — SUBJECTIVE</div>
				<div style="border:1px solid #BAE6FD;border-top:none;padding:10px 12px;font-size:11px;border-radius:0 0 3px 3px;">
					${data.chiefComplaints?.length ? `<div style="margin-bottom:8px;"><b>Chief Complaints:</b> ${data.chiefComplaints.join('; ')}</div>` : ''}
					${data.historyOfPresentIllness ? `<div style="margin-bottom:8px;"><b>History of Present Illness:</b> ${data.historyOfPresentIllness}</div>` : ''}
					${data.medicalHistory?.length ? `<div style="margin-bottom:8px;"><b>Past Medical History:</b> ${data.medicalHistory.join('; ')}</div>` : ''}
					${data.allergies?.length ? `<div><b>Allergies:</b> <span style="color:#DC2626;font-weight:600;">${data.allergies.join(', ')}</span></div>` : ''}
					${!data.chiefComplaints?.length && !data.historyOfPresentIllness && !data.medicalHistory?.length && !data.allergies?.length ? '<span style="color:#94A3B8;">No subjective data recorded</span>' : ''}
				</div>
			</div>

			<!-- O — Objective -->
			<div style="margin-bottom:18px;">
				<div style="background:#0369A1;color:#fff;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:0.5px;border-radius:3px 3px 0 0;">O — OBJECTIVE</div>
				<div style="border:1px solid #BAE6FD;border-top:none;padding:10px 12px;font-size:11px;border-radius:0 0 3px 3px;">
					${vitalsGrid(data, '#F0F9FF', '#BAE6FD', '#075985')}
					${data.physicalExamination ? `<div><b>Physical Examination:</b> ${data.physicalExamination}</div>` : ''}
					${!data.vitalSigns && !data.physicalExamination ? '<span style="color:#94A3B8;">No objective findings recorded</span>' : ''}
				</div>
			</div>

			<!-- A — Assessment -->
			<div style="margin-bottom:18px;">
				<div style="background:#0369A1;color:#fff;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:0.5px;border-radius:3px 3px 0 0;">A — ASSESSMENT</div>
				<div style="border:1px solid #BAE6FD;border-top:none;padding:10px 12px;font-size:11px;border-radius:0 0 3px 3px;">
					${data.diagnosis ? `<div style="margin-bottom:6px;"><b>Diagnosis:</b> ${data.diagnosis}</div>` : ''}
					${data.clinicalSummary ? `<div><b>Clinical Summary:</b> ${data.clinicalSummary}</div>` : ''}
					${!data.diagnosis && !data.clinicalSummary ? '<span style="color:#94A3B8;">—</span>' : ''}
				</div>
			</div>

			<!-- P — Plan -->
			<div style="margin-bottom:18px;">
				<div style="background:#0369A1;color:#fff;padding:5px 12px;font-size:12px;font-weight:700;letter-spacing:0.5px;border-radius:3px 3px 0 0;">P — PLAN</div>
				<div style="border:1px solid #BAE6FD;border-top:none;padding:10px 12px;font-size:11px;border-radius:0 0 3px 3px;">
					${medicationsTable(data.medications, '#F0F9FF', '#075985', '#BAE6FD')}
					${data.investigations?.length ? `<div style="margin-top:10px;"><b>Investigations Ordered:</b> ${data.investigations.join('; ')}</div>` : ''}
					${data.instructions?.length ? `<div style="margin-top:6px;"><b>Patient Instructions:</b> ${data.instructions.join('; ')}</div>` : ''}
					${data.followUp ? `<div style="margin-top:6px;"><b>Follow-up:</b> ${data.followUp}</div>` : ''}
				</div>
			</div>

			<!-- Signature -->
			<div style="margin-top:32px;text-align:right;">
				<div style="border-top:1px solid #94A3B8;display:inline-block;padding-top:6px;min-width:180px;text-align:center;">
					<div style="font-size:11px;font-weight:600;">${doc.name}</div>
					<div style="font-size:9px;color:#64748B;">${doc.tagline}</div>
				</div>
			</div>
		</div>
	</div>`;
}

// ────────────────────────────────────────────────────
// Template 2: Two-Column Record
// History/subjective on left, exam/plan on right
// ────────────────────────────────────────────────────
function twoColumnTemplate(data: OpdNoteData, doc: DoctorInfo) {
	const leftSections = [
		data.chiefComplaints?.length ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Chief Complaints</div><div style="font-size:11px;">${listItems(data.chiefComplaints)}</div></div>` : '',
		data.historyOfPresentIllness ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">History of Present Illness</div><div style="font-size:11px;">${data.historyOfPresentIllness}</div></div>` : '',
		data.medicalHistory?.length ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Past Medical History</div><div style="font-size:11px;">${listItems(data.medicalHistory)}</div></div>` : '',
		data.allergies?.length ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Allergies</div><div style="font-size:11px;color:#DC2626;font-weight:600;">${listItems(data.allergies)}</div></div>` : '',
	].filter(Boolean).join('');

	const rightSections = [
		data.physicalExamination ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Physical Examination</div><div style="font-size:11px;">${data.physicalExamination}</div></div>` : '',
		data.diagnosis ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Diagnosis</div><div style="font-size:11px;">${data.diagnosis}</div></div>` : '',
		data.investigations?.length ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Investigations</div><div style="font-size:11px;">${listItems(data.investigations)}</div></div>` : '',
		data.instructions?.length ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Instructions</div><div style="font-size:11px;">${listItems(data.instructions)}</div></div>` : '',
		data.followUp ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;border-bottom:1px solid #C7D2FE;padding-bottom:3px;">Follow-up</div><div style="font-size:11px;">${data.followUp}</div></div>` : '',
	].filter(Boolean).join('');

	return `
	<div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;background:#fff;color:#1a1a1a;">
		<!-- Header with left accent bar -->
		<div style="display:flex;">
			<div style="width:6px;background:linear-gradient(180deg,#4338CA,#6366F1);"></div>
			<div style="flex:1;padding:16px 24px;">
				<table style="width:100%;border-collapse:collapse;">
					<tr>
						<td>
							<div style="font-size:18px;font-weight:700;color:#312E81;">${doc.name}</div>
							<div style="font-size:10px;color:#6B7280;">${doc.tagline} | ${doc.specialty}</div>
						</td>
						<td style="text-align:right;">
							<div style="font-size:11px;font-weight:600;color:#312E81;">${doc.clinic}</div>
							<div style="font-size:10px;color:#6B7280;">${doc.phone}</div>
						</td>
					</tr>
				</table>
			</div>
		</div>

		<div style="background:#EEF2FF;padding:6px 30px;font-size:11px;font-weight:700;color:#4338CA;text-align:center;letter-spacing:1px;border-top:1px solid #C7D2FE;border-bottom:1px solid #C7D2FE;">OUTPATIENT DEPARTMENT — CONSULTATION RECORD</div>

		<!-- Demographics -->
		<table style="width:100%;border-collapse:collapse;font-size:10px;border-bottom:2px solid #4338CA;">
			<tr>
				<td style="padding:6px 14px;border-right:1px solid #E0E7FF;"><b>Name:</b> ${d(data.patientName, 'N/A')}</td>
				<td style="padding:6px 14px;border-right:1px solid #E0E7FF;"><b>Age/Sex:</b> ${d(data.age, '—')}/${d(data.sex, '—')}</td>
				<td style="padding:6px 14px;border-right:1px solid #E0E7FF;"><b>Date:</b> ${d(data.date, today())}</td>
				<td style="padding:6px 14px;"><b>Address:</b> ${d(data.address, '—')}</td>
			</tr>
		</table>

		<!-- Vitals bar -->
		${data.vitalSigns ? `<div style="padding:8px 30px;background:#F5F3FF;border-bottom:1px solid #DDD6FE;font-size:10px;">
			<b style="color:#4338CA;">VITALS:</b> &nbsp; ${vitalsInline(data)}
		</div>` : ''}

		<!-- Two-column body -->
		<table style="width:100%;border-collapse:collapse;">
			<tr>
				<td style="width:50%;vertical-align:top;padding:16px 20px 16px 30px;border-right:2px solid #E0E7FF;">
					<div style="font-size:10px;font-weight:700;color:#818CF8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">HISTORY &amp; SUBJECTIVE</div>
					${leftSections || '<div style="font-size:11px;color:#94A3B8;">No history recorded</div>'}
				</td>
				<td style="width:50%;vertical-align:top;padding:16px 30px 16px 20px;">
					<div style="font-size:10px;font-weight:700;color:#818CF8;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">EXAMINATION &amp; PLAN</div>
					${rightSections || '<div style="font-size:11px;color:#94A3B8;">No examination recorded</div>'}
				</td>
			</tr>
		</table>

		<!-- Medications — full width -->
		<div style="padding:12px 30px;border-top:2px solid #E0E7FF;">
			<div style="font-size:10px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Treatment Plan</div>
			${medicationsTable(data.medications, '#EEF2FF', '#3730A3', '#C7D2FE')}
		</div>

		<!-- Signature + Footer -->
		<div style="padding:10px 30px 16px;">
			<div style="text-align:right;margin-top:24px;">
				<div style="border-top:1px solid #94A3B8;display:inline-block;padding-top:6px;min-width:180px;text-align:center;">
					<div style="font-size:11px;font-weight:600;">${doc.name}</div>
					<div style="font-size:9px;color:#6B7280;">${doc.specialty}</div>
				</div>
			</div>
		</div>

		<div style="background:#312E81;padding:8px 30px;color:rgba(255,255,255,0.7);font-size:9px;">
			<table style="width:100%;border-collapse:collapse;color:rgba(255,255,255,0.7);">
				<tr>
					<td>${doc.clinic} | ${doc.phone}</td>
					<td style="text-align:right;">${doc.address}</td>
				</tr>
			</table>
		</div>
	</div>`;
}

// ────────────────────────────────────────────────────
// Template 3: Structured Form
// Numbered fields, bordered boxes — government hospital register style
// ────────────────────────────────────────────────────
function structuredFormTemplate(data: OpdNoteData, doc: DoctorInfo) {
	let fieldNum = 0;
	const field = (label: string, value: string, colSpan = 1) => {
		fieldNum++;
		const cs = colSpan > 1 ? ` colspan="${colSpan}"` : '';
		return `<td${cs} style="padding:6px 10px;border:1px solid #A7F3D0;vertical-align:top;font-size:11px;">
			<div style="font-size:9px;font-weight:700;color:#065F46;margin-bottom:2px;">${fieldNum}. ${label}</div>
			<div>${value || '<span style="color:#94A3B8;">—</span>'}</div>
		</td>`;
	};

	return `
	<div style="font-family:'Courier New',Courier,monospace;width:100%;box-sizing:border-box;background:#fff;color:#1a1a1a;">
		<!-- Government-style header -->
		<div style="border:2px solid #047857;margin:0;">
			<div style="background:#047857;padding:10px 20px;color:#fff;text-align:center;">
				<div style="font-size:15px;font-weight:700;letter-spacing:1px;">${doc.clinic}</div>
				<div style="font-size:10px;opacity:0.9;">${doc.address} | Tel: ${doc.phone}</div>
			</div>
			<div style="background:#ECFDF5;padding:6px 20px;text-align:center;border-bottom:2px solid #047857;">
				<span style="font-size:13px;font-weight:700;color:#047857;letter-spacing:2px;">OPD CASE RECORD</span>
			</div>

			<!-- Doctor info row -->
			<table style="width:100%;border-collapse:collapse;font-size:10px;">
				<tr>
					<td style="padding:5px 10px;border:1px solid #A7F3D0;"><b>Attending Physician:</b> ${doc.name}</td>
					<td style="padding:5px 10px;border:1px solid #A7F3D0;"><b>Qualifications:</b> ${doc.tagline}</td>
					<td style="padding:5px 10px;border:1px solid #A7F3D0;"><b>Dept:</b> ${doc.specialty}</td>
				</tr>
			</table>

			<!-- Numbered fields -->
			<table style="width:100%;border-collapse:collapse;">
				<tr>
					${field('Patient Name', d(data.patientName, ''), 2)}
					${field('Date', d(data.date, today()))}
				</tr>
				<tr>
					${field('Age', d(data.age, ''))}
					${field('Sex', d(data.sex, ''))}
					${field('Address', d(data.address, ''))}
				</tr>
				<tr>
					${field('Vital Signs', data.vitalSigns ? vitalsInline(data) : '', 3)}
				</tr>
				<tr>
					${field('Chief Complaints', data.chiefComplaints?.join('; ') || '', 3)}
				</tr>
				<tr>
					${field('History of Present Illness', data.historyOfPresentIllness || '', 3)}
				</tr>
				<tr>
					${field('Past Medical History', data.medicalHistory?.join('; ') || '', 2)}
					${field('Allergies', data.allergies?.length ? `<span style="color:#DC2626;font-weight:700;">${data.allergies.join(', ')}</span>` : '')}
				</tr>
				<tr>
					${field('Physical Examination', data.physicalExamination || '', 3)}
				</tr>
				<tr>
					${field('Diagnosis', d(data.diagnosis, ''), 3)}
				</tr>
			</table>

			<!-- Medications -->
			<div style="padding:8px 10px;border:1px solid #A7F3D0;">
				<div style="font-size:9px;font-weight:700;color:#065F46;margin-bottom:4px;">${++fieldNum}. TREATMENT / MEDICATIONS</div>
				${medicationsTable(data.medications, '#ECFDF5', '#065F46', '#A7F3D0')}
			</div>

			<table style="width:100%;border-collapse:collapse;">
				<tr>
					${field('Investigations Ordered', data.investigations?.join('; ') || '', 3)}
				</tr>
				<tr>
					${field('Instructions to Patient', data.instructions?.join('; ') || '', 2)}
					${field('Follow-up Date', d(data.followUp, ''))}
				</tr>
			</table>

			<!-- Signature box -->
			<table style="width:100%;border-collapse:collapse;">
				<tr>
					<td style="padding:8px 10px;border:1px solid #A7F3D0;width:50%;font-size:10px;">
						<div style="font-size:9px;font-weight:700;color:#065F46;margin-bottom:16px;">CLINICAL SUMMARY</div>
						<div style="font-size:11px;">${data.clinicalSummary || '<span style="color:#94A3B8;">—</span>'}</div>
					</td>
					<td style="padding:8px 10px;border:1px solid #A7F3D0;width:50%;vertical-align:bottom;text-align:center;font-size:10px;">
						<div style="margin-top:30px;border-top:1px solid #333;display:inline-block;padding-top:4px;min-width:160px;">
							<div style="font-weight:600;">${doc.name}</div>
							<div style="font-size:9px;color:#666;">Signature &amp; Stamp</div>
						</div>
					</td>
				</tr>
			</table>
		</div>
	</div>`;
}

// ────────────────────────────────────────────────────
// Template 4: Systems-Based Review
// Organized by body systems for physical examination
// ────────────────────────────────────────────────────
function systemsBasedTemplate(data: OpdNoteData, doc: DoctorInfo) {
	return `
	<div style="font-family:'Segoe UI',Arial,sans-serif;width:100%;box-sizing:border-box;background:#fff;color:#1a1a1a;">
		<!-- Red-accent header -->
		<div style="background:#7F1D1D;padding:14px 28px;color:#fff;">
			<table style="width:100%;border-collapse:collapse;">
				<tr>
					<td>
						<div style="font-size:17px;font-weight:700;">${doc.name}</div>
						<div style="font-size:10px;opacity:0.85;">${doc.tagline}</div>
					</td>
					<td style="text-align:right;">
						<div style="font-size:12px;font-weight:600;">${doc.clinic}</div>
						<div style="font-size:10px;opacity:0.85;">${doc.phone}</div>
					</td>
				</tr>
			</table>
		</div>
		<div style="background:#FEE2E2;padding:5px 28px;font-size:11px;font-weight:700;color:#991B1B;text-align:center;letter-spacing:1px;border-bottom:2px solid #B91C1C;">COMPREHENSIVE OPD ASSESSMENT</div>

		<!-- Patient bar -->
		<div style="padding:8px 28px;background:#FFF5F5;font-size:11px;border-bottom:1px solid #FECACA;">
			<b>Patient:</b> ${d(data.patientName, 'N/A')} &nbsp;&nbsp; <b>Age/Sex:</b> ${d(data.age, '—')}/${d(data.sex, '—')} &nbsp;&nbsp; <b>Date:</b> ${d(data.date, today())} &nbsp;&nbsp; <b>Address:</b> ${d(data.address, '—')}
		</div>

		<div style="padding:14px 28px;">

			<!-- Vitals grid -->
			${vitalsGrid(data, '#FEF2F2', '#FECACA', '#991B1B')}

			<!-- Presenting Complaint + HPI side by side -->
			<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
				<tr>
					<td style="width:35%;vertical-align:top;padding:8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;">
						<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:4px;">Presenting Complaints</div>
						<div style="font-size:11px;">${data.chiefComplaints?.length ? listItems(data.chiefComplaints) : '<span style="color:#94A3B8;">—</span>'}</div>
					</td>
					<td style="width:4%;"></td>
					<td style="width:61%;vertical-align:top;padding:8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:4px;">
						<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:4px;">History of Present Illness</div>
						<div style="font-size:11px;">${data.historyOfPresentIllness || '<span style="color:#94A3B8;">—</span>'}</div>
					</td>
				</tr>
			</table>

			<!-- Past History + Allergies row -->
			<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
				<tr>
					<td style="width:65%;vertical-align:top;padding:8px;border:1px solid #E5E7EB;border-radius:4px;">
						<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:4px;">Past Medical / Surgical History</div>
						<div style="font-size:11px;">${data.medicalHistory?.length ? listItems(data.medicalHistory) : '<span style="color:#94A3B8;">No significant history</span>'}</div>
					</td>
					<td style="width:4%;"></td>
					<td style="width:31%;vertical-align:top;padding:8px;border:2px solid #FCA5A5;border-radius:4px;background:#FFF5F5;">
						<div style="font-size:10px;font-weight:700;color:#DC2626;text-transform:uppercase;margin-bottom:4px;">&#9888; Allergies</div>
						<div style="font-size:11px;color:#B91C1C;font-weight:600;">${data.allergies?.length ? listItems(data.allergies) : '<span style="color:#94A3B8;font-weight:400;">NKDA</span>'}</div>
					</td>
				</tr>
			</table>

			<!-- Physical Examination — full block -->
			<div style="margin-bottom:14px;padding:10px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:4px;">
				<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:6px;">Systemic Examination</div>
				<div style="font-size:11px;">${data.physicalExamination || '<span style="color:#94A3B8;">Not documented</span>'}</div>
			</div>

			<!-- Diagnosis -->
			${data.diagnosis ? `<div style="margin-bottom:14px;padding:8px 10px;background:#FEF2F2;border-left:4px solid #B91C1C;border-radius:0 4px 4px 0;">
				<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:2px;">Assessment / Diagnosis</div>
				<div style="font-size:12px;font-weight:600;">${data.diagnosis}</div>
				${data.clinicalSummary ? `<div style="font-size:11px;color:#6B7280;margin-top:4px;">${data.clinicalSummary}</div>` : ''}
			</div>` : ''}

			<!-- Treatment Plan -->
			<div style="margin-bottom:14px;">
				<div style="font-size:10px;font-weight:700;color:#B91C1C;text-transform:uppercase;margin-bottom:6px;">Treatment Plan</div>
				${medicationsTable(data.medications, '#FEF2F2', '#991B1B', '#FECACA')}
			</div>

			<!-- Investigations + Instructions + Follow-up row -->
			<table style="width:100%;border-collapse:collapse;font-size:11px;">
				<tr>
					<td style="width:33%;vertical-align:top;padding:6px 8px;border:1px solid #E5E7EB;"><b style="color:#B91C1C;">Investigations:</b><br/>${data.investigations?.join('; ') || '—'}</td>
					<td style="width:34%;vertical-align:top;padding:6px 8px;border:1px solid #E5E7EB;"><b style="color:#B91C1C;">Instructions:</b><br/>${data.instructions?.join('; ') || '—'}</td>
					<td style="width:33%;vertical-align:top;padding:6px 8px;border:1px solid #E5E7EB;"><b style="color:#B91C1C;">Follow-up:</b><br/>${d(data.followUp, '—')}</td>
				</tr>
			</table>

			<!-- Signature -->
			<div style="margin-top:32px;text-align:right;">
				<div style="border-top:1px solid #94A3B8;display:inline-block;padding-top:6px;min-width:180px;text-align:center;">
					<div style="font-size:11px;font-weight:600;">${doc.name}</div>
					<div style="font-size:9px;color:#6B7280;">${doc.specialty}</div>
				</div>
			</div>
		</div>

		<div style="background:#7F1D1D;padding:8px 28px;color:rgba(255,255,255,0.7);font-size:9px;">
			<table style="width:100%;border-collapse:collapse;color:rgba(255,255,255,0.7);">
				<tr>
					<td>${doc.phone} | ${doc.email}</td>
					<td style="text-align:right;">${doc.address}</td>
				</tr>
			</table>
		</div>
	</div>`;
}

// ────────────────────────────────────────────────────
// Template 5: Progress Note (EMR-style)
// Running narrative with timestamped entries
// ────────────────────────────────────────────────────
function progressNoteTemplate(data: OpdNoteData, doc: DoctorInfo) {
	const timestamp = `${d(data.date, today())} ${timeNow()}`;
	const entries: string[] = [];

	if (data.chiefComplaints?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — CHIEF COMPLAINT</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.chiefComplaints.join('; ')}</div>
		</div>`);
	}
	if (data.historyOfPresentIllness) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — HPI</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.historyOfPresentIllness}</div>
		</div>`);
	}
	if (data.medicalHistory?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — PAST HISTORY</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.medicalHistory.join('; ')}</div>
		</div>`);
	}
	if (data.allergies?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#DC2626;font-weight:600;">${timestamp} — ALLERGY ALERT</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #FCA5A5;margin-top:3px;color:#B91C1C;font-weight:600;">${data.allergies.join(', ')}</div>
		</div>`);
	}
	if (data.vitalSigns) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — VITALS</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${vitalsInline(data)}</div>
		</div>`);
	}
	if (data.physicalExamination) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — PHYSICAL EXAM</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.physicalExamination}</div>
		</div>`);
	}
	if (data.diagnosis) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — ASSESSMENT</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #C084FC;margin-top:3px;font-weight:600;">${data.diagnosis}${data.clinicalSummary ? `<br/><span style="font-weight:400;color:#6B7280;">${data.clinicalSummary}</span>` : ''}</div>
		</div>`);
	}
	if (data.medications?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — ORDERS / MEDICATIONS</div>
			<div style="padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">
				${medicationsTable(data.medications, '#FAF5FF', '#5B21B6', '#DDD6FE')}
			</div>
		</div>`);
	}
	if (data.investigations?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — INVESTIGATIONS ORDERED</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.investigations.join('; ')}</div>
		</div>`);
	}
	if (data.instructions?.length) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — PATIENT INSTRUCTIONS</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.instructions.join('; ')}</div>
		</div>`);
	}
	if (data.followUp) {
		entries.push(`<div style="margin-bottom:10px;">
			<div style="font-size:9px;color:#7C3AED;font-weight:600;">${timestamp} — FOLLOW-UP</div>
			<div style="font-size:11px;padding-left:12px;border-left:2px solid #DDD6FE;margin-top:3px;">${data.followUp}</div>
		</div>`);
	}

	return `
	<div style="font-family:'SF Mono','Fira Code','Consolas',monospace;width:100%;box-sizing:border-box;background:#FAFAF9;color:#1a1a1a;">
		<!-- EMR-style top bar -->
		<div style="background:#1E1B4B;padding:10px 24px;color:#fff;font-size:10px;">
			<table style="width:100%;border-collapse:collapse;color:#fff;">
				<tr>
					<td>
						<span style="font-weight:700;font-size:12px;">${doc.clinic}</span>
						&nbsp;&nbsp;<span style="opacity:0.6;">|</span>&nbsp;&nbsp;
						<span style="opacity:0.7;">Electronic Health Record — OPD Module</span>
					</td>
					<td style="text-align:right;opacity:0.7;">${doc.phone}</td>
				</tr>
			</table>
		</div>

		<!-- Patient banner -->
		<div style="background:#EDE9FE;padding:10px 24px;border-bottom:2px solid #7C3AED;">
			<table style="width:100%;border-collapse:collapse;font-size:11px;">
				<tr>
					<td style="font-weight:700;font-size:13px;color:#1E1B4B;">${d(data.patientName, 'N/A')}</td>
					<td style="text-align:right;color:#6D28D9;">
						<b>Age:</b> ${d(data.age, '—')} &nbsp; <b>Sex:</b> ${d(data.sex, '—')} &nbsp; <b>Visit:</b> ${d(data.date, today())}
					</td>
				</tr>
				${data.address ? `<tr><td colspan="2" style="font-size:10px;color:#6B7280;padding-top:2px;">${data.address}</td></tr>` : ''}
			</table>
		</div>

		<!-- Encounter header -->
		<div style="padding:12px 24px 6px;">
			<div style="font-size:10px;color:#6D28D9;font-weight:600;border-bottom:1px dashed #DDD6FE;padding-bottom:6px;margin-bottom:12px;">
				ENCOUNTER NOTE &nbsp;&nbsp;|&nbsp;&nbsp; Provider: ${doc.name} (${doc.specialty}) &nbsp;&nbsp;|&nbsp;&nbsp; ${doc.tagline}
			</div>
		</div>

		<!-- Timeline entries -->
		<div style="padding:0 24px 16px;">
			${entries.length > 0 ? entries.join('') : '<div style="font-size:11px;color:#94A3B8;padding:12px 0;">No clinical data recorded for this encounter</div>'}
		</div>

		<!-- Signature -->
		<div style="padding:8px 24px 16px;">
			<div style="border-top:1px dashed #DDD6FE;padding-top:10px;font-size:10px;color:#6B7280;">
				<table style="width:100%;border-collapse:collapse;">
					<tr>
						<td>Electronically signed by <b style="color:#1E1B4B;">${doc.name}</b> — ${doc.specialty}</td>
						<td style="text-align:right;">Signed: ${timestamp}</td>
					</tr>
				</table>
			</div>
		</div>

		<div style="background:#1E1B4B;padding:8px 24px;color:rgba(255,255,255,0.5);font-size:9px;">
			<table style="width:100%;border-collapse:collapse;color:rgba(255,255,255,0.5);">
				<tr>
					<td>${doc.email} | ${doc.website}</td>
					<td style="text-align:right;">${doc.address}</td>
				</tr>
			</table>
		</div>
	</div>`;
}

export const opdTemplateRenderers: Record<string, (data: OpdNoteData, doc: DoctorInfo) => string> = {
	soap: soapTemplate,
	'two-column': twoColumnTemplate,
	'structured-form': structuredFormTemplate,
	'systems-based': systemsBasedTemplate,
	'progress-note': progressNoteTemplate,
};

const OpdTemplateRenderer = forwardRef<HTMLDivElement, Props>(
	({ templateId, opdNoteData, doctorInfo }, ref) => {
		const render = opdTemplateRenderers[templateId] || soapTemplate;
		const data: OpdNoteData = opdNoteData || {};
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

OpdTemplateRenderer.displayName = 'OpdTemplateRenderer';

export default OpdTemplateRenderer;
