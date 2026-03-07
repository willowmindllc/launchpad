import { Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function exportTasksCsv(tasks: Task[], projectName: string) {
  const headers = ['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Created', 'Updated']

  const rows = tasks.map((task) => [
    escapeCsvField(task.title),
    escapeCsvField(task.description ?? ''),
    escapeCsvField(TASK_STATUS_LABELS[task.status]),
    escapeCsvField(TASK_PRIORITY_LABELS[task.priority]),
    escapeCsvField(formatDate(task.due_date)),
    escapeCsvField(formatDate(task.created_at)),
    escapeCsvField(formatDate(task.updated_at)),
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  const date = new Date().toISOString().split('T')[0]
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  link.href = url
  link.download = `${safeName}-tasks-${date}.csv`
  link.click()

  URL.revokeObjectURL(url)
}
