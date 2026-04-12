/* WGS Record of Discussion — FAQ Search & Chat
 *
 * Search is backed by Fuse.js (vendored at js/vendor/fuse.min.js,
 * loaded via a plain <script> tag in faq.html before this file).
 * The previous implementation used a hand-rolled scoring pass with
 * a Levenshtein distance check over tags; Fuse gives better recall
 * on typos and synonyms without hand-tuning weights.
 *
 * No network calls. Fuse is local. The privacy guarantee is intact.
 */

let faqData = [];
let fuse = null;

// Fuse.js configuration. Weights favour exact question matches, then
// tags, then answer text. Threshold 0.4 matches the recall of the old
// Levenshtein path on the existing test corpus without false positives.
const FUSE_OPTIONS = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.4,
  minMatchCharLength: 2,
  keys: [
    { name: 'question', weight: 0.6 },
    { name: 'tags', weight: 0.3 },
    { name: 'answer', weight: 0.1 }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadFaqData();
  initFaqSearch();
  initFaqChat();
  initFaqChips();
});

async function loadFaqData() {
  try {
    const res = await fetch('assets/data/faq-knowledge.json');
    faqData = await res.json();
    if (typeof Fuse === 'function') {
      fuse = new Fuse(faqData, FUSE_OPTIONS);
    } else {
      console.warn('Fuse.js not loaded; FAQ search will fall back to empty results.');
    }
  } catch (e) {
    console.error('Failed to load FAQ data:', e);
  }
}

/* ============ SEARCH ============ */
function initFaqSearch() {
  const input = document.getElementById('faq-search-input');
  if (!input) return;

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      if (query.length >= 2) {
        const results = searchFaq(query);
        // Show results in chat
        if (results.length > 0) {
          addUserMessage(query);
          results.forEach((r, i) => {
            setTimeout(() => addBotMessage(r), (i + 1) * 300);
          });
          input.value = '';
        }
      }
    }, 600);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = input.value.trim();
      if (query.length >= 2) {
        handleQuery(query);
        input.value = '';
      }
    }
  });
}

/* ============ CHAT ============ */
function initFaqChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  if (!input || !sendBtn) return;

  sendBtn.addEventListener('click', () => {
    const query = input.value.trim();
    if (query.length >= 2) {
      handleQuery(query);
      input.value = '';
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = input.value.trim();
      if (query.length >= 2) {
        handleQuery(query);
        input.value = '';
      }
    }
  });
}

/* ============ CHIPS ============ */
function initFaqChips() {
  document.querySelectorAll('.chat__chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q;
      if (q) handleQuery(q);
    });
  });
}

/* ============ QUERY HANDLING ============ */
function handleQuery(query) {
  addUserMessage(query);
  showTyping();

  const results = searchFaq(query);

  setTimeout(() => {
    removeTyping();

    if (results.length > 0) {
      results.forEach((r, i) => {
        setTimeout(() => addBotMessage(r), i * 200);
      });

      // Show related questions
      const related = getRelatedQuestions(results[0]);
      if (related.length > 0) {
        setTimeout(() => addRelatedChips(related), results.length * 200 + 300);
      }
    } else {
      addBotMessageRaw(`<p style="margin-bottom:8px">I couldn't find a specific answer to that question in my knowledge base.</p>
        <p style="margin-bottom:8px">You may find answers on these authoritative sources:</p>
        <ul style="margin:0;padding-left:16px">
          <li><a href="https://www.nhs.uk/conditions/genetics/" target="_blank" rel="noopener">NHS.uk — Genetic and Genomic Testing</a></li>
          <li><a href="https://www.genomicsengland.co.uk/understanding-genomics" target="_blank" rel="noopener">Genomics England — Understanding Genomics</a></li>
          <li><a href="https://www.geneticalliance.org.uk/" target="_blank" rel="noopener">Genetic Alliance UK</a></li>
        </ul>
        <p style="margin-top:8px;margin-bottom:0">Or ask your healthcare professional for personalised guidance.</p>`);
    }

    scrollToBottom();
  }, 800 + Math.random() * 400);
}

/* ============ SEARCH ALGORITHM ============ */
// Returns up to 3 results ordered by Fuse relevance. Falls back to an
// empty array if the knowledge base or the Fuse index failed to load.
function searchFaq(query) {
  if (!faqData.length) return [];
  const q = query.trim();
  if (!q) return [];

  if (fuse) {
    return fuse
      .search(q, { limit: 3 })
      .map(r => r.item);
  }

  // Fuse is unavailable (script missing, corrupt, blocked). Degrade
  // gracefully to a literal substring match so the chat still works
  // for obvious queries rather than returning nothing.
  const lower = q.toLowerCase();
  return faqData
    .filter(item =>
      item.question.toLowerCase().includes(lower) ||
      (item.tags || []).some(t => t.toLowerCase().includes(lower))
    )
    .slice(0, 3);
}

function getRelatedQuestions(item) {
  if (!item.related) return [];
  return item.related
    .map(id => faqData.find(f => f.id === id))
    .filter(Boolean)
    .slice(0, 3);
}

/* ============ UI HELPERS ============ */
function addUserMessage(text) {
  const msgs = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = 'chat__bubble chat__bubble--user';
  bubble.textContent = text;
  msgs.appendChild(bubble);
  scrollToBottom();
}

function addBotMessage(item) {
  const msgs = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = 'chat__bubble chat__bubble--bot';
  bubble.innerHTML = `
    <p style="margin-bottom:4px;font-weight:600;color:var(--color-primary-600)">${item.question}</p>
    <p style="margin-bottom:0">${item.answer}</p>
    <div class="chat__source">
      Source: <a href="${item.sourceUrl}" target="_blank" rel="noopener">${item.source}</a>
    </div>`;
  msgs.appendChild(bubble);
  scrollToBottom();
}

function addBotMessageRaw(html) {
  const msgs = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = 'chat__bubble chat__bubble--bot';
  bubble.innerHTML = html;
  msgs.appendChild(bubble);
  scrollToBottom();
}

function addRelatedChips(items) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start;animation:fadeInUp 0.3s ease';

  const label = document.createElement('span');
  label.style.cssText = 'font-size:12px;color:var(--text-tertiary);width:100%;margin-bottom:4px';
  label.textContent = 'Related questions:';
  div.appendChild(label);

  items.forEach(item => {
    const chip = document.createElement('button');
    chip.className = 'chat__chip';
    chip.textContent = item.question;
    chip.addEventListener('click', () => handleQuery(item.question));
    div.appendChild(chip);
  });

  msgs.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const msgs = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'chat__typing';
  typing.id = 'typing-indicator';
  typing.innerHTML = '<div class="chat__typing-dot"></div><div class="chat__typing-dot"></div><div class="chat__typing-dot"></div>';
  msgs.appendChild(typing);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById('typing-indicator')?.remove();
}

function scrollToBottom() {
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

