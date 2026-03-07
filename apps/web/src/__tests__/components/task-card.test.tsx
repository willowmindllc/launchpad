import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TaskCard } from '@/components/board/task-card'
import type { Task } from '@/types/database'

const mockTask: Task = {
  id: '1',
  title: 'Test task',
  description: 'A test description',
  status: 'backlog',
  priority: 'high',
  project_id: '1',
  assignee_id: null,
  due_date: '2025-07-20',
  position: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('Test task')).toBeInTheDocument()
  })

  it('renders priority badge', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText('A test description')).toBeInTheDocument()
  })

  it('renders due date', () => {
    render(<TaskCard task={mockTask} />)
    expect(screen.getByText(/2025/)).toBeInTheDocument()
  })
})
