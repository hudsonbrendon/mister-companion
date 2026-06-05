import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button primitive', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Launch</Button>)
    const btn = screen.getByRole('button', { name: /launch/i })
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports asChild to render a different element', () => {
    render(
      <Button asChild>
        <a href="#go">Go</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: /go/i })).toBeInTheDocument()
  })
})
