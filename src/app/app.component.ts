import { Component } from '@angular/core';
import { BarcodeAdminComponent } from './admin/barcode-admin.component';

@Component({
  selector:'app-root',
  standalone:true,
  imports:[BarcodeAdminComponent],
  template:`<app-barcode-admin></app-barcode-admin>`
})
export class AppComponent {}
