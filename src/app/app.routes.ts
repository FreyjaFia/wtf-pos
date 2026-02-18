import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';
import { Login } from '@features/login/login';
import { CustomerDetailsComponent } from '@features/management/customers/customer-details/customer-details';
import { CustomerEditorComponent } from '@features/management/customers/customer-editor/customer-editor';
import { CustomerListComponent } from '@features/management/customers/customer-list/customer-list';
import { CustomersComponent } from '@features/management/customers/customers';
import { ManagementComponent } from '@features/management/management';
import { ProductDetailsComponent } from '@features/management/products/product-details/product-details';
import { ProductEditorComponent } from '@features/management/products/product-editor/product-editor';
import { ProductListComponent } from '@features/management/products/product-list/product-list';
import { ProductsComponent } from '@features/management/products/products';
import { UserDetailsComponent } from '@features/management/users/user-details/user-details';
import { UserEditorComponent } from '@features/management/users/user-editor/user-editor';
import { UserListComponent } from '@features/management/users/user-list/user-list';
import { UsersComponent } from '@features/management/users/users';
import { OrderEditor } from '@features/orders/order-editor/order-editor';
import { OrderList } from '@features/orders/order-list/order-list';
import { Orders } from '@features/orders/orders';
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
        path: 'my-profile',
        component: UserEditorComponent,
        canDeactivate: [unsavedChangesGuard],
        data: { isProfile: true },
      },
      {
        path: 'management',
        component: ManagementComponent,
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
