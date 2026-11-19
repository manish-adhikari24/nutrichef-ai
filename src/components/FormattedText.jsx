// Shows an AI reply with light formatting: paragraphs, bullet and numbered lists, **bold** and *italic*.
// It builds React elements and never inserts raw HTML, so anything the AI writes is shown as text, safely.

// Splits one line into text, bold and italic parts.
function inline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`)/);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^(\*\*|__).+\1$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*.+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    if (/^`.+`$/.test(part)) return <code key={key}>{part.slice(1, -1)}</code>;
    return part;
  });
}

// Groups the lines into paragraphs and lists.
function blocks(text) {
  const result = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const last = result[result.length - 1];
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      const item = (bullet || numbered)[1];
      if (last?.type === type) last.items.push(item);
      else result.push({ type, items: [item] });
    } else if (!line) {
      result.push({ type: 'break' });
    } else {
      // A heading like "## Storage" becomes a bold line.
      const heading = line.match(/^#{1,6}\s+(.*)$/);
      const content = heading ? `**${heading[1]}**` : line;
      if (last?.type === 'p') last.lines.push(content);
      else result.push({ type: 'p', lines: [content] });
    }
  }
  return result.filter((b) => b.type !== 'break');
}

export default function FormattedText({ text }) {
  return blocks(text).map((block, i) => {
    if (block.type === 'p') {
      return (
        <p key={i}>
          {block.lines.map((line, j) => (
            <span key={j}>{j > 0 && <br />}{inline(line, `${i}-${j}`)}</span>
          ))}
        </p>
      );
    }
    const List = block.type;
    return <List key={i}>{block.items.map((item, j) => <li key={j}>{inline(item, `${i}-${j}`)}</li>)}</List>;
  });
}
