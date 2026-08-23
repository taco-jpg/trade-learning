import { Link, Navigate, useParams } from 'react-router-dom'
import { getLesson, getQuizForModule, lessons } from '../data/curriculum'
import { useLearningProgress } from '../hooks/useLearningProgress'

const Lesson = () => {
  const { lessonSlug } = useParams()
  const item = getLesson(lessonSlug)
  const { progress, toggleLesson } = useLearningProgress()
  if (!item) return <Navigate to="/learn" replace />
  const index = lessons.findIndex((lesson) => lesson.slug === item.slug)
  const next = lessons[index + 1]
  const quiz = getQuizForModule(item.module)
  const complete = progress.completedLessons.includes(item.slug)

  return <div className="page lesson-page">
    <Link className="back-link" to="/learn">← All lessons</Link>
    <article className="lesson-article">
      <header><span className="eyebrow">Lesson {index + 1} · {item.module}</span><h2>{item.title}</h2><p>{item.summary}</p></header>
      {item.sections.map((part) => <section key={part.heading}><h3>{part.heading}</h3><p>{part.body}</p><aside><strong>Key takeaway</strong><span>{part.takeaway}</span></aside></section>)}
      <div className="lesson-actions"><button className={complete ? 'completed-button' : 'primary'} onClick={() => toggleLesson(item.slug)}>{complete ? '✓ Lesson completed' : 'Mark as complete'}</button>{next && <Link className="button-link" to={`/learn/${next.slug}`}>Next lesson →</Link>}</div>
    </article>
    <aside className="quiz-callout"><div><span className="eyebrow">Check your understanding</span><h3>{quiz.title}</h3><p>Finish the {item.module.toLowerCase()} module, then test the ideas without risking your portfolio.</p></div><Link className="button-link" to={`/quizzes/${quiz.slug}`}>Take checkpoint →</Link></aside>
  </div>
}

export default Lesson
