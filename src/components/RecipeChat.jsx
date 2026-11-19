// Chat under a recipe: ask cooking questions about it, or ask for changes to it.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatCircleDots, PaperPlaneRight } from '@phosphor-icons/react';
import { sendChat } from '../lib/api.js';
import FormattedText from './FormattedText.jsx';

// Example messages shown before the chat starts.
const SUGGESTIONS = [
  'Make it spicier',
  'Scale it to 4 servings',
  'What can I use instead of a missing ingredient?',
  'How long will leftovers keep?',
];

// messages: [{ id, role: 'user' | 'assistant', content, changed }], stored on the server.
// messagesLeft: how many of the 10 messages for this recipe remain.
// onReply: called with the server's reply ({ messages, messagesLeft, changed, recipe }).
// onLimit: called if the server says the limit is reached.
export default function RecipeChat({ recipe, messages, messagesLeft, onReply, onLimit }) {
  const [text, setText] = useState('');
  // The message being sent, shown straight away while waiting for the reply.
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  // The message list, so it can scroll to the newest message.
  const logRef = useRef(null);

  // Scroll to the bottom when a message arrives.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(value) {
    const content = value.trim();
    if (!content) {
      setError('Type a message first.');
      return;
    }
    // Same limit as the server.
    if (content.length > 500) {
      setError('Keep your message under 500 characters.');
      return;
    }
    setText('');
    setError('');
    setPending(content);
    try {
      onReply(await sendChat(recipe.id, content));
    } catch (err) {
      if (err.code === 'chat_limit') {
        onLimit();
        return;
      }
      // Failed: put the message back in the box to try again.
      setText(content);
      setError(err.message);
    } finally {
      setPending('');
    }
  }

  const busy = pending !== '';

  return (
    <section className="assistant" aria-labelledby="assistant-title">
      <h2 id="assistant-title" className="dash-h2">
        <ChatCircleDots size={22} aria-hidden /> Chat about this recipe
      </h2>
      <p className="assistant-intro">
        Ask about this recipe or what to serve with it, or ask for a change and the recipe above will update.
        Changes are allergen-checked. AI can make mistakes, and it can&apos;t tell you whether something is safe for an allergy.
      </p>

      {/* The conversation. aria-live reads new replies aloud to screen readers. */}
      {(messages.length > 0 || busy) && (
        <div className="assistant-log" ref={logRef} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`assistant-msg ${m.role === 'user' ? 'is-user' : 'is-bot'}`}>
              <span className="visually-hidden">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
              {/* The cook's own words are shown as typed. Replies get light formatting (lists, bold). */}
              {m.role === 'user' ? m.content : <FormattedText text={m.content} />}
              {m.changed && <b className="assistant-changed">Recipe updated</b>}
            </div>
          ))}
          {busy && <p className="assistant-msg is-user"><span className="visually-hidden">You: </span>{pending}</p>}
          {busy && <p className="assistant-msg is-bot" role="status">Thinking… a change can take up to a minute.</p>}
        </div>
      )}

      {/* Example message buttons, until the chat starts. */}
      {messages.length === 0 && !busy && messagesLeft > 0 && (
        <div className="chip-list assistant-suggestions" role="group" aria-label="Example messages">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip chip-btn" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* All 10 messages used: the box is replaced by a note. */}
      {messagesLeft === 0 && !busy ? (
        <p className="care-note assistant-limit" role="note">
          You&apos;ve used all 10 messages for this recipe. <Link to="/dashboard/generate" className="inline-link">Generate a new recipe</Link> to keep chatting.
        </p>
      ) : (
      <>
      {/* Message box and Send button. */}
      <form className="dash-add" onSubmit={(e) => { e.preventDefault(); send(text); }} noValidate>
        <div className="dash-add-name">
          <label htmlFor="assistant-message" className="field-label">Your message</label>
          <input
            id="assistant-message"
            type="text"
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'assistant-error' : undefined}
          />
        </div>
        <button type="submit" className="btn btn-primary dash-add-btn" disabled={busy}>
          <PaperPlaneRight size={18} aria-hidden /> {busy ? 'Sending…' : 'Send'}
        </button>
        {error && <p id="assistant-error" className="field-error dash-add-error" role="alert">{error}</p>}
      </form>
      <p className="field-hint assistant-count" aria-live="polite">{messagesLeft} of 10 messages left for this recipe</p>
      </>
      )}
    </section>
  );
}
