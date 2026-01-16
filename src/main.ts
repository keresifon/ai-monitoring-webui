import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Top-level await is not supported in target browsers, promise chain is required
bootstrapApplication(AppComponent, appConfig) // NOSONAR typescript:S6478
  .catch((err) => console.error(err));
