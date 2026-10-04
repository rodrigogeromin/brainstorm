import React from 'react';
import '@testing-library/jest-dom';
import {render, screen,fireEvent} from '@testing-library/react';
import {Extension,ExtensionFlyout} from '../src/app/Extension';
import {register} from '../src/argocd/register';
import {validContext, absentContext} from './fixtures/context';
import project from '../extension-project.json';
import type {HostContractInput} from '../references/parameters';
const contract=project.hostContract as HostContractInput;
import type {ExtensionsAPI,ProjectRegistration} from '../src/argocd/types';
const registration=project.registration as unknown as ProjectRegistration;
function expectedArguments(){return (contract.argumentMap as string[]).map(token=>{
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
  const callback=fn.mock.calls[0][contract.argumentMap.indexOf('callback.shouldDisplay')] as ((application?:typeof validContext.application)=>boolean)|undefined;
  if(contract.argumentMap.includes('callback.shouldDisplay'))expect(callback?.(validContext.application)).toBe(registration.shouldDisplay??true);
  delete window.extensionsAPI;
  expect(() => register(Extension)).toThrow('extensionsAPI');
});

test('flyout action follows enabled profile and host context',()=>{
 const open=jest.fn();render(<Extension {...validContext} openFlyout={open}/>);
 const button=screen.queryByRole('button',{name:'Open details'});
 if(registration.flyout && ['top-bar-action','status-panel'].includes(project.profile)){expect(button).toBeInTheDocument();fireEvent.click(button!);expect(open).toHaveBeenCalledTimes(1);}else expect(button).not.toBeInTheDocument();
});
test('flyout content receives separate context',()=>{
 render(<ExtensionFlyout application={validContext.application} tree={validContext.tree}/>);
 expect(screen.getByRole('heading',{name:'Extension details'})).toBeInTheDocument();expect(screen.getByText('Healthy')).toBeInTheDocument();
});
