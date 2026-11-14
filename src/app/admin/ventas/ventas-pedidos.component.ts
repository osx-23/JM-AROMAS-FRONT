import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { QRCodeWriter, BarcodeFormat } from '@zxing/library';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';
import { AdminPedidosWhatsappComponent } from '../pagos/admin-pedidos-whatsapp.component';

interface Venta {
  id:string; codigo:string; medioPago:string; total:number; creadoEn:string;
}
interface Ticket extends Venta {
  articulos:Array<{sku:string;nombre:string;cantidad:number;precioUnitario:number;totalLinea:number}>;
}
@Component({
  selector:'app-ventas-pedidos',
  standalone:true,
  imports:[CommonModule, FormsModule, AdminPedidosWhatsappComponent],
  template:`
    <main class="pagina">
      <header><span class="ceja">JM AROMAS · ADMINISTRACIÓN</span>
        <h1>Ventas y <em>pedidos.</em></h1>
        <p>Consulta las ventas presenciales y los pedidos web por separado.</p>
      </header>
      <nav class="pestanas" aria-label="Canal de ventas">
        <button type="button" [class.activa]="canal==='PRESENCIAL'" (click)="cambiarCanal('PRESENCIAL')">Ventas presenciales</button>
        <button type="button" [class.activa]="canal==='WEB'" (click)="cambiarCanal('WEB')">Pedidos web</button>
      </nav>
      <p *ngIf="errorSesion" role="alert" class="error">{{errorSesion}}</p>
      <ng-container *ngIf="token">
        <section *ngIf="canal==='PRESENCIAL'" class="panel">
          <div class="filtros">
            <label>Desde <input type="date" [(ngModel)]="desde"></label>
            <label>Hasta <input type="date" [(ngModel)]="hasta"></label>
            <label>Código <input type="search" [(ngModel)]="buscar" placeholder="VP-..."></label>
            <label>Medio de pago
              <select [(ngModel)]="medioPago">
                <option value="TODOS">Todos</option><option value="EFECTIVO">Efectivo</option>
                <option value="YAPE">Yape</option><option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </label>
            <button type="button" (click)="cargar()" [disabled]="cargando">Aplicar filtros</button>
          </div>
          <p *ngIf="error" class="error" role="alert">{{error}}</p>
          <p *ngIf="cargando" role="status">Cargando ventas presenciales…</p>
          <div class="tabla" *ngIf="!cargando">
            <table><thead><tr><th>Código</th><th>Fecha</th><th>Pago</th><th>Total</th><th>Detalle</th></tr></thead>
              <tbody>
                <tr *ngFor="let v of ventasPagina">
                  <td>{{v.codigo}}</td><td>{{v.creadoEn | date:'dd/MM/yyyy HH:mm'}}</td>
                  <td>{{v.medioPago}}</td><td>{{v.total | currency:'PEN':'symbol':'1.2-2'}}</td>
                  <td><button type="button" class="enlace" (click)="ver(v)" [disabled]="cargandoDetalle">Ver ticket</button></td>
                </tr>
                <tr *ngIf="ventas.length===0"><td colspan="5">No hay ventas presenciales para los filtros seleccionados.</td></tr>
              </tbody>
            </table>
          </div>
          <div class="paginacion" *ngIf="ventas.length">
            <label>Filas <select [(ngModel)]="tamanoPagina" (ngModelChange)="pagina=1"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select></label>
            <span>{{ventas.length}} resultados · Página {{pagina}} de {{totalPaginas}}</span>
            <div class="acciones-pagina">
              <button type="button" [disabled]="pagina<=1" (click)="cambiarPagina(pagina-1)">Anterior</button>
              <button type="button" [disabled]="pagina>=totalPaginas" (click)="cambiarPagina(pagina+1)">Siguiente</button>
            </div>
          </div>
          <p class="ayuda">La consulta actual carga hasta 500 ventas. La paginación de este listado se realiza sobre los resultados recuperados.</p>
          <section *ngIf="detalle as t" class="detalle" aria-label="Detalle de venta">
            <div class="cabecera"><h2>Venta {{t.codigo}}</h2><button type="button" class="enlace" (click)="detalle=null">Cerrar</button></div>
            <p>{{t.creadoEn | date:'dd/MM/yyyy HH:mm'}} · {{t.medioPago}}</p>
            <table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Total</th></tr></thead>
              <tbody><tr *ngFor="let a of t.articulos"><td>{{a.nombre}}</td><td>{{a.cantidad}}</td>
                <td>{{a.precioUnitario | currency:'PEN'}}</td><td>{{a.totalLinea | currency:'PEN'}}</td></tr></tbody>
            </table>
            <p><strong>Total: {{t.total | currency:'PEN'}}</strong></p>
            <button type="button" (click)="imprimir(t)">Imprimir o guardar ticket en PDF</button>
          </section>
        </section>
        <section *ngIf="canal==='WEB'">
          <app-admin-pedidos-whatsapp [accessToken]="token"></app-admin-pedidos-whatsapp>
        </section>
      </ng-container>
    </main>
  `,
  styles:[`
    :host{display:block;min-width:0}.pagina{max-width:1320px;padding:28px clamp(14px,3vw,44px) 70px;margin:auto;color:#4b372b}
    .ceja{font-size:10px;letter-spacing:.17em;color:#a47552;font-weight:800}
    h1{font:500 clamp(34px,4vw,50px) Georgia,serif;margin:12px 0}
    h1 em{color:#a47552}header p,.ayuda{font-size:13px;color:#87776b}
    .pestanas{display:flex;gap:8px;flex-wrap:wrap;margin:25px 0 15px}
    button{border:0;background:#694c3b;color:#fff;border-radius:9px;padding:10px 15px;cursor:pointer}
    button:disabled{opacity:.55}.pestanas button{background:#f1e9df;color:#694c3b}
    .pestanas button.activa{background:#694c3b;color:#fff}
    .panel,.detalle{background:white;border:1px solid #e8ded3;border-radius:15px;padding:22px;margin-bottom:18px}
    .filtros{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin-bottom:20px}
    label{display:grid;gap:6px;font-size:12px;font-weight:600}
    input,select{padding:10px;border:1px solid #d7c8bb;border-radius:8px;max-width:100%;font:inherit}
    .tabla{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{padding:12px 8px;border-bottom:1px solid #eee6dd;text-align:left}
    .enlace{background:#eee5dc;color:#604632}.error{padding:12px;color:#a33b33;background:#fff0ed;border-radius:10px}
    .paginacion{display:flex;align-items:center;flex-wrap:wrap;gap:12px;justify-content:space-between;margin-top:20px;padding-top:17px;border-top:1px solid #e9dfd4;font-size:12px;color:#7b6b60}
    .paginacion label{display:flex;align-items:center;gap:8px}
    .paginacion .acciones-pagina{display:flex;gap:8px}
    .paginacion button{background:#f1e9df;color:#604632;border:1px solid #e3d3c2}
    .paginacion button:disabled{opacity:.4;cursor:default}
    .pestanas{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:thin}
    .pestanas button{white-space:nowrap;min-height:44px}
    .detalle{margin-top:20px;background:#fbf8f3}.cabecera{display:flex;justify-content:space-between;align-items:center}
    h2{font-size:19px}.ayuda{margin-top:15px}
    @media(max-width:640px){.panel{padding:13px}.filtros label{width:100%}.filtros input,.filtros select{width:100%}}
  `]
})
export class VentasPedidosComponent implements OnInit {
  private readonly auth=inject(AuthService);
  private readonly http=inject(HttpClient);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly api=environment.apiBaseUrl+'/admin/ventas-presenciales';
  token='';errorSesion='';error='';canal:'PRESENCIAL'|'WEB'='PRESENCIAL';
  desde='';hasta='';buscar='';medioPago='TODOS';cargando=false;cargandoDetalle=false;
  ventas:Venta[]=[];detalle:Ticket|null=null;
  pagina=1;tamanoPagina=10;
  get totalPaginas():number{return Math.max(1,Math.ceil(this.ventas.length/this.tamanoPagina));}
  get ventasPagina():Venta[]{return this.ventas.slice((this.pagina-1)*this.tamanoPagina,this.pagina*this.tamanoPagina);}
  cambiarPagina(n:number):void{this.pagina=Math.max(1,Math.min(n,this.totalPaginas));}
  async ngOnInit():Promise<void>{
    try{const sesion=await this.auth.sesion();if(!sesion)throw Error('Sesión requerida');
      this.token=sesion.access_token;await this.cargar();}
    catch{this.errorSesion='Inicia sesión como administrador para consultar las ventas.';}
    finally{this.cdr.markForCheck();}
  }
  cambiarCanal(canal:'PRESENCIAL'|'WEB'):void{this.canal=canal;this.detalle=null;}
  private headers():HttpHeaders{return new HttpHeaders({Authorization:'Bearer '+this.token});}
  async cargar():Promise<void>{
    if(!this.token)return;
    if(this.desde&&this.hasta&&this.desde>this.hasta){this.error='La fecha inicial no puede superar a la final.';return;}
    this.cargando=true;this.error='';this.detalle=null;this.pagina=1;this.cdr.markForCheck();
    let params=new HttpParams().set('buscar',this.buscar.trim()).set('medioPago',this.medioPago);
    if(this.desde)params=params.set('desde',this.desde);
    if(this.hasta)params=params.set('hasta',this.hasta);
    try{this.ventas=await firstValueFrom(this.http.get<Venta[]>(this.api,{headers:this.headers(),params}));}
    catch{this.error='No se pudo obtener el historial de ventas presenciales.';}
    finally{this.cargando=false;this.cdr.markForCheck();}
  }
  async ver(v:Venta):Promise<void>{
    this.cargandoDetalle=true;this.error='';this.cdr.markForCheck();
    try{this.detalle=await firstValueFrom(this.http.get<Ticket>(this.api+'/'+encodeURIComponent(v.id),{headers:this.headers()}));}
    catch{this.error='No se pudo obtener el detalle de la venta.';}
    finally{this.cargandoDetalle=false;this.cdr.markForCheck();}
  }
  imprimir(t:Ticket):void{
    const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,
      ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
    const dinero=(n:number)=>'S/ '+Number(n).toFixed(2);
    const matriz=new QRCodeWriter().encode('https://jmaromas.shop/',BarcodeFormat.QR_CODE,37,37,new Map());
    const rects:string[]=[];for(let y=0;y<matriz.getHeight();y++)for(let x=0;x<matriz.getWidth();x++)
      if(matriz.get(x,y))rects.push('<rect x="'+x+'" y="'+y+'" width="1" height="1"/>');
    const qr='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37" width="38mm" height="38mm"><rect width="100%" height="100%" fill="white"/><g fill="black">'+rects.join('')+'</g></svg>';
    const filas=t.articulos.map(a=>'<tr><td>'+escape(a.nombre)+'</td><td>'+a.cantidad+'</td><td>'+dinero(a.precioUnitario)+'</td><td>'+dinero(a.totalLinea)+'</td></tr>').join('');
    const doc='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ticket '+escape(t.codigo)+'</title>'+
      '<style>@page{size:80mm auto;margin:4mm}body{font:11px Arial,sans-serif;width:72mm;margin:auto;color:#111}h1,p{text-align:center}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px dashed #aaa;text-align:right;padding:5px 2px}td:first-child,th:first-child{text-align:left}.qr{text-align:center;margin:15px}svg{display:block;margin:auto}button{padding:10px}@media print{button{display:none}}</style></head>'+
      '<body><h1>JM AROMAS</h1><p>TICKET DE VENTA · NO ES COMPROBANTE TRIBUTARIO</p><p>'+escape(t.codigo)+'</p><p>'+
      escape(new Date(t.creadoEn).toLocaleString('es-PE'))+'</p><p>Pago: '+escape(t.medioPago)+'</p>'+
      '<table><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Total</th></tr>'+filas+'</table>'+
      '<h2>Total: '+dinero(t.total)+'</h2><p>Gracias por tu compra.</p><div class="qr"><p>Visita nuestra tienda</p>'+qr+
      '<p>jmaromas.shop</p></div><button onclick="window.print()">Imprimir / Guardar como PDF</button></body></html>';
    const w=window.open('','_blank','width=420,height=700');
    if(!w){this.error='Habilita ventanas emergentes para guardar el ticket.';return;}
    w.document.open();w.document.write(doc);w.document.close();w.focus();
  }
}
