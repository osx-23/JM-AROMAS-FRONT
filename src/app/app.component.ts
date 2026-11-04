import { CommonModule } from '@angular/common';
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
    <section *ngIf="analytics.configurado && (mostrarOpciones || analytics.consentimiento==='sin_decidir')"
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
    <button type="button" *ngIf="analytics.configurado && analytics.consentimiento!=='sin_decidir' && !mostrarOpciones"
      class="preferencias" (click)="mostrarOpciones=true">Privacidad y analítica</button>
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
    .preferencias{position:fixed;bottom:14px;left:14px;z-index:9999;
      border:1px solid #d6c2b0;border-radius:30px;background:#fffdf9;
      box-shadow:0 4px 14px #2b180f20;font-size:10px;padding:8px 11px;
      color:#7e6551;cursor:pointer}
    @media(max-width:640px){.aviso-analytics{flex-direction:column;align-items:stretch;
      bottom:10px;padding:16px}.acciones{flex-direction:row}.acciones button{flex:1}}
  `]
})
export class AppComponent implements OnDestroy {
  readonly analytics=inject(AnalyticsService);
  private readonly router=inject(Router);
  private readonly suscripcion:Subscription;
  mostrarOpciones=false;

  constructor() {
    this.suscripcion=this.router.events
      .pipe(filter((evento):evento is NavigationEnd=>evento instanceof NavigationEnd))
      .subscribe(evento=>this.analytics.paginaPublica(evento.urlAfterRedirects.split('?')[0].split('#')[0]));
  }
  aceptar():void {this.analytics.aceptar();this.mostrarOpciones=false;}
  rechazar():void {this.analytics.rechazar();this.mostrarOpciones=false;}
  ngOnDestroy():void {this.suscripcion.unsubscribe();}
}
