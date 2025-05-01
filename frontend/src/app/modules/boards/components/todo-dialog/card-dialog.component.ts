import { Component, inject, Inject } from '@angular/core';
import {
  Dialog,
  DialogRef,
  DIALOG_DATA,
  DialogModule,
} from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faClose,
  faCheckToSlot,
  faBars,
  faUser,
  faTag,
  faCheckSquare,
  faClock,
  faEye,
  faPlus,
  faPaperclip,
  faWindowMaximize,
  faFolder,
  faArrowRight,
  faCopy,
  faBox,
  faBoxArchive,
  faShareNodes,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { Card } from '@models/card.model';
import { CardsService } from '@services/cards.service';

interface InputData {
  card: Card;
  listTitle: string;
}

export interface OutputData {
  rta?: boolean;
  card?: Card;
  action?: 'deleted' | 'updated';
  cardId?: number;
}

export interface CardDialogResult {
  action: 'updated' | 'deleted' | string;
  card?: Card;
  cardId?: number;
}

@Component({
  selector: 'app-card-dialog',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    FontAwesomeModule,
    BtnComponent,
  ],
  templateUrl: './card-dialog.component.html',
})
export class CardDialogComponent {
  //iconos
  // This component is a dialog
  // It will be used to create a dialog when for example we click over a task
  faClose = faClose;
  faCheckToSlot = faCheckToSlot;
  faBars = faBars;
  faUser = faUser;
  faTag = faTag;
  faCheckSquare = faCheckSquare;
  faClock = faClock;
  faEye = faEye;
  faPlus = faPlus;
  faPaperclip = faPaperclip;
  faWindowMaximize = faWindowMaximize;
  faFolder = faFolder;
  faArrowRight = faArrowRight;
  faCopy = faCopy;
  faBox = faBox;
  faBoxArchive = faBoxArchive;
  faShareNodes = faShareNodes;
  faTrash = faTrash;

  // card without assigning a value
  card: Card;

  // listTitle without assigning a value
  listTitle: string;

  // Properties to update and delete the card
  isEditing = false;
  cardForm = {
    title: '',
    description: '',
  };

  // Inject the cards service
  private cardsService = inject(CardsService);

  // inject DialogRef with the constructor
  // inject DIALOG_DATA with 'Inject'
  // DIALOG_DATA is a token that is used to inject the data that was passed to the dialog
  constructor(
    private dialogRef: DialogRef<CardDialogResult>,
    @Inject(DIALOG_DATA) data: InputData,
  ) {
    this.card = data.card;
    this.listTitle = data.listTitle;
    // Initialize form with current card data
    this.cardForm.title = this.card.title;
    this.cardForm.description = this.card.description || '';
  }

  close() {
    // Here in close() we can send information back to the component that opened the dialog
    // We can send any data we want, which is this case CardDialogResult
    // but in this case we are not sending anything
    // because we are not updating or deleting the card
    this.dialogRef.close();
  }

  // Toggle edit mode
  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset form when canceling edit
      this.cardForm.title = this.card.title;
      this.cardForm.description = this.card.description || '';
    }
  }

  // Save card changes
  saveCard() {
    if (!this.cardForm.title.trim()) return;

    this.cardsService
      .update(this.card.id, {
        title: this.cardForm.title.trim(),
        description: this.cardForm.description.trim(),
        listId: this.card.listId,
        position: this.card.position,
      })
      .subscribe({
        next: (updatedCard) => {
          // Update local card data with response
          this.card = updatedCard;
          this.isEditing = false;

          // Close dialog with updated card
          // We can send any data we want, which is this case CardDialogResult
          this.dialogRef.close({
            action: 'updated',
            card: updatedCard,
          });
        },
        error: (error) => {
          console.error('Error updating card', error);
        },
      });
  }

  // Delete card
  deleteCard() {
    if (confirm('Are you sure you want to delete this card?')) {
      this.cardsService.delete(this.card.id).subscribe({
        next: () => {
          // Close dialog and indicate deletion
          // We can send any data we want, which is this case CardDialogResult
          this.dialogRef.close({
            action: 'deleted',
            cardId: this.card.id,
          });
        },
        error: (error) => {
          console.error('Error deleting card', error);
          alert('Error deleting card. Please try again later.');
        },
      });
    }
  }
}
