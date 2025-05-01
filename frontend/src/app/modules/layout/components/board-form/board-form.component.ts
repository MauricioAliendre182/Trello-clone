import { Component, inject, output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BtnComponent } from "../../../shared/components/btn/btn.component";
import { CommonModule } from '@angular/common';
import { BACKGROUND_COLORS, BackgroundColorValue, Colors } from '@models/colors.model';
import { BoardsService } from '@services/boards.service';
import { RecentBoardsService } from '@services/recent-boards.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-board-form',
  imports: [ReactiveFormsModule, BtnComponent, CommonModule],
  templateUrl: './board-form.component.html'
})
export class BoardFormComponent {
  // We need an output to notify the parent component that the board was created
  // This will be used to close the dialog or overlay
  boardCreated = output<void>();

  private formBuilder = inject(FormBuilder);
  private boardsService = inject(BoardsService);
  private recentBoardsService = inject(RecentBoardsService);
  private router = inject(Router);

  // We need the title and the color of the board
  // The board should not send nullable values to the backend
  form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    // Our background color is a string that can be one of the colors defined in the BACKGROUND_COLORS array
    // We can use the type Colors to define the type of the background color
    backgroundColor: new FormControl<BackgroundColorValue>('sky', {
      nonNullable: true,
      validators: [Validators.required],
    })
  });

  // We need to specify the colors of the board
  boardBackgrounds = BACKGROUND_COLORS;

  // method to select a color
  selectBackground(value: BackgroundColorValue): void {
    this.form.controls['backgroundColor'].setValue(value);
  }

  // We need to create a method to submit the form
  doSave() {
    if (this.form.valid) {
      const { title, backgroundColor } = this.form.getRawValue();

      // Here we can call the service to create the board
      if (!title?.trim()) return;

      // Call the service to create a new board
      // Pass the selected background color and the title of the new board
      this.boardsService
        .createBoard(title, backgroundColor)
        .subscribe({
          next: (createdBoard) => {
            // Also add to recent boards
            this.recentBoardsService.addBoard(createdBoard);

            // Reset the form
            this.form.reset();

            // Emit event to notify parent component that board was created
            this.boardCreated.emit();

            // Navigate to the new board
            this.router.navigate(['/app/boards', createdBoard.id]);
          },
          error: (error) => {
            console.error('Error creating board', error);
          },
        });
    } else {
      // mark all the fields as touched to show the errors
      this.form.markAllAsTouched();
    }
  }
}
