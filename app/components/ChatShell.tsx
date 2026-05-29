'use client';

import { FormEvent, useRef, useState } from 'react';

type Tab = 'ask' | 'capture';

type HistoryItem = {
  id: string;
  title: string;
  mode: Tab;
  results: number;
  usedMemory: boolean;
  answer: string;
  sources: string[];
  pending?: boolean;
};

type ChatResponse = {
  answer?: string;
  error?: string;
  usedMemory?: boolean;
  memories?: Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
};

type CaptureResponse = {
  results?: Array<{ sourceName: string; memoriesCreated: number }>;
  error?: string;
};

const ASK_EXAMPLES = [
  'How do I fix the home Wi-Fi?',
  'How do I reset the Aroma kettle?',
  'What is Vernice Moorhouse not immune to?',
  'Who is my dentist?'
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ChatShell() {
  const [tab, setTab] = useState<Tab>('ask');
  const [useXtrace, setUseXtrace] = useState(true);
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [active, setActive] = useState<HistoryItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function runAsk(question: string) {
    if (loading) return;
    const memoryEnabled = useXtrace;
    const pendingItem: HistoryItem = {
      id: newId(),
      title: question,
      mode: 'ask',
      results: 0,
      usedMemory: memoryEnabled,
      answer: memoryEnabled ? 'Asking with XTrace memory ON...' : 'XTrace memory is OFF. The agent will answer only if it already knows without memory.',
      sources: [],
      pending: true
    };
    setLoading(true);
    setActive(pendingItem);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'retrieve', message: question, useXtrace: memoryEnabled })
      });
      const payload = (await response.json()) as ChatResponse;
      if (!response.ok) throw new Error(payload.error ?? 'Request failed');

      const sources = [
        ...new Set(
          (payload.memories ?? [])
            .map((memory) => String(memory.metadata?.source_name ?? ''))
            .filter(Boolean)
        )
      ];

      const item: HistoryItem = {
        id: newId(),
        title: question,
        mode: 'ask',
        results: payload.memories?.length ?? 0,
        usedMemory: payload.usedMemory ?? memoryEnabled,
        answer: payload.answer ?? 'Done.',
        sources
      };
      setHistory((current) => [item, ...current]);
      setActive(item);
      setInput('');
    } catch (error) {
      const item: HistoryItem = {
        id: newId(),
        title: question,
        mode: 'ask',
        results: 0,
        usedMemory: memoryEnabled,
        answer: error instanceof Error ? error.message : 'Something went wrong',
        sources: []
      };
      setHistory((current) => [item, ...current]);
      setActive(item);
    } finally {
      setLoading(false);
    }
  }

  async function runCapture(text: string, files: FileList | null) {
    if (loading) return;
    if (!text.trim() && !files?.length) return;

    setLoading(true);
    try {
      let summary: string;
      let count = 0;

      if (files?.length) {
        const formData = new FormData();
        formData.set('notes', notes);
        if (text.trim()) formData.set('text', text.trim());
        for (const file of Array.from(files)) formData.append('files', file);

        const response = await fetch('/api/capture', { method: 'POST', body: formData });
        const payload = (await response.json()) as CaptureResponse;
        if (!response.ok) throw new Error(payload.error ?? 'Capture failed');

        count = payload.results?.reduce((sum, r) => sum + r.memoriesCreated, 0) ?? 0;
        summary =
          payload.results
            ?.map((r) => `${r.sourceName}: ${r.memoriesCreated} memories`)
            .join('\n') ?? 'Captured.';
      } else {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'capture',
            message: text.trim(),
            sourceName: notes.trim() || 'quick-capture'
          })
        });
        const payload = (await response.json()) as ChatResponse;
        if (!response.ok) throw new Error(payload.error ?? 'Capture failed');
        summary = payload.answer ?? 'Captured.';
      }

      const item: HistoryItem = {
        id: newId(),
        title: notes.trim() || text.trim().slice(0, 60) || 'Captured files',
        mode: 'capture',
        results: count,
        usedMemory: true,
        answer: summary,
        sources: []
      };
      setHistory((current) => [item, ...current]);
      setActive(item);
      setInput('');
      setNotes('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      const item: HistoryItem = {
        id: newId(),
        title: notes.trim() || text.trim().slice(0, 60) || 'Capture',
        mode: 'capture',
        results: 0,
        usedMemory: true,
        answer: error instanceof Error ? error.message : 'Capture failed',
        sources: []
      };
      setHistory((current) => [item, ...current]);
      setActive(item);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tab === 'ask') {
      if (!input.trim()) return;
      void runAsk(input.trim());
    } else {
      void runCapture(input, fileRef.current?.files ?? null);
    }
  }

  return (
    <section className="shell">
      <div className="controlCard">
        <div className="tabs" aria-label="Mode">
          <button className={tab === 'ask' ? 'active' : ''} onClick={() => setTab('ask')} type="button">
            Ask
          </button>
          <button
            className={tab === 'capture' ? 'active' : ''}
            onClick={() => setTab('capture')}
            type="button"
          >
            Capture
          </button>
        </div>

        <form className="searchRow" onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              tab === 'ask'
                ? 'Ask what your home remembers...'
                : 'Paste a note, manual text, or reminder to remember...'
            }
          />
          {tab === 'capture' && (
            <button
              type="button"
              className="attachButton"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              Files
            </button>
          )}
          <button className="primaryButton" disabled={loading}>
            {loading ? '...' : tab === 'ask' ? 'Ask' : 'Save'}
          </button>
          <input
            ref={fileRef}
            className="hiddenFile"
            type="file"
            multiple
            onChange={() => {
              setTab('capture');
              void runCapture(input, fileRef.current?.files ?? null);
            }}
          />
        </form>

        <div className="optionRow">
          {tab === 'capture' && (
            <input
              className="noteInput"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional source name, e.g. Wi-Fi fix"
            />
          )}

          <div className="xtraceControl" aria-label="XTrace memory toggle">
            <span>XTrace</span>
            <button
              type="button"
              className={useXtrace ? 'active' : ''}
              onClick={() => {
                setUseXtrace(true);
                setActive({
                  id: newId(),
                  title: 'XTrace memory turned ON',
                  mode: 'ask',
                  results: 0,
                  usedMemory: true,
                  answer: 'Memory retrieval is ON. Ask the same question again and the agent will search XTrace first.',
                  sources: []
                });
              }}
            >
              ON
            </button>
            <button
              type="button"
              className={!useXtrace ? 'active off' : ''}
              onClick={() => {
                setUseXtrace(false);
                setActive({
                  id: newId(),
                  title: 'XTrace memory turned OFF',
                  mode: 'ask',
                  results: 0,
                  usedMemory: false,
                  answer: 'Memory retrieval is OFF. Ask a known home question now and it should say it does not know.',
                  sources: []
                });
              }}
            >
              OFF
            </button>
          </div>
        </div>

        {tab === 'ask' && (
          <div className="chips">
            {ASK_EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => setInput(example)}>
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <article className={`answerCard ${active.results === 0 && active.mode === 'ask' && !active.pending ? 'empty' : ''} ${active.pending ? 'pending' : ''}`}>
          <header>
            <span className="badge">{active.mode}</span>
            <span className="badge muted">{active.usedMemory ? 'XTrace ON' : 'XTrace OFF'}</span>
            <span className="badge muted">{active.results} results</span>
          </header>
          <h3>{active.title}</h3>
          <p>{active.answer}</p>
          {active.sources.length > 0 && (
            <div className="sourceTags">
              {active.sources.map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          )}
        </article>
      )}

      <section className="historySection">
        <div className="historyHead">
          <h2>History</h2>
          <span>Recent searches</span>
        </div>
        {history.length === 0 ? (
          <p className="emptyHistory">No searches yet. Ask something above.</p>
        ) : (
          <div className="historyGrid">
            {history.map((item) => (
              <button key={item.id} className="historyCard" type="button" onClick={() => setActive(item)}>
                <strong>{item.title}</strong>
                <div className="historyMeta">
                  <span className="badge">{item.mode}</span>
                  <span>{item.results} results</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
