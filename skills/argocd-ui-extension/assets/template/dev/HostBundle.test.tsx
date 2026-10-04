import '@testing-library/jest-dom';
import React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import {render, screen, cleanup} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import type {ExtensionProps} from '../src/argocd/types';
import {validContext} from './fixtures/context';
import project from '../extension-project.json';
import type {ExtensionsAPI,ProjectRegistration} from '../src/argocd/types';
const registration=project.registration as unknown as ProjectRegistration;
function expectedArguments(){return (project.hostContract.argumentMap as string[]).map(token=>{
  if(token==='component')return expect.any(Function);
  if(token==='component.flyout')return registration.flyout?expect.any(Function):undefined;
  if(token==='callback.shouldDisplay')return expect.any(Function);
  if(token==='registration.iconOptions')return registration.icon?{icon:registration.icon}:undefined;
  if(token==='undefined')return undefined;
  if(token.startsWith('registration.'))return registration[token.slice('registration.'.length) as keyof ProjectRegistration];
  throw new Error(`Unknown host argument: ${token}`);
});}
// Executed only after production build by npm run harness. Uses the host's globals.
test('production bundle registers and renders against simulated host globals', () => {
  let component: React.ComponentType<ExtensionProps> | undefined;
  const globals = window as unknown as Record<string, unknown>;
  globals.React = React;
  globals.ReactDOM = ReactDOM;
  globals.ReactJSXRuntime = ReactJSXRuntime;
  const register = jest.fn((c: React.ComponentType<ExtensionProps>) => {component = c;});
  window.extensionsAPI = Object.fromEntries(['registerResourceExtension','registerSystemLevelExtension','registerStatusPanelExtension','registerTopBarActionMenuExt','registerAppViewExtension'].map(method=>[method,register])) as unknown as ExtensionsAPI;
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
  expect(register).toHaveBeenCalledWith(...expectedArguments());
  if (!component) throw new Error('No host registration');
  const Component = component;
  render(<Component {...frozen} />);
  expect(screen.getByText('Healthy')).toBeInTheDocument();
  cleanup();
  render(<Component />);
  expect(screen.getByRole('status')).toHaveTextContent('No context');
  expect(globals.React).toBe(React);
  expect(globals.ReactDOM).toBe(ReactDOM);
  if(project.hostContract.globals.includes('ReactJSXRuntime'))expect(globals.ReactJSXRuntime).toBe(ReactJSXRuntime);
  delete window.extensionsAPI;
});
