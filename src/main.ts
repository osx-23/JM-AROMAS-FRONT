import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEs, 'es-PE');
bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideZoneChangeDetection({eventCoalescing:true})]
}).catch(error => console.error('No se pudo iniciar JM-AROMAS', error));
