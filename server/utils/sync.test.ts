import { describe, expect, it } from 'vitest';
import { desiredSlackStatus } from './sync';

describe('desiredSlackStatus', () => {
  it('formats a playing track for Slack', () => {
    const status = desiredSlackStatus({
      id: 'track-1',
      kind: 'track',
      title: 'Veridis Quo',
      artist: 'Daft Punk',
      album: 'Discovery',
      isPlaying: true,
      observedAt: 0,
    });

    expect(status).toEqual({
      statusText: '🎧 Veridis Quo — Daft Punk',
      statusEmoji: ':headphones:',
    });
  });

  it('uses podcast formatting for episodes', () => {
    const status = desiredSlackStatus({
      id: 'episode-1',
      kind: 'episode',
      title: 'Episode 42',
      artist: 'Le podcast',
      album: 'Le podcast',
      isPlaying: false,
      observedAt: 0,
    });

    expect(status?.statusText).toBe('🎙️ Episode 42 — Le podcast');
    expect(status?.statusEmoji).toBe(':studio_microphone:');
  });

  it('keeps status text within Slack’s 100-character limit', () => {
    const status = desiredSlackStatus({
      id: 'track-2',
      kind: 'track',
      title: 'A'.repeat(180),
      artist: 'B'.repeat(180),
      album: 'Album',
      isPlaying: true,
      observedAt: 0,
    });

    expect(Array.from(status?.statusText || '').length).toBeLessThanOrEqual(100);
    expect(status?.statusText.endsWith('…')).toBe(true);
  });

  it('returns no desired status when playback is empty', () => {
    expect(desiredSlackStatus(null)).toBeNull();
  });
});
