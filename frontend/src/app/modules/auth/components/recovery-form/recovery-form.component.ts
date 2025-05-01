import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { CustomValidators } from '@utils/validators';
import { AuthService } from '@services/auth.service';
import { RequestStatus } from '@models/request-status.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-recovery-form',
  standalone: true,
  imports: [CommonModule, BtnComponent, FontAwesomeModule, ReactiveFormsModule],
  templateUrl: './recovery-form.component.html',
  styleUrl: './recovery-form.component.scss'
})
export class RecoveryFormComponent {
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.minLength(6), Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [
        CustomValidators.MatchValidator('newPassword', 'confirmPassword'),
      ],
    }
  );
  status: RequestStatus = 'init';
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  showPassword = false;

  // Intial value of the token
  token = ';'

  constructor() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      // I need to check if the token exists in the query params
      if (token) {
        // I recover the token from the URL
        this.token = token;
      } else {
        // Redirect to login in case we do not have a token in the URL
        this.router.navigate(['/login']);
      }
    });
  }

  recovery() {
    if (this.form.valid) {
      this.status = 'loading';
      const { newPassword } = this.form.getRawValue();
      this.authService.changePassword(this.token, newPassword).subscribe({
        next: () => {
          this.status = 'success';
          this.router.navigate(['/login']);
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
