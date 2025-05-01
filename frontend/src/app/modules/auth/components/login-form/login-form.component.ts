import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BtnComponent } from '../../../shared/components/btn/btn.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPen, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '@services/auth.service';
import { RequestStatus } from '@models/request-status.model';

@Component({
  selector: 'app-login-form',
  imports: [CommonModule, BtnComponent, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss'
})
export class LoginFormComponent {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  // I need to inject ActivatedRoute to get the query params
  // in this case the email
  private route = inject(ActivatedRoute);

  form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.email, Validators.required]],
    password: ['', [ Validators.required, Validators.minLength(8)]],
  });
  faPen = faPen;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  showPassword = false;
  status: RequestStatus = 'init';

  constructor() {
    this.route.queryParams.subscribe((params) => {
      const email = params['email'];
      // I need to check if the email exists in the query params
      if (email) {
        // I need to set the email in the form if it exists
        this.form.controls.email.setValue(email);
      }
    });
  }

  doLogin() {
    if (this.form.valid) {
      this.status = 'loading';
      const { email, password } = this.form.getRawValue();
      this.authService.login(email, password)
      .subscribe({
        next: () => {
          this.status = 'success';
          this.router.navigate(['/app/boards'])
        },
        error: () => {
          this.status = 'failed';
          console.log(this.status);
        }
      })
    } else {
      this.form.markAllAsTouched();
    }
  }
}
