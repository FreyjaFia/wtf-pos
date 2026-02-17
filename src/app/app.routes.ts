import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';
import { Login } from '@features/login/login';
import { OrderEditor } from '@features/orders/order-editor/order-editor';
import { OrderList } from '@features/orders/order-list/order-list';
import { Orders } from '@features/orders/orders';
import { CustomerDetailsComponent } from '@features/settings/customers/customer-details/customer-details';
import { CustomerEditorComponent } from '@features/settings/customers/customer-editor/customer-editor';
import { CustomerListComponent } from '@features/settings/customers/customer-list/customer-list';
import { CustomersComponent } from '@features/settings/customers/customers';
import { ProductDetailsComponent } from '@features/settings/products/product-details/product-details';
import { ProductEditorComponent } from '@features/settings/products/product-editor/product-editor';
import { ProductListComponent } from '@features/settings/products/product-list/product-list';
import { ProductsComponent } from '@features/settings/products/products';
import { SettingsComponent } from '@features/settings/settings';
import { UserDetailsComponent } from '@features/settings/users/user-details/user-details';
import { UserEditorComponent } from '@features/settings/users/user-editor/user-editor';
import { UserListComponent } from '@features/settings/users/user-list/user-list';
import { UsersComponent } from '@features/settings/users/users';
import { Layout } from '@shared/components';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: 'orders',
        component: Orders,
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'editor', component: OrderEditor, canDeactivate: [unsavedChangesGuard] },
          { path: 'editor/:id', component: OrderEditor, canDeactivate: [unsavedChangesGuard] },
          { path: 'list', component: OrderList },
        ],
      },
      {
        path: 'settings',
        component: SettingsComponent,
        children: [
          {
            path: '',
            redirectTo: 'products',
            pathMatch: 'full',
          },
          {
            path: 'products',
            component: ProductsComponent,
            children: [
              {
                path: '',
                component: ProductListComponent,
              },
              {
                path: 'new',
                component: ProductEditorComponent,
                canDeactivate: [unsavedChangesGuard],
              },
              {
                path: 'details/:id',
                component: ProductDetailsComponent,
              },
              {
                path: 'edit/:id',
                component: ProductEditorComponent,
                canDeactivate: [unsavedChangesGuard],
              },
            ],
          },
          {
            path: 'customers',
            component: CustomersComponent,
            children: [
              {
                path: '',
                component: CustomerListComponent,
              },
              {
                path: 'new',
                component: CustomerEditorComponent,
                canDeactivate: [unsavedChangesGuard],
              },
              {
                path: 'details/:id',
                component: CustomerDetailsComponent,
              },
              {
                path: 'edit/:id',
                component: CustomerEditorComponent,
                canDeactivate: [unsavedChangesGuard],
              },
            ],
          },
          {
            path: 'users',
            component: UsersComponent,
            children: [
              {
                path: '',
                component: UserListComponent,
              },
              {
                path: 'new',
                component: UserEditorComponent,
              },
              {
                path: 'details/:id',
                component: UserDetailsComponent,
              },
              {
                path: 'edit/:id',
                component: UserEditorComponent,
              },
            ],
          },
        ],
      },
    ],
  },
];
