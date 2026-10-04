import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {Extension} from '../src/app/Extension';
import {register} from '../src/argocd/register';
import {validContext, absentContext} from './fixtures/context';
import project from '../extension-project.json';
test('renders the informational notice without changing host context', () => {
  const before = JSON.stringify(validContext);
  render(<Extension {...validContext} />);
  expect(screen.getByRole('status')).toHaveTextContent('Informativo de demonstração');
  expect(screen.getByText(/resource tab de leitura/)).toBeInTheDocument();
  expect(JSON.stringify(validContext)).toBe(before);
});
test('renders missing context', () => {
  render(<Extension {...absentContext} />);
  expect(screen.getByRole('status')).toHaveTextContent('Informativo de demonstração');
});
test('registers the same component using the host contract', () => {
  const fn = jest.fn();
  window.extensionsAPI = {registerResourceExtension: fn};
  register(Extension);
  expect(fn).toHaveBeenCalledWith(Extension, 'argoproj.io', 'Application', project.registration.tabTitle);
  delete window.extensionsAPI;
  expect(() => register(Extension)).toThrow('extensionsAPI');
});
