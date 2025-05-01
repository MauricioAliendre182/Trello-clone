import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '@services/auth.service';
import { RequestStatus } from '@models/request-status.model';

@Component({
  selector: 'app-forgot-password-form',
  standalone: true,
  imports: [CommonModule, BtnComponent, ReactiveFormsModule, BtnComponent],
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './forgot-password-form.component.scss'
})
export class ForgotPasswordFormComponent {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.email, Validators.required]],
  });
  status: RequestStatus = 'init';
  emailSent = false;

  sendLink() {
    if (this.form.valid) {
      this.status = 'loading';
      const { email } = this.form.getRawValue();
      this.authService.recovery(email).subscribe({
        next: () => {
          this.status = 'success';
          this.emailSent = true;
        },
        error: () => {
          this.status = 'failed';
          console.log(this.status);
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
