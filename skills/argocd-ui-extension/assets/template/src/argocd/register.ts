import type {ComponentType} from 'react';
import type {ExtensionProps} from './types';
import project from '../../extension-project.json';
export function register(component: ComponentType<ExtensionProps>): void {
  if (!window.extensionsAPI) throw new Error('Argo CD extensionsAPI is unavailable; use npm run dev for preview');
  window.extensionsAPI.registerResourceExtension(component, project.registration.group, project.registration.kind, project.registration.tabTitle);
}
