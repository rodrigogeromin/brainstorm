import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {Extension} from '../src/app/Extension';
import {register} from '../src/argocd/register';
import {validContext, absentContext} from './fixtures/context';
import project from '../extension-project.json';
import type {ExtensionsAPI,ProjectRegistration} from '../src/argocd/types';
const registration=project.registration as unknown as ProjectRegistration;
function expectedArguments(){return (project.hostContract.argumentMap as string[]).map(token=>{
  if(token==='component')return Extension;
  if(token==='component.flyout')return registration.flyout?expect.any(Function):undefined;
  if(token==='callback.shouldDisplay')return expect.any(Function);
  if(token==='registration.iconOptions')return registration.icon?{icon:registration.icon}:undefined;
  if(token==='undefined')return undefined;
  if(token.startsWith('registration.'))return registration[token.slice('registration.'.length) as keyof ProjectRegistration];
  throw new Error(`Unknown host argument: ${token}`);
});}
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
  const methods=['registerResourceExtension','registerSystemLevelExtension','registerStatusPanelExtension','registerTopBarActionMenuExt','registerAppViewExtension'];
  window.extensionsAPI = Object.fromEntries(methods.map(method=>[method,fn])) as unknown as ExtensionsAPI;
  register(Extension);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(...expectedArguments());
  const callback=fn.mock.calls[0].slice(1).find((arg:unknown)=>typeof arg==='function') as (()=>boolean)|undefined;
  if(project.hostContract.argumentMap.includes('callback.shouldDisplay'))expect(callback?.()).toBe(true);
  delete window.extensionsAPI;
  expect(() => register(Extension)).toThrow('extensionsAPI');
});
