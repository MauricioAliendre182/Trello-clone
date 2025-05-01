import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BoardStateService {
  // Initialize with a default background color
  private backgroundColorSubject = new BehaviorSubject<string>('gray-700');

  // Expose as Observable to prevent external components from directly emitting values
  public backgroundColor$: Observable<string> = this.backgroundColorSubject.asObservable();

  // Additional board info could be added here if needed
  private boardIdSubject = new BehaviorSubject<string | null>(null);
  public boardId$: Observable<string | null> = this.boardIdSubject.asObservable();

  private boardTitleSubject = new BehaviorSubject<string>('');
  public boardTitle$: Observable<string> = this.boardTitleSubject.asObservable();

  constructor() {}

  // Method to update background color
  setBackgroundColor(color: string): void {
    this.backgroundColorSubject.next(color);
  }

  // Methods for other board state if needed
  setBoardId(id: string | null): void {
    this.boardIdSubject.next(id);
  }

  setBoardTitle(title: string): void {
    this.boardTitleSubject.next(title);
  }

  // You could also set all board info at once
  updateBoardInfo(id: string | null, title: string, backgroundColor: string): void {
    this.boardIdSubject.next(id);
    this.boardTitleSubject.next(title);
    this.backgroundColorSubject.next(backgroundColor);
  }

  resetState(): void {
    this.backgroundColorSubject.next(''); // Default color
    this.boardTitleSubject.next('');
    this.boardIdSubject.next(null);
  }
}
