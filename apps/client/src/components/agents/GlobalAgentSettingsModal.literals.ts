import type { SupportedLocale } from "@/lib/types";

export const literals = {
  en: {
    title: "Global Agent Settings",
    subtitle: "Configure the root Spaces context",
    factoryNameLabel: "Display Name",
    factoryNamePlaceholder: "e.g. Spaces / Antigravity",
    factorySystemPromptLabel: "Global System Prompt / Persona",
    factorySystemPromptPlaceholder: "Instructions appended to all root sessions...",
    cancel: "Cancel",
    save: "Save Changes",
    saving: "Saving...",
    loadError: "Failed to load global settings",
    saveError: "Failed to save global settings",
  },
  es: {
    title: "Ajustes del Agente Global",
    subtitle: "Configura el contexto raíz de la Spaces",
    factoryNameLabel: "Nombre a mostrar",
    factoryNamePlaceholder: "ej. Spaces / Antigravity",
    factorySystemPromptLabel: "Instrucciones de Sistema Global / Persona",
    factorySystemPromptPlaceholder: "Instrucciones añadidas a todas las sesiones raíz...",
    cancel: "Cancelar",
    save: "Guardar Cambios",
    saving: "Guardando...",
    loadError: "Error al cargar ajustes globales",
    saveError: "Error al guardar ajustes globales",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;
