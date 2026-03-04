'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CalendarEvent,
  generateICSContent,
  generateGoogleCalendarURL,
  createCalendarEvent,
  EventType,
} from '@/lib/ics-generator';

interface CalendarButtonsProps {
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  description?: string;
  clientName?: string;
  value?: number;
  url?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function CalendarButtons({
  type,
  title,
  date,
  endDate,
  description,
  clientName,
  value,
  url,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: CalendarButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const event = createCalendarEvent({
    type,
    title,
    date,
    endDate,
    description,
    clientName,
    value,
    url,
  });

  const handleGoogleCalendar = () => {
    const googleUrl = generateGoogleCalendarURL(event);
    window.open(googleUrl, '_blank');
    setIsOpen(false);
  };

  const handleAppleCalendar = () => {
    const icsContent = generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setIsOpen(false);
  };

  const handleDownloadICS = () => {
    handleAppleCalendar(); // Mesmo processo
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Calendar className="h-4 w-4" />
          {showLabel && 'Calendário'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Adicionar ao Google Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAppleCalendar} className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          <span>Adicionar ao Apple Calendar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS} className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          <span>Baixar arquivo .ics</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente simplificado para uso em listas
export function QuickCalendarButton({
  type,
  title,
  date,
  clientName,
  value,
}: {
  type: EventType;
  title: string;
  date: Date;
  clientName?: string;
  value?: number;
}) {
  return (
    <CalendarButtons
      type={type}
      title={title}
      date={date}
      clientName={clientName}
      value={value}
      variant="ghost"
      size="icon"
      showLabel={false}
    />
  );
}
