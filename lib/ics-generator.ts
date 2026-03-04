// Gerador de arquivos ICS para integração com Google Calendar e Apple Calendar

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  url?: string;
  reminder?: number; // minutos antes
}

// Formata data para formato ICS (YYYYMMDDTHHMMSSZ)
function formatDateICS(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return date.toISOString().replace(/[-:]/g, '').split('T')[0];
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Escapa caracteres especiais para ICS
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Gera UID único para o evento
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@defoco.com.br`;
}

// Gera conteúdo do arquivo ICS
export function generateICSContent(event: CalendarEvent): string {
  const uid = generateUID();
  const now = new Date();
  const endDate = event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000); // Default 1h

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Defoco//Gestão de Propostas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateICS(now)}`,
  ];

  if (event.allDay) {
    icsContent.push(`DTSTART;VALUE=DATE:${formatDateICS(event.startDate, true)}`);
    icsContent.push(`DTEND;VALUE=DATE:${formatDateICS(endDate, true)}`);
  } else {
    icsContent.push(`DTSTART:${formatDateICS(event.startDate)}`);
    icsContent.push(`DTEND:${formatDateICS(endDate)}`);
  }

  icsContent.push(`SUMMARY:${escapeICS(event.title)}`);

  if (event.description) {
    icsContent.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  if (event.location) {
    icsContent.push(`LOCATION:${escapeICS(event.location)}`);
  }

  if (event.url) {
    icsContent.push(`URL:${event.url}`);
  }

  // Adiciona lembrete
  if (event.reminder) {
    icsContent.push('BEGIN:VALARM');
    icsContent.push('ACTION:DISPLAY');
    icsContent.push(`DESCRIPTION:${escapeICS(event.title)}`);
    icsContent.push(`TRIGGER:-PT${event.reminder}M`);
    icsContent.push('END:VALARM');
  }

  icsContent.push('END:VEVENT');
  icsContent.push('END:VCALENDAR');

  return icsContent.join('\r\n');
}

// Gera URL para Google Calendar
export function generateGoogleCalendarURL(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams();

  params.append('text', event.title);

  // Formatação de data para Google Calendar
  const formatGoogleDate = (date: Date, allDay: boolean = false): string => {
    if (allDay) {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    }
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const endDate = event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000);
  const dates = `${formatGoogleDate(event.startDate, event.allDay)}/${formatGoogleDate(endDate, event.allDay)}`;
  params.append('dates', dates);

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `${baseUrl}&${params.toString()}`;
}

// Tipos de eventos predefinidos para a aplicação
export type EventType = 'job_deadline' | 'proposal_expiry' | 'installment_due' | 'meeting' | 'absence';

export interface CreateEventOptions {
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  description?: string;
  clientName?: string;
  value?: number;
  url?: string;
}

// Cria evento formatado baseado no tipo
export function createCalendarEvent(options: CreateEventOptions): CalendarEvent {
  const { type, title, date, endDate, description, clientName, value, url } = options;

  let formattedTitle = title;
  let formattedDescription = description || '';
  let reminder = 60; // 1 hora padrão
  let allDay = false;

  switch (type) {
    case 'job_deadline':
      formattedTitle = `📋 Prazo: ${title}`;
      if (clientName) formattedDescription += `\nCliente: ${clientName}`;
      reminder = 1440; // 1 dia antes
      break;

    case 'proposal_expiry':
      formattedTitle = `📄 Proposta Expira: ${title}`;
      if (clientName) formattedDescription += `\nCliente: ${clientName}`;
      if (value) formattedDescription += `\nValor: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      reminder = 1440; // 1 dia antes
      allDay = true;
      break;

    case 'installment_due':
      formattedTitle = `💰 Parcela: ${title}`;
      if (clientName) formattedDescription += `\nCliente: ${clientName}`;
      if (value) formattedDescription += `\nValor: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      reminder = 2880; // 2 dias antes
      allDay = true;
      break;

    case 'meeting':
      formattedTitle = `🤝 Reunião: ${title}`;
      if (clientName) formattedDescription += `\nCom: ${clientName}`;
      reminder = 30; // 30 minutos antes
      break;

    case 'absence':
      formattedTitle = `🏖️ ${title}`;
      allDay = true;
      reminder = 1440; // 1 dia antes
      break;
  }

  return {
    title: formattedTitle,
    description: formattedDescription.trim(),
    startDate: date,
    endDate: endDate,
    allDay,
    reminder,
    url,
  };
}
