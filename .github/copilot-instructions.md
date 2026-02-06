# Angular Coding Standards (copilot-instructions)

## Source
- Official Angular Style Guide: [https://angular.dev/style-guide](https://angular.dev/style-guide)

## Key Rules & Recommendations

### General Principles
- **Consistency:** When in doubt, prefer consistency within a file over strict adherence to the guide.
- **All UI code in `src/`:** Keep Angular UI code (TypeScript, HTML, styles) inside the `src` directory. Non-UI code (config, scripts) should be outside.
- **Bootstrap in `main.ts`:** The app entry point should be `src/main.ts`.

### Naming
- **Hyphens in file names:** Separate words in file names with hyphens (e.g., `user-profile.ts`).
- **Test files:** End test file names with `.spec.ts` (e.g., `user-profile.spec.ts`).
- **Match file names to identifiers:** File names should reflect the main TypeScript class or concept inside.
- **Component files:** Use the same base name for TypeScript, template, and style files (e.g., `user-profile.ts`, `user-profile.html`, `user-profile.css`).

### Project Structure
- **Feature-based folders:** Organize by feature area, not by code type (avoid `components/`, `services/` folders).
- **Group related files:** Keep component files and their tests together in the same directory.
- **One concept per file:** Prefer one component, directive, or service per file.

## Application Architecture

This application follows a **feature-based architecture** with clear separation of concerns:

### Directory Structure

```
src/app/
├── core/                      # App-wide singleton services and infrastructure
│   ├── auth/                  # Authentication module  
│   │   ├── auth.service.ts    # Authentication service
│   │   ├── auth.guard.ts      # Route guard
│   │   └── auth.guard.spec.ts # Guard tests
│   └── services/              # App-wide API/data services
│       ├── product.service.ts # Product API service
│       └── order.service.ts   # Order API service
│
├── shared/                    # Reusable UI components and models
│   ├── components/            # Shared components
│   │   ├── dock/
│   │   ├── header/
│   │   ├── icons/
│   │   └── layout/
│   └── models/                # Shared data models/interfaces
│       ├── product.models.ts
│       └── order.models.ts
│
└── features/                  # Feature modules
    ├── home/
    ├── login/
    └── orders/
        ├── orders.ts
        ├── new-order/
        └── order-list/
```

### Module Guidelines

**Core Module (`core/`)**
- Contains singleton services used app-wide
- Auth-related code (services, guards, interceptors)
- **API/data services** that are used across multiple features (ProductService, OrderService, etc.)
- Global state management services
- **When to use:** If a service is used in 2+ feature modules, put it in `core/services/`
- **Import core services anywhere in the app**
- Never import feature-specific code into core

**Shared Module (`shared/`)**
- Reusable UI components, directives, and pipes
- Shared data models and interfaces (DTOs, enums, types)
- **No services should be in shared/** (use `core/services/` instead)
- Shared components should be presentation-focused
- Can be imported by any feature module

**Features (`features/`)**
- Self-contained feature modules
- Each feature has its own components, templates, and styles
- Feature-specific logic stays within the feature
- Features can import from core and shared
- Features should not import from other features

### Code Style

**Control Flow Statements**
- **Always use braces:** All `if`, `else`, `for`, `while`, and `do-while` statements must use braces, even for single-line bodies.
- **Logical grouping:** Add blank lines to separate logical sections within methods for better readability.

**Example:**
```typescript
// ✓ Correct
if (condition) {
  doSomething();
}

// ✗ Incorrect
if (condition) doSomething();

// ✓ Correct - with logical grouping
login() {
  const credentials = this.getCredentials();
  
  if (!credentials.isValid) {
    this.showError('Invalid credentials');
    return;
  }
  
  this.auth.login(credentials);
  this.router.navigateByUrl('/home');
}
```

### Environment Configuration

**Environment Files**
- Use `src/environments/environment.development.ts` for development configuration
- Use `src/environments/environment.ts` for production configuration
- Always import from `environment.development.ts` in services (Angular handles file replacement during builds)

**Configuration Structure:**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5282/api'
};
```

**Usage:**
```typescript
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;
}
```

**File Replacements:**
- Production builds automatically replace `environment.development.ts` with `environment.ts`
- Configured in `angular.json` under `configurations.production.fileReplacements`

### Dependency Injection
- **Prefer `inject()` over constructor injection:** Use the `inject()` function for dependencies for readability and type inference.

### Forms
- **Always use Reactive Forms:** Use `ReactiveFormsModule` with `FormControl`, `FormGroup`, and `FormBuilder` instead of template-driven forms (`ngModel`).
- **Form validation:** Apply validators to form controls for client-side validation.
- **Debounce user input:** Use RxJS operators like `debounceTime()` on `valueChanges` for search/filter inputs.

**Example:**
```typescript
protected readonly filterForm = new FormGroup({
  searchTerm: new FormControl(''),
  isActive: new FormControl(true)
});

ngOnInit() {
  this.filterForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
    this.loadData();
  });
}
```

### Components & Directives
- **Selector naming:** Use application-specific prefixes for selectors.
- **Group Angular properties:** Place injected dependencies, inputs, outputs, and queries at the top of the class.
- **Presentation focus:** Keep components/directives focused on UI; refactor logic to other files if not UI-related.
- **Template logic:** Avoid complex logic in templates; use computed properties in TypeScript.
- **Protected members:** Use `protected` for class members only used in templates.
- **Readonly properties:** Mark properties initialized by Angular (inputs, outputs, queries) as `readonly`.
- **Prefer `class`/`style` bindings:** Use `[class]` and `[style]` bindings instead of `NgClass`/`NgStyle` for performance and clarity.
- **Event handler naming:** Name handlers for what they do, not the event (e.g., `saveUserData()` instead of `handleClick()`).
- **Lifecycle hooks:** Keep lifecycle methods simple; delegate logic to named methods.
- **Lifecycle interfaces:** Implement TypeScript interfaces for lifecycle hooks (e.g., `OnInit`).

## Styling

- **Prefer Tailwind CSS & DaisyUI:** Use Tailwind utility classes and DaisyUI components for styles whenever possible instead of creating new custom CSS.
- **Minimal component styles:** Only add component-scoped CSS when utility classes cannot express the required design.
- **Design tokens & theme:** Use the project's `tailwind.config.js` and DaisyUI themes for colors, spacing, and typography rather than hard-coded values.
- **Responsive utilities:** Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) instead of hand-written media queries.
- **Accessibility:** Keep focus and contrast in mind; prefer DaisyUI components that follow accessible patterns and verify interactive controls have visible focus styles.
- **Reuse & extraction:** If a utility combination repeats, extract it to a reusable class or use `@apply` in a CSS file to keep templates readable.

## Editor Shortcuts & Code Hygiene

- **Format documents:** Always format files before committing. In VS Code use the shortcut `Alt+Shift+F` to format the current file.
- **Organize imports:** Use `Alt+Shift+O` to organize and remove unused imports in the current file.
- **Remove unused code:** Remove unused declarations, methods, and parameters. Prefer enabling TypeScript checks (`noUnusedLocals`, `noUnusedParameters`) in `tsconfig.json` and fix reported issues before committing.

	- **Why:** Removing dead code reduces maintenance burden and avoids compiler and lint warnings.
	- **How:** Use your editor's quick-fix actions, `tsc`, or automated tools (e.g., `eslint --fix`) to locate and remove unused symbols.

## Additional Resources
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Angular Security Best Practices](https://angular.dev/best-practices/security)
- [Angular Accessibility Guide](https://angular.dev/best-practices/a11y)

---
_Last updated: February 6, 2026_

## Git Commit Guidelines

Follow these rules for writing clear and consistent commit messages:

### The Seven Rules of a Great Git Commit Message

1. **Separate subject from body with a blank line**
2. **Limit the subject line to 50 characters**
3. **Capitalize the subject line**
4. **Do not end the subject line with a period**
5. **Use the imperative mood in the subject line**
6. **Wrap the body at 72 characters**
7. **Use the body to explain what and why vs. how**

### Commit Message Template

```
Capitalized, short (50 chars or less) summary

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of an email and the rest as the body. The blank line
separating the summary from the body is critical (unless you omit
the body entirely); tools like rebase can get confused if you run
the two together.

Write your commit message in the imperative: "Fix bug" and not
"Fixed bug" or "Fixes bug." This convention matches up with commit
messages generated by commands like git merge and git revert.

Further paragraphs come after blank lines.

- Bullet points are okay, too
- Use a hyphen or asterisk for the bullet
- Wrap at 72 characters
```

### Good Examples

**Example 1:**
```
Add comprehensive coding standards document

Create copilot-instructions.md to establish project-wide coding
standards and conventions.

This document provides:
- Project architecture overview (Vertical Slice, CQRS, Minimal API)
- Naming conventions for all code elements
- Code style rules (using directives, bracing, spacing)

Why: Ensures consistency across the codebase and helps developers
follow established patterns and conventions.
```

**Example 2:**
```
Adopt primary constructors in handler classes

Replace traditional constructor pattern with C# 12 primary
constructors in all MediatR handlers.

Changes:
- Remove private readonly fields
- Use constructor parameter directly in methods
- Applied to all handlers

Why: Primary constructors reduce boilerplate code and improve
readability while leveraging modern C# 12 features.
```

### Bad Examples

? **Too vague:**
```
Update files
```

? **Not imperative mood:**
```
Fixed the bug in handler
```

? **Subject too long:**
```
Add new feature that allows users to create and edit merchants with validation
```

? **No body for complex changes:**
```
Refactor handlers
```

? **Subject ends with period:**
```
Add new endpoint.
```

### When to Write Detailed Commit Bodies

Write a detailed body when:
- The change is not obvious from the subject line
- The change affects multiple files or areas
- You're introducing a new pattern or approach
- The reasoning behind the change is important
- Future developers might ask "why was this done?"

---
