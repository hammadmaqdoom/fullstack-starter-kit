'use client';

import type { DirectoryEntry } from '@/libs/api/org';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { useState } from 'react';
import { directoryDisplayName, searchDirectory } from '@/libs/api/org';

type WorkerPickerProps = {
  inputId?: string;
  value: DirectoryEntry | null;
  onChange: (worker: DirectoryEntry | null) => void;
  placeholder?: string;
  className?: string;
};

type Suggestion = DirectoryEntry & { label: string };

function toSuggestion(entry: DirectoryEntry): Suggestion {
  return {
    ...entry,
    label: `${directoryDisplayName(entry)} (${entry.email})`,
  };
}

export function WorkerPicker({
  inputId,
  value,
  onChange,
  placeholder,
  className = '',
}: WorkerPickerProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const selected = value ? toSuggestion(value) : null;

  const search = async (event: AutoCompleteCompleteEvent) => {
    const q = event.query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await searchDirectory({ q, limit: 20 });
      setSuggestions((data ?? []).map(toSuggestion));
    } catch {
      setSuggestions([]);
    }
  };

  return (
    <AutoComplete
      inputId={inputId}
      value={selected}
      suggestions={suggestions}
      completeMethod={event => void search(event)}
      field="label"
      dropdown
      forceSelection
      placeholder={placeholder}
      className={`w-full ${className}`}
      onChange={(event) => {
        const next = event.value as Suggestion | string | null;
        if (!next || typeof next === 'string') {
          onChange(null);
          return;
        }
        const { label: _label, ...entry } = next;
        onChange(entry);
      }}
    />
  );
}
