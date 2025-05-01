import { CommonModule } from '@angular/common';
import { Component, computed, input, Input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Colors, COLORS } from '@models/colors.model';

@Component({
  selector: 'app-btn',
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './btn.component.html'
})
export class BtnComponent {
  faSpinner = faSpinner;

  typeBtn = input<'button' | 'reset' | 'submit'>('button')
  colorBtn = input<Colors>('success')
  disabled = input<boolean>();
  loading = input<boolean>();

  // Use a computed signal instead of manually updating classBtnCustom
  // ✅ Compute the class dynamically (Angular will track it reactively)
  classBtnCustom = computed(() => {
    const color = this.colorBtn();
    const baseClasses = 'w-full px-5 py-2 font-medium rounded text-sm focus:ring-4';

    // We will use a getter to return the class object
    // This is to have dynamic clasess with the help ngClass from Angular
    const colorClasses = {
      danger: 'text-white bg-red-500 hover:bg-red-800 focus:ring-red-300',
      sky: 'text-white bg-sky-500 hover:bg-sky-800 focus:ring-sky-300',
      success: 'text-white bg-green-500 hover:bg-green-800 focus:ring-green-300',
      graylight: 'text-gray-700 bg-gray-200 hover:bg-gray-500 focus:ring-gray-50',
      gray: 'text-white bg-gray-500 hover:bg-gray-800 focus:ring-gray-300', // Default
    };

    return `${baseClasses} ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray}`;
  }
  );

  loadingOrDisabled = computed(() => {
    return this.loading() || this.disabled();
  });

  loadingState = computed(() => {
    return this.loading();
  })
}
