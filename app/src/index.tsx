/* @refresh reload */
import { render } from 'solid-js/web';
import './global.css';
import App from './app.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

render(() => <App />, root);
