import { Suspense } from "solid-js";
import { css } from '../styled-system/css'

import "./app.css";

export default function App() {
  return (
    <Suspense>
      <div class={css({ fontSize: '2xl', fontWeight: 'bold' })}>
        Hello 🐼!
      </div>
    </Suspense>
  );
}
