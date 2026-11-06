import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

/**
 * Estructura única para toda el área de administración.
 * La navegación permanece montada mientras cambian las rutas hijas.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly analyticsUrl='https://analytics.google.com/';
  readonly menus=[
    { titulo:'Resumen', ruta:'/admin/dashboard', icono:'◫' },
    { titulo:'Inventario', ruta:'/admin/inventario', icono:'▥' },
    { titulo:'Pedidos y pagos', ruta:'/admin/pedidos', icono:'◇' },
    { titulo:'Productos y ofertas', ruta:'/admin/productos', icono:'✦' },
    { titulo:'Boletas electrónicas', ruta:'/admin/boletas', icono:'▤' }
  ];

  minimizado=false;
  movilAbierto=false;
  cerrandoSesion=false;

  ngOnInit():void {
    // Solo persiste la preferencia visual, nunca credenciales.
    try { this.minimizado=localStorage.getItem('jm-admin-menu-minimizado')==='true'; }
    catch { this.minimizado=false; }
  }
  alternarMenu():void {
    this.minimizado=!this.minimizado;
    try { localStorage.setItem('jm-admin-menu-minimizado',String(this.minimizado)); } catch {}
  }
  alternarMovil():void { this.movilAbierto=!this.movilAbierto; }
  cerrarMovil():void { this.movilAbierto=false; }
  @HostListener('document:keydown.escape')
  cerrarConEscape():void { this.cerrarMovil(); }

  async salir():Promise<void> {
    if(this.cerrandoSesion)return;
    this.cerrandoSesion=true;
    try{
      await this.auth.cerrarSesion();
      await this.router.navigateByUrl('/');
    }catch{
      this.cerrandoSesion=false;
    }
  }
}
