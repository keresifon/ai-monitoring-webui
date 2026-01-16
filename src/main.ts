import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// NOSONAR: Angular's bootstrapApplication doesn't support top-level await
// The promise chain is the correct and recommended approach for Angular
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
