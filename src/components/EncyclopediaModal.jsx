import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Search, X, ChevronRight, Compass, Database, Layers, Sparkles,
  Tag, ExternalLink, Bookmark
} from 'lucide-react';
import { ENCYCLOPEDIA_CHAPTERS } from '../data/encyclopediaData';

const ICONS_MAP = {
  Compass,
  Database,
  Layers,
  Sparkles
};

export default function EncyclopediaModal({ isOpen, onClose, initialArticleId = null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState(
    initialArticleId || ENCYCLOPEDIA_CHAPTERS[0]?.articles[0]?.id
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Find active article & chapter
  const activeData = (() => {
    for (const ch of ENCYCLOPEDIA_CHAPTERS) {
      const found = ch.articles.find((a) => a.id === selectedArticleId);
      if (found) {
        return { chapter: ch, article: found };
      }
    }
    return { chapter: ENCYCLOPEDIA_CHAPTERS[0], article: ENCYCLOPEDIA_CHAPTERS[0]?.articles[0] };
  })();

  // Filter chapters/articles based on search query
  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ENCYCLOPEDIA_CHAPTERS;

    return ENCYCLOPEDIA_CHAPTERS.map((ch) => {
      const matchedArticles = ch.articles.filter((art) => {
        return (
          art.title.toLowerCase().includes(q) ||
          art.tags?.some((t) => t.toLowerCase().includes(q)) ||
          art.content.toLowerCase().includes(q)
        );
      });
      return { ...ch, articles: matchedArticles };
    }).filter((ch) => ch.articles.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  // Simple Markdown-like renderer for article content
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let inTable = false;
    let tableRows = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(2); // Skip separator row
        elements.push(
          <div key={`table-${elements.length}`} style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {headerRow.map((cell, idx) => (
                    <th key={idx} style={styles.th}>{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={styles.td}>{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${idx}`} style={styles.codeBlock}>
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line.split('|').slice(1, -1);
        tableRows.push(cells);
        inTable = true;
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} style={styles.h3}>
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }
      if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={idx} style={styles.h4}>
            {line.replace('#### ', '')}
          </h4>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} style={styles.blockquote}>
            {line.replace('> ', '')}
          </blockquote>
        );
        return;
      }

      // Divider
      if (line.trim() === '---') {
        elements.push(<hr key={idx} style={styles.hr} />);
        return;
      }

      // Unordered lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        elements.push(
          <div key={idx} style={styles.listItem}>
            <span style={styles.bullet}>•</span>
            <span>{line.trim().replace(/^[*-]\s+/, '')}</span>
          </div>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={idx} style={{ height: 8 }} />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={idx} style={styles.p}>
          {line}
        </p>
      );
    });

    flushTable();
    return elements;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        className="sa-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Кодекс Mitory: Энциклопедия сценариста"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Верхняя шапка модального окна */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.iconCircle}>
              <BookOpen size={18} color="#3b82f6" />
            </div>
            <div>
              <h2 style={styles.modalTitle}>Кодекс Mitory: Энциклопедия сценариста</h2>
              <div style={styles.modalSubtitle}>
                Интерактивное руководство по геймдизайну, логике условий и архитектуре визуальных новелл (F1)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            title="Закрыть Кодекс (Esc)"
            aria-label="Закрыть Кодекс"
          >
            <X size={18} />
          </button>
        </div>

        {/* Двухколоночный интерфейс: навигация + контент */}
        <div style={styles.body}>
          {/* Левая колонка: оглавление и поиск */}
          <aside style={styles.sidebar}>
            <div style={styles.searchBox}>
              <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по статьям и тегам..."
                style={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}
                  title="Очистить"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={styles.chapterList}>
              {filteredChapters.map((ch) => {
                const IconComponent = ICONS_MAP[ch.icon] || Compass;
                return (
                  <div key={ch.id} style={styles.chapterGroup}>
                    <div style={styles.chapterHeader}>
                      <IconComponent size={13} color="#94a3b8" />
                      <span>{ch.title}</span>
                    </div>
                    <div style={styles.articlesWrap}>
                      {ch.articles.map((art) => {
                        const isSelected = art.id === selectedArticleId;
                        return (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => setSelectedArticleId(art.id)}
                            style={{
                              ...styles.articleItem,
                              ...(isSelected ? styles.articleItemActive : {})
                            }}
                          >
                            <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.35 }}>
                              {art.title}
                            </span>
                            {isSelected && <ChevronRight size={13} color="#3b82f6" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredChapters.length === 0 && (
                <div style={styles.noResults}>
                  По запросу «{searchQuery}» статей не найдено
                </div>
              )}
            </div>
          </aside>

          {/* Правая колонка: статья */}
          <main style={styles.contentPane}>
            {activeData?.article ? (
              <div style={styles.articleScrollArea}>
                <div style={styles.articleMeta}>
                  <div style={styles.breadcrumb}>
                    <span>{activeData.chapter?.title}</span>
                    <ChevronRight size={12} color="#64748b" />
                    <span style={{ color: '#38bdf8' }}>{activeData.article.title}</span>
                  </div>

                  <h1 style={styles.articleTitle}>{activeData.article.title}</h1>

                  {activeData.article.tags?.length > 0 && (
                    <div style={styles.tagsRow}>
                      {activeData.article.tags.map((tag) => (
                        <span key={tag} style={styles.tagBadge}>
                          <Tag size={10} style={{ marginRight: 4 }} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.articleRendered}>
                  {renderFormattedContent(activeData.article.content)}
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>Выберите статью из оглавления слева</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3500,
    background: 'rgba(5, 10, 20, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  modal: {
    width: 'min(980px, 96vw)',
    height: 'min(720px, 92vh)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 16,
    background: 'var(--panel-bg, #0f172a)',
    border: '1px solid var(--panel-border, #334155)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
    overflow: 'hidden',
    color: 'var(--text-color, #f8fafc)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 18px',
    borderBottom: '1px solid var(--panel-border, rgba(51, 65, 85, 0.6))',
    background: 'rgba(255, 255, 255, 0.02)',
    flexShrink: 0
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '-0.01em'
  },
  modalSubtitle: {
    fontSize: '0.74rem',
    opacity: 0.65,
    marginTop: 2
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: '1px solid var(--panel-border, rgba(51, 65, 85, 0.5))',
    background: 'transparent',
    color: 'var(--text-color, #f8fafc)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s'
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0
  },
  sidebar: {
    width: 290,
    borderRight: '1px solid var(--panel-border, rgba(51, 65, 85, 0.6))',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(15, 23, 42, 0.5)',
    flexShrink: 0
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderBottom: '1px solid var(--panel-border, rgba(51, 65, 85, 0.4))'
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-color, #f8fafc)',
    fontSize: '0.8rem'
  },
  clearSearchBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 2
  },
  chapterList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px'
  },
  chapterGroup: {
    marginBottom: 14
  },
  chapterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: '0.72rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#94a3b8',
    padding: '4px 6px',
    marginBottom: 4
  },
  articlesWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  articleItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 9px',
    borderRadius: 7,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-color, #cbd5e1)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  articleItemActive: {
    background: 'rgba(59, 130, 246, 0.16)',
    borderColor: 'rgba(59, 130, 246, 0.45)',
    color: '#93c5fd',
    fontWeight: 700
  },
  noResults: {
    textAlign: 'center',
    padding: '28px 14px',
    fontSize: '0.78rem',
    color: '#94a3b8'
  },
  contentPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: 'rgba(15, 23, 42, 0.25)'
  },
  articleScrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px'
  },
  articleMeta: {
    marginBottom: 20
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.72rem',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: 8
  },
  articleTitle: {
    margin: 0,
    fontSize: '1.45rem',
    fontWeight: 800,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
    color: '#f8fafc'
  },
  tagsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 10
  },
  tagBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 4,
    background: 'rgba(59, 130, 246, 0.14)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#93c5fd',
    fontSize: '0.68rem',
    fontWeight: 700
  },
  articleRendered: {
    fontSize: '0.86rem',
    lineHeight: 1.65,
    color: '#cbd5e1'
  },
  h3: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#f8fafc',
    margin: '18px 0 10px 0'
  },
  h4: {
    fontSize: '0.96rem',
    fontWeight: 700,
    color: '#93c5fd',
    margin: '14px 0 6px 0'
  },
  p: {
    margin: '0 0 10px 0'
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    margin: '4px 0'
  },
  bullet: {
    color: '#3b82f6',
    fontWeight: 900
  },
  blockquote: {
    margin: '14px 0',
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(59, 130, 246, 0.1)',
    borderLeft: '4px solid #3b82f6',
    color: '#e2e8f0',
    fontSize: '0.84rem'
  },
  hr: {
    border: 'none',
    height: 1,
    background: 'var(--panel-border, rgba(51, 65, 85, 0.6))',
    margin: '18px 0'
  },
  codeBlock: {
    background: '#090d16',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: '12px 14px',
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: '#38bdf8',
    margin: '10px 0'
  },
  tableWrap: {
    overflowX: 'auto',
    margin: '14px 0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem'
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '2px solid #334155',
    color: '#f8fafc',
    fontWeight: 700
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #1e293b'
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#64748b'
  }
};
