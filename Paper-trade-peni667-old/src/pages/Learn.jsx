import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { lessons, modules } from '../data/curriculum'
import { useLearningProgress } from '../hooks/useLearningProgress'

const Learn = () => {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const { progress } = useLearningProgress()
  const visible = useMemo(() => lessons.filter((item) =>
    (filter === 'All' || item.module === filter) &&
    `${item.title} ${item.summary}`.toLowerCase().includes(search.toLowerCase())
  ), [filter, search])
  const percent = Math.round((progress.completedLessons.length / lessons.length) * 100)

  return <div className="page learning-page">
    <section className="learning-hero">
      <div><span className="eyebrow">Trading academy</span><h2>Build the skill before risking the capital.</h2><p>Forty focused lessons take you from market basics to a repeatable trading process.</p></div>
      <div className="progress-card"><strong>{percent}%</strong><span>{progress.completedLessons.length} of {lessons.length} lessons complete</span><div className="progress-track"><i style={{ width: `${percent}%` }} /></div></div>
    </section>
    <section className="catalog-tools">
      <input aria-label="Search lessons" placeholder="Search lessons…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="filter-row">{['All', ...modules].map((item) => <button className={filter === item ? 'active-filter' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    </section>
    <section className="lesson-grid">{visible.map((item) => <Link className="lesson-card" to={`/learn/${item.slug}`} key={item.slug}>
      <div className="lesson-meta"><span>{item.module}</span><span>{item.level}</span></div>
      <div className="lesson-number">{String(lessons.indexOf(item) + 1).padStart(2, '0')}</div><h3>{item.title}</h3><p>{item.summary}</p>
      <div className="lesson-link">{progress.completedLessons.includes(item.slug) ? '✓ Completed' : 'Start lesson →'}</div>
    </Link>)}</section>
    {!visible.length && <p className="empty-state">No lessons match that search.</p>}
  </div>
}

export default Learn
