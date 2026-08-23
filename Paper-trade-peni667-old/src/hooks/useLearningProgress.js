import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'paper-trade-learning-progress'
const emptyProgress = { completedLessons: [], quizScores: {} }

const readProgress = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved && typeof saved === 'object' ? { ...emptyProgress, ...saved } : emptyProgress
  } catch {
    return emptyProgress
  }
}

export const useLearningProgress = () => {
  const [progress, setProgress] = useState(readProgress)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const toggleLesson = useCallback((slug) => {
    setProgress((current) => ({
      ...current,
      completedLessons: current.completedLessons.includes(slug)
        ? current.completedLessons.filter((item) => item !== slug)
        : [...current.completedLessons, slug],
    }))
  }, [])

  const saveQuizScore = useCallback((slug, score, total) => {
    setProgress((current) => ({
      ...current,
      quizScores: { ...current.quizScores, [slug]: { score, total, completedAt: new Date().toISOString() } },
    }))
  }, [])

  return { progress, toggleLesson, saveQuizScore }
}
