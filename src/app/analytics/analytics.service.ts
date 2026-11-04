import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

type Consentimiento = 'aceptado'|'rechazado'|'sin_decidir';
type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
  [key: string]: unknown;
};

/**
 * Google Analytics 4 con consentimiento BÁSICO:
 * no carga ni ejecuta gtag hasta que el visitante lo acepta.
 * NUNCA transmitir DNI, correo, teléfono, dirección, token, código de pedido
 * ni URLs privadas de seguimiento.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly clave = 'jm_aromas_analytics_consent_v1';
  private readonly id = environment.analyticsMeasurementId || '';
  readonly configurado = /^G-[A-Z0-9]+$/i.test(this.id);
  consentimiento: Consentimiento = 'sin_decidir';
  private cargado = false;

  constructor() {
    try {
      const almacenado = localStorage.getItem(this.clave);
      if(almacenado==='aceptado'||almacenado==='rechazado')
        this.consentimiento=almacenado;
    } catch { /* El navegador puede bloquear almacenamiento */ }
    if(this.configurado && this.consentimiento==='aceptado') this.inicializar();
  }

  aceptar(): void {
    this.consentimiento='aceptado';
    this.persistir('aceptado');
    this.inicializar();
    this.paginaPublica(window.location.pathname);
  }

  rechazar(): void {
    this.consentimiento='rechazado';
    this.persistir('rechazado');
    if(this.cargado) {
      const w=window as AnalyticsWindow;
      w['ga-disable-'+this.id]=true;
      w.gtag?.('consent','update',{
        analytics_storage:'denied',
        ad_storage:'denied',
        ad_user_data:'denied',
        ad_personalization:'denied'
      });
    }
  }

  private persistir(value:string):void {
    try { localStorage.setItem(this.clave,value); } catch {}
  }

  private inicializar(): void {
    if(!this.configurado || this.cargado || this.consentimiento!=='aceptado')return;
    const w=window as AnalyticsWindow;
    w['ga-disable-'+this.id]=false;
    w.dataLayer=w.dataLayer||[];
    if(!w.gtag) w.gtag=(...args: unknown[])=>{w.dataLayer?.push(args);};
    w.gtag('consent','default',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    w.gtag('js',new Date());
    w.gtag('config',this.id,{
      send_page_view:false,
      allow_google_signals:false,
      allow_ad_personalization_signals:false
    });
    const tag=document.createElement('script');
    tag.async=true;
    tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(this.id);
    tag.referrerPolicy='strict-origin-when-cross-origin';
    document.head.appendChild(tag);
    this.cargado=true;
  }

  /** Solo la portada del catálogo; nunca URLs de pedidos, login o perfiles. */
  paginaPublica(ruta:string):void {
    if(ruta!=='/')return;
    this.evento('page_view',{
      page_path:'/',
      page_location:window.location.origin+'/',
      page_title:'JM-AROMAS | Perfumes'
    });
  }

  /** Identificadores de productos son información pública; datos del comprador no. */
  evento(nombre:string,parametros:Record<string,unknown>={}):void {
    if(!this.configurado || this.consentimiento!=='aceptado' || !this.cargado)return;
    if(!['page_view','view_item','add_to_cart','begin_checkout'].includes(nombre))return;
    (window as AnalyticsWindow).gtag?.('event',nombre,parametros);
  }
}
