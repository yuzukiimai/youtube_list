import { videoStatus, formatSeconds, videoKind } from './videoStatus'

test('watched video returns watched', () => {
  expect(videoStatus({ watched: true, progressSeconds: 120 })).toBe('watched')
  expect(videoStatus({ watched: true, progressSeconds: 0 })).toBe('watched')
})

test('partially watched, not finished returns inProgress', () => {
  expect(videoStatus({ watched: false, progressSeconds: 30 })).toBe('inProgress')
})

test('untouched video returns unwatched', () => {
  expect(videoStatus({ watched: false, progressSeconds: 0 })).toBe('unwatched')
})

test('formatSeconds formats minutes and hours', () => {
  expect(formatSeconds(65)).toBe('1:05')
  expect(formatSeconds(3661)).toBe('1:01:01')
})

test('videoKind classifies by duration (3 min threshold)', () => {
  expect(videoKind(45)).toBe('short')
  expect(videoKind(120)).toBe('short')
  expect(videoKind(180)).toBe('short')
  expect(videoKind(181)).toBe('long')
  expect(videoKind(600)).toBe('long')
  expect(videoKind(null)).toBe('unknown')
})

test('videoKind treats #shorts hashtag as short regardless of duration', () => {
  expect(videoKind(61, 'ドッキリw #shorts')).toBe('short')
  expect(videoKind(null, 'タイトル #Shorts')).toBe('short')
  expect(videoKind(600, '長い動画です')).toBe('long')
})
