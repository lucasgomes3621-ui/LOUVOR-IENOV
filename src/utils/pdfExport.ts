import { jsPDF } from 'jspdf';
import { Schedule, Ministry, Setlist } from '../types/database';

export interface ScheduleTableRow {
  role: string;
  name: string;
}

export interface PDFExportOptions {
  rehearsalNote?: string;
  includeSetlist?: boolean;
}

/**
 * Removes emojis and characters outside Latin-1 that cause jsPDF Helvetica to throw encoding errors.
 */
export function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, '')
    .trim();
}

// Format date into standard Brazilian format: DD/MM/AAAA
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Format service title to match church official template: "QUARTA (23/09/26)" or "DOMINGO (27/09/26)"
export function formatServiceHeaderTitle(service?: { date?: string; title?: string }): string {
  if (!service?.date) {
    return cleanPdfText((service?.title || 'CULTO').toUpperCase());
  }
  const [y, m, d] = service.date.split('-');
  const shortYear = y ? y.slice(-2) : '26';
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const weekdays = [
    'DOMINGO',
    'SEGUNDA',
    'TERÇA',
    'QUARTA',
    'QUINTA',
    'SEXTA',
    'SÁBADO'
  ];
  const dayOfWeek = weekdays[dateObj.getDay()] || 'CULTO';
  return `${dayOfWeek} (${d}/${m}/${shortYear})`;
}

/**
 * Builds the exact row structure seen in the church's official sheet:
 * MINISTRAÇÃO
 * BACK VOCAL (one or more)
 * VIOLÃO / VIOLÃO/VOZ
 * BAIXO
 * GUITARRA
 * BATERIA
 * TECLADO
 * SONOPLASTIA
 * (and any other assigned role)
 */
export function buildScheduleTableRows(
  schedule: Schedule,
  includeEmptyStandardSlots: boolean = true
): ScheduleTableRow[] {
  const members = schedule?.members || [];
  const rows: ScheduleTableRow[] = [];

  const getCleanName = (m: any): string => {
    if (!m) return '';
    const raw = m?.member?.profile?.full_name || m?.profile?.full_name || '';
    return cleanPdfText(raw.trim().toUpperCase());
  };

  // 1. MINISTRAÇÃO
  const ministracaoMember =
    members.find((m) =>
      m.role?.name?.toLowerCase().includes('ministra') ||
      m.role_id === 'role-ministracao' ||
      m.ministry_member_id === schedule.repertoire_responsible_id
    ) ||
    (schedule.repertoire_responsible_id
      ? members.find((m) => m.ministry_member_id === schedule.repertoire_responsible_id)
      : undefined);

  if (ministracaoMember) {
    rows.push({
      role: 'MINISTRAÇÃO',
      name: getCleanName(ministracaoMember)
    });
  } else if (schedule.repertoire_responsible?.profile?.full_name) {
    rows.push({
      role: 'MINISTRAÇÃO',
      name: cleanPdfText(schedule.repertoire_responsible.profile.full_name.toUpperCase())
    });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'MINISTRAÇÃO', name: '' });
  }

  // 2. BACK VOCAL (multiple members can be in vocal)
  const vocalMembers = members.filter((m) => {
    if (m === ministracaoMember) return false;
    const rName = (m.role?.name || '').toLowerCase();
    return rName.includes('vocal') || (rName.includes('voz') && !rName.includes('viol'));
  });

  if (vocalMembers.length > 0) {
    vocalMembers.forEach((vm) => {
      rows.push({
        role: 'BACK VOCAL',
        name: getCleanName(vm)
      });
    });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'BACK VOCAL', name: '' });
  }

  // 3. VIOLÃO / VIOLÃO/VOZ
  const violaoMembers = members.filter((m) => {
    if (m === ministracaoMember) return false;
    const rName = (m.role?.name || '').toLowerCase();
    return rName.includes('viol');
  });

  if (violaoMembers.length > 0) {
    violaoMembers.forEach((vm) => {
      const rName = (vm.role?.name || '').toLowerCase();
      const roleLabel = rName.includes('voz') ? 'VIOLÃO/VOZ' : 'VIOLÃO';
      rows.push({ role: roleLabel, name: getCleanName(vm) });
    });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'VIOLÃO', name: '' });
  }

  // 4. BAIXO
  const baixoMember = members.find((m) => {
    if (m === ministracaoMember) return false;
    return (m.role?.name || '').toLowerCase().includes('baixo');
  });
  if (baixoMember) {
    rows.push({ role: 'BAIXO', name: getCleanName(baixoMember) });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'BAIXO', name: '' });
  }

  // 5. GUITARRA
  const guitarraMember = members.find((m) => {
    if (m === ministracaoMember) return false;
    return (m.role?.name || '').toLowerCase().includes('guit');
  });
  if (guitarraMember) {
    rows.push({ role: 'GUITARRA', name: getCleanName(guitarraMember) });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'GUITARRA', name: '' });
  }

  // 6. BATERIA
  const bateriaMember = members.find((m) => {
    if (m === ministracaoMember) return false;
    return (m.role?.name || '').toLowerCase().includes('bat');
  });
  if (bateriaMember) {
    rows.push({ role: 'BATERIA', name: getCleanName(bateriaMember) });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'BATERIA', name: '' });
  }

  // 7. TECLADO
  const tecladoMember = members.find((m) => {
    if (m === ministracaoMember) return false;
    return (m.role?.name || '').toLowerCase().includes('tecl');
  });
  if (tecladoMember) {
    rows.push({ role: 'TECLADO', name: getCleanName(tecladoMember) });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'TECLADO', name: '' });
  }

  // 8. SONOPLASTIA
  const sonoplastiaMember = members.find((m) => {
    if (m === ministracaoMember) return false;
    const rName = (m.role?.name || '').toLowerCase();
    return rName.includes('sono') || rName.includes('som') || rName.includes('audio');
  });
  if (sonoplastiaMember) {
    rows.push({ role: 'SONOPLASTIA', name: getCleanName(sonoplastiaMember) });
  } else if (includeEmptyStandardSlots) {
    rows.push({ role: 'SONOPLASTIA', name: '' });
  }

  // 9. Other members assigned
  const handledIds = new Set(
    [
      ministracaoMember,
      ...vocalMembers,
      ...violaoMembers,
      baixoMember,
      guitarraMember,
      bateriaMember,
      tecladoMember,
      sonoplastiaMember
    ]
      .filter(Boolean)
      .map((m: any) => m.id)
  );

  members.forEach((m) => {
    if (!handledIds.has(m.id)) {
      const cleanRole = cleanPdfText(m.role?.name || 'EQUIPE').toUpperCase();
      rows.push({
        role: cleanRole,
        name: getCleanName(m)
      });
    }
  });

  return rows;
}

/**
 * Adjust font size so text does not overflow the cell width.
 */
function fitTextInCell(doc: jsPDF, text: string, maxWidth: number, maxFontSize = 10.5, minFontSize = 7.5): number {
  let size = maxFontSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minFontSize) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

/**
 * Draws a single service table block with the exact styling of the church's PDF.
 */
function drawServiceTableBlock(
  doc: jsPDF,
  schedule: Schedule,
  startY: number,
  options?: { rehearsalNote?: string }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const service = schedule.service;
  const serviceTitle = formatServiceHeaderTitle(service);

  let currentY = startY;

  // Day Title (e.g. "QUARTA (23/09/26)")
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(0, 0, 0);
  doc.text(serviceTitle, pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;

  // Table Configuration
  const tableWidth = 118; // mm
  const col1Width = 46; // Função
  const col2Width = 72; // Integrante
  const startX = (pageWidth - tableWidth) / 2;
  const col1CenterX = startX + col1Width / 2;
  const col2CenterX = startX + col1Width + col2Width / 2;
  const rowHeight = 6.8;

  const rows = buildScheduleTableRows(schedule);

  // Borders and text
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.22);
  doc.setFont('helvetica', 'bold');

  rows.forEach((row, i) => {
    const rowY = currentY + i * rowHeight;

    // Draw row cell boxes (Left & Right)
    doc.rect(startX, rowY, col1Width, rowHeight);
    doc.rect(startX + col1Width, rowY, col2Width, rowHeight);

    // Text in Left Cell (Role)
    doc.setTextColor(0, 0, 0);
    const roleSize = fitTextInCell(doc, row.role, col1Width - 4, 10.5, 7.5);
    doc.text(row.role, col1CenterX, rowY + 4.8, { align: 'center' });

    // Text in Right Cell (Name)
    if (row.name) {
      fitTextInCell(doc, row.name, col2Width - 4, 10.5, 7.5);
      doc.text(row.name, col2CenterX, rowY + 4.8, { align: 'center' });
    }
  });

  currentY += rows.length * rowHeight;

  // Rehearsal note / Observation under table (e.g. "ENSAIO QUINTA FEIRA" or custom leader observation)
  const noteRaw = options?.rehearsalNote !== undefined
    ? options.rehearsalNote
    : (schedule.notes || service?.notes || '');

  const noteClean = cleanPdfText(noteRaw);

  if (noteClean && noteClean.length > 0) {
    currentY += 5.5;
    const noteUpper = noteClean.toUpperCase();

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 132, 199); // Brand Blue

    // Split text into multiple lines if needed (max 130mm width)
    const maxNoteWidth = 130;
    const lines = doc.splitTextToSize(noteUpper, maxNoteWidth);
    const fontSize = lines.length > 1 ? 10 : 11;
    doc.setFontSize(fontSize);

    lines.forEach((line: string, lineIdx: number) => {
      const lineY = currentY + lineIdx * 5.2;
      doc.text(line, pageWidth / 2, lineY, { align: 'center' });

      // Draw underline under the line
      const textWidth = doc.getTextWidth(line);
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - textWidth / 2, lineY + 0.8, pageWidth / 2 + textWidth / 2, lineY + 0.8);
    });

    currentY += (lines.length - 1) * 5.2 + 3;
  }

  return currentY;
}

/**
 * Draws the clean Setlist / Songs table (if present or requested)
 */
function drawSongsTableBlock(doc: jsPDF, setlist: Setlist, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const songs = setlist.songs || [];
  if (songs.length === 0) return startY;

  let currentY = startY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('REPERTÓRIO DE LOUVORES', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4;

  const tableWidth = 118;
  const col1Width = 14; // #
  const col2Width = 84; // Música
  const col3Width = 20; // Tom
  const startX = (pageWidth - tableWidth) / 2;
  const rowHeight = 6.4;

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);

  songs.forEach((s, idx) => {
    const rowY = currentY + idx * rowHeight;

    doc.rect(startX, rowY, col1Width, rowHeight);
    doc.rect(startX + col1Width, rowY, col2Width, rowHeight);
    doc.rect(startX + col1Width + col2Width, rowY, col3Width, rowHeight);

    doc.setTextColor(0, 0, 0);
    doc.text(`${idx + 1}º`, startX + col1Width / 2, rowY + 4.5, { align: 'center' });

    const rawTitle = `${s.song?.title || 'Louvor'} - ${s.song?.artist || ''}`;
    const cleanTitle = cleanPdfText(rawTitle);
    const displayTitle = cleanTitle.length > 34 ? cleanTitle.slice(0, 32) + '...' : cleanTitle;
    doc.text(displayTitle.toUpperCase(), startX + col1Width + 3, rowY + 4.5);

    const key = cleanPdfText(s.key_override || s.song?.original_key || '-');
    doc.text(key, startX + col1Width + col2Width + col3Width / 2, rowY + 4.5, { align: 'center' });
  });

  return currentY + songs.length * rowHeight;
}

/**
 * 1. Export SINGLE schedule to PDF (Escala de Culto / Dia)
 * Replicates the exact style of the church's official attachment.
 */
export function generateSingleSchedulePDF(
  schedule: Schedule,
  ministry?: Ministry,
  setlist?: Setlist,
  options?: PDFExportOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header: "ESCALA DE LOUVOR"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('ESCALA DE LOUVOR', pageWidth / 2, 28, { align: 'center' });

  // Draw Service Table
  const defaultRehearsal = options?.rehearsalNote !== undefined
    ? options.rehearsalNote
    : schedule?.notes || schedule?.service?.notes || '';

  const endY = drawServiceTableBlock(doc, schedule, 38, {
    rehearsalNote: defaultRehearsal
  });

  // Optional: If setlist has songs and user wants songs included
  if (options?.includeSetlist && setlist && setlist.songs && setlist.songs.length > 0) {
    drawSongsTableBlock(doc, setlist, endY);
  }

  return doc;
}

/**
 * 2. Export WEEKLY schedules to PDF (Escala Semanal)
 * Page 1: "ESCALA DE LOUVOR", then Service 1 & Service 2.
 * Page 2: Service 3 + Observation/Rehearsal note.
 */
export function generateWeeklySchedulesPDF(
  schedules: Schedule[],
  ministry?: Ministry,
  getSetlistFn?: (serviceId: string) => Setlist | undefined,
  options?: PDFExportOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Sort chronologically
  const sorted = [...(schedules || [])].sort((a, b) => {
    return (a.service?.date || '').localeCompare(b.service?.date || '');
  });

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('ESCALA DE LOUVOR', pageWidth / 2, 35, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma escala agendada para este período.', pageWidth / 2, 55, { align: 'center' });
    return doc;
  }

  // Page 1: Header "ESCALA DE LOUVOR"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('ESCALA DE LOUVOR', pageWidth / 2, 28, { align: 'center' });

  let currentY = 38;
  let servicesOnCurrentPage = 0;

  sorted.forEach((sch, idx) => {
    // Two services per page, matching the template
    if (servicesOnCurrentPage >= 2) {
      doc.addPage();
      currentY = 28;
      servicesOnCurrentPage = 0;
    }

    const isSunday = sch.service?.date ? new Date(sch.service.date).getDay() === 0 : false;
    const isCeia = sch.service?.title?.toLowerCase().includes('ceia') || false;
    const schNote = sch.notes || sch.service?.notes;
    const rehearsal =
      options?.rehearsalNote !== undefined
        ? options.rehearsalNote
        : schNote
        ? schNote
        : (isSunday || isCeia)
        ? 'ENSAIO QUINTA FEIRA'
        : undefined;

    const nextY = drawServiceTableBlock(doc, sch, currentY, {
      rehearsalNote: rehearsal
    });

    currentY = nextY + 12;
    servicesOnCurrentPage++;
  });

  return doc;
}

/**
 * 3. Export MONTHLY schedules to PDF (Escala Mensal)
 * Formats all services in the month using the exact clean table layout.
 */
export function generateMonthlySchedulesPDF(
  schedules: Schedule[],
  ministry?: Ministry,
  monthLabel?: string,
  getSetlistFn?: (serviceId: string) => Setlist | undefined,
  options?: PDFExportOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  const sorted = [...(schedules || [])].sort((a, b) => {
    return (a.service?.date || '').localeCompare(b.service?.date || '');
  });

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('ESCALA DE LOUVOR', pageWidth / 2, 35, { align: 'center' });
    if (monthLabel) {
      doc.setFontSize(13);
      doc.text(cleanPdfText(monthLabel.toUpperCase()), pageWidth / 2, 45, { align: 'center' });
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma escala encontrada para este mês.', pageWidth / 2, 60, { align: 'center' });
    return doc;
  }

  // Header on Page 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  const mainHeader = monthLabel
    ? `ESCALA DE LOUVOR — ${cleanPdfText(monthLabel.toUpperCase())}`
    : 'ESCALA DE LOUVOR';
  doc.text(mainHeader, pageWidth / 2, 28, { align: 'center' });

  let currentY = 38;
  let servicesOnCurrentPage = 0;

  sorted.forEach((sch) => {
    if (servicesOnCurrentPage >= 2) {
      doc.addPage();
      currentY = 28;
      servicesOnCurrentPage = 0;
    }

    const isSunday = sch.service?.date ? new Date(sch.service.date).getDay() === 0 : false;
    const isCeia = sch.service?.title?.toLowerCase().includes('ceia') || false;
    const schNote = sch.notes || sch.service?.notes;
    const rehearsal =
      options?.rehearsalNote !== undefined
        ? options.rehearsalNote
        : schNote
        ? schNote
        : (isSunday || isCeia)
        ? 'ENSAIO QUINTA FEIRA'
        : undefined;

    const nextY = drawServiceTableBlock(doc, sch, currentY, {
      rehearsalNote: rehearsal
    });

    currentY = nextY + 12;
    servicesOnCurrentPage++;
  });

  return doc;
}

/**
 * Checks if running on a mobile browser.
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Direct file downloader for Desktop and Mobile.
 * Uses robust Blob URL anchor dispatch, avoiding conflicting duplicate triggers.
 */
export function downloadSchedulePDF(
  doc: jsPDF,
  fileName: string
): { success: boolean; blobUrl: string } {
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const cleanName = safeFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  let blob: Blob | null = null;
  let blobUrl = '';

  try {
    blob = doc.output('blob');
    blobUrl = URL.createObjectURL(blob);
  } catch (e) {
    console.warn('doc.output(blob) failed, attempting arraybuffer:', e);
    try {
      const buffer = doc.output('arraybuffer');
      blob = new Blob([buffer], { type: 'application/pdf' });
      blobUrl = URL.createObjectURL(blob);
    } catch (e2) {
      console.warn('Blob generation failed:', e2);
    }
  }

  // 1. Check legacy msSaveOrOpenBlob (Internet Explorer / Legacy Edge)
  if (blob && typeof (window.navigator as any)?.msSaveOrOpenBlob === 'function') {
    try {
      (window.navigator as any).msSaveOrOpenBlob(blob, cleanName);
      return { success: true, blobUrl };
    } catch (msErr) {
      console.warn('msSaveOrOpenBlob failed:', msErr);
    }
  }

  // 2. Primary HTML5 programmatic download via Blob URL
  if (blobUrl) {
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanName;
      link.setAttribute('download', cleanName);
      link.rel = 'noopener noreferrer';

      // Keep element accessible in DOM layout tree (avoid display: none which can be ignored by browser)
      link.style.position = 'fixed';
      link.style.top = '-9999px';
      link.style.left = '-9999px';
      link.style.opacity = '0';
      link.style.pointerEvents = 'none';

      document.body.appendChild(link);

      // Trigger standard click
      link.click();

      // Clean up DOM after delay
      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        } catch (err) {}
      }, 5000);

      return { success: true, blobUrl };
    } catch (anchorErr) {
      console.warn('Anchor programmatic click failed, attempting doc.save fallback:', anchorErr);
    }
  }

  // 3. Fallback to doc.save() ONLY if anchor failed
  try {
    doc.save(cleanName);
    return { success: true, blobUrl };
  } catch (saveErr) {
    console.warn('doc.save() failed, trying data URI fallback:', saveErr);
  }

  // 4. Data URI fallback as last resort
  try {
    const dataUri = doc.output('datauristring');
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1000);
    return { success: true, blobUrl };
  } catch (dataErr) {
    console.error('All PDF download methods failed:', dataErr);
  }

  return { success: false, blobUrl };
}

/**
 * Universal Share/Download helper:
 * On Desktop: Always downloads directly to the computer.
 * On Mobile: Can use Web Share API for native WhatsApp/files sharing, or falls back to direct download.
 */
export async function downloadOrShareSchedulePDF(
  doc: jsPDF,
  fileName: string,
  shareTitle: string,
  shareText: string,
  forceDownload: boolean = false
): Promise<{ shared: boolean; downloaded: boolean; blobUrl?: string; error?: string }> {
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const cleanName = safeFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // If download explicitly requested, or if on desktop, ALWAYS execute direct download!
  if (forceDownload || !isMobileBrowser()) {
    const res = downloadSchedulePDF(doc, cleanName);
    return { shared: false, downloaded: res.success, blobUrl: res.blobUrl };
  }

  // On Mobile devices, when sharing is requested:
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const file = new File([blob], cleanName, { type: 'application/pdf' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText
        });
        return { shared: true, downloaded: false, blobUrl };
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return { shared: false, downloaded: false, blobUrl };
        }
        // Fall through to download if share failed
      }
    }

    const res = downloadSchedulePDF(doc, cleanName);
    return { shared: false, downloaded: res.success, blobUrl: res.blobUrl };
  } catch (err: any) {
    console.error('downloadOrShareSchedulePDF error:', err);
    const res = downloadSchedulePDF(doc, cleanName);
    return { shared: false, downloaded: res.success, blobUrl: res.blobUrl, error: err?.message };
  }
}
