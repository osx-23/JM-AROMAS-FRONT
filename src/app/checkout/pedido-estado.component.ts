import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

interface EstadoPedido {
  codigo:string;estado:string;estadoPago:string;metodoPago:string;
  totalProductos:number;creadoEn:string;expiraEn:string|null;
  telefonoWhatsapp:string|null;
  numeroYape:string|null;qrUrl:string|null;titular:string|null;
  banco:string|null;numeroCuenta:string|null;cci:string|null;
  articulos?:{nombre:string;cantidad:number;totalLinea:number}[];
  historial?:{estadoAnterior:string|null;estadoNuevo:string;observacion:string|null;creadoEn:string}[];
}
@Component({
  selector:'app-pedido-estado',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
    <main class="page">
      <a routerLink="/" class="back">← JM-AROMAS</a>
      <a routerLink="/mi-perfil" class="back volver-pedidos">Mis pedidos ↗</a>
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
          <div *ngIf="pPermiteComprobante()" class="reintento">
            <h3>Datos para completar tu pago</h3>
            <ng-container *ngIf="p.metodoPago==='YAPE'">
              <p><b>Yape:</b> {{p.numeroYape || 'Consulta con la tienda'}} — {{p.titular}}</p>
              <img *ngIf="p.qrUrl" [src]="p.qrUrl" alt="QR del Yape de JM-AROMAS" class="qr-pago">
            </ng-container>
            <ng-container *ngIf="p.metodoPago==='TRANSFERENCIA'">
              <p><b>Banco:</b> {{p.banco}}</p>
              <p><b>Titular:</b> {{p.titular}}</p>
              <p><b>Número de cuenta:</b> {{p.numeroCuenta || 'Consulta con la tienda'}}</p>
              <p *ngIf="p.cci"><b>CCI:</b> {{p.cci}}</p>
            </ng-container>
            <p><b>Importe de productos:</b> {{p.totalProductos | currency:'PEN':'symbol':'1.2-2'}}
              (envío por coordinar)</p>
          </div>
          <div *ngIf="p.metodoPago==='COORDINAR_WHATSAPP' && p.estado!=='CANCELADO'"
               class="reintento">
            <p><b>¿Todavía no enviaste tu pedido por WhatsApp?</b></p>
            <p>Puedes abrir nuevamente la conversación con el código del pedido y su resumen.
               Pulsa Enviar en WhatsApp para contactar con la tienda.</p>
            <a *ngIf="urlWhatsapp()" [href]="urlWhatsapp()"
               target="_blank" rel="noopener noreferrer" class="button enlace-whatsapp">
               Abrir WhatsApp y enviar ↗
            </a>
          </div>
        </ng-container>
        <div class="reintento" *ngIf="token && pPermiteComprobante()">
          <p><b>¿Necesitas adjuntar o reemplazar tu comprobante?</b></p>
          <p>Si aún no lo enviaste o fue rechazado, puedes subir otra captura mientras tu reserva esté vigente.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="elegirArchivo($event)"
            aria-label="Seleccionar nueva evidencia de pago">
          <button type="button" class="button" [disabled]="!archivo || enviando" (click)="subirComprobante()">
            {{enviando?'Subiendo...':'Enviar evidencia para revisión'}}
          </button>
        </div>
        <section *ngIf="pedido?.historial?.length" class="timeline" aria-labelledby="historial-titulo">
          <h2 id="historial-titulo">Movimientos del pedido</h2>
          <ol>
            <li *ngFor="let h of pedido?.historial">
              <span class="timeline-punto" aria-hidden="true"></span>
              <div><strong>{{h.estadoNuevo==='PENDIENTE'?'Pedido pendiente':h.estadoNuevo==='PREPARANDO'?'En preparación':h.estadoNuevo==='ENTREGADO'?'Entregado':h.estadoNuevo==='CANCELADO'?'Cancelado':h.estadoNuevo==='CONFIRMADO'?'Pedido confirmado':h.estadoNuevo==='CONTACTADO'?'En coordinación':h.estadoNuevo}}</strong>
                <time>{{h.creadoEn | date:'dd/MM/yyyy HH:mm'}}</time>
                <p *ngIf="h.observacion">{{h.observacion}}</p>
              </div>
            </li>
          </ol>
        </section>
        <button *ngIf="pedido" type="button" (click)="consultar()" class="button">Actualizar estado ↻</button>
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
    .enlace-whatsapp{display:block;text-align:center;text-decoration:none;box-sizing:border-box}
    .qr-pago{display:block;width:190px;max-width:100%;height:190px;object-fit:contain;padding:10px;background:#fff;margin:12px auto}
    .reintento{margin-top:20px;padding:16px;background:#fbf4eb;border:1px solid #ebdbc8}.reintento p{font-size:12px;line-height:1.6}.reintento input{display:block;max-width:100%;font-size:11px}
    .volver-pedidos{float:right}.timeline{padding-top:25px;margin-top:26px;border-top:1px solid #eee1d5}
    .timeline h2{font:500 23px 'Playfair Display',Georgia,serif;margin:0 0 20px}
    .timeline ol{list-style:none;padding:0;margin:0}.timeline li{display:flex;align-items:flex-start;gap:14px;position:relative;padding-bottom:20px}
    .timeline li:after{content:'';position:absolute;top:14px;left:6px;bottom:0;border-left:1px solid #d9c4b1}
    .timeline li:last-child:after{display:none}.timeline-punto{flex:none;width:13px;height:13px;border-radius:50%;background:#b58b6b;border:3px solid #f7ece0;position:relative;z-index:1}
    .timeline strong{display:block;font-size:13px;color:#48372c}
    .timeline time{display:block;font-size:11px;color:#9e8777;margin:5px 0}
    .timeline p{font-size:12px;color:#786658;line-height:1.6;margin:7px 0 0}
    @media(max-width:480px){.card{padding:22px}h1{font-size:30px}}
  `]
})
export class PedidoEstadoComponent implements OnInit {
  private readonly http=inject(HttpClient);
  private readonly ruta=inject(ActivatedRoute);
  private readonly auth=inject(AuthService);
  pedido:EstadoPedido|null=null;
  cargando=false;
  error='';
  id='';
  token='';
  archivo:File|null=null;
  enviando=false;
  ngOnInit():void{
    this.id=this.ruta.snapshot.paramMap.get('id')||'';
    const fragmento=this.ruta.snapshot.fragment||'';
    this.token=fragmento.startsWith('token=')?decodeURIComponent(fragmento.slice(6)):
      sessionStorage.getItem('jm_pedido_token_'+this.id)||'';
    if(this.token) sessionStorage.setItem('jm_pedido_token_'+this.id,this.token);
    // También permite consultar pedidos propios al entrar desde Mi perfil,
    // aun en dispositivos donde no se guardó el token de invitado.
    void this.consultar();
  }
  async consultar():Promise<void>{
    if(!this.id)return;
    this.cargando=true;this.error='';
    try{
      const sesion=await this.auth.sesion();
      if(!this.token && !sesion) {
        this.error='Para ver este pedido inicia sesión con Google o abre tu enlace privado de seguimiento.';
        return;
      }
      let cabeceras=new HttpHeaders();
      if(this.token) cabeceras=cabeceras.set('X-Pedido-Token',this.token);
      if(sesion) cabeceras=cabeceras.set('Authorization','Bearer '+sesion.access_token);
      this.pedido=await firstValueFrom(this.http.get<EstadoPedido>(
        environment.apiBaseUrl+'/checkout/pedidos/'+encodeURIComponent(this.id),
        {headers:cabeceras}
      ));
    }catch{
      this.error='No se pudo consultar el pedido. Verifica tu sesión o enlace privado y la conexión con la API.';
    }finally{this.cargando=false;}
  }
  urlWhatsapp():string {
    const p=this.pedido;
    const telefono=p?.telefonoWhatsapp?.replace(/\D/g,'');
    if(!p || !telefono || p.metodoPago!=='COORDINAR_WHATSAPP')return '';
    const moneda=(n:number)=>new Intl.NumberFormat('es-PE',{
      style:'currency',currency:'PEN'}).format(Number(n));
    const lineas=(p.articulos||[]).map(i=>
      '- '+i.nombre+' × '+i.cantidad+' — '+moneda(i.totalLinea)
    ).join(String.fromCharCode(10));
    const mensaje=[
      'Hola, JM-AROMAS. Quiero coordinar mi pedido.',
      '*Pedido:* '+p.codigo,
      '*Productos:*',
      lineas,
      '*Total de productos:* '+moneda(p.totalProductos),
      'El costo de envío se coordina aparte.'
    ].join(String.fromCharCode(10));
    return 'https://wa.me/'+telefono+'?text='+encodeURIComponent(mensaje);
  }

  etiquetaPago(v:string):string{
    return ({PENDIENTE:'Pendiente',PENDIENTE_CONFIRMACION:'Pendiente de confirmación',
      PAGADO:'Confirmado',RECHAZADO:'Comprobante rechazado',ANULADO:'Anulado'} as Record<string,string>)[v]||v;
  }
  pPermiteComprobante():boolean{
    const p=this.pedido;
    return !!p && p.estado==='PENDIENTE' &&
      ['YAPE','TRANSFERENCIA'].includes(p.metodoPago) &&
      ['PENDIENTE','RECHAZADO'].includes(p.estadoPago);
  }
  elegirArchivo(event:Event):void{
    const f=(event.target as HTMLInputElement).files?.[0];
    if(f && ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size<=5*1024*1024){
      this.archivo=f;this.error='';
    }else{
      this.archivo=null;
      this.error='Selecciona una imagen JPG, PNG o WEBP menor de 5 MB.';
    }
  }
  async subirComprobante():Promise<void>{
    if(!this.pPermiteComprobante() || !this.archivo || this.enviando)return;
    this.enviando=true;this.error='';
    try{
      const form=new FormData();form.append('archivo',this.archivo,this.archivo.name);
      const sesion=await this.auth.sesion();
      let cabeceras=new HttpHeaders();
      if(this.token) cabeceras=cabeceras.set('X-Pedido-Token',this.token);
      if(sesion) cabeceras=cabeceras.set('Authorization','Bearer '+sesion.access_token);
      await firstValueFrom(this.http.post(
        environment.apiBaseUrl+'/checkout/pedidos/'+this.id+'/comprobante',
        form,{headers:cabeceras}));
      this.archivo=null;
      await this.consultar();
    }catch{this.error='No se pudo subir la captura. Comprueba que la reserva no haya vencido.';}
    finally{this.enviando=false;}
  }
  copiarEnlace():void{
    void navigator.clipboard.writeText(window.location.origin+'/pedido/'+this.id+
      '#token='+encodeURIComponent(this.token));
  }
}
