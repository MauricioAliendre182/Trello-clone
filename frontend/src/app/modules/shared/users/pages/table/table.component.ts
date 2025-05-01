import { Component, inject } from '@angular/core';
import { NavbarComponent } from '../../../../layout/components/navbar/navbar.component';
import { Product } from '../../../../../models/product.model';
import { HttpClient } from '@angular/common/http';
import { CdkTableModule } from '@angular/cdk/table';
import { ColumnConfig } from '@models/column.model';
import { BtnComponent } from '../../../components/btn/btn.component';
import { NgClass } from '@angular/common';
import { DataSourceProduct} from './data-source';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-table',
  imports: [NavbarComponent, CdkTableModule, BtnComponent, NgClass, ReactiveFormsModule],
  templateUrl: './table.component.html',
})
export class TableComponent {
  // Now our products will be an instance of DataSourceProduct
  // in this way we will improve a bit more the perfomance of our table
  // and we will be able to use the data source as a data source for the table
  dataSource = new DataSourceProduct();
  total = 0;

  // Here I will use a reactive form to manage the input
  // the value must not be nullable
  input = new FormControl('', { nonNullable: true })

  // I need to state the columns to be displayed
  columnConfig: ColumnConfig[] = [
    { name: '#No', header: 'Id.', field: 'id', type: 'text' },
    { name: 'name', header: 'Title', field: 'title', type: 'text' },
    {
      name: 'price',
      header: 'Price',
      field: 'price',
      type: 'text',
      showTotal: true,
    },
    { name: 'cover', header: 'Cover', field: 'images', type: 'image' },
    { name: 'actions', header: 'Actions', field: '', type: 'action' },
  ];

  columns: string[] = this.columnConfig.map((col) => col.name);

  // Inject http client through constructor
  private http = inject(HttpClient);

  ngOnInit() {
    this.http
      .get<Product[]>('https://api.escuelajs.co/api/v1/products')
      .subscribe((data) => {
        // Load the initial data into the data source
        this.dataSource.init(data);
        this.total = this.dataSource.getTotal();


        // Let's hear the changes of input
        this.input.valueChanges
        // First we need to give it a debounce time
        // to avoid unnecessary searchs (search for every key introduced in the keyboard)
        .pipe(
          debounceTime(300)
        )
        .subscribe(value => {
          // Here we will use the find method to search for the products
          this.dataSource.find(value)
        })

        // this.products = data;
        // this.total = this.products
        //   .map(item => item.price)
        //   .reduce((prev, curr) => prev + curr, 0);
      });
  }

  // This method is to update a product using Reactie programming
  update(product: Product) {
    // We will use dataSource to update the product
    this.dataSource.update(product.id, { price: 20 })
  }
}
