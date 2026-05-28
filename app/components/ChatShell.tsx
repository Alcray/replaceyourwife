'use client';

import { FormEvent, useRef, useState } from 'react';

type Mode = 'capture' | 'retrieve';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type ChatResponse = {
  answer?: string;
  error?: string;
  memories?: Array<{
    id: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
};

export function ChatShell() {
  const [mode, setMode] = useState<Mode>('retrieve');
  const [tab, setTab] = useState<'prompt' | 'history'>('prompt');
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ask what your home remembers, or capture something new.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);
    setMessages((current) => [...current, { role: 'user', content: userText }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, message: userText })
      });
      const payload = (await response.json()) as ChatResponse;
      if (!response.ok) throw new Error(payload.error ?? 'Request failed');

      setSources(
        payload.memories
          ?.map((memory) => String(memory.metadata?.source_name ?? 'home memory'))
          .filter(Boolean) ?? []
      );
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: payload.answer ?? 'Done.' }
      ]);
      setTab('history');
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'system',
          content: error instanceof Error ? error.message : 'Something went wrong'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitFiles() {
    if (loading) return;

    const files = fileRef.current?.files;
    if (!files?.length && !input.trim()) return;

    const formData = new FormData();
    formData.set('notes', notes);
    if (input.trim()) formData.set('text', input.trim());
    for (const file of Array.from(files ?? [])) formData.append('files', file);

    setLoading(true);
    setMessages((current) => [
      ...current,
      { role: 'user', content: `Capture ${files?.length ?? 0} file(s)${input.trim() ? ' plus notes' : ''}.` }
    ]);

    try {
      const response = await fetch('/api/capture', { method: 'POST', body: formData });
      const payload = (await response.json()) as {
        results?: Array<{ sourceName: string; memoriesCreated: number }>;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? 'Capture failed');

      const summary =
        payload.results
          ?.map((result) => `${result.sourceName}: ${result.memoriesCreated} memories`)
          .join('\n') ?? 'Captured.';
      setMessages((current) => [...current, { role: 'assistant', content: summary }]);
      setTab('history');
      setInput('');
      setNotes('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'system',
          content: error instanceof Error ? error.message : 'Capture failed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="promptShell">
      <div className="tabs" aria-label="View">
        <button className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>
          Prompt
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History
        </button>
      </div>

      {tab === 'prompt' && (
        <>
          <form className="promptBar" onSubmit={submitChat}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                mode === 'capture'
                  ? 'Paste a note, manual text, or reminder to remember'
                  : 'Ask about a document, repair, reminder, or thing you forgot'
              }
            />
            <input
              ref={fileRef}
              className="fileInput"
              type="file"
              multiple
              onChange={() => {
                setMode('capture');
                void submitFiles();
              }}
            />
            <button
              className="iconButton"
              type="button"
              aria-label="Attach files"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              +
            </button>
            <button className="askButton" disabled={loading || !input.trim()}>
              {loading ? '...' : mode === 'capture' ? 'Save' : 'Ask'}
            </button>
          </form>

          {mode === 'capture' && (
            <input
              className="noteInput"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional source note, e.g. basement boiler manual"
            />
          )}

          <div className="chips">
            <button onClick={() => setInput('How do I reset the Aroma kettle if it does not heat?')}>
              Kettle reset
            </button>
            <button onClick={() => setInput('What is Vernice Moorhouse not immune to?')}>
              Medical record
            </button>
            <button
              onClick={() => {
                setMode('capture');
                setInput('Remember this: ');
              }}
            >
              Capture note
            </button>
            <button onClick={() => setInput('What did I forget about the house?')}>I forgot</button>
          </div>

          <div className="modeLine">
            <button className={mode === 'retrieve' ? 'active' : ''} onClick={() => setMode('retrieve')}>
              Ask memory
            </button>
            <button className={mode === 'capture' ? 'active' : ''} onClick={() => setMode('capture')}>
              Save memory
            </button>
          </div>
        </>
      )}

      {tab === 'history' && (
        <section className="historyCard">
          <div className="messages">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
                <span>{message.role}</span>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          {sources.length > 0 && (
            <div className="sources">
              {[...new Set(sources)].map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
