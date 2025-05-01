import { Component, inject, OnInit } from '@angular/core';
import { CdkTableModule } from '@angular/cdk/table';
import { ColumnConfig } from '@models/column.model';
import { BtnComponent } from '../../../components/btn/btn.component';
import { NgClass, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { UsersService } from '@services/users.service';
import { UserDataSource } from './user-data-source';
import { User } from '@models/user.model';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-users-table',
  imports: [CdkTableModule, BtnComponent, NgClass, ReactiveFormsModule, FormsModule, NgIf],
  templateUrl: './users-table.component.html'
})
export class UsersTableComponent implements OnInit {
  private userService = inject(UsersService);
  private authService = inject(AuthService);

  dataSource = new UserDataSource(); // Custom data source that extends CDK's DataSource
  isLoading = false;                 // Loading state flag for UI feedback
  originalData: any[] = [];          // Backup of original data for reset operations
  searchConfig = {
    name: true,
    email: true
  };

  // Add pagination properties
  itemsPerPage = 10;                 // Number of users to display per page
  currentPage = 1;                   // Current active page

  // Here I will use a reactive form to manage the input
  // the value must not be nullable
  input = new FormControl('', { nonNullable: true })       // Search input control

  // We need to store the user data
  user: User | null = null;

  // I need to state the columns to be displayed
  columnConfig: ColumnConfig[] = [
    { name: '#No', header: 'Id.', field: 'id', type: 'text' },
    { name: 'name', header: 'Name', field: 'name', type: 'text' },
    { name: 'email', header: 'Email', field: 'email', type: 'text' },
    { name: 'avatar', header: 'Avatar', field: 'avatar', type: 'image' },
  ];

  columns: string[] = this.columnConfig.map((col) => col.name);

  ngOnInit(): void {
      this.userService.getUsers()
      .subscribe((users) => {
        // Initialize the data source with users
        this.dataSource.init(users);

        // Store original data from the dataSource, not directly
        this.originalData = [...this.dataSource.originalData];

        // Let's hear the changes of input
        // Set up search functionality
        this.input.valueChanges
        // First we need to give it a debounce time
        // to avoid unnecessary searchs (search for every key introduced in the keyboard)

        // First we need to give it a debounce time
        // to avoid unnecessary searchs (search for every key introduced in the keyboard)
        .pipe(

          debounceTime(300), // Wait 300ms after last input before filtering
          distinctUntilChanged() // Only emit if value has changed
        )
        .subscribe(value => {
          this.isLoading = true;
          // Reset pagination when searching
          this.currentPage = 1;
          // Here we will use the find method to search for the users
          this.dataSource.find(value);
          // Add this line to turn off loading once search completes
          setTimeout(() => {
            this.isLoading = false;
            // Update pagination after search completes
            this.updateVisibleData();
          }, 300);
        })
      })

      // Here I will get the user data
      // We will use reactive programming to get the user
      // we need to get user$ and make the subscribe
      // IMPORTANT: if we use getDataUser() we will get a null value
      // this is because the ngOnInit from layout.component.ts is being executed
      // LATER than the current ngOnInit
      this.authService.user$
      .subscribe(user => {
        this.user = user
      })

      // Add watcher for search config changes
      Object.keys(this.searchConfig).forEach(key => {
        const keyTyped = key as keyof typeof this.searchConfig;
        this.watch(keyTyped);
      });
  }

  // Add this method to update searchConfig
  // Updates search configuration and re-applies current search
  // Example: If a user unchecks the "search by email" option, this method updates the datasource so that subsequent searches only look at names.
  updateSearchConfig() {
    this.dataSource.setSearchConfig(this.searchConfig);
    // Re-apply current search if input has a value
    if (this.input.value) {
      this.dataSource.find(this.input.value);
    }
  }

  // Creates reactive getters/setters for search configuration properties
  // Helper method to watch for changes to search config
  // this method will be called for each key in searchConfig
  // and will create a getter and setter for each key
  // this way we can update the searchConfig when the user changes the checkbox
  // this method will be called for each key in searchConfig

  // Example: When user toggles the "Name" checkbox from true to false, this setter captures the change
  // and triggers updateSearchConfig() which updates the search behavior.
  watch(key: keyof typeof this.searchConfig) {
    // getOwnPropertyDescriptor will return the descriptor of the property
    // if the property is configurable, we can create a getter and setter for it
    // two arguments are needed, the name of the property and the descriptor
    const descriptor = Object.getOwnPropertyDescriptor(this.searchConfig, key);
    if (descriptor && descriptor.configurable) {
      let value = this.searchConfig[key];
      // defineProperty will create a getter and setter for the property
      // this way we can update the searchConfig when the user changes the checkbox
      // four arguments are needed, the object, the name of the property, the descriptor and a boolean
      // to indicate if the property is configurable or not
      Object.defineProperty(this.searchConfig, key, {
        get: () => value,
        set: (newValue) => {
          value = newValue;
          this.updateSearchConfig();
        },
        configurable: true
      });
    }
  }

  // Add this getter
  // to check if the search input is empty
  // Example: If searching for "XYZ" returns no matching users, this will
  // return true, allowing the UI to show a "No results found" message.
  get hasNoResults(): boolean {
    return this.dataSource.data.value.length === 0;
  }

  // Example: When user clicks "Clear search" after searching for "John",
  // this resets the input and shows the original user list.
  clearSearch() {
    this.input.reset();
    // Reset pagination when clearing search
    this.currentPage = 1;
    // Update pagination after clearing search
    this.updateVisibleData();
  }

  // Pagination methods
  // Example:
  // Without search: If there are 50 total users, returns 50
  // With search for "admin": If 5 users match, returns 5
  get totalItems() {
    // If searching, use the filtered data length
    return this.isSearching ? this.dataSource.data.value.length : this.dataSource.originalData.length;
  }

  // Add this getter to detect if we're in search mode
  // Example: If the search box contains "admin", this returns true,
  // allowing conditional UI elements to display.
  get isSearching(): boolean {
    return this.input.value !== '';
  }

  //   Example:

  // 50 users with 10 per page = 5 pages
  // 55 users with 10 per page = 6 pages
  // 0 users = 1 page (to avoid division by zero issues)
  get totalPages() {
    const total = this.totalItems;
    return total === 0 ? 1 : Math.ceil(total / this.itemsPerPage);
  }

  // Calculates the index of the first visible item on the current page
  //   Example:

  // Page 1 with 10 items per page: (1-1) * 10 + 1 = 1
  // Page 3 with 10 items per page: (3-1) * 10 + 1 = 21
  get startItem() {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  // Calculates the index of the last visible item on the current page
  //   Example:

  // Page 3 of 5 with 10 items per page: 3 * 10 = 30
  // Page 6 of 6 with 10 items per page (55 total items): Returns 55 instead of 60
  get endItem() {
    if (this.totalItems === 0) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalItems ? this.totalItems : end;
  }

  // Moves to the previous page and updates visible data
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateVisibleData();
    }
  }

  // Moves to the next page and updates visible data
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateVisibleData();
    }
  }

  // Updates the data shown in the table based on pagination
  //   Example:

  // On page 3 with 10 items per page: Shows items 21-30
  // The calculation: start = (3-1) * 10 = 20, so we slice from index 20 to 30
  updateVisibleData() {
    // If we're searching, use the filtered results
    if (this.isSearching) {
      return; // Let the search results display directly
    }

    // Only paginate the full data when not searching
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const paginatedData = this.dataSource.originalData.slice(start, start + this.itemsPerPage);
    this.dataSource.data.next(paginatedData);
    }
}
