import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductoEditable {
  id: string;
  codigoBarras: string;
  sku: string;
  nombre: string;
  marca: string | null;
  descripcion: string | null;
  precio: number;
  stock: number;
  publicado: boolean;
  publicoObjetivo: 'HOMBRE' | 'MUJER' | 'UNISEX' | null;
  contenidoMl: number | null;
}
interface Descuento {
  id: string; nombre: string; tipo: 'PORCENTAJE' | 'MONTO';
  valor: number; inicio: string; fin: string; activo: boolean;
}
interface Formulario {
  codigoBarras:string; sku:string; nombre:string; marca:string;
  descripcion:string; precio:number; publicoObjetivo:string; contenidoMl:number|null;
}

@Component({
  selector: 'app-admin-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="editor" id="editar-producto">
      <header class="editor-cabecera">
        <div><span class="eyebrow">ADMINISTRACIÓN DE PRODUCTOS</span>
          <h2>Editar {{producto.nombre}}</h2>
          <p>Modifica los datos, la presentación y los descuentos. El stock se actualiza desde el módulo de inventario.</p>
        </div>
        <button type="button" class="cerrar" (click)="cerrado.emit()">✕ Cerrar</button>
      </header>
      <div *ngIf="error" role="alert" class="alerta error">{{error}}</div>
      <div *ngIf="mensaje" role="status" class="alerta exito">{{mensaje}}</div>
      <form class="datos" (ngSubmit)="guardar()">
        <label>Nombre del perfume
          <input name="nombre" [(ngModel)]="form.nombre" required maxlength="160">
        </label>
        <label>Marca
          <input name="marca" [(ngModel)]="form.marca" maxlength="160">
        </label>
        <label>Código de barras
          <input name="codigo" [(ngModel)]="form.codigoBarras" required maxlength="64">
        </label>
        <label>SKU
          <input name="sku" [(ngModel)]="form.sku" required maxlength="90">
        </label>
        <label>Precio base (S/)
          <input name="precio" [(ngModel)]="form.precio" required type="number" min="0" step="0.01">
        </label>
        <label>Para quién
          <select name="publico" [(ngModel)]="form.publicoObjetivo">
            <option value="">Sin clasificar</option>
            <option value="HOMBRE">Hombre</option>
            <option value="MUJER">Mujer</option>
            <option value="UNISEX">Unisex</option>
          </select>
        </label>
        <label>Presentación (ml)
          <input name="ml" [(ngModel)]="form.contenidoMl" type="number" min="1" max="2000" step="1" placeholder="Ej. 100">
        </label>
        <label>Stock actual (solo lectura)
          <input [value]="producto.stock+' unidades'" readonly>
        </label>
        <label class="ancho">Descripción
          <textarea name="descripcion" [(ngModel)]="form.descripcion" rows="3" maxlength="4000"></textarea>
        </label>
        <div class="acciones ancho">
          <button type="submit" [disabled]="guardando" class="principal">{{guardando?'Guardando...':'Guardar cambios'}}</button>
          <button type="button" class="secundario" (click)="restaurar()" [disabled]="guardando">Descartar cambios</button>
        </div>
      </form>

      <div class="divisor"></div>
      <div class="seccion-descuento">
        <span class="eyebrow">PROMOCIONES</span>
        <h3>Descuentos del perfume</h3>
        <p>Configura un descuento porcentual o fijo con fecha de inicio y fin. No se acumulan descuentos en un mismo período.</p>
        <div *ngIf="cargandoDescuentos" role="status">Cargando descuentos...</div>
        <div *ngIf="!cargandoDescuentos && descuentos.length===0" class="sin-descuentos">
          Todavía no hay promociones configuradas para este producto.
        </div>
        <div *ngIf="!cargandoDescuentos && descuentos.length>0" class="lista-descuentos">
          <article *ngFor="let d of descuentos" class="descuento">
            <div>
              <strong>{{d.nombre}}</strong>
              <span>{{d.tipo==='PORCENTAJE' ? d.valor+' %' : moneda(d.valor)}} de descuento</span>
              <small>Del {{d.inicio | date:'dd/MM/yyyy HH:mm'}} al {{d.fin | date:'dd/MM/yyyy HH:mm'}}</small>
            </div>
            <div class="estatus">
              <b>{{estado(d)}}</b>
              <button *ngIf="d.activo" type="button" (click)="desactivar(d)" [disabled]="gestionandoDescuento">Desactivar</button>
            </div>
          </article>
        </div>
        <form class="datos datos-descuento" (ngSubmit)="crearDescuento()">
          <label class="ancho">Nombre de la promoción
            <input name="promoNombre" [(ngModel)]="promo.nombre" required maxlength="120" placeholder="Ej. Oferta de lanzamiento">
          </label>
          <label>Tipo de descuento
            <select name="tipo" [(ngModel)]="promo.tipo">
              <option value="PORCENTAJE">Porcentaje (%)</option>
              <option value="MONTO">Monto fijo (S/)</option>
            </select>
          </label>
          <label>{{promo.tipo==='PORCENTAJE'?'Porcentaje de descuento':'Monto a descontar (S/)'}}
            <input name="valor" [(ngModel)]="promo.valor" type="number" required min="0.01" step="0.01"
                   [max]="promo.tipo==='PORCENTAJE' ? 99.99 : form.precio">
          </label>
          <label>Fecha y hora de inicio
            <input name="inicio" [(ngModel)]="promo.inicio" type="datetime-local" required>
          </label>
          <label>Fecha y hora de fin
            <input name="fin" [(ngModel)]="promo.fin" type="datetime-local" required>
          </label>
          <p class="ancho ayuda">El descuento se aplicará automáticamente en el catálogo y al calcular el pedido. Puedes desactivarlo cuando quieras; el historial se conserva.</p>
          <button type="submit" class="principal ancho" [disabled]="gestionandoDescuento">
            {{gestionandoDescuento?'Guardando promoción...':'Añadir descuento'}}
          </button>
        </form>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.editor{background:#fff;border:1px solid #e5d8ca;padding:30px;border-radius:16px;box-shadow:0 10px 35px #3029230d}
    .editor-cabecera{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}
    .editor h2,.editor h3{font:500 29px 'Playfair Display',Georgia,serif;color:#403027;margin:12px 0}.editor p{font-size:13px;color:#76685d;line-height:1.6;margin:6px 0 22px}
    .eyebrow{font-size:11px;font-weight:800;letter-spacing:.15em;color:#987252}
    .cerrar{border:1px solid #decbbb;border-radius:7px;background:#fff;padding:9px 12px;color:#75533e;cursor:pointer;white-space:nowrap}
    .datos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
    label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:700;color:#655142}
    input,select,textarea{font:inherit;font-weight:400;color:#3f3029;background:#fff;border:1px solid #dcd0c5;border-radius:7px;min-height:43px;padding:10px 12px;width:100%}
    textarea{resize:vertical}.ancho{grid-column:1/-1}.acciones{display:flex;gap:11px;flex-wrap:wrap}
    .principal,.secundario{padding:13px 17px;border:0;border-radius:7px;font-weight:700;cursor:pointer}
    .principal{background:#94664e;color:white}.secundario{background:#f1e7df;color:#6c4d3c}
    button:disabled{opacity:.6;cursor:not-allowed}.divisor{border-top:1px solid #eee2d7;margin:31px 0}
    .descuento{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:13px 15px;border:1px solid #eadfd3;background:#fffaf7;border-radius:9px}
    .lista-descuentos{display:grid;gap:9px;margin:16px 0 23px}.descuento strong{font-size:13px;color:#503a2f}.descuento span,.descuento small{display:block;margin-top:5px;font-size:12px;color:#79685c}
    .estatus{display:flex;flex-direction:column;gap:8px;align-items:flex-end;font-size:11px;color:#71543f}.estatus button{border:1px solid #d3b5a3;background:#fff;color:#a54c39;border-radius:5px;padding:7px 9px;cursor:pointer}
    .sin-descuentos{font-size:13px;background:#faf5f0;padding:20px;margin:12px 0;border-radius:9px;color:#8b7464}
    .datos-descuento{margin-top:15px}.ayuda{font-weight:400}
    .alerta{margin:12px 0;padding:13px;border-radius:7px;font-size:12px}
    .error{background:#fff1ed;color:#a54135}.exito{background:#f0f7ed;color:#346638}
    @media(max-width:650px){.editor{padding:20px}.datos{grid-template-columns:1fr}.ancho{grid-column:auto}.editor-cabecera{flex-wrap:wrap}.descuento{align-items:flex-start;flex-direction:column}.estatus{align-items:flex-start}}
  `]
})
export class AdminEditorComponent implements OnChanges {
  @Input({required:true}) producto!: ProductoEditable;
  @Input({required:true}) accessToken='';
  @Output() guardado=new EventEmitter<void>();
  @Output() cerrado=new EventEmitter<void>();

  private readonly http=inject(HttpClient);
  form:Formulario={codigoBarras:'',sku:'',nombre:'',marca:'',descripcion:'',
    precio:0,publicoObjetivo:'',contenidoMl:null};
  descuentos:Descuento[]=[];
  promo={nombre:'',tipo:'PORCENTAJE' as 'PORCENTAJE'|'MONTO',valor:10,inicio:'',fin:''};
  cargandoDescuentos=false;
  gestionandoDescuento=false;
  guardando=false;
  error='';
  mensaje='';

  ngOnChanges(changes:SimpleChanges):void {
    if(changes['producto'] && this.producto) {
      this.restaurar();
      this.descuentos=[];
      this.promo={nombre:'',tipo:'PORCENTAJE',valor:10,inicio:this.fechaLocal(Date.now()),
        fin:this.fechaLocal(Date.now()+7*24*3600000)};
      void this.cargarDescuentos();
    }
  }

  restaurar():void {
    const p=this.producto;
    this.form={codigoBarras:p.codigoBarras||'',sku:p.sku,nombre:p.nombre,
      marca:p.marca||'',descripcion:p.descripcion||'',precio:Number(p.precio),
      publicoObjetivo:p.publicoObjetivo||'',contenidoMl:p.contenidoMl??null};
  }

  private fechaLocal(fecha:number):string {
    const d=new Date(fecha);
    return new Date(fecha-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }

  private headers():HttpHeaders {
    return new HttpHeaders({Authorization:'Bearer '+this.accessToken});
  }
  private url():string {return environment.apiBaseUrl+'/admin/productos/'+this.producto.id;}
  moneda(n:number):string {return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);}

  async guardar():Promise<void> {
    if(this.guardando)return;
    this.error='';this.mensaje='';
    if(!this.form.nombre.trim() || !this.form.sku.trim() ||
       !this.form.codigoBarras.trim() || !Number.isFinite(this.form.precio) ||
       this.form.precio<0 || !Number.isFinite(this.form.precio*100) ||
       (this.form.contenidoMl!=null && (!Number.isInteger(this.form.contenidoMl) ||
          this.form.contenidoMl<1 || this.form.contenidoMl>2000))) {
      this.error='Completa correctamente el nombre, código, SKU, precio y presentación.';
      return;
    }
    this.guardando=true;
    try {
      await firstValueFrom(this.http.patch(this.url(),{
        ...this.form,
        publicoObjetivo:this.form.publicoObjetivo||null,
        contenidoMl:this.form.contenidoMl||null
      },{headers:this.headers()}));
      Object.assign(this.producto,{
        codigoBarras:this.form.codigoBarras,sku:this.form.sku,nombre:this.form.nombre,
        marca:this.form.marca||null,descripcion:this.form.descripcion||null,
        precio:this.form.precio,publicoObjetivo:this.form.publicoObjetivo||null,
        contenidoMl:this.form.contenidoMl||null
      });
      this.mensaje='Datos del producto actualizados correctamente.';
      this.guardado.emit();
    } catch(e) {
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||err.error?.detail||'No se pudo guardar la edición.';
    } finally {this.guardando=false;}
  }

  async cargarDescuentos():Promise<void> {
    this.cargandoDescuentos=true;
    try {
      this.descuentos=await firstValueFrom(this.http.get<Descuento[]>(
        this.url()+'/descuentos',{headers:this.headers()}));
    } catch {
      this.error='No se pudo consultar la lista de descuentos.';
    } finally {this.cargandoDescuentos=false;}
  }

  estado(d:Descuento):string {
    if(!d.activo)return 'Desactivado';
    const hoy=Date.now();
    return hoy<Date.parse(d.inicio)?'Programado':
      hoy>=Date.parse(d.fin)?'Finalizado':'Vigente';
  }

  async crearDescuento():Promise<void> {
    if(this.gestionandoDescuento)return;
    this.error='';this.mensaje='';
    const inicio=new Date(this.promo.inicio);
    const fin=new Date(this.promo.fin);
    if(!this.promo.nombre.trim() || !Number.isFinite(this.promo.valor) ||
       this.promo.valor<=0 || Number.isNaN(inicio.getTime()) ||
       Number.isNaN(fin.getTime()) || fin<=inicio ||
       (this.promo.tipo==='PORCENTAJE' && this.promo.valor>=100) ||
       (this.promo.tipo==='MONTO' && this.promo.valor>=this.producto.precio)) {
      this.error='Verifica nombre, importe y fechas. La rebaja debe ser menor al precio.';
      return;
    }
    this.gestionandoDescuento=true;
    try {
      await firstValueFrom(this.http.post(this.url()+'/descuentos',{
        ...this.promo,inicio:inicio.toISOString(),fin:fin.toISOString()
      },{headers:this.headers()}));
      this.mensaje='Descuento registrado. Se aplicará automáticamente durante su vigencia.';
      await this.cargarDescuentos();
      this.guardado.emit();
    }catch(e) {
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||err.error?.detail||'No se pudo registrar el descuento.';
    }finally{this.gestionandoDescuento=false;}
  }

  async desactivar(d:Descuento):Promise<void> {
    if(this.gestionandoDescuento)return;
    this.gestionandoDescuento=true;this.error='';this.mensaje='';
    try {
      await firstValueFrom(this.http.patch(this.url()+'/descuentos/'+d.id+'/desactivar',
        {},{headers:this.headers()}));
      this.mensaje='Descuento desactivado. El historial permanece disponible.';
      await this.cargarDescuentos();
      this.guardado.emit();
    }catch {
      this.error='No se pudo desactivar la promoción.';
    }finally {this.gestionandoDescuento=false;}
  }
}
