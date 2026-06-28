import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterChannelForm } from './RegisterChannelForm'

test('renders URL input and submit button', () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  expect(screen.getByPlaceholderText(/youtube.com\/@/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /登録/i })).toBeInTheDocument()
})

test('shows error when URL is empty on submit', async () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /登録/i }))
  expect(screen.getByText(/URLを入力してください/i)).toBeInTheDocument()
})
