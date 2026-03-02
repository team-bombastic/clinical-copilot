// Shared helper functions for prescription and OPD template renderers

interface MedicationRow {
	name: string;
	dosage: string;
	frequency: string;
	duration: string;
	instructions?: string;
}

export function medicationsTable(
	meds: MedicationRow[] | undefined,
	headerBg: string,
	headerColor: string,
	borderColor: string
) {
	if (!meds || meds.length === 0)
		return '<p style="color:#888;font-style:italic;">No medications prescribed</p>';
	return `
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      <thead>
        <tr style="background:${headerBg};color:${headerColor};">
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">#</th>
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">Medication</th>
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">Dosage</th>
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">Frequency</th>
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">Duration</th>
          <th style="padding:6px 8px;text-align:left;border:1px solid ${borderColor};font-size:11px;">Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${meds
			.map(
				(m, i) => `
          <tr>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;">${i + 1}</td>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;font-weight:500;">${m.name}</td>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;">${m.dosage}</td>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;">${m.frequency}</td>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;">${m.duration}</td>
            <td style="padding:5px 8px;border:1px solid ${borderColor};font-size:11px;">${m.instructions || '—'}</td>
          </tr>`
			)
			.join('')}
      </tbody>
    </table>`;
}

export function listItems(items: string[] | undefined) {
	if (!items || items.length === 0) return '<span style="color:#888;">—</span>';
	return items.map((item) => `<span style="display:block;">• ${item}</span>`).join('');
}
