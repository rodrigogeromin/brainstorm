import '@testing-library/jest-dom';
import React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import {render, screen, cleanup} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import type {ExtensionProps} from '../src/argocd/types';
import {validContext} from './fixtures/context';
import project from '../extension-project.json';
// Executed only after production build by npm run harness. Uses the host's globals.
test('production bundle registers and renders against simulated host globals', () => {
  let component: React.ComponentType<ExtensionProps> | undefined;
  const globals = window as unknown as Record<string, unknown>;
  globals.React = React;
  globals.ReactDOM = ReactDOM;
  globals.ReactJSXRuntime = ReactJSXRuntime;
  const register = jest.fn((c: React.ComponentType<ExtensionProps>) => {component = c;});
  window.extensionsAPI = {registerResourceExtension: register};
  const frozen = JSON.parse(JSON.stringify(validContext)) as ExtensionProps;
  function freeze(value: unknown) {
    if (value && typeof value === 'object') {
      Object.freeze(value);
      Object.values(value).forEach(freeze);
    }
  }
  freeze(frozen);
  // Indirect eval models the host loading extension JS; this is not Argo CD integration.
  (0, eval)(readFileSync(`dist/resources/extension-${project.name}.js`, 'utf8'));
  expect(register).toHaveBeenCalledWith(expect.any(Function), 'argoproj.io', 'Application', project.registration.tabTitle);
  if (!component) throw new Error('No host registration');
  const Component = component;
  render(<Component {...frozen} />);
  expect(screen.getByText('Healthy')).toBeInTheDocument();
  cleanup();
  render(<Component />);
  expect(screen.getByRole('status')).toHaveTextContent('No context');
  expect(globals.React).toBe(React);
  expect(globals.ReactDOM).toBe(ReactDOM);
  expect(globals.ReactJSXRuntime).toBe(ReactJSXRuntime);
  delete window.extensionsAPI;
});
