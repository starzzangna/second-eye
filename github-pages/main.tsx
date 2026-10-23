import { createRoot } from 'react-dom/client';
import { SecondEyeApp } from '../app/page';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(
  <SecondEyeApp demoOnly assetBase="/second-eye/" />,
);
