import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type Tipo='YAPE'|'TRANSFERENCIA'|'WHATSAPP';
interface Medio {
  id?:string;tipo:Tipo;titulo:string;titular:string|null;numeroYape:string|null;
  qrUrl:string|null;banco:string|null;numeroCuenta:string|null;cci:string|null;
  telefonoWhatsapp:string|null;activo:boolean;orden:number;
}
function vacio():Medio{return{
  tipo:'YAPE',titulo:'Yape JM-AROMAS',titular:null,numeroYape:null,qrUrl:null,
  banco:null,numeroCuenta:null,cci:null,telefonoWhatsapp:null,activo:false,orden:0
}}
@Component({
  selector:'app-admin-medios',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    <section class="panel">
      <div class="header"><div><span class="step">CONFIGURACIÓN DE COBROS</span><h2>Yape, bancos y WhatsApp</h2>
        <p>Registra únicamente los datos reales de la tienda. Los métodos inactivos no aparecerán en el checkout.</p>
      </div><button class="outline" type="button" (click)="nuevo()">Añadir medio de pago +</button></div>
      <p *ngIf="error" class="error" role="alert">{{error}}</p>
      <p *ngIf="mensaje" class="success" role="status">{{mensaje}}</p>
      <div class="list" *ngIf="medios.length">
        <button type="button" *ngFor="let m of medios" class="medium" (click)="editar(m)">
          <span><b>{{m.titulo}}</b><small>{{m.tipo==='TRANSFERENCIA'?m.banco:
            m.tipo==='YAPE'?m.numeroYape:m.telefonoWhatsapp}}</small></span>
          <span [class.active]="m.activo" class="status">{{m.activo?'Activo':'Inactivo'}}</span>
        </button>
      </div>
      <p *ngIf="!medios.length && !cargando" class="hint">Aún no hay medios de pago registrados.</p>
      <div *ngIf="formAbierto" class="formulario">
        <h3>{{form.id?'Editar medio de pago':'Nuevo medio de pago'}}</h3>
        <form (ngSubmit)="guardar()" class="fields">
          <label>Tipo
            <select name="tipo" [(ngModel)]="form.tipo" [disabled]="!!form.id">
              <option value="YAPE">Yape</option><option value="TRANSFERENCIA">Transferencia bancaria</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </label>
          <label>Título<input name="titulo" [(ngModel)]="form.titulo" required maxlength="120"></label>
          <label *ngIf="form.tipo!=='WHATSAPP'">Titular de la cuenta<input name="titular" [(ngModel)]="form.titular" placeholder="Nombre exacto del titular"></label>
          <label *ngIf="form.tipo==='YAPE'">Número Yape<input name="numero-yape" [(ngModel)]="form.numeroYape" placeholder="Celular afiliado a Yape"></label>
          <label *ngIf="form.tipo==='TRANSFERENCIA'">Banco<input name="banco" [(ngModel)]="form.banco" placeholder="Nombre del banco"></label>
          <label *ngIf="form.tipo==='TRANSFERENCIA'">Número de cuenta<input name="numero-cuenta" [(ngModel)]="form.numeroCuenta"></label>
          <label *ngIf="form.tipo==='TRANSFERENCIA'">CCI (opcional)<input name="cci" [(ngModel)]="form.cci"></label>
          <label *ngIf="form.tipo==='WHATSAPP'">WhatsApp de administradora<input name="whatsapp" [(ngModel)]="form.telefonoWhatsapp" placeholder="+519XXXXXXXX"></label>
          <label *ngIf="form.tipo==='YAPE'" class="full">URL del QR (se completa automáticamente al subir la imagen)
            <input name="qr-url" [(ngModel)]="form.qrUrl" readonly>
          </label>
          <div *ngIf="form.id && form.tipo==='YAPE'" class="full uploader">
            <label>Subir foto del código QR Yape
              <input type="file" accept="image/png,image/jpeg,image/webp" (change)="seleccionarQr($event)">
            </label>
            <button class="outline" type="button" [disabled]="!qrFile||subiendo" (click)="subirQr()">{{subiendo?'Subiendo...':'Guardar QR en Supabase'}}</button>
            <img *ngIf="form.qrUrl" [src]="form.qrUrl" alt="QR Yape del comercio" class="qr">
          </div>
          <label class="full checkbox"><input type="checkbox" name="activo" [(ngModel)]="form.activo">
            Habilitar este medio de pago para clientes</label>
          <p class="full hint">Yape requiere número, titular y QR antes de activarse. Puedes guardar primero como inactivo y subir la imagen.</p>
          <div class="full actions"><button type="submit" class="primary" [disabled]="guardando">{{guardando?'Guardando...':'Guardar cambios'}}</button>
            <button type="button" class="outline" (click)="formAbierto=false">Cerrar</button></div>
        </form>
      </div>
    </section>
  `,
  styles:[`
    .panel{background:white;border:1px solid #e8e1d9;border-radius:16px;padding:30px;box-shadow:0 10px 34px #30292307}
    .header{display:flex;justify-content:space-between;align-items:start;gap:12px}.step{font-size:10px;letter-spacing:.16em;color:#967155;font-weight:800}
    h2,h3{font:500 28px 'Playfair Display',serif;margin:10px 0 13px}h3{font-size:25px}
    p{font-size:12px;color:#887365;line-height:1.7}.outline{background:white;border:1px solid #ba9b83;border-radius:5px;color:#775037;padding:11px 13px;font-size:12px;font-weight:700}
    .list{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}.medium{background:#faf7f3;border:1px solid #ebded2;border-radius:7px;padding:14px 16px;display:flex;justify-content:space-between;gap:15px;align-items:center;min-width:200px;text-align:left}
    .medium b,.medium small{display:block}.medium b{font-size:12px}.medium small{font-size:10px;margin-top:5px;color:#877467}.status{border-radius:20px;background:#eee1d5;color:#7e5941;padding:6px 8px;font-size:10px}.status.active{background:#e5f1e2;color:#39703b}
    .formulario{border-top:1px solid #eee1d6;padding-top:18px;margin-top:10px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.fields label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#5d493d;font-weight:700}.fields label.full,.fields .full{grid-column:1/-1}
    .fields input:not([type=checkbox]),.fields select{border:1px solid #d7c9be;border-radius:4px;padding:12px;background:#fffefa;width:100%}
    .checkbox{display:flex!important;flex-direction:row!important;gap:10px!important;align-items:center!important}.checkbox input{width:17px;height:17px}
    .uploader{background:#f9f5f0;padding:16px;border-radius:5px}.uploader .outline{margin-top:12px}.qr{display:block;max-width:180px;max-height:180px;object-fit:contain;margin:15px 0}
    .actions{display:flex;flex-wrap:wrap;gap:10px}.primary{background:#8f6448;color:white;border:0;padding:13px 20px;border-radius:4px;font-weight:700;font-size:12px}
    .error,.success{padding:13px;border-radius:5px}.error{color:#963b35;background:#fff0ec}.success{color:#3d7545;background:#edf8ef}.hint{color:#8f7b6e;font-size:11px;line-height:1.6}
    @media(max-width:650px){.panel{padding:20px}.header{flex-direction:column}.fields{grid-template-columns:1fr}.fields label.full,.fields .full{grid-column:auto}.medium{width:100%}.actions button{flex:1}}
  `]
})
export class AdminMediosComponent implements OnInit {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  medios:Medio[]=[];
  form:Medio=vacio();
  formAbierto=false;
  cargando=false;
  guardando=false;
  subiendo=false;
  qrFile:File|null=null;
  error='';mensaje='';
  ngOnInit():void{void this.cargar();}
  private headers():HttpHeaders{return new HttpHeaders({Authorization:'Bearer '+this.accessToken});}
  async cargar():Promise<void>{
    if(!this.accessToken)return;
    this.cargando=true;
    try{
      this.medios=await firstValueFrom(this.http.get<Medio[]>(
        environment.apiBaseUrl+'/admin/medios-pago',{headers:this.headers()}));
    }catch{this.error='No se pudo obtener la configuración de cobros.';}
    finally{this.cargando=false;}
  }
  nuevo():void{this.form=vacio();this.qrFile=null;this.formAbierto=true;this.error='';this.mensaje='';}
  editar(m:Medio):void{this.form={...m};this.qrFile=null;this.formAbierto=true;this.error='';this.mensaje='';}
  async guardar():Promise<void>{
    this.guardando=true;this.error='';this.mensaje='';
    try{
      if(this.form.id){
        await firstValueFrom(this.http.patch(environment.apiBaseUrl+'/admin/medios-pago/'+this.form.id,
          this.form,{headers:this.headers()}));
      }else{
        const r=await firstValueFrom(this.http.post<{id:string}>(
          environment.apiBaseUrl+'/admin/medios-pago',this.form,{headers:this.headers()}));
        this.form.id=r.id;
      }
      this.mensaje='Medio de pago guardado correctamente.';
      await this.cargar();
    }catch(e:any){
      this.error=e?.error?.error||e?.error?.detail||
        'No se pudo guardar. Comprueba los campos obligatorios.';
    }finally{this.guardando=false;}
  }
  seleccionarQr(event:Event):void{
    const file=(event.target as HTMLInputElement).files?.[0];
    this.qrFile=file||null;
  }
  async subirQr():Promise<void>{
    if(!this.form.id||!this.qrFile)return;
    this.subiendo=true;this.error='';this.mensaje='';
    try{
      const body=new FormData();
      body.append('archivo',this.qrFile,this.qrFile.name);
      const resultado=await firstValueFrom(this.http.post<{qrUrl:string}>(
        environment.apiBaseUrl+'/admin/medios-pago/'+this.form.id+'/qr',
        body,{headers:this.headers()}));
      this.form.qrUrl=resultado.qrUrl;
      this.mensaje='QR cargado en Supabase. Activa el medio y guarda los cambios.';
      this.qrFile=null;
      await this.cargar();
    }catch{this.error='No se pudo subir el QR. Comprueba el formato y la configuración de Storage.';}
    finally{this.subiendo=false;}
  }
}
