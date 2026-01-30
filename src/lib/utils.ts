import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza telefone para comparação (últimos 11 dígitos apenas)
 * Remove caracteres não numéricos e pega os últimos 11 dígitos
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-11);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function getWhatsAppLink(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/55${cleaned}`;
}

// ============================================
// TIMEZONE: BRT (America/Sao_Paulo, UTC-3)
// ============================================

/**
 * Cria um Date a partir de data + horário interpretados como BRT (UTC-3).
 * Evita problemas de DST do navegador ao usar offset explícito.
 */
export function createDateBRT(selectedDate: Date, hours: number, minutes: number): Date {
  const year = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const h = String(hours).padStart(2, "0");
  const min = String(minutes).padStart(2, "0");
  return new Date(`${year}-${m}-${d}T${h}:${min}:00-03:00`);
}

/**
 * Converte uma Date (UTC) para uma Date "fake" cujos campos locais
 * correspondem ao horário de Brasília. Permite usar date-fns format()
 * sem depender do fuso do navegador.
 */
export function toBRT(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";

  return new Date(
    +get("year"),
    +get("month") - 1,
    +get("day"),
    +get("hour") === 24 ? 0 : +get("hour"),
    +get("minute"),
    +get("second")
  );
}
