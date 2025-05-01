import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faInfoCircle,
  faCircleQuestion,
  faChevronDown,
  faAngleDown,
  faClose,
} from '@fortawesome/free-solid-svg-icons';
import { NavigationEnd, Router, RouterLinkWithHref } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { BoardFormComponent } from "../board-form/board-form.component";
import { BoardStateService } from '@services/board-state.service';
import { filter, Observable } from 'rxjs';
import { RecentBoardsService } from '@services/recent-boards.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    BtnComponent,
    OverlayModule,
    FontAwesomeModule,
    RouterLinkWithHref,
    BoardFormComponent
],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  // Import service authService
  private readonly authService = inject(AuthService);
  // Import router to make the redirect to the main page
  private readonly router = inject(Router);
  // Import board state service to manage the state of the board
  private readonly boardStateService = inject(BoardStateService);
  // Import recent viewed board service to delete them with the logout
  private readonly recentBoardService = inject(RecentBoardsService);

  // Every import from font-awesome is a component
  // Which is renderized through SVG
  // We need to create variables to have access to these components
  faBell = faBell;
  faInfoCircle = faInfoCircle;
  faCircleQuestion = faCircleQuestion;
  faChevronDown = faChevronDown;
  faAngleDown = faAngleDown;
  faClose = faClose;

  // I need a user to show the avatar and the name
  // for that we will recover the observable where we are
  // storing the user
  user$ = this.authService.user$;

  // Expose as Observable for template binding
  backgroundColor$: Observable<string> = this.boardStateService.backgroundColor$;
  boardTitle$: Observable<string> = this.boardStateService.boardTitle$;

  // Every overlay should have its own state
  isOpen = false;
  isOpenEspaciodeTrabajo = false;
  isOpenReciente = false;
  isOpenCreateBoard = false;

  constructor() {
    // Subscribe to route changes
    this.router.events.pipe(
      // We can use the filter operator to check if the event is an instance of NavigationEnd
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Reset board state when route changes
      this.boardStateService.resetState();
    });
  }

  logout() {
    this.authService.logout();
    this.recentBoardService.clearRecentBoards();
    this.router.navigate(['/login']);
  }

  toggleCreateBoardMenu() {
    this.isOpenCreateBoard = !this.isOpenCreateBoard;
  }

  closeCreateBoardOverlay() {
    this.isOpenCreateBoard = false;
  }
}
