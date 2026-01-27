// Sistema de eventos global para sincronização de dados entre componentes
// Permite que qualquer componente notifique outros sobre mudanças de dados

type EventCallback = () => void;

class DataEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Retorna função de cleanup
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string) {
    console.log(`[DataEvents] Emitting: ${event}`);
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error(`[DataEvents] Error in callback for ${event}:`, error);
      }
    });
  }

  // Emite múltiplos eventos de uma vez
  emitMultiple(events: string[]) {
    events.forEach((event) => this.emit(event));
  }
}

// Singleton global
export const dataEvents = new DataEventEmitter();

// Tipos de eventos disponíveis
export const DATA_EVENTS = {
  LEADS_UPDATED: "leads:updated",
  APPOINTMENTS_UPDATED: "appointments:updated",
  CONTRACTS_UPDATED: "contracts:updated",
  DEBTORS_UPDATED: "debtors:updated",
  FIXED_COSTS_UPDATED: "fixed-costs:updated",
  ALL_DATA_UPDATED: "all:updated",
} as const;

// Helper para emitir evento de atualização de dados
export function emitDataUpdate(type: keyof typeof DATA_EVENTS) {
  dataEvents.emit(DATA_EVENTS[type]);
}

// Helper para emitir atualização geral (quando não sabe o tipo específico)
export function emitAllDataUpdate() {
  Object.values(DATA_EVENTS).forEach((event) => {
    dataEvents.emit(event);
  });
}
