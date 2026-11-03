import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface EstadoPedido {
  codigo:string;estado:string;estadoPago:string;metodoPago:string;
  totalProductos:number;creadoEn:string;expiraEn:string|null;
}
@Component({
  selector:'app-pedido-estado',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
    <main class="page">
      <a routerLink="/" class="back">← JM-AROMAS</a>
      <div class="card">
        <span class="eyebrow">SEGUIMIENTO PRIVADO</span>
        <h1>Estado de tu pedido</h1>
        <p *ngIf="cargando">Consultando información...</p>
        <p *ngIf="error" class="error" role="alert">{{error}}</p>
        <ng-container *ngIf="pedido as p">
          <strong class="code">{{p.codigo}}</strong>
          <div class="state"><span>Pedido</span><b>{{p.estado}}</b></div>
          <div class="state"><span>Pago</span><b [class.paid]="p.estadoPago==='PAGADO'">{{etiquetaPago(p.estadoPago)}}</b></div>
          <div class="state"><span>Medio</span><b>{{p.metodoPago}}</b></div>
          <div class="state"><span>Total de productos</span><b>{{p.totalProductos | currency:'PEN':'symbol':'1.2-2'}}</b></div>
          <p class="info" *ngIf="p.estadoPago==='PENDIENTE_CONFIRMACION'">
            Hemos recibido tu comprobante. La administradora revisará el abono en Yape o su cuenta bancaria.
          </p>
          <p class="info" *ngIf="p.estadoPago==='PAGADO'">
            ¡Pago confirmado por la tienda! Tu pedido ya puede continuar su preparación.
          </p>
          <p class="info warning" *ngIf="p.estadoPago==='RECHAZADO'">
            El comprobante fue rechazado. Contacta a la tienda para resolverlo o adjunta una nueva evidencia antes de que venza la reserva.
          </p>
          <p class="info warning" *ngIf="p.estado==='CANCELADO'">
            El pedido fue cancelado o venció la reserva. Debes iniciar una nueva compra.
          </p>
          <p class="info" *ngIf="p.metodoPago==='COORDINAR_WHATSAPP' && p.estado==='PENDIENTE'">
            Tu pedido está pendiente de coordinación por WhatsApp.
          </p>
        </ng-container>
        <button *ngIf="token" type="button" (click)="consultar()" class="button">Actualizar estado ↻</button>
        <button type="button" (click)="copiarEnlace()" *ngIf="token" class="link">Copiar enlace de seguimiento</button>
        <p class="small">Conserva este enlace privado. No compartas el código de acceso con otras personas.</p>
      </div>
    </main>
  `,
  styles:[`
    :host{display:block;background:#f6f0e9;min-height:100vh;font-family:'DM Sans',sans-serif;color:#382d25}
    .page{max-width:650px;margin:auto;padding:35px 18px}.back{font-size:12px;color:#74523e;text-decoration:none}
    .card{margin-top:22px;padding:33px;background:white;border:1px solid #e5d8cb;border-radius:12px;box-shadow:0 10px 30px #0001}
    .eyebrow{color:#9e7052;font-size:11px;letter-spacing:.18em;font-weight:700}
    h1{font:500 36px 'Playfair Display',Georgia,serif;margin:11px 0 23px}
    .code{font-size:18px;letter-spacing:.04em;color:#77513a;display:block;margin-bottom:20px}
    .state{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #ede2d8;padding:17px 0;font-size:13px}
    .state b{color:#986c4b;overflow-wrap:anywhere;text-align:right}.state .paid{color:#3c854f}
    .info{padding:16px;background:#f2f7ef;border-left:3px solid #7cab75;font-size:12px;line-height:1.7;margin-top:24px}
    .warning{background:#fff6ed;border-color:#d8a079}
    .button{width:100%;background:#3d3027;color:white;border:0;padding:16px;margin-top:23px;font-size:13px;cursor:pointer}
    .link{background:none;border:0;color:#80563f;text-decoration:underline;margin-top:19px;cursor:pointer}
    .small{font-size:11px;line-height:1.7;color:#9b8b7e;margin-top:22px}
    .error{color:#a02f2f;background:#fff2ee;padding:16px;font-size:13px}
    @media(max-width:480px){.card{padding:22px}h1{font-size:30px}}
  `]
})
export class PedidoEstadoComponent implements OnInit {
  private readonly http=inject(HttpClient);
  private readonly ruta=inject(ActivatedRoute);
  pedido:EstadoPedido|null=null;
  cargando=false;
  error='';
  id='';
  token='';
  ngOnInit():void{
    this.id=this.ruta.snapshot.paramMap.get('id')||'';
    const fragmento=this.ruta.snapshot.fragment||'';
    this.token=fragmento.startsWith('token=')?decodeURIComponent(fragmento.slice(6)):
      sessionStorage.getItem('jm_pedido_token_'+this.id)||'';
    if(this.token){sessionStorage.setItem('jm_pedido_token_'+this.id,this.token);void this.consultar();}
    else this.error='No se encontró el acceso privado a este pedido. Abre el enlace de seguimiento que guardaste.';
  }
  async consultar():Promise<void>{
    if(!this.id||!this.token)return;
    this.cargando=true;this.error='';
    try{
      this.pedido=await firstValueFrom(this.http.get<EstadoPedido>(
        environment.apiBaseUrl+'/checkout/pedidos/'+encodeURIComponent(this.id),
        {headers:new HttpHeaders({'X-Pedido-Token':this.token})}
      ));
    }catch{
      this.error='No se pudo consultar el pedido. Revisa el enlace privado y la conexión con la API.';
    }finally{this.cargando=false;}
  }
  etiquetaPago(v:string):string{
    return ({PENDIENTE:'Pendiente',PENDIENTE_CONFIRMACION:'Pendiente de confirmación',
      PAGADO:'Confirmado',RECHAZADO:'Comprobante rechazado',ANULADO:'Anulado'} as Record<string,string>)[v]||v;
  }
  copiarEnlace():void{
    void navigator.clipboard.writeText(window.location.origin+'/pedido/'+this.id+
      '#token='+encodeURIComponent(this.token));
  }
}
