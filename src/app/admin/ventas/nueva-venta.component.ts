import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

interface ProductoVenta {
  id:string; nombre:string; sku:string; codigoBarras:string|null;
  marca:string|null; precio:number; stock:number;
}
interface ItemVenta {
  producto:ProductoVenta; cantidad:number;
}
interface TicketVenta {
  id:string; codigo:string; medioPago:string; total:number; creadoEn:string;
  articulos:Array<{sku:string;nombre:string;cantidad:number;precioUnitario:number;totalLinea:number}>;
}

@Component({
  selector:'app-nueva-venta',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
  <main class="pagina">
    <header>
      <span class="eyebrow">JM AROMAS · TIENDA FÍSICA</span>
      <h1>Nueva <em>venta.</em></h1>
      <p>Registra ventas del mostrador. El stock se descuenta de forma automática al confirmar.</p>
    </header>
    <p *ngIf="error" class="alerta error" role="alert">{{error}}</p>
    <p *ngIf="mensaje" class="alerta exito" role="status">{{mensaje}}</p>
    <section class="panel">
      <h2>Buscar productos</h2>
      <div class="busqueda">
        <input aria-label="Buscar perfume" [(ngModel)]="busqueda" (ngModelChange)="limpiarResultados()" (keyup.enter)="buscar()"
          placeholder="Nombre, SKU o código de barras" [disabled]="guardando">
        <button type="button" (click)="buscar()" [disabled]="buscando||guardando||!token||!busqueda.trim()">
          {{buscando?'Buscando…':'Buscar'}}
        </button>
      </div>
      <div class="escaneo-acciones">
        <button type="button" class="secundario" (click)="alternarEscaner()" [disabled]="!token||guardando">
          {{escanerActivo?'Cerrar cámara':'Escanear código de barras'}}
        </button>
        <span class="ayuda">También puedes utilizar un lector de códigos USB o Bluetooth.</span>
      </div>
      <div class="camara" [hidden]="!escanerActivo">
        <video #videoEscaner autoplay muted playsinline aria-label="Cámara para escanear códigos de barras"></video>
        <p class="ayuda">Apunta al código de barras del producto.</p>
      </div>
      <p class="ayuda" *ngIf="!token">Cargando sesión de administración…</p>
      <p class="ayuda" *ngIf="token && !busqueda.trim() && !escanerActivo">Escribe un producto o escanea su código para buscarlo.</p>
      <div class="resultados" *ngIf="resultados.length">
        <div class="resultado" *ngFor="let p of resultados">
          <div><strong>{{p.nombre}}</strong><small>{{p.sku}} · Stock: {{p.stock}}</small></div>
          <div><b>{{p.precio | currency:'PEN'}}</b>
            <button type="button" (click)="agregar(p)" [disabled]="guardando||p.stock<1">Agregar</button></div>
        </div>
      </div>
      <p class="ayuda" *ngIf="buscado && !resultados.length">No se encontraron productos activos.</p>
    </section>
    <section class="panel">
      <h2>Detalle de la venta</h2>
      <p *ngIf="!carrito.length" class="ayuda">Busca un producto y agrégalo a la venta.</p>
      <div class="linea" *ngFor="let item of carrito">
        <div class="nombre"><strong>{{item.producto.nombre}}</strong>
          <small>{{item.producto.precio | currency:'PEN'}} por unidad · Disponible: {{item.producto.stock}}</small></div>
        <label>Cantidad
          <input type="number" min="1" [max]="item.producto.stock" step="1"
            [(ngModel)]="item.cantidad" (ngModelChange)="validarCantidades()" [disabled]="guardando">
        </label>
        <b>{{item.producto.precio*item.cantidad | currency:'PEN'}}</b>
        <button type="button" class="quitar" (click)="quitar(item.producto.id)" [disabled]="guardando" aria-label="Quitar producto">×</button>
      </div>
      <div class="total"><span>Total</span><strong>{{total | currency:'PEN'}}</strong></div>
      <label class="pago">Medio de pago
        <select [(ngModel)]="medioPago" [disabled]="guardando">
          <option value="EFECTIVO">Efectivo</option>
          <option value="YAPE">Yape</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="TARJETA">Tarjeta</option>
        </select>
      </label>
      <p class="ayuda">Al confirmar se registra la venta y se descuentan las existencias. El ticket no es una boleta electrónica.</p>
      <button class="confirmar" type="button" (click)="confirmar()"
        [disabled]="guardando||!ventaValida||!token">
        {{guardando?'Registrando venta…':'Confirmar venta'}}
      </button>
    </section>
    <section class="panel ticket" *ngIf="ticket as t">
      <h2>Venta registrada: {{t.codigo}}</h2>
      <p>Total {{t.total | currency:'PEN'}} · {{t.medioPago}}</p>
      <button type="button" (click)="imprimirTicket()">Imprimir / guardar ticket en PDF</button>
      <button type="button" class="secundario" (click)="nuevaVenta()">Iniciar otra venta</button>
    </section>
  </main>
  `,
  styles:[`
    :host{display:block;background:#fbf8f5;min-height:100%}
    .pagina{max-width:1050px;margin:auto;padding:30px clamp(14px,3vw,42px) 70px;color:#483529}
    header{margin-bottom:26px}.eyebrow{font-size:11px;letter-spacing:.16em;font-weight:800;color:#a37452}
    h1{font:500 clamp(34px,4vw,52px) Georgia,serif;margin:12px 0}h1 em{color:#9f7050}
    header p,.ayuda{font-size:13px;color:#806f63;line-height:1.6}
    h2{font-size:18px;font-weight:700;margin:0 0 17px}
    .panel{background:white;border:1px solid #e8ddd3;border-radius:16px;padding:24px;margin-bottom:18px}
    .busqueda{display:flex;gap:10px}.busqueda input{flex:1;min-width:0}
    input,select{padding:12px;border:1px solid #d7c8bb;border-radius:9px;font:inherit}
    button{padding:11px 16px;border:0;border-radius:9px;background:#684b39;color:white;cursor:pointer;font:inherit}
    button:disabled{opacity:.5;cursor:not-allowed}
    .escaneo-acciones{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:12px}
    .camara{margin-top:14px;max-width:420px}.camara video{width:100%;aspect-ratio:4/3;object-fit:cover;background:#171717;border-radius:12px}
    .resultados{margin-top:16px;max-height:360px;overflow:auto}
    .resultado,.linea{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid #f0e9e3}
    .resultado>div:last-child{display:flex;align-items:center;gap:14px}
    strong,small{display:block}small{font-size:12px;color:#8c7a6c;margin-top:4px}
    .linea .nombre{flex:1;min-width:100px}.linea label{font-size:12px}
    .linea input{display:block;width:80px;max-width:100%;margin-top:5px}
    .quitar{background:#eee0d7;color:#744331;font-size:20px;padding:5px 12px}
    .total{display:flex;align-items:center;justify-content:space-between;padding:24px 0;font-size:21px}
    .pago{display:block;font-size:13px;font-weight:700;margin:0 0 22px}
    .pago select{display:block;min-width:220px;margin-top:8px}
    .confirmar{background:#6b4832;font-weight:700;padding:15px 26px;width:100%}
    .alerta{padding:14px;border-radius:10px;margin-bottom:16px}
    .error{background:#ffede9;color:#922f27}.exito{background:#eff7ed;color:#32623d}
    .ticket{border-color:#bca18c}.ticket button{margin:8px 12px 0 0}.secundario{background:#eee5dc;color:#5f422f}
    @media(max-width:640px){.panel{padding:16px}.resultado{align-items:flex-start}.resultado>div:last-child{flex-direction:column;align-items:flex-end}.linea{flex-wrap:wrap}.busqueda{flex-wrap:wrap}.busqueda button{flex:1}}
  `]
})
export class NuevaVentaComponent implements OnInit, OnDestroy {
  @ViewChild('videoEscaner') videoEscaner?:ElementRef<HTMLVideoElement>;
  escanerActivo=false;
  private lector?:BrowserMultiFormatReader;
  private controles?:IScannerControls;
  private procesandoCodigo=false;
  private readonly auth=inject(AuthService);
  private readonly http=inject(HttpClient);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly api=environment.apiBaseUrl+'/admin/ventas-presenciales';
  token='';
  busqueda='';
  resultados:ProductoVenta[]=[];
  carrito:ItemVenta[]=[];
  ticket:TicketVenta|null=null;
  medioPago='EFECTIVO';
  error=''; mensaje=''; buscando=false; buscado=false; guardando=false;
  private idempotencia=crypto.randomUUID();

  get total():number {return this.carrito.reduce((n,item)=>n+item.producto.precio*item.cantidad,0);}
  get ventaValida():boolean {
    return this.carrito.length>0 && this.total>0 && this.carrito.every(item=>
      Number.isInteger(item.cantidad)&&item.cantidad>0&&item.cantidad<=item.producto.stock);
  }
  private headers():HttpHeaders {
    return new HttpHeaders({Authorization:'Bearer '+this.token});
  }
  async ngOnInit():Promise<void> {
    try{
      const sesion=await this.auth.sesion();
      if(!sesion)throw new Error('Sesión no encontrada');
      this.token=sesion.access_token;
    }catch{this.error='Accede con una cuenta administrativa para registrar ventas.';}
    finally{this.cdr.markForCheck();}
  }
  ngOnDestroy():void {this.cerrarEscaner();}
  limpiarResultados():void {this.resultados=[];this.buscado=false;}
  async alternarEscaner():Promise<void> {
    if(this.escanerActivo){this.cerrarEscaner();return;}
    if(!navigator.mediaDevices?.getUserMedia){
      this.error='La cámara no está disponible. Utiliza HTTPS y un navegador compatible.';
      return;
    }
    this.error='';
    this.escanerActivo=true;
    this.cdr.detectChanges();
    try{
      this.lector=new BrowserMultiFormatReader();
      const video=this.videoEscaner?.nativeElement;
      if(!video)throw new Error('No se encontró el visor de la cámara');
      const controles=await this.lector.decodeFromVideoDevice(undefined,video,(resultado)=>{
        if(resultado && !this.procesandoCodigo){
          void this.procesarCodigo(resultado.getText());
        }
      });
      if(!this.escanerActivo){controles.stop();return;}
      this.controles=controles;
    }catch{
      this.cerrarEscaner();
      this.error='No se pudo abrir la cámara. Revisa los permisos o utiliza un lector físico.';
    }finally{this.cdr.markForCheck();}
  }
  private cerrarEscaner():void {
    this.escanerActivo=false;
    this.controles?.stop();
    this.controles=undefined;
    this.lector=undefined;
    const video=this.videoEscaner?.nativeElement;
    if(video?.srcObject){
      (video.srcObject as MediaStream).getTracks().forEach(track=>track.stop());
      video.srcObject=null;
    }
    this.cdr.markForCheck();
  }
  private async procesarCodigo(codigo:string):Promise<void> {
    const valor=codigo.trim();
    if(!valor||this.procesandoCodigo)return;
    this.procesandoCodigo=true;
    this.cerrarEscaner();
    this.busqueda=valor;
    await this.buscar();
    const producto=this.resultados.find(p=>p.codigoBarras===valor||p.sku===valor);
    if(producto){
      this.agregar(producto);
      this.mensaje=producto.nombre+' agregado a la venta.';
    }else if(!this.error){
      this.error='No se encontró un producto con el código escaneado: '+valor;
    }
    this.procesandoCodigo=false;
    this.cdr.markForCheck();
  }
  async buscar():Promise<void> {
    const termino=this.busqueda.trim();
    if(!this.token||this.buscando||!termino)return;
    this.buscando=true;this.error='';
    try{
      this.resultados=await firstValueFrom(this.http.get<ProductoVenta[]>(this.api+'/productos',{
        headers:this.headers(),params:new HttpParams().set('buscar',termino)
      }));
      this.buscado=true;
    }catch(e){
      this.error='No fue posible consultar productos. Verifica tu conexión y permisos.';
    }finally{this.buscando=false;this.cdr.markForCheck();}
  }
  agregar(p:ProductoVenta):void {
    if(this.guardando||p.stock<1)return;
    const linea=this.carrito.find(x=>x.producto.id===p.id);
    if(linea){if(linea.cantidad<p.stock)linea.cantidad++;else this.error='Stock insuficiente.';}
    else this.carrito.push({producto:p,cantidad:1});
    this.ticket=null;
    this.busqueda='';
    this.limpiarResultados();
  }
  quitar(id:string):void {
    this.carrito=this.carrito.filter(x=>x.producto.id!==id);
  }
  validarCantidades():void {
    this.error=this.ventaValida||!this.carrito.length?'':'Revisa las cantidades disponibles.';
  }
  async confirmar():Promise<void> {
    if(this.guardando||!this.ventaValida||!this.token)return;
    if(!window.confirm('¿Registrar esta venta presencial y descontar las unidades del inventario?'))return;
    this.guardando=true;this.error='';this.mensaje='';
    try{
      this.ticket=await firstValueFrom(this.http.post<TicketVenta>(this.api,{
        idempotencia:this.idempotencia,medioPago:this.medioPago,
        articulos:this.carrito.map(x=>({productoId:x.producto.id,cantidad:x.cantidad}))
      },{headers:this.headers()}));
      this.mensaje='Venta registrada. Ya puedes imprimir o guardar el ticket.';
      this.carrito=[];
      this.idempotencia=crypto.randomUUID();
      this.busqueda='';
      this.limpiarResultados();
    }catch(e){
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||'No se pudo registrar la venta. Comprueba si ya fue guardada antes de reintentar.';
      // Conserva idempotencia tras error para prevenir un cobro duplicado.
    }finally{this.guardando=false;this.cdr.markForCheck();}
  }
  nuevaVenta():void {
    this.cerrarEscaner();
    this.busqueda='';this.limpiarResultados();
    this.ticket=null;this.carrito=[];this.mensaje='';this.error='';
    this.idempotencia=crypto.randomUUID();this.medioPago='EFECTIVO';
  }
  imprimirTicket():void {
    if(!this.ticket)return;
    const t=this.ticket;
    const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,
      ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
    const dinero=(v:number)=>'S/ '+Number(v).toFixed(2);
    const filas=t.articulos.map(a=>`<tr><td>${escape(a.nombre)}<small>${escape(a.sku)}</small></td><td>${a.cantidad}</td><td>${dinero(a.precioUnitario)}</td><td>${dinero(a.totalLinea)}</td></tr>`).join('');
    const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Ticket ${escape(t.codigo)}</title>
      <style>@page{size:80mm auto;margin:4mm}body{font:11px Arial,sans-serif;color:#111;width:72mm;margin:auto}
      h1,p{text-align:center;margin:5px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:15px}
      th,td{border-bottom:1px dashed #aaa;text-align:right;padding:6px 2px;vertical-align:top}
      th:first-child,td:first-child{text-align:left}small{display:block;color:#555}
      .total{text-align:right;font-size:16px;font-weight:bold;margin:13px 0}
      .nota{text-align:center;margin-top:22px;font-size:10px}
      @media screen{body{padding:18px}button{padding:10px;margin-top:15px}}@media print{button{display:none}}</style></head>
      <body><h1>JM AROMAS</h1><p>TICKET DE VENTA · NO ES COMPROBANTE TRIBUTARIO</p>
      <p>Venta: ${escape(t.codigo)}</p><p>${escape(new Date(t.creadoEn).toLocaleString('es-PE'))}</p>
      <p>Medio de pago: ${escape(t.medioPago)}</p>
      <table><thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Importe</th></tr></thead>
      <tbody>${filas}</tbody></table><div class="total">TOTAL: ${dinero(t.total)}</div>
      <p class="nota">Gracias por tu compra.</p>
      <button onclick="window.print()">Imprimir / Guardar como PDF</button></body></html>`;
    const ventana=window.open('','_blank','width=420,height=700');
    if(!ventana){this.error='Habilita las ventanas emergentes para imprimir el ticket.';return;}
    ventana.document.open();ventana.document.write(doc);ventana.document.close();ventana.focus();
    // El diálogo de impresión permite usar la opción «Guardar como PDF».
  }
}
