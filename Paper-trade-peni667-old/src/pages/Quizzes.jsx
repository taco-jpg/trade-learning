import { Link } from 'react-router-dom'
import { quizzes } from '../data/curriculum'
import { useLearningProgress } from '../hooks/useLearningProgress'

const Quizzes = () => {
  const { progress } = useLearningProgress()
  return <div className="page learning-page">
    <section className="learning-hero"><div><span className="eyebrow">Knowledge checks</span><h2>Turn information into decisions.</h2><p>Each checkpoint tests a full learning module and explains every answer.</p></div><div className="quiz-stat"><strong>{Object.keys(progress.quizScores).length}/{quizzes.length}</strong><span>checkpoints attempted</span></div></section>
    <section className="quiz-grid">{quizzes.map((quiz, index) => { const result = progress.quizScores[quiz.slug]; return <Link className="quiz-card" to={`/quizzes/${quiz.slug}`} key={quiz.slug}><span className="quiz-index">0{index + 1}</span><div><span className="eyebrow">{quiz.module} · {quiz.questions.length} questions</span><h3>{quiz.title}</h3><p>Covers {quiz.lessonSlugs.length} lessons from the {quiz.module.toLowerCase()} module.</p></div><strong className="score-badge">{result ? `${result.score}/${result.total}` : 'Start →'}</strong></Link>})}</section>
  </div>
}

export default Quizzes
