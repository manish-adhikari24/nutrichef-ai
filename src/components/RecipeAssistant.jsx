import { useEffect, useRef, useState } from 'react';
import { ChatCircleDots, PaperPlaneRight } from '@phosphor-icons/react';
import { askAboutRecipe } from '../lib/api.js';

const SUGGESTIONS = [
  'Can I make this without an oven?',
  'What can I use instead of a missing ingredient?',
  'How do I scale this for 4 people?',
  'How long will leftovers keep?',
];
const MAX_TURNS = 12;

// Trial feature: answers cooking questions about this one recipe.
export default function RecipeAssistant({ recipe }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setError('');
  }, [recipe.id]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  async function send(text) {
    const content = text.trim();
    if (!content) {
      setError('Type a question first.');
      return;
    }
    if (content.length > 500) {
      setError('Keep your question under 500 characters.');
      return;
    }
    // Only the latest turns are sent, so long chats stay within the server's limit.
    const next = [...messages, { role: 'user', content }].slice(-(MAX_TURNS - 1));
    setMessages(next);
    setQuestion('');
    setError('');
    setBusy(true);
    try {
      const { answer } = await askAboutRecipe(recipe.id, next[0].role === 'user' ? next : next.slice(1));
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages((m) => m.slice(0, -1));
      setQuestion(content);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="assistant" aria-labelledby="assistant-title">
      <h3 id="assistant-title" className="dash-h2">
        <ChatCircleDots size={22} aria-hidden /> Ask about this recipe
      </h3>
      <p className="assistant-intro">
        Questions about cooking this dish, like swaps, timing or leftovers. AI can make mistakes, and it
        can&apos;t tell you whether something is safe for an allergy.
      </p>

      {messages.length > 0 && (
        <div className="assistant-log" ref={logRef} aria-live="polite">
          {messages.map((m, index) => (
            <p key={index} className={`assistant-msg ${m.role === 'user' ? 'is-user' : 'is-bot'}`}>
              <span className="visually-hidden">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
              {m.content}
            </p>
          ))}
          {busy && <p className="assistant-msg is-bot" role="status">Thinking…</p>}
        </div>
      )}

      {messages.length === 0 && (
        <div className="chip-list assistant-suggestions" role="group" aria-label="Example questions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip chip-btn" onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      )}

      <form className="dash-add" onSubmit={(e) => { e.preventDefault(); send(question); }} noValidate>
        <div className="dash-add-name">
          <label htmlFor="assistant-question" className="field-label">Your question</label>
          <input
            id="assistant-question"
            type="text"
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'assistant-error' : undefined}
          />
        </div>
        <button type="submit" className="btn btn-primary dash-add-btn" disabled={busy}>
          <PaperPlaneRight size={18} aria-hidden /> {busy ? 'Asking…' : 'Ask'}
        </button>
        {error && <p id="assistant-error" className="field-error dash-add-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
