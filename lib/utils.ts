import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export interface Installment {
  number: number;
  dueDate: Date;
  amount: number;
}

export function calculateInstallments(
  total: number,
  installments: number,
  installmentDay: number
): Installment[] {
  if (!installments || installments <= 0) return [];
  
  const installmentAmount = total / installments;
  const result: Installment[] = [];
  const today = new Date();
  
  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(today.getFullYear(), today.getMonth() + i + 1, installmentDay);
    
    // Adjust if the day doesn't exist in the month (e.g., February 31)
    if (dueDate.getDate() !== installmentDay) {
      // Go to the last day of the month
      dueDate.setDate(0);
    }
    
    result.push({
      number: i + 1,
      dueDate,
      amount: installmentAmount
    });
  }
  
  return result;
}

export function generatePersuasiveText(
  total: number,
  subtotal: number,
  discountValue: number | null,
  discountPercent: number | null
): string {
  const savedAmount = discountValue || 0;
  const savedPercent = discountPercent || 0;
  
  if (savedAmount <= 0 && savedPercent <= 0) {
    return `Estamos entusiasmados em apresentar esta proposta exclusiva que demonstra o valor excepcional que agregamos ao seu projeto. Nossa equipe está comprometida em entregar resultados que superem suas expectativas, com a qualidade e excelência que a sua empresa merece. O retorno é garantido através da nossa dedicação em transformar sua visão em realidade.`;
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  return `Esta é uma oportunidade única de negócio de valor inestimável. Estamos oferecendo um desconto especial de ${savedPercent > 0 ? `${savedPercent}%` : formatCurrency(savedAmount)}, representando uma economia de ${formatCurrency(savedAmount)} sobre o valor original de ${formatCurrency(subtotal)}. Este investimento de ${formatCurrency(total)} representa não apenas uma economia significativa, mas também a garantia de retorno através da nossa expertise e compromisso com a excelência. Esta oferta reflete nosso desejo genuíno de estabelecer uma parceria duradoura e bem-sucedida com sua empresa.`;
}