// The collections are only utilites that we can use to create our own data source
// and we can use them to create our own data source
import { DataSource } from '@angular/cdk/collections';
import { Product } from '../../../../../models/product.model';
import { BehaviorSubject, Observable } from 'rxjs';

export class DataSourceProduct extends DataSource<Product> {
  // BehaviorSubject is a type of observable that can emit new values
  // It is used to create a data source that can be used to connect to the table
  data = new BehaviorSubject<Product[]>([]); // The data source is a collection of data that we can use to create our own data source

  // Every time that we make a search, we need to have a backup of the original data
  originalData: Product[] = [];

  // The connect method is used to connect the data source to the table
  // It returns an observable that emits the data when it changes
  connect(): Observable<Product[]> {
    // In this case, we are just returning the data as an observable
    return this.data;
  }

  // We need to specify the initial data for the data source
  init(products: Product[]) {
    // The init method is used to initialize the data source with the initial data
    // It is called when the data source is created

    // I need to store the original data in a variable to be able to use it later
    this.originalData = products;
    // The data is a BehaviorSubject that emits the data when it changes
    this.data.next(products);
  }

  // Method to get the total of the price of the products
  getTotal() {
    const total = this.data
      .getValue()
      .map((item) => item.price)
      .reduce((prev, curr) => prev + curr, 0);
    return total;
  }

  // Method tp update our products
  // Partial<> is to make optional all the options of the Product
  update(id: Product['id'], changes: Partial<Product>) {
    const products = this.data.getValue();
    const productIndex = products.findIndex((item) => item.id === id);

    // Here we need to clarify that index is not -1, which means that we could not find
    //  the index (this index includes 0 which we will use it)
    if (productIndex !== -1) {
      products[productIndex] = {
        ...products[productIndex],
        ...changes,
      };

      this.data.next(products);
    }
  }

  find(query: string) {
    // The find method is used to find products by its title, id or price matching the query string
    // It takes a query string as an argument and returns an observable that emits the product when it is found
    // NOTE: this method should consult to a service to get the data from the server
    // We will use orginalData to avoid mutation of the data (this.data.getValue())
    // const products = this.data.getValue()
    const newProducts = this.originalData.filter((element) => {
      return (
        element.title.toLowerCase().includes(query.toLowerCase()) ||
        element.id.toString().includes(query) ||
        element.price.toString().includes(query)
      );
    });
    this.data.next(newProducts);
  }

  disconnect() {
    // The disconnect method is used to disconnect the data source from the table
    // It is called when the table is destroyed
    // this.data.complete()
  }
}
