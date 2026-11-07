import { useEffect } from 'react'
import { getCourse } from '../../game/courses'
import { useLab } from '../../store/lab'
import { useProgress } from '../../store/progress'

export function CourseGuide({ courseId }: { courseId: string }) {
  const course = getCourse(courseId)
  const device = useLab((s) => s.device)
  const state = useLab((s) => s.state)
  const selected = useLab((s) => s.selected)
  const completedSteps = useProgress((s) => s.courses[courseId] ?? 0)
  const advanceCourse = useProgress((s) => s.advanceCourse)
  const resetCourse = useProgress((s) => s.resetCourse)

  const currentStep = course ? course.steps[completedSteps] : null
  const isFinished = !!course && completedSteps >= course.steps.length

  useEffect(() => {
    if (!course || !currentStep || !state || !device) return
    if (currentStep.check({ state, selected, device })) {
      advanceCourse(course.id, completedSteps + 1)
    }
  }, [course, currentStep, state, selected, device, completedSteps, advanceCourse])

  if (!course) return null

  return (
    <div className="course-guide" role="region" aria-label={`Course: ${course.title}`}>
      <div className="course-guide-header">
        <span className="tag highlight">Course</span>
        <span className="course-step-count">
          {isFinished ? 'Completed' : `Step ${completedSteps + 1} of ${course.steps.length}`}
        </span>
      </div>
      <h4>{course.title}</h4>
      {isFinished ? (
        <div className="course-done-msg">
          <p className="good-text">🎉 Course complete! (+50 XP)</p>
          <p className="course-desc">
            You successfully navigated disassembly, safely isolated electrical power, and removed the lithium-ion
            cell with zero safety violations.
          </p>
          <div className="row">
            <button className="btn" type="button" onClick={() => resetCourse(course.id)}>
              Practice again
            </button>
            <a className="btn primary" href={`#/lab/${device?.id ?? 'galaxy-s23-ultra'}/explore`}>
              Exit course
            </a>
          </div>
        </div>
      ) : currentStep ? (
        <div className="course-step-body">
          <h5>{currentStep.title}</h5>
          <p className="course-instruction">{currentStep.instruction}</p>
          <div className="course-explanation">
            <small>{currentStep.explanation}</small>
          </div>
          <div className="course-progress-bar">
            <div
              className="course-progress-fill"
              style={{ width: `${(completedSteps / course.steps.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
