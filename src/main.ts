import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { CatalogoPageComponent } from './app/tienda/catalogo-page.component';
import { BarcodeAdminComponent } from './app/admin/inventario/barcode-admin.component';
import { CheckoutPageComponent } from './app/checkout/checkout-page.component';
import { PedidoEstadoComponent } from './app/checkout/pedido-estado.component';
import { LoginPageComponent } from './app/auth/login-page.component';
import { AuthCallbackComponent } from './app/auth/auth-callback.component';
import { adminGuard } from './app/auth/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: CatalogoPageComponent, title: 'JM-AROMAS | Tienda de perfumes' },
  { path: 'ingresar', component: LoginPageComponent, title: 'JM-AROMAS | Iniciar sesión' },
  { path: 'auth/callback', component: AuthCallbackComponent, title: 'JM-AROMAS | Verificando sesión' },
  { path: 'admin', component: BarcodeAdminComponent, canActivate: [adminGuard], title: 'JM-AROMAS | Administración' },
  { path: 'checkout', component: CheckoutPageComponent, title: 'JM-AROMAS | Tu pedido' },
  { path: 'pedido/:id', component: PedidoEstadoComponent, title: 'JM-AROMAS | Seguimiento' },
  { path: '**', redirectTo: '' }
];

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]
}).catch(err => console.error('Error al iniciar JM-AROMAS', err));
