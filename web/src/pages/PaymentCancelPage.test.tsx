import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import PaymentCancelPage from './PaymentCancelPage';

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter>
        <PaymentCancelPage />
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('PaymentCancelPage', () => {
  it('shows the cancelled heading', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Payment cancelled');
  });

  it('informs the user no charges were made', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('No charges were made');
  });

  it('has a link back to /pricing', () => {
    const renderer = render();
    const links = renderer.root.findAll(
      (node) => node.type === 'a' && node.props.href === '/pricing'
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it('link text is "Back to Pricing"', () => {
    const renderer = render();
    const link = renderer.root.find(
      (node) => node.type === 'a' && node.props.href === '/pricing'
    );
    expect(JSON.stringify(link.children)).toContain('Back to Pricing');
  });
});
