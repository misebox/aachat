/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import './global.css';
import App from './app.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DirectPage } from './pages/DirectPage.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

render(() => (
  <Router root={App}>
    <Route path="/" component={HomePage} />
    <Route path="/direct/:keyword" component={DirectPage} />
  </Router>
), root);
