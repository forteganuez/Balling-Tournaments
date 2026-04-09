import { createElement, type ReactElement } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

export async function waitFor(assertion: () => void, timeoutMs = 1000, intervalMs = 10) {
  const startedAt = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw error;
      }

      await act(async () => {
        await new Promise((resolve) => globalThis.setTimeout(resolve, intervalMs));
      });
    }
  }
}

export function renderHook<T>(useHook: () => T) {
  let current: T | undefined;
  let renderer!: TestRenderer.ReactTestRenderer;

  function Harness() {
    current = useHook();
    return null;
  }

  act(() => {
    renderer = TestRenderer.create(createElement(Harness));
  });

  return {
    result: {
      get current() {
        if (current === undefined) {
          throw new Error('Hook result is not available yet');
        }

        return current;
      },
    },
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

export function render(element: ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(element);
  });

  return {
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
}
