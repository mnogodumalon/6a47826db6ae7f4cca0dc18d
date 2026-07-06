// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Werkzeuguebersicht {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    lagerort?: string;
    zustand?: LookupValue;
    kaufpreis?: number;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    seriennummer?: string;
    bemerkungen?: string;
    bild?: string;
  };
}

export const APP_IDS = {
  WERKZEUGUEBERSICHT: '6a478262711e1dc1b4b5e141',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'werkzeuguebersicht': {
    kategorie: [{ key: "handwerkzeug", label: "Handwerkzeug" }, { key: "elektrowerkzeug", label: "Elektrowerkzeug" }, { key: "messwerkzeug", label: "Messwerkzeug" }, { key: "schneidwerkzeug", label: "Schneidwerkzeug" }, { key: "spanwerkzeug", label: "Spanwerkzeug" }, { key: "montagewerkzeug", label: "Montagewerkzeug" }, { key: "sonstiges", label: "Sonstiges" }],
    zustand: [{ key: "neu", label: "Neu" }, { key: "gut", label: "Gut" }, { key: "gebraucht", label: "Gebraucht" }, { key: "defekt", label: "Defekt" }, { key: "in_reparatur", label: "In Reparatur" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'werkzeuguebersicht': {
    'name': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'lagerort': 'string/text',
    'zustand': 'lookup/select',
    'kaufpreis': 'number',
    'kaufdatum': 'date/date',
    'seriennummer': 'string/text',
    'bemerkungen': 'string/textarea',
    'bild': 'file',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateWerkzeuguebersicht = StripLookup<Werkzeuguebersicht['fields']>;