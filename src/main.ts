import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { CatalogoPageComponent } from './app/tienda/catalogo-page.component';
import { BarcodeAdminComponent } from './app/admin/barcode-admin.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: CatalogoPageComponent, title: 'JM-AROMAS | Tienda de perfumes' },
  { path: 'admin', component: BarcodeAdminComponent, title: 'JM-AROMAS | Administración' },
  { path: '**', redirectTo: '' }
];

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]
}).catch(err => console.error('Error al iniciar JM-AROMAS', err));
