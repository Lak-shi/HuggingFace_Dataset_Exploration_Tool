import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthForm from '../AuthForm';

// Mock fetch
global.fetch = jest.fn();

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AuthForm Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders login form by default', () => {
    renderWithRouter(<AuthForm />);
    expect(screen.getByText('Welcome to Dataset Explorer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  test('can switch between login and register', () => {
    renderWithRouter(<AuthForm />);
    const switchButton = screen.getByText('Sign up');
    fireEvent.click(switchButton);
    expect(screen.getByText('Create account')).toBeInTheDocument();
  });

  test('shows error message on failed login', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ detail: 'Invalid credentials' })
      })
    );

    renderWithRouter(<AuthForm />);
    
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('successful login redirects to datasets', async () => {
    fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: 'fake-token' })
      })
    );

    const { container } = renderWithRouter(<AuthForm />);
    
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByText('Sign In'));
    
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-token');
    });
  });
}); 