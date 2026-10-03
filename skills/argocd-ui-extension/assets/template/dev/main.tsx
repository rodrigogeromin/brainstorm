import {createRoot} from 'react-dom/client';
import {Extension} from '../src/app/Extension';
import {validContext, absentContext} from './fixtures/context';
import './preview.css';
const query = new URLSearchParams(location.search);
const element = document.getElementById('root');
if (!element) throw new Error('Missing preview root');
if (query.get('theme') === 'dark') element.dataset.theme = 'dark';
createRoot(element).render(<div className="preview-panel" style={{width: query.get('width') ?? '100%', height: query.get('height') ?? '100%'}}>
  <Extension {...(query.get('fixture') === 'absent' ? absentContext : validContext)} />
</div>);
