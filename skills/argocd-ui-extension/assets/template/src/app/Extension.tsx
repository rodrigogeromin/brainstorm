import React from 'react';
import {ContextSummary} from '../features/context/components/ContextSummary';
import type {ExtensionProps,FlyoutProps} from '../argocd/types';
import project from '../../extension-project.json';
import type {ProjectRegistration} from '../argocd/types';
import '../styles/extension.css';
export function Extension(props: ExtensionProps) {
  const registration = project.registration as ProjectRegistration;
  const title = project.profile === 'resource-tab' ? registration.tabTitle : registration.title;
  return <section id="argocd-ext-__EXTENSION_NAME__" aria-label={title} tabIndex={0}>
    <h1>{title}</h1>
    {registration.flyout && (project.profile === 'top-bar-action' || project.profile === 'status-panel') && props.openFlyout && <button type="button" onClick={props.openFlyout}>Open details</button>}
    <p>{project.description}</p>
    <ContextSummary {...props} />
  </section>;
}
export function ExtensionFlyout(props: FlyoutProps) { return <section aria-label="Extension details"><h2>Extension details</h2><ContextSummary {...props} /></section>; }
