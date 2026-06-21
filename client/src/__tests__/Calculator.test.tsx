import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarbonCalculator } from '../pages/Calculator';
import '@testing-library/jest-dom';

describe('CarbonCalculator Accessibility', () => {
  it('should render with proper semantic structure', () => {
    render(<CarbonCalculator />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(3); // 3 fieldsets
  });

  it('should have descriptive labels for all inputs', () => {
    render(<CarbonCalculator />);
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach((input) => {
      expect(input).toHaveAccessibleName();
    });
  });

  it('should be keyboard navigable (Tab order)', async () => {
    const user = userEvent.setup();
    render(<CarbonCalculator />);
    const submitButton = screen.getByRole('button', { name: /calculate/i });
    let currentElement = document.body;
    while (currentElement !== submitButton && currentElement.nextSibling) {
      await user.tab();
      currentElement = document.activeElement as HTMLElement;
    }
    expect(document.activeElement).toBe(submitButton);
  });

  it('should display error messages in aria-live region', async () => {
    const user = userEvent.setup();
    render(<CarbonCalculator />);
    const carMilesInput = screen.getByLabelText(/Car Travel/i);
    await user.clear(carMilesInput);
    await user.type(carMilesInput, '-100');
    const submitButton = screen.getByRole('button', { name: /calculate/i });
    await user.click(submitButton);
    // Since we throw Error on submit, it will appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should announce success to screen readers', async () => {
    const user = userEvent.setup();
    render(<CarbonCalculator />);
    const carMilesInput = screen.getByLabelText(/Car Travel/i);
    await user.clear(carMilesInput);
    await user.type(carMilesInput, '500');

    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ total: 250 }) })
    ) as jest.Mock;

    const submitButton = screen.getByRole('button', { name: /calculate/i });
    await user.click(submitButton);

    await waitFor(() => {
      const statusMessage = screen.getByRole('status');
      expect(statusMessage).toHaveTextContent('successfully');
    });
  });
});
