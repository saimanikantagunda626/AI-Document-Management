import { useCallback, useEffect, useRef, useState } from 'react';
import './DocumentChat.css';

const CHAT_API = 'https://docuai-backend-65h8.onrender.com/api/chat';

function DocumentChat({ token }) {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Chat request failed.');
    }

    return data;
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;

    setHistoryLoading(true);

    try {
      const data = await request(CHAT_API);
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
  }

  async function openConversation(id) {
    setError('');

    try {
      const data = await request(`${CHAT_API}/${id}`);
      const conversation = data.conversation;

      setConversationId(conversation._id);
      setMessages(conversation.messages || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setInput('');
    setError('');

    setMessages((previous) => [
      ...previous,
      { role: 'user', content: message }
    ]);

    setLoading(true);

    try {
      const data = await request(CHAT_API, {
        method: 'POST',
        body: JSON.stringify({
          message,
          ...(conversationId ? { conversationId } : {})
        })
      });

      setConversationId(data.conversationId);

      if (data.conversation?.messages) {
        setMessages(data.conversation.messages);
      } else {
        setMessages((previous) => [
          ...previous,
          {
            role: 'assistant',
            content: data.answer,
            sources: data.sources || []
          }
        ]);
      }

      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteConversation(id) {
    const confirmed = window.confirm(
      'Delete this conversation permanently?'
    );

    if (!confirmed) return;

    try {
      await request(`${CHAT_API}/${id}`, { method: 'DELETE' });

      setConversations((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (conversationId === id) {
        startNewChat();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="document-chat">
      <aside className="chat-history">
        <div className="chat-history-header">
          <div>
            <span className="chat-eyebrow">YOUR WORKSPACE</span>
            <h3>Conversations</h3>
          </div>

          <button
            type="button"
            className="chat-new-button"
            onClick={startNewChat}
          >
            + New
          </button>
        </div>

        {historyLoading ? (
          <p className="chat-muted">Loading history...</p>
        ) : conversations.length === 0 ? (
          <p className="chat-muted">
            Your saved conversations will appear here.
          </p>
        ) : (
          <div className="chat-history-list">
            {conversations.map((item) => (
              <div
                key={item._id}
                className={`chat-history-item ${
                  conversationId === item._id ? 'active' : ''
                }`}
              >
                <button
                  type="button"
                  className="chat-history-title"
                  onClick={() => openConversation(item._id)}
                >
                  <span>{item.title || 'New conversation'}</span>
                  <small>
                    {item.messageCount || 0} messages
                  </small>
                </button>

                <button
                  type="button"
                  className="chat-delete-button"
                  title="Delete conversation"
                  aria-label={`Delete ${item.title || 'conversation'}`}
                  onClick={() => deleteConversation(item._id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      <div className="chat-main">
        <header className="chat-main-header">
          <div className="chat-ai-icon">✦</div>
          <div>
            <h2>Chat with Documents</h2>
            <p>Ask questions across your uploaded documents.</p>
          </div>
          <span className="chat-status">AI ASSISTANT</span>
        </header>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">✦</div>
              <h2>Your documents, one conversation.</h2>
              <p>
                Ask a question about your uploaded files. Answers
                are generated from the readable text in your
                document library.
              </p>

              <div className="chat-suggestions">
                <button
                  type="button"
                  onClick={() =>
                    setInput('Summarize the main points in my documents.')
                  }
                >
                  Summarize my documents
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput('What are the most important topics in my files?')
                  }
                >
                  Find important topics
                </button>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message._id || `${message.role}-${index}`}
              className={`chat-message ${
                message.role === 'user' ? 'user-message' : 'assistant-message'
              }`}
            >
              <div className="chat-avatar">
                {message.role === 'user' ? 'You' : 'AI'}
              </div>

              <div className="chat-message-body">
                <span className="chat-message-label">
                  {message.role === 'user' ? 'You' : 'Document Assistant'}
                </span>

                <div className="chat-message-content">
                  {message.content}
                </div>

                {message.sources?.length > 0 && (
                  <div className="chat-sources">
                    <strong>Sources</strong>
                    {message.sources.map((source, sourceIndex) => (
                      <span
                        key={source.documentId || sourceIndex}
                        className="chat-source-chip"
                      >
                        ▤ {source.documentName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant-message">
              <div className="chat-avatar">AI</div>
              <div className="chat-message-body">
                <span className="chat-message-label">
                  Document Assistant
                </span>
                <p className="chat-thinking">
                  Analyzing your documents...
                </p>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="chat-error" role="alert">
            {error}
            <button type="button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        <form className="chat-composer" onSubmit={sendMessage}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask a question about your documents..."
            rows={2}
            maxLength={1000}
            disabled={loading}
          />

          <div className="chat-composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <button
              type="submit"
              disabled={loading || !input.trim()}
            >
              {loading ? 'Thinking...' : 'Send ↑'}
            </button>
          </div>
        </form>

        <p className="chat-disclaimer">
          AI responses can make mistakes. Verify important details
          against your original documents.
        </p>
      </div>
    </section>
  );
}

export default DocumentChat;