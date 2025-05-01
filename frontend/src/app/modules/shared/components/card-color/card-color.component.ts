import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { COLORS, Colors } from '@models/colors.model';

@Component({
  selector: 'app-card-color',
  imports: [CommonModule],
  templateUrl: './card-color.component.html'
})
export class CardColorComponent {
  color = input<Colors>("sky")

  mapColors = COLORS;

  // computed is a signal that will be updated when the input changes
  // This is a good practice to use computed instead of using the input directly in the template
  // in this case we want to compute the changes in the input 'color'
  classColor = computed(() => {
    // Here we are using the input 'color' to get the color from the mapColors object
    // We are using the 'as' keyword to tell TypeScript that the color is a key of the mapColors object
    const classes = this.mapColors[this.color() as keyof typeof this.mapColors]

    return classes ? classes : {}
  })
}
