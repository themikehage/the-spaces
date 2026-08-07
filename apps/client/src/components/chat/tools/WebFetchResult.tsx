// SPDX-License-Identifier: MIT

interface Props {
  text: string;
  details?: any;
  l: Record<string, string>;
}


export function WebFetchResult({ text }: Props) {
  return (
    <div className="p-3 bg-bg rounded-md border border-border/40 text-[11px] leading-relaxed max-h-64 overflow-y-auto font-mono text-text-secondary whitespace-pre-wrap select-all">
      {text || "Sin contenido extraído."}
    </div>
  );
}
