import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { RouterLinkWithHref } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { CustomValidators } from '@utils/validators';
import { RequestStatus } from '@models/request-status.model';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [
    CommonModule,
    BtnComponent,
    RouterLinkWithHref,
    FontAwesomeModule,
    ReactiveFormsModule,
  ],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
})
export class RegisterFormComponent {
  status: RequestStatus = 'init';

  // Status for the email availability check
  statusUser: RequestStatus = 'init';

  faEye = faEye;
  faEyeSlash = faEyeSlash;
  showPassword = false;
  messageError = '';
  formError = false;

  // Boolean to show the register form or not
  showRegister = false;

  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  // We will create another form to check if the email is available
  formUser = this.formBuilder.nonNullable.group({
    email: ['', [Validators.email, Validators.required]],
  });

  form = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.email, Validators.required]],
      password: ['', [Validators.minLength(8), Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [
        CustomValidators.MatchValidator('password', 'confirmPassword'),
      ],
    },
  );

  register() {
    if (this.form.valid) {
      this.status = 'loading';
      const { name, email, password } = this.form.getRawValue();
      this.authService.registerAndLogin(name, email, password).subscribe({
        next: () => {
          this.status = 'success';
          this.router.navigate(['/app/boards']);
        },
        error: (err) => {
          this.status = 'failed';
          this.formError = true;
          this.messageError = err.error.message;
        },
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  validateUser() {
    if (this.formUser.valid) {
      this.statusUser = 'loading';
      const { email } = this.formUser.getRawValue();

      this.authService.isAvailable(email).subscribe({
        next: (res) => {
          this.statusUser = 'success';
          // As the response always 201 letting us know that the email is available
          // we will use the response to make the redirect to login or not
          console.log(res.isAvailable);
          if (res.isAvailable) {
            // if the email is available we will fill the value of the email in the form
            // and show the register form
            this.showRegister = true;
            this.form.controls.email.setValue(email);
          } else {
            // I want to send the email to the view of /login
            // to do that I need to use a queryParam in the URL (login?email=email)
            this.router.navigate(['/login'], { queryParams: { email } });
          }
        }
      });
    } else {
      // this is to send at once the error message in the FE side
      this.formUser.markAllAsTouched();
    }
  }
}
