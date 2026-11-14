import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AnalyticsService } from './analytics/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    <section *ngIf="analytics.configurado && rutaPublica && (mostrarOpciones || analytics.consentimiento==='sin_decidir')"
      class="aviso-analytics" role="dialog" aria-label="Preferencias de analítica">
      <div>
        <strong>Privacidad en JM-AROMAS</strong>
        <p>¿Nos permites usar Google Analytics para conocer visitas y mejorar la tienda?
          No enviamos DNI, correo, direcciones ni datos de pago. Puedes cambiar de opinión.</p>
      </div>
      <div class="acciones">
        <button type="button" class="rechazar" (click)="rechazar()">No aceptar</button>
        <button type="button" class="aceptar" (click)="aceptar()">Aceptar analítica</button>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}
    .aviso-analytics{position:fixed;z-index:10000;bottom:22px;left:50%;transform:translateX(-50%);
      width:min(690px,calc(100vw - 24px));background:#fffaf5;border:1px solid #dbbfaa;
      color:#46352b;border-radius:11px;box-shadow:0 12px 65px #25160f38;
      display:flex;gap:17px;align-items:center;padding:18px 20px;box-sizing:border-box;font-family:Arial,sans-serif}
    .aviso-analytics strong{font-size:14px}
    .aviso-analytics p{font-size:11px;line-height:1.6;color:#806c5d;margin:6px 0 0}
    .acciones{display:flex;flex-direction:column;gap:7px;flex:none}
    .acciones button{padding:10px 14px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer}
    .rechazar{border:1px solid #cbb5a4;background:#fff;color:#684e3d}
    .aceptar{border:1px solid #553c2a;background:#553c2a;color:#fff}
    /* El aviso se oculta mientras el menú móvil de categorías está abierto. */
    :host:has(.jm-mobile-category-drawer) .aviso-analytics{display:none}
    @media(max-width:640px){.aviso-analytics{flex-direction:column;align-items:stretch;
      bottom:10px;padding:16px}.acciones{flex-direction:row}.acciones button{flex:1}}
  `]
})
export class AppComponent implements OnDestroy {
  readonly analytics=inject(AnalyticsService);
  private readonly router=inject(Router);
  private readonly document=inject(DOCUMENT);
  private readonly suscripcion:Subscription;
  mostrarOpciones=false;
  get rutaPublica():boolean {
    return this.router.url==='/' || this.router.url.startsWith('/checkout');
  }

  constructor() {
    this.suscripcion=this.router.events
      .pipe(filter((evento):evento is NavigationEnd=>evento instanceof NavigationEnd))
      .subscribe(evento=>{
        const ruta=evento.urlAfterRedirects.split('?')[0].split('#')[0];
        this.analytics.paginaPublica(ruta);
        this.actualizarSeo(ruta);
      });
  }
  /**
   * El HTML inicial tiene canonical de portada. Las rutas públicas legales
   * obtienen su propio canonical, y las pantallas de cuenta lo eliminan.
   * Las reglas X-Robots-Tag de Cloudflare añaden noindex a rutas privadas.
   */
  private actualizarSeo(ruta:string):void {
    const paginas: Record<string,{descripcion:string;titulo:string}> = {
      '/': {
        titulo: 'JM Aromas | Tienda de perfumes y fragancias en Perú',
        descripcion: 'Descubre JM Aromas, tienda online de perfumes y fragancias en Perú. Explora nuestro catálogo y coordina tus pedidos de forma sencilla.'
      },
      '/politica-de-privacidad': {
        titulo: 'Política de privacidad | JM Aromas',
        descripcion: 'Consulta cómo JM Aromas protege y utiliza los datos personales de sus clientes.'
      },
      '/terminos-y-condiciones': {
        titulo: 'Términos y condiciones | JM Aromas',
        descripcion: 'Conoce las condiciones de compra, pagos y entregas de la tienda JM Aromas.'
      }
    };
    const pagina=paginas[ruta];
    const enlace=this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const metaRobots=this.document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if(!pagina) {
      enlace?.remove();
      if(metaRobots) metaRobots.content='noindex,nofollow';
      return;
    }
    const canonical=enlace || this.document.createElement('link');
    canonical.rel='canonical';
    canonical.href='https://jmaromas.shop'+ruta;
    if(!enlace) this.document.head.appendChild(canonical);
    if(metaRobots) metaRobots.content='index,follow';
    const descripcion=this.document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if(descripcion) descripcion.content=pagina.descripcion;
    const ogTitulo=this.document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescripcion=this.document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const ogUrl=this.document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if(ogTitulo) ogTitulo.content=pagina.titulo;
    if(ogDescripcion) ogDescripcion.content=pagina.descripcion;
    if(ogUrl) ogUrl.content=canonical.href;
  }

  aceptar():void {this.analytics.aceptar();this.mostrarOpciones=false;}
  rechazar():void {this.analytics.rechazar();this.mostrarOpciones=false;}
  ngOnDestroy():void {this.suscripcion.unsubscribe();}
}
