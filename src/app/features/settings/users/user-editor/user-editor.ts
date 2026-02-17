import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService, UserService } from '@app/core/services';
import { AvatarComponent, Icon } from '@app/shared/components';
import { CreateUserDto, UpdateUserDto } from '@app/shared/models';

@Component({
  selector: 'app-user-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon, AvatarComponent],
  templateUrl: './user-editor.html',
  host: {
    class: 'block h-full',
  },
})
export class UserEditorComponent implements OnInit {
  // Angular-injected dependencies
  protected readonly userService = inject(UserService);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly alertService = inject(AlertService);

  // UI state signals
  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);

  // Image upload signals
  protected readonly isUploading = signal(false);
  protected readonly isDragging = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);

  // Form group
  protected readonly userForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    password: new FormControl('', {
      nonNullable: false,
      validators: [Validators.maxLength(100)],
    }),
  });

  // Unsaved changes guard
  protected readonly showDiscardModal = signal(false);
  private pendingDeactivateResolve: ((value: boolean) => void) | null = null;
  private skipGuard = false;

  protected userId: string | null = null;

  /**
   * OnInit lifecycle hook
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.userId = id;
      this.loadUser(id);
    }
  }

  /**
   * File input change handler
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.alertService.error(
          'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.',
        );
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.alertService.error('File size exceeds 5MB limit.');
        return;
      }
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove selected image
   */
  protected removeImage(): void {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
    // Reset file input
    const fileInput = document.getElementById('userImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Drag over handler
   */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  /**
   * Drag leave handler
   */
  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  /**
   * File drop handler
   */
  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (!file) {
      return;
    }
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.alertService.error(
        'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.',
      );
      return;
    }
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.alertService.error('File size exceeds 5MB limit.');
      return;
    }
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Upload image to server (placeholder, implement endpoint in UserService if needed)
   */
  protected uploadImage(userId?: string): void {
    const file = this.selectedFile();
    const id = userId || this.userId;
    if (!file || !id) {
      return;
    }
    this.isUploading.set(true);
    this.userService.uploadUserImage(id, file).subscribe({
      next: (user) => {
        this.currentImageUrl.set(user.imageUrl || null);
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.imagePreview.set(null);
        this.alertService.success('Image uploaded successfully');
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isUploading.set(false);
      },
    });
  }

  /**
   * Loads user data for editing
   */
  private loadUser(id: string): void {
    this.isLoading.set(true);

    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.userForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        });
        // Set current image URL for preview, matching product-editor behavior
        this.currentImageUrl.set(user.imageUrl || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.alertService.error(err.message);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Handles user form submission for create/update
   */
  protected saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    if (this.isEditMode()) {
      const dto: UpdateUserDto = {
        id: this.userId!,
        firstName: this.userForm.controls.firstName.value!,
        lastName: this.userForm.controls.lastName.value!,
        username: this.userForm.controls.username.value!,
        password: this.userForm.controls.password.value || undefined,
      };

      this.userService.updateUser(dto).subscribe({
        next: () => {
          // If there's a file selected, upload it after updating the user
          if (this.selectedFile()) {
            this.uploadImageAndNavigate();
          } else {
            this.isSaving.set(false);
            this.skipGuard = true;
            this.goBack();
          }
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    } else {
      const dto: CreateUserDto = {
        firstName: this.userForm.controls.firstName.value!,
        lastName: this.userForm.controls.lastName.value!,
        username: this.userForm.controls.username.value!,
        password: this.userForm.controls.password.value!,
      };

      this.userService.createUser(dto).subscribe({
        next: (createdUser) => {
          // If there's a file selected, upload it after creating the user
          if (this.selectedFile()) {
            this.uploadImageAndNavigate(createdUser.id);
          } else {
            this.isSaving.set(false);
            this.skipGuard = true;
            this.goBack();
          }
        },
        error: (err) => {
          this.alertService.error(err.message);
          this.isSaving.set(false);
        },
      });
    }
  }

  /**
   * Upload image and navigate to details after upload
   */
  protected uploadImageAndNavigate(userId?: string): void {
    const file = this.selectedFile();
    const id = userId || this.userId;
    if (!file || !id) {
      this.isSaving.set(false);
      return;
    }
    this.isUploading.set(true);
    this.userService.uploadUserImage(id, file).subscribe({
      next: (updatedUser) => {
        this.currentImageUrl.set(updatedUser.imageUrl || null);
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.imagePreview.set(null);
        this.isSaving.set(false);
        this.skipGuard = true;
        this.goBack();
        this.alertService.success('Image uploaded successfully');
      },
      error: (err) => {
        this.alertService.error(err.message || 'Failed to upload image');
        this.isUploading.set(false);
        this.isSaving.set(false);
      },
    });
  }

  /**
   * Navigates back to the user list
   */
  protected goBack(): void {
    this.skipGuard = true;
    this.router.navigate(['/settings/users']);
  }

  /**
   * Returns true if the control is invalid and touched/dirty
   */
  protected hasError(control: string): boolean {
    const ctrl = this.userForm.get(control);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /**
   * Returns the error message for a control
   */
  protected getErrorMessage(control: string): string | null {
    const ctrl = this.userForm.get(control);
    if (!ctrl || !ctrl.errors) {
      return null;
    }
    if (ctrl.errors['required']) {
      return 'This field is required.';
    }
    if (ctrl.errors['maxlength']) {
      return `Maximum length is ${ctrl.errors['maxlength'].requiredLength}.`;
    }
    return null;
  }

  /**
   * Unsaved changes guard logic for navigation
   */
  canDeactivate(): Promise<boolean> {
    if (this.skipGuard || !this.userForm.dirty) {
      return Promise.resolve(true);
    }

    this.showDiscardModal.set(true);
    return new Promise((resolve) => {
      this.pendingDeactivateResolve = resolve;
    });
  }

  /**
   * Cancels the discard action in the modal
   */
  protected cancelDiscard(): void {
    this.showDiscardModal.set(false);
    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(false);
      this.pendingDeactivateResolve = null;
    }
  }

  /**
   * Confirms the discard action in the modal
   */
  protected confirmDiscard(): void {
    this.showDiscardModal.set(false);
    if (this.pendingDeactivateResolve) {
      this.pendingDeactivateResolve(true);
      this.pendingDeactivateResolve = null;
    }
    this.goBack();
  }

  /**
   * Returns the full name from the form controls
   */
  protected userFullName(): string {
    const first = this.userForm.controls.firstName.value || '';
    const last = this.userForm.controls.lastName.value || '';
    return `${first} ${last}`.trim();
  }
}
