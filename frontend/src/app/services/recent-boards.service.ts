import { Injectable } from '@angular/core';
import { Board } from '@models/board.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecentBoardsService {
  private readonly STORAGE_KEY = 'recentBoards';
  private readonly MAX_RECENT_BOARDS = 4;

  private _recentBoards = new BehaviorSubject<Board[]>([]);
  recentBoards$ = this._recentBoards.asObservable();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const storedBoards = localStorage.getItem(this.STORAGE_KEY);
      if (storedBoards) {
        const boards = JSON.parse(storedBoards);
        // _recentBoards is a BehaviorSubject<Board[]>
        // next is a method of BehaviorSubject that emits the new value to all subscribers
        // and updates the current value of the BehaviorSubject
        this._recentBoards.next(boards);
      }
    } catch (e) {
      console.error('Error loading recent boards from localStorage', e);
    }
  }

  private saveToLocalStorage(boards: Board[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(boards));
    } catch (e) {
      console.error('Error saving recent boards to localStorage', e);
    }
  }

  addBoard(board: Board) {
    const currentBoards = this._recentBoards.value;

    // Remove the board if it already exists (to avoid duplicates)
    const filteredBoards = currentBoards.filter(b => b.id !== board.id);

    // Add the new board at the beginning
    const newBoards = [board, ...filteredBoards].slice(0, this.MAX_RECENT_BOARDS);

    this._recentBoards.next(newBoards);
    this.saveToLocalStorage(newBoards);
  }

  clearRecentBoards() {
    this._recentBoards.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Clear only an specific board from the recent boards
  clearBoard(boardId: string) {
    const currentBoards = this._recentBoards.value;
    const filteredBoards = currentBoards.filter(board => board.id !== boardId);

    this._recentBoards.next(filteredBoards);
    this.saveToLocalStorage(filteredBoards);
  }
}
