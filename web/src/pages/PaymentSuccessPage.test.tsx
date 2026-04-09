import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/client', () => ({
  api: { get: vi.fn() },
}));

import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import PaymentSuccessPage from './PaymentSuccessPage';

const refetchMock = vi.fn();

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    logout: vi.fn(),
    refetch: refetchMock,
  } as never);
  vi.clearAllMocks();
});

function renderPage() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter>
        <PaymentSuccessPage />
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('PaymentSuccessPage', () => {
  it('shows the success heading', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 50 }, subscription: null },
    });

    const renderer = renderPage();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Payment successful');
  });

  it('shows "Your account has been updated" message', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 50 }, subscription: null },
    });

    const renderer = renderPage();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Your account has been updated');
  });

  it('has a link to /dashboard', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 50 }, subscription: null },
    });

    const renderer = renderPage();
    const links = renderer.root.findAll(
      (node) => node.type === 'a' && node.props.href === '/dashboard'
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it('calls api.get to fetch balance on mount', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 30 }, subscription: null },
    });

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    expect(api.get).toHaveBeenCalledWith('/api/monetization/balance');
  });

  it('shows credits after successful api response', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 42 }, subscription: null },
    });
    refetchMock.mockResolvedValueOnce(undefined);

    const renderer = renderPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('42');
  });

  it('calls refetch after balance is loaded', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { credits: { total: 10 }, subscription: null },
    });
    refetchMock.mockResolvedValueOnce(undefined);

    renderPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(refetchMock).toHaveBeenCalled();
  });

  it('still shows success when api call fails (non-fatal)', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const renderer = renderPage();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Payment successful');
    // credits count not shown when api fails
    expect(json).not.toContain('credits available');
  });

  it('does not show credits count before api responds', () => {
    // Do not resolve the promise — simulates pending state
    vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}));

    const renderer = renderPage();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('credits available');
  });
});
