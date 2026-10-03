import {ContextSummary} from '../features/context/components/ContextSummary';
import type {ExtensionProps} from '../argocd/types';
import project from '../../extension-project.json';
import '../styles/extension.css';
export function Extension(props: ExtensionProps) {
  return <section id="argocd-ext-__EXTENSION_NAME__" aria-label={project.registration.tabTitle} tabIndex={0}>
    <h1>{project.registration.tabTitle}</h1>
    <p>{project.description}</p>
    <ContextSummary {...props} />
  </section>;
}
