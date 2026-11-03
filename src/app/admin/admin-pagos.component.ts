import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface PagoPendiente {
  id:string;codigo:string;metodoPago:string;total:number;estadoPago:string;
  clienteJson:string;direccionJson:string;creadoEn:string;comprobanteEn:string;
  cuentaTitulo:string|null;cuentaTitular:string|null;cuentaBanco:string|null;
  cuentaNumero:string|null;cuentaYape:string|null;cuentaCci:string|null;
}
@Component({
  selector:'app-admin-pagos',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    <section class="panel-pagos">
      <div class="header"><div><span class="step">ADMINISTRACIÓN DE PAGOS</span>
        <h2>Comprobantes pendientes</h2>
        <p>Comprueba cada abono en tus movimientos reales de Yape o el banco antes de aprobarlo.</p>
      </div><button type="button" class="outline" (click)="cargar()">Actualizar ↻</button></div>
      <p class="info" *ngIf="cargando">Consultando comprobantes...</p>
      <p class="error" role="alert" *ngIf="error">{{error}}</p>
      <p class="success" role="status" *ngIf="mensaje">{{mensaje}}</p>
      <div class="empty" *ngIf="!cargando && pendientes.length===0">No hay pagos pendientes de confirmación.</div>
      <article class="pedido" *ngFor="let p of pendientes">
        <div class="pedido-cabecera">
          <div><b>{{p.codigo}}</b><span>Comprobante recibido: {{p.comprobanteEn | date:'short'}}</span></div>
          <strong>{{p.total | currency:'PEN':'symbol':'1.2-2'}}</strong>
        </div>
        <div class="datos">
          <div><small>Medio</small><b>{{p.metodoPago}}</b><small>{{p.cuentaTitulo}}</small></div>
          <div><small>Cliente</small><b>{{nombreCliente(p)}}</b></div>
          <div><small>Cuenta receptora</small><b>{{p.cuentaBanco || "Yape"}}</b><small>{{p.cuentaNumero || p.cuentaYape}}</small><small>{{p.cuentaTitular}}</small></div>
          <div><small>Estado</small><b>Pendiente de confirmación</b></div>
        </div>
        <button type="button" class="outline" (click)="verComprobante(p)">Ver evidencia de pago</button>
        <ng-container *ngIf="seleccion?.id===p.id">
          <div class="visor">
            <img *ngIf="urlComprobante" [src]="urlComprobante" alt="Captura de pago subida por el comprador">
            <p *ngIf="cargandoImagen">Cargando evidencia privada...</p>
          </div>
          <label class="checkbox"><input type="checkbox" [(ngModel)]="verificado">
            Verifiqué que el dinero ingresó a la cuenta correcta, con el monto y referencia correspondientes.
          </label>
          <label class="observacion">Observación del rechazo (obligatoria al rechazar)
            <textarea [(ngModel)]="observacion" rows="2" placeholder="Explica por qué se rechaza..."></textarea>
          </label>
          <div class="acciones">
            <button type="button" class="aprobar" [disabled]="!verificado||procesando" (click)="decidir(p,'CONFIRMAR')">
              {{procesando?'Procesando...':'Confirmar pago'}}
            </button>
            <button type="button" class="rechazar" [disabled]="!observacion.trim()||procesando" (click)="decidir(p,'RECHAZAR')">Rechazar comprobante</button>
            <button type="button" class="cerrar" (click)="cerrarImagen()">Cerrar</button>
          </div>
        </ng-container>
      </article>
    </section>
  `,
  styles:[`
    .panel-pagos{background:white;border:1px solid #e8e1d9;border-radius:16px;padding:30px;box-shadow:0 10px 34px #30292307}
    .header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:22px}
    .step{font-size:10px;letter-spacing:.16em;color:#987054;font-weight:800}
    h2{font:500 29px 'Playfair Display',serif;margin:10px 0}
    p{font-size:12px;line-height:1.7;color:#857467}.outline{border:1px solid #bea28d;color:#76533f;background:white;padding:11px 13px;border-radius:4px;font-weight:700;font-size:12px}
    .empty{text-align:center;color:#86776a;background:#faf6f2;padding:32px 20px;font-size:13px}
    .pedido{border:1px solid #e8d8c9;border-radius:9px;padding:19px;margin-top:13px}
    .pedido-cabecera{display:flex;justify-content:space-between;gap:15px}.pedido-cabecera b{display:block}.pedido-cabecera span{display:block;color:#8b7768;font-size:11px;margin-top:6px}
    .pedido-cabecera strong{font-size:18px}.datos{display:flex;gap:30px;flex-wrap:wrap;border-top:1px solid #eee1d7;border-bottom:1px solid #eee1d7;margin:18px 0;padding:17px 0}
    .datos div{display:grid;gap:5px}.datos small{font-size:10px;color:#8b7768}.datos b{font-size:12px}
    .visor{background:#eee8e2;padding:15px;margin-top:17px;text-align:center}.visor img{max-width:100%;max-height:400px;object-fit:contain}
    .checkbox{display:flex;align-items:flex-start;gap:10px;margin:20px 0;font-size:12px;line-height:1.6;color:#614f44}
    .observacion{display:grid;gap:8px;font-size:12px;color:#685146}.observacion textarea{border:1px solid #d9c8bb;border-radius:5px;padding:12px;resize:vertical}
    .acciones{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.acciones button{padding:13px 16px;border:0;border-radius:5px;font-size:12px;font-weight:700}
    .aprobar{background:#457e4a;color:white}.rechazar{background:#a64940;color:white}.cerrar{background:#eee7e0;color:#44342d}
    .error{color:#a33636;background:#fff0ed;padding:12px}.success{color:#377540;background:#edf9ef;padding:12px}.info{padding:12px}
    @media(max-width:650px){.panel-pagos{padding:20px}.header{flex-direction:column}h2{font-size:26px}.datos{gap:16px}.acciones button{width:100%}}
  `]
})
export class AdminPagosComponent implements OnInit,OnDestroy {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  pendientes:PagoPendiente[]=[];
  seleccion:PagoPendiente|null=null;
  urlComprobante:string|null=null;
  cargando=false;
  cargandoImagen=false;
  procesando=false;
  verificado=false;
  observacion='';
  error='';
  mensaje='';
  ngOnInit():void{void this.cargar();}
  ngOnDestroy():void{this.cerrarImagen();}
  private cabeceras():HttpHeaders{return new HttpHeaders({Authorization:'Bearer '+this.accessToken});}
  async cargar():Promise<void>{
    if(!this.accessToken)return;
    this.cargando=true;this.error='';
    try{
      this.pendientes=await firstValueFrom(this.http.get<PagoPendiente[]>(
        environment.apiBaseUrl+'/admin/pedidos/pendientes',{headers:this.cabeceras()}));
    }catch{this.error='No se pudo consultar la bandeja de pagos. Comprueba tus permisos y la API.';}
    finally{this.cargando=false;}
  }
  nombreCliente(p:PagoPendiente):string{
    try{return JSON.parse(p.clienteJson)?.nombre||'Cliente';}catch{return 'Cliente';}
  }
  cerrarImagen():void{
    if(this.urlComprobante)URL.revokeObjectURL(this.urlComprobante);
    this.urlComprobante=null;this.seleccion=null;this.verificado=false;this.observacion='';
  }
  async verComprobante(p:PagoPendiente):Promise<void>{
    this.cerrarImagen();
    this.seleccion=p;this.cargandoImagen=true;this.error='';
    try{
      const blob=await firstValueFrom(this.http.get(
        environment.apiBaseUrl+'/admin/pedidos/'+p.id+'/comprobante',
        {headers:this.cabeceras(),responseType:'blob'}));
      this.urlComprobante=URL.createObjectURL(blob);
    }catch{this.error='No se pudo obtener la evidencia privada. Revisa la configuración de Storage.';}
    finally{this.cargandoImagen=false;}
  }
  async decidir(p:PagoPendiente,accion:'CONFIRMAR'|'RECHAZAR'):Promise<void>{
    if(this.procesando || (accion==='CONFIRMAR'&&!this.verificado)||
       (accion==='RECHAZAR'&&!this.observacion.trim()))return;
    this.procesando=true;this.error='';this.mensaje='';
    try{
      await firstValueFrom(this.http.patch(
        environment.apiBaseUrl+'/admin/pedidos/'+p.id+'/pago',
        {accion,observacion:this.observacion},{headers:this.cabeceras()}));
      this.mensaje=accion==='CONFIRMAR'?'Pago confirmado. El cliente ya verá el estado PAGADO.':
        'Comprobante rechazado. El cliente verá RECHAZADO.';
      this.cerrarImagen();
      await this.cargar();
    }catch(e){this.error='No fue posible registrar la decisión. Comprueba que el comprobante siga pendiente.';}
    finally{this.procesando=false;}
  }
}
