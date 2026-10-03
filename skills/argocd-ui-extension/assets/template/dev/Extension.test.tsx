import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {Extension} from '../src/app/Extension';
import {register} from '../src/argocd/register';
import {validContext, absentContext} from './fixtures/context';
import project from '../extension-project.json';
test('renders valid immutable host context without changing it', () => {
  const before = JSON.stringify(validContext);
  render(<Extension {...validContext} />);
  expect(screen.getAllByText('example-application')).toHaveLength(2);
  expect(screen.getByText('Healthy')).toBeInTheDocument();
  expect(JSON.stringify(validContext)).toBe(before);
});
test('renders missing context', () => {
  render(<Extension {...absentContext} />);
  expect(screen.getByRole('status')).toHaveTextContent('No context');
});
test('registers the same component using the host contract', () => {
  const fn = jest.fn();
  window.extensionsAPI = {registerResourceExtension: fn};
  register(Extension);
  expect(fn).toHaveBeenCalledWith(Extension, 'argoproj.io', 'Application', project.registration.tabTitle);
  delete window.extensionsAPI;
  expect(() => register(Extension)).toThrow('extensionsAPI');
});
