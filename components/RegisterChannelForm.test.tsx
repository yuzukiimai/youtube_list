import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterChannelForm } from './RegisterChannelForm'

beforeEach(() => {
  global.fetch = vi.fn()
})

test('renders input and submit button (検索 by default)', () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  expect(screen.getByPlaceholderText(/チャンネル名/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /検索/ })).toBeInTheDocument()
})

test('shows error when input is empty on submit', async () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  await userEvent.click(screen.getByRole('button', { name: /検索/ }))
  expect(screen.getByText(/入力してください/i)).toBeInTheDocument()
})

test('button label switches to 追加 for a direct URL/@handle input', async () => {
  render(<RegisterChannelForm onRegistered={() => {}} />)
  await userEvent.type(screen.getByPlaceholderText(/チャンネル名/i), '@hikakin')
  expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument()
})

test('direct input (@handle) posts to add endpoint', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
  const onRegistered = vi.fn()
  render(<RegisterChannelForm onRegistered={onRegistered} />)

  await userEvent.type(screen.getByPlaceholderText(/チャンネル名/i), '@hikakin')
  await userEvent.click(screen.getByRole('button', { name: /追加/i }))

  await waitFor(() => expect(onRegistered).toHaveBeenCalled())
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/channels')
})

test('plain name triggers a search and lists candidates', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { channelId: 'UCx', name: 'ヒカキン', thumbnailUrl: 'https://e/t.jpg', description: 'desc' },
    ],
  } as Response)
  render(<RegisterChannelForm onRegistered={() => {}} />)

  await userEvent.type(screen.getByPlaceholderText(/チャンネル名/i), 'ヒカキン')
  await userEvent.click(screen.getByRole('button', { name: /検索/ }))

  await waitFor(() => expect(screen.getByText('ヒカキン')).toBeInTheDocument())
  expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/api/channels/search?q=')
})
