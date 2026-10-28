import { describe, it, expect, vi } from 'vitest';
import { createKeyboardShortcutListener } from '../hooks/useKeyboardShortcuts';

function mockEvent(opts: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    code: '',
    key: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    target: null,
    ...opts,
  } as unknown as KeyboardEvent;
}

describe('createKeyboardShortcutListener', () => {
  it('calls onPlayPause when Space is pressed outside inputs', () => {
    const onPlayPause = vi.fn();
    const listener = createKeyboardShortcutListener({ onPlayPause });

    const event = mockEvent({ code: 'Space' });
    listener(event);

    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not trigger onPlayPause when typing in an input element', () => {
    const onPlayPause = vi.fn();
    const listener = createKeyboardShortcutListener({ onPlayPause });

    const inputMock = { tagName: 'INPUT' } as unknown as HTMLElement;
    const event = mockEvent({ code: 'Space', target: inputMock });

    listener(event);
    expect(onPlayPause).not.toHaveBeenCalled();
  });

  it('triggers seek relative on ArrowLeft / ArrowRight with shift support', () => {
    const onSeekRelative = vi.fn();
    const listener = createKeyboardShortcutListener({ onSeekRelative });

    // ArrowLeft (-5)
    const leftEvent = mockEvent({ key: 'ArrowLeft' });
    listener(leftEvent);
    expect(onSeekRelative).toHaveBeenCalledWith(-5);

    // Shift + ArrowRight (+15)
    const shiftRightEvent = mockEvent({ key: 'ArrowRight', shiftKey: true });
    listener(shiftRightEvent);
    expect(onSeekRelative).toHaveBeenCalledWith(15);
  });

  it('triggers volume relative on ArrowUp / ArrowDown', () => {
    const onVolumeChangeRelative = vi.fn();
    const listener = createKeyboardShortcutListener({ onVolumeChangeRelative });

    const upEvent = mockEvent({ key: 'ArrowUp' });
    listener(upEvent);
    expect(onVolumeChangeRelative).toHaveBeenCalledWith(5);

    const downEvent = mockEvent({ key: 'ArrowDown' });
    listener(downEvent);
    expect(onVolumeChangeRelative).toHaveBeenCalledWith(-5);
  });

  it('triggers track skipping on Ctrl+ArrowLeft and Ctrl+ArrowRight', () => {
    const onPreviousTrack = vi.fn();
    const onNextTrack = vi.fn();
    const listener = createKeyboardShortcutListener({ onPreviousTrack, onNextTrack });

    const prevEvent = mockEvent({ key: 'ArrowLeft', ctrlKey: true });
    listener(prevEvent);
    expect(onPreviousTrack).toHaveBeenCalledTimes(1);

    const nextEvent = mockEvent({ key: 'ArrowRight', ctrlKey: true });
    listener(nextEvent);
    expect(onNextTrack).toHaveBeenCalledTimes(1);
  });

  it('triggers toggles with Ctrl combinations (M, L, Q, K, S, R)', () => {
    const onMuteToggle = vi.fn();
    const onLyricsToggle = vi.fn();
    const onQueueToggle = vi.fn();
    const onAskSlothOpen = vi.fn();
    const onShuffleToggle = vi.fn();
    const onRepeatCycle = vi.fn();

    const listener = createKeyboardShortcutListener({
      onMuteToggle,
      onLyricsToggle,
      onQueueToggle,
      onAskSlothOpen,
      onShuffleToggle,
      onRepeatCycle,
    });

    listener(mockEvent({ key: 'm', ctrlKey: true }));
    expect(onMuteToggle).toHaveBeenCalledTimes(1);

    listener(mockEvent({ key: 'l', ctrlKey: true }));
    expect(onLyricsToggle).toHaveBeenCalledTimes(1);

    listener(mockEvent({ key: 'q', ctrlKey: true }));
    expect(onQueueToggle).toHaveBeenCalledTimes(1);

    listener(mockEvent({ key: 'k', ctrlKey: true }));
    expect(onAskSlothOpen).toHaveBeenCalledTimes(1);

    listener(mockEvent({ key: 's', ctrlKey: true }));
    expect(onShuffleToggle).toHaveBeenCalledTimes(1);

    listener(mockEvent({ key: 'r', ctrlKey: true }));
    expect(onRepeatCycle).toHaveBeenCalledTimes(1);
  });

  it('triggers onEscape even if focused on an input', () => {
    const onEscape = vi.fn();
    const listener = createKeyboardShortcutListener({ onEscape });

    const blurSpy = vi.fn();
    const inputMock = { tagName: 'INPUT', blur: blurSpy } as unknown as HTMLElement;
    const event = mockEvent({ key: 'Escape', target: inputMock });

    listener(event);
    expect(blurSpy).toHaveBeenCalled();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('handles macOS metaKey modifier equivalently to ctrlKey for shortcuts', () => {
    const onLyricsToggle = vi.fn();
    const onQueueToggle = vi.fn();
    const listener = createKeyboardShortcutListener({ onLyricsToggle, onQueueToggle });

    // Cmd + L (macOS)
    listener(mockEvent({ key: 'l', metaKey: true }));
    expect(onLyricsToggle).toHaveBeenCalledTimes(1);

    // Cmd + Q (macOS)
    listener(mockEvent({ key: 'q', metaKey: true }));
    expect(onQueueToggle).toHaveBeenCalledTimes(1);
  });

  it('ignores standard non-modifier hotkeys when inside contentEditable elements', () => {
    const onPlayPause = vi.fn();
    const listener = createKeyboardShortcutListener({ onPlayPause });

    const editableMock = { isContentEditable: true } as unknown as HTMLElement;
    listener(mockEvent({ code: 'Space', target: editableMock }));

    expect(onPlayPause).not.toHaveBeenCalled();
  });
});
