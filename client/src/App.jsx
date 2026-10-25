
import { useEffect, useState } from 'react'
import './App.css'
import { translations } from './languages'
import DocumentChat from './components/DocumentChat'
import SummaryAudio from './components/SummaryAudio'

const API_URL = '/api/auth'
const DOCUMENTS_URL = '/api/documents'

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  )

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })

  const [isRegister, setIsRegister] = useState(false)

  const [language, setLanguage] = useState(
    () => localStorage.getItem('docuai-language') || 'English'
  )

  const t = translations[language] || translations.English

  const [theme, setTheme] = useState(
    () => localStorage.getItem('docuai-theme') || 'dark'
  )

  const [documents, setDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const [loading, setLoading] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiAction, setAiAction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('docuai-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('docuai-language', language)
  }, [language])

  useEffect(() => {
    if (token) {
      fetchDocuments()
    } else {
      setDocuments([])
      setSelectedDocument(null)
    }
  }, [token])

  function changeLanguage(event) {
    setLanguage(event.target.value)
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  // Format a byte count using an appropriate unit.
  function formatStorageSize(bytes) {
    const size = Number(bytes) || 0

    if (size < 1024) {
      return `${size} ${size === 1 ? 'Byte' : 'Bytes'}`
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  // Calculate the combined storage used by all uploaded documents.
  function getTotalStorageBytes() {
    return documents.reduce((total, doc) => {
      const size = Number(doc.size ?? doc.fileSize ?? 0)
      return total + (Number.isFinite(size) && size > 0 ? size : 0)
    }, 0)
  }

  async function handleAuth(event) {
    event.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const endpoint = isRegister ? '/register' : '/login'

      const payload = isRegister
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
          }
        : {
            email: email.trim(),
            password,
          }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'Authentication failed.'
        )
      }

      const receivedToken = data.token

      const receivedUser = data.user || {
        name: name.trim() || email.trim().split('@')[0],
        email: email.trim(),
      }

      if (!receivedToken) {
        throw new Error(
          'The server did not return an authentication token.'
        )
      }

      localStorage.setItem('token', receivedToken)
      localStorage.setItem('user', JSON.stringify(receivedUser))

      setToken(receivedToken)
      setUser(receivedUser)

      setPassword('')
      setName('')

      setSuccess(
        isRegister
          ? 'Account created successfully.'
          : 'Login successful.'
      )
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    setToken('')
    setUser(null)
    setDocuments([])
    setSelectedDocument(null)
    setSelectedFile(null)
    setAiResult('')
    setAiQuestion('')
    setAiAction('')
    setError('')
    setSuccess('')
  }

  async function fetchDocuments() {
    if (!token) return

    setDocumentsLoading(true)
    setError('')

    try {
      const response = await fetch(DOCUMENTS_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load documents.')
      }

      const documentList = Array.isArray(data)
        ? data
        : data.documents || []

      setDocuments(documentList)

      setSelectedDocument((current) => {
        if (!current) return null

        return (
          documentList.find((doc) => doc._id === current._id) || null
        )
      })
    } catch (err) {
      setError(err.message || 'Could not load documents.')
    } finally {
      setDocumentsLoading(false)
    }
  }

  async function handleUpload(event) {
    event.preventDefault()

    if (!selectedFile) {
      setError('Please choose a document first.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('document', selectedFile)

      const response = await fetch(`${DOCUMENTS_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Document upload failed.')
      }

      setSelectedFile(null)

      const fileInput = document.getElementById('document-file')

      if (fileInput) {
        fileInput.value = ''
      }

      setSuccess('Document uploaded successfully.')
      await fetchDocuments()
    } catch (err) {
      setError(err.message || 'Document upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function openDocument(doc) {
    setError('')
    setSuccess('')
    setSelectedDocument(doc)
    setAiResult('')
    setAiQuestion('')
    setAiAction('')

    try {
      const response = await fetch(
        `${DOCUMENTS_URL}/download/${encodeURIComponent(doc._id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        let message = 'Could not open this document.'

        try {
          const data = await response.json()
          message = data.message || message
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(message)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const openedWindow = window.open(
        objectUrl,
        '_blank',
        'noopener,noreferrer'
      )

      if (!openedWindow) {
        const link = document.createElement('a')

        link.href = objectUrl
        link.download =
          doc.originalName || doc.filename || doc.name || 'document'

        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 60000)
    } catch (err) {
      setError(err.message || 'Could not open this document.')
    }
  }

  async function downloadDocument(doc) {
    setError('')

    try {
      const response = await fetch(
        `${DOCUMENTS_URL}/download/${encodeURIComponent(doc._id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        let message = 'Could not download this document.'

        try {
          const data = await response.json()
          message = data.message || message
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(message)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download =
        doc.originalName || doc.filename || doc.name || 'document'

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    } catch (err) {
      setError(err.message || 'Could not download this document.')
    }
  }

  async function deleteDocument(doc) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${doc.originalName || doc.filename || doc.name || 'this document'}"?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${DOCUMENTS_URL}/${encodeURIComponent(doc._id)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete this document.')
      }

      setDocuments((current) =>
        current.filter((item) => item._id !== doc._id)
      )

      if (selectedDocument?._id === doc._id) {
        setSelectedDocument(null)
        setAiResult('')
        setAiQuestion('')
        setAiAction('')
      }

      setSuccess('Document deleted successfully.')
    } catch (err) {
      setError(err.message || 'Could not delete this document.')
    }
  }

  async function runAI(action) {
    if (!selectedDocument) {
      setError('Please select a document first.')
      return
    }

    if (action === 'question' && !aiQuestion.trim()) {
      setError('Please enter a question for the AI assistant.')
      return
    }

    setAiLoading(true)
    setError('')
    setSuccess('')
    setAiResult('')
    setAiAction(action)

    try {
      const documentId = encodeURIComponent(selectedDocument._id)

      const endpoint =
        action === 'summary'
          ? `${DOCUMENTS_URL}/${documentId}/summarize`
          : `${DOCUMENTS_URL}/${documentId}/ask`

      const requestOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }

      if (action === 'question') {
        requestOptions.body = JSON.stringify({
          question: aiQuestion.trim(),
        })
      }

      const response = await fetch(endpoint, requestOptions)
      const contentType = response.headers.get('content-type') || ''

      let data

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const responseText = await response.text()

        console.error('Unexpected AI response:', responseText)

        if (response.status === 404) {
          throw new Error(
            'The AI endpoint was not found. Verify the backend route and restart the server.'
          )
        }

        throw new Error(
          `The server returned an unexpected response (HTTP ${response.status}).`
        )
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || 'The AI request failed.'
        )
      }

      const result =
        action === 'summary'
          ? data.summary || data.result || data.response
          : data.answer || data.result || data.response

      if (typeof result === 'string' && result.trim()) {
        setAiResult(result)
      } else if (result) {
        setAiResult(JSON.stringify(result, null, 2))
      } else {
        throw new Error(
          'The AI service returned no summary or answer.'
        )
      }
    } catch (err) {
      setError(err.message || 'The AI request failed.')
      setAiAction('')
    } finally {
      setAiLoading(false)
    }
  }

  function getDocumentName(doc) {
    return (
      doc.originalName ||
      doc.filename ||
      doc.name ||
      'Untitled document'
    )
  }

  function getDocumentSize(doc) {
    const bytes = Number(doc.size ?? doc.fileSize ?? 0)

    if (!Number.isFinite(bytes) || bytes <= 0) {
      return 'Size unavailable'
    }

    return formatStorageSize(bytes)
  }

  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-background-shape auth-shape-one" />
        <div className="auth-background-shape auth-shape-two" />

        <section className="auth-card">
          <div className="brand-logo">D</div>

          <p className="eyebrow">SMART DOCUMENT WORKSPACE</p>
          <h1>DocuAI</h1>

          <p className="auth-description">
            Store your documents, generate AI summaries, and get answers
            from your files in one place.
          </p>

          <div className="auth-language">
            <label htmlFor="auth-language">{t.language}</label>

            <select
              id="auth-language"
              value={language}
              onChange={changeLanguage}
            >
              <option value="English">English</option>
              <option value="Telugu">తెలుగు</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Tamil">தமிழ்</option>
            </select>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={!isRegister ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setIsRegister(false)
                setError('')
                setSuccess('')
              }}
            >
              {t.signIn || 'Sign In'}
            </button>

            <button
              type="button"
              className={isRegister ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setIsRegister(true)
                setError('')
                setSuccess('')
              }}
            >
              {t.createAccount || 'Create Account'}
            </button>
          </div>

          {error && (
            <div className="message error-message">{error}</div>
          )}

          {success && (
            <div className="message success-message">{success}</div>
          )}

          <form onSubmit={handleAuth} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={
                  isRegister ? 'new-password' : 'current-password'
                }
                minLength={isRegister ? 6 : undefined}
              />
            </div>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : isRegister
                  ? t.createAccount || 'Create Account'
                  : t.signIn || 'Sign In'}
            </button>
          </form>

          <p className="auth-footer">
            Your documents stay in your personal workspace.
          </p>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo small-logo">D</div>

          <div>
            <h2>DocuAI</h2>
            <p>Smart Workspace</p>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-label">WORKSPACE</p>

          <button
            type="button"
            className="sidebar-link active"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span>▦</span>
            {t.dashboard || 'Dashboard'}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              document
                .getElementById('documents-section')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <span>▤</span>
            {t.myDocuments || 'My Documents'}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              document
                .getElementById('ai-section')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <span>✧</span>
            {t.aiAssistant || 'AI Assistant'}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              document
                .getElementById('chat-section')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <span>☷</span>
            {t.chatDocuments || 'Chat with Documents'}
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user?.name || user?.email || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user?.name || 'User'}</strong>
              <span>{user?.email || ''}</span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            ↪ {t.logout || 'Logout'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t.dashboard || 'DASHBOARD'}</p>

            <h1>
              {t.welcome || 'Welcome back'}
              {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>

            <p className="muted-text">
              {t.manageDocuments ||
                'Manage your documents and get insights with AI.'}
            </p>
          </div>

          <div className="header-actions">
            <label className="language-selector">
              <span>{t.language || 'Language'}:</span>

              <select value={language} onChange={changeLanguage}>
                <option value="English">English</option>
                <option value="Telugu">తెలుగు</option>
                <option value="Hindi">हिन्दी</option>
                <option value="Tamil">தமிழ்</option>
              </select>
            </label>

            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={fetchDocuments}
              disabled={documentsLoading}
            >
              ↻ {t.refresh || 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <div className="message error-message page-message">
            <span>{error}</span>

            <button type="button" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="message success-message page-message">
            <span>{success}</span>

            <button type="button" onClick={() => setSuccess('')}>
              ×
            </button>
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon purple">▤</div>

            <div>
              <p>{t.totalDocuments || 'Total Documents'}</p>
              <h2>{documents.length}</h2>
              <span>Documents in your workspace</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon blue">⇧</div>

            <div>
              <p>{t.storageUsed || 'Storage Used'}</p>

              <h2>{formatStorageSize(getTotalStorageBytes())}</h2>

              <span>Combined document size</span>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">✧</div>

            <div>
              <p>{t.aiAssistant || 'AI Assistant'}</p>
              <h2>Ready</h2>
              <span>Summaries and answers</span>
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel upload-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DOCUMENT MANAGEMENT</p>
                <h2>{t.uploadDocuments || 'Upload Documents'}</h2>

                <p className="muted-text">
                  {t.uploadDocument ||
                    'Add a new document to your workspace.'}
                </p>
              </div>

              <div className="panel-icon">⇧</div>
            </div>

            <form onSubmit={handleUpload}>
              <label htmlFor="document-file" className="upload-dropzone">
                <div className="upload-icon">↑</div>

                <strong>
                  {selectedFile
                    ? selectedFile.name
                    : t.chooseFile || 'Choose a document to upload'}
                </strong>

                <span>Click to browse files from your computer</span>

                <span className="file-hint">
                  Maximum file size: 10 MB (subject to server settings)
                </span>
              </label>

              <input
                id="document-file"
                type="file"
                className="file-input"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] || null)
                }
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.ppt,.pptx"
              />

              <button
                type="submit"
                className="primary-button full-width"
                disabled={loading || !selectedFile}
              >
                {loading
                  ? 'Uploading...'
                  : `↑ ${t.upload || 'Upload Document'}`}
              </button>
            </form>
          </article>

          <article className="panel ai-panel" id="ai-section">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AI-POWERED TOOLS</p>
                <h2>{t.aiAssistant || 'AI Assistant'}</h2>

                <p className="muted-text">
                  Summarize a document or ask a question about its content.
                </p>
              </div>

              <div className="panel-icon sparkle">✧</div>
            </div>

            <div className="selected-document-box">
              <span className="selected-doc-icon">▤</span>

              <div>
                <strong>
                  {selectedDocument
                    ? getDocumentName(selectedDocument)
                    : t.selectDocument || 'No document selected'}
                </strong>

                <span>
                  {selectedDocument
                    ? 'Selected for AI analysis'
                    : t.chooseDocument ||
                      'Choose a document from your document list below.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button full-width"
              onClick={() => runAI('summary')}
              disabled={!selectedDocument || aiLoading}
            >
              {aiLoading && aiAction === 'summary'
                ? 'Generating summary...'
                : `✧ ${t.summarize || 'Generate AI Summary'}`}
            </button>

            <form
              className="question-form"
              onSubmit={(event) => {
                event.preventDefault()
                runAI('question')
              }}
            >
              <label htmlFor="ai-question">
                {t.askQuestion || 'Ask a question about this document'}
              </label>

              <textarea
                id="ai-question"
                value={aiQuestion}
                onChange={(event) => setAiQuestion(event.target.value)}
                placeholder="Example: What are the key points in this document?"
                rows={3}
                disabled={!selectedDocument || aiLoading}
              />

              <button
                type="submit"
                className="secondary-button full-width"
                disabled={
                  !selectedDocument ||
                  aiLoading ||
                  !aiQuestion.trim()
                }
              >
                {aiLoading && aiAction === 'question'
                  ? 'Getting answer...'
                  : t.askAI || 'Ask AI'}
              </button>
            </form>

            {aiResult && (
              <div className="ai-result">
                <div className="ai-result-heading">
                  <h3>
                    {aiAction === 'summary'
                      ? t.documentSummary || 'Document Summary'
                      : t.aiAnswer || 'AI Answer'}
                  </h3>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setAiResult('')
                      setAiAction('')
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div className="ai-result-text">{aiResult}</div>

                {aiAction === 'summary' && (
                  <SummaryAudio text={aiResult} />
                )}
              </div>
            )}
          </article>
        </section>

        <section className="panel documents-panel" id="documents-section">
          <div className="panel-heading documents-heading">
            <div>
              <p className="eyebrow">YOUR FILE LIBRARY</p>
              <h2>{t.myDocuments || 'My Documents'}</h2>

              <p className="muted-text">
                View, open, download, or delete your uploaded documents.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={fetchDocuments}
              disabled={documentsLoading}
            >
              ↻{' '}
              {documentsLoading
                ? 'Loading...'
                : t.refresh || 'Refresh'}
            </button>
          </div>

          {documentsLoading && documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◌</div>
              <h3>Loading documents...</h3>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>{t.noDocuments || 'No documents yet'}</h3>
              <p>
                Upload your first document to get started with DocuAI.
              </p>
            </div>
          ) : (
            <div className="document-list">
              {documents.map((doc) => (
                <article
                  className={
                    selectedDocument?._id === doc._id
                      ? 'document-item selected'
                      : 'document-item'
                  }
                  key={doc._id}
                >
                  <button
                    type="button"
                    className="document-main"
                    onClick={() => setSelectedDocument(doc)}
                    title="Select document for AI tools"
                  >
                    <div className="document-icon">▤</div>

                    <div className="document-info">
                      <strong>{getDocumentName(doc)}</strong>

                      <span>
                        {getDocumentSize(doc)}
                        {doc.createdAt
                          ? ` · ${new Date(doc.createdAt).toLocaleDateString()}`
                          : ''}
                      </span>
                    </div>
                  </button>

                  <div className="document-actions">
                    <button
                      type="button"
                      className="small-action-button"
                      onClick={() => openDocument(doc)}
                      title="Open document"
                    >
                      ↗ {t.open || 'Open'}
                    </button>

                    <button
                      type="button"
                      className="small-action-button"
                      onClick={() => downloadDocument(doc)}
                      title="Download document"
                    >
                      ↓ {t.download || 'Download'}
                    </button>

                    <button
                      type="button"
                      className="small-action-button danger-action"
                      onClick={() => deleteDocument(doc)}
                      title="Delete document"
                    >
                      × {t.delete || 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel chat-panel" id="chat-section">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CONVERSATIONAL AI</p>
              <h2>{t.chatDocuments || 'Chat with Documents'}</h2>

              <p className="muted-text">
                Ask questions and explore information from your documents.
              </p>
            </div>

            <div className="panel-icon sparkle">✧</div>
          </div>

          {selectedDocument ? (
            <DocumentChat
              key={selectedDocument._id}
              document={selectedDocument}
              token={token}
              documentsUrl={DOCUMENTS_URL}
            />
          ) : (
            <div className="chat-empty-state">
              <div className="empty-icon">☷</div>
              <h3>{t.selectDocument || 'Select a document first'}</h3>

              <p>
                Choose a document in the library above to start chatting
                with it.
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  document
                    .getElementById('documents-section')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {t.myDocuments || 'View Documents'}
              </button>
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} DocuAI</span>
          <span>Smart documents. Clear answers.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
