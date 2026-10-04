import type {ExtensionProps} from '../argocd/types';
import project from '../../extension-project.json';
import '../styles/extension.css';
export function Extension(props: ExtensionProps) {
  return <section id="argocd-ext-argocd-informativo" aria-label={project.registration.tabTitle} tabIndex={0}>
    <h1>{project.registration.tabTitle}</h1>
    <p className="notice" role="status">Informativo de demonstração</p>
    <p>{project.description}</p>
    <p>Esta aba foi criada com a skill Argo CD UI Extension. Ela demonstra uma resource tab de leitura, sem executar alterações na aplicação ou no cluster.</p>
    <p>Application: {props.application?.metadata?.name ?? 'contexto não fornecido'}</p>
  </section>;
}
