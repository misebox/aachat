/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import './global.css';
import App from './app';
import { HomePage } from './pages/HomePage';
import { DirectPage } from './pages/DirectPage';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

render(() => (
  <Router root={App}>
    <Route path="/" component={HomePage} />
    <Route path="/direct/:keyword" component={DirectPage} />
  </Router>
), root);
