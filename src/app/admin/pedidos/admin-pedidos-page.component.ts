import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { AdminMediosComponent } from '../pagos/admin-medios.component';

/** Sección dedicada: nunca carga el escáner ni el editor de productos. */
@Component({
  selector:'app-admin-pedidos-page',
  standalone:true,
  imports:[CommonModule,RouterLink,AdminMediosComponent],
  template:`
    <main class="pedidos-page">
      <header class="page-heading">
        <span class="eyebrow">JM AROMAS / CONFIGURACIÓN</span>
        <h1>Métodos <em>de pago.</em></h1>
        <p>Configura Yape, transferencias bancarias y WhatsApp. Los pedidos y las ventas se consultan desde «Ventas y pedidos».</p>
      </header>
      <div *ngIf="cargando" class="feedback">Comprobando acceso administrativo…</div>
      <div *ngIf="error" class="feedback error" role="alert">{{error}}
        <a routerLink="/ingresar">Iniciar sesión</a>
      </div>
      <ng-container *ngIf="accessToken">
        <div class="contenido-medios">
          <app-admin-medios [accessToken]="accessToken"></app-admin-medios>
        </div>
      </ng-container>
    </main>
  `,
  styles:[`
    :host{display:block;min-width:0}
    .pedidos-page{max-width:1360px;margin:0 auto;padding:28px clamp(15px,3.2vw,45px) 65px}
    .page-heading{padding:12px 0 27px}
    .eyebrow{letter-spacing:.17em;color:#a06f50;font-size:10px;font-weight:800}
    h1{font:500 clamp(33px,4vw,52px)/1.17 'Playfair Display',Georgia,serif;
      margin:13px 0;color:#423127}
    h1 em{color:#996a4b;font-weight:400}
    .page-heading p{font-size:13px;color:#827368;line-height:1.75;max-width:700px}
    .feedback{border-radius:13px;padding:23px;background:#f2e9df;color:#70523d;font-size:13px}
    .feedback.error{background:#fff0ec;color:#a14137}
    .feedback a{color:inherit;margin-left:12px;text-decoration:underline}
    .ajustes-medios{margin:4px 0 24px;border:1px solid #e7d9cd;border-radius:15px;
      background:#fff;overflow:hidden}
    .ajustes-medios>summary{cursor:pointer;padding:20px 24px;
      font-weight:750;color:#654735;font-size:14px}
    .ajustes-medios>summary span{font-weight:400;font-size:12px;color:#9d8674;margin-left:10px}
    .contenido-medios{padding:0 12px 16px}
    .ajustes-medios[open]>summary{border-bottom:1px solid #ede2d6;background:#fcfaf7}
    @media(max-width:640px){.pedidos-page{padding:19px 12px 45px}}
  `]
})
export class AdminPedidosPageComponent implements OnInit {
  private readonly auth=inject(AuthService);
  private readonly cdr=inject(ChangeDetectorRef);
  accessToken='';
  cargando=true;
  error='';
  async ngOnInit():Promise<void>{
    try{
      const sesion=await this.auth.sesion();
      if(!sesion)throw new Error('Sin sesión');
      this.accessToken=sesion.access_token;
    }catch{
      this.error='No fue posible comprobar tu sesión administrativa.';
    }finally{
      this.cargando=false;
      this.cdr.markForCheck();
    }
  }
}
