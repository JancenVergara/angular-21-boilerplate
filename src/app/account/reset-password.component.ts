import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, first, map, timeout } from 'rxjs/operators';
import { of } from 'rxjs';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

enum TokenStatus {
    Validating,
    Valid,
    Invalid
}

@Component({ templateUrl: 'reset-password.component.html', standalone: false })
export class ResetPasswordComponent implements OnInit {
    TokenStatus = TokenStatus;
    tokenStatus = TokenStatus.Validating;
    token?: string;
    form!: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private cdr: ChangeDetectorRef,
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });

        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.setTokenStatus(TokenStatus.Invalid);
            return;
        }

        this.location.replaceState(this.router.url.split('?')[0]);

        this.accountService.validateResetToken(token)
            .pipe(
                first(),
                timeout(5000),
                map(() => true),
                catchError(() => of(false))
            )
            .subscribe(isValid => {
                if (isValid) {
                    this.token = token;
                    this.setTokenStatus(TokenStatus.Valid);
                } else {
                    this.setTokenStatus(TokenStatus.Invalid);
                }
            });
    }

    get f() { return this.form.controls; }

    private setTokenStatus(status: TokenStatus) {
        this.tokenStatus = status;
        this.cdr.detectChanges();
    }

    onSubmit() {
        this.submitted = true;
        this.alertService.clear();

        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        this.accountService.resetPassword(this.token!, this.f['password'].value, this.f['confirmPassword'].value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['../login'], { relativeTo: this.route });
                },
                error: (error: any) => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
}
