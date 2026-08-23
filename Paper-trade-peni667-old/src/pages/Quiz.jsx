import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getQuiz } from '../data/curriculum'
import { useLearningProgress } from '../hooks/useLearningProgress'

const Quiz = () => {
  const { quizSlug } = useParams()
  const quiz = getQuiz(quizSlug)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const { saveQuizScore } = useLearningProgress()
  if (!quiz) return <Navigate to="/quizzes" replace />
  const score = quiz.questions.reduce((total, item, index) => total + (answers[index] === item.answer ? 1 : 0), 0)
  const submit = () => { setSubmitted(true); saveQuizScore(quiz.slug, score, quiz.questions.length); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const reset = () => { setAnswers({}); setSubmitted(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="page quiz-page"><Link className="back-link" to="/quizzes">← All checkpoints</Link>
    <header className="quiz-header"><div><span className="eyebrow">{quiz.module} checkpoint</span><h2>{quiz.title}</h2><p>Choose one answer for each question. Explanations appear after submission.</p></div>{submitted && <div className="result-ring"><strong>{score}/{quiz.questions.length}</strong><span>{score === quiz.questions.length ? 'Excellent' : score >= 2 ? 'Passed' : 'Review'}</span></div>}</header>
    <form onSubmit={(event) => { event.preventDefault(); submit() }}>{quiz.questions.map((item, questionIndex) => <fieldset className="question-card" key={item.prompt} disabled={submitted}><legend><span>{questionIndex + 1}</span>{item.prompt}</legend><div className="choice-list">{item.choices.map((choice, choiceIndex) => { const selected = answers[questionIndex] === choiceIndex; const state = submitted ? choiceIndex === item.answer ? 'correct' : selected ? 'incorrect' : '' : selected ? 'selected' : ''; return <label className={state} key={choice}><input type="radio" name={`question-${questionIndex}`} checked={selected} onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: choiceIndex }))} /><span>{choice}</span></label>})}</div>{submitted && <p className="explanation"><strong>{answers[questionIndex] === item.answer ? 'Correct.' : 'Not quite.'}</strong> {item.explanation}</p>}</fieldset>)}
      <div className="quiz-actions">{submitted ? <><button type="button" onClick={reset}>Try again</button><Link className="button-link" to="/learn">Review lessons</Link></> : <button className="primary" type="submit" disabled={Object.keys(answers).length !== quiz.questions.length}>Submit answers</button>}</div>
    </form>
  </div>
}

export default Quiz
