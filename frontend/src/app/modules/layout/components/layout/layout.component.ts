import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  imports: [CommonModule, NavbarComponent, RouterModule],
})
export class LayoutComponent implements OnInit {
  // This component is the main layout of the app
  // Here we will call our profile only one time to have it available in the whole app
  private authService = inject(AuthService);

  ngOnInit(): void {
      // Make a subscribe to get the profile info
      // in this case we do not send nothing because the user
      // info will be stored in user$
      this.authService.getProfile().subscribe();
  }
}
