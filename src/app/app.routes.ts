import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { Home } from '@features/home/home';
import { Login } from '@features/login/login';
import { OrderEditor } from '@features/orders/order-editor/order-editor';
import { OrderList } from '@features/orders/order-list/order-list';
import { Orders } from '@features/orders/orders';
import { ProductDetailsComponent } from '@features/settings/products/product-details/product-details';
import { ProductEditorComponent } from '@features/settings/products/product-editor/product-editor';
import { ProductListComponent } from '@features/settings/products/product-list/product-list';
import { ProductsComponent } from '@features/settings/products/products';
import { SettingsComponent } from '@features/settings/settings';
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
        path: 'home',
        component: Home,
      },
      {
        path: 'orders',
        component: Orders,
        children: [
          { path: 'editor', component: OrderEditor },
          { path: 'editor/:id', component: OrderEditor },
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
              },
              {
                path: 'details/:id',
                component: ProductDetailsComponent,
              },
              {
                path: 'edit/:id',
                component: ProductEditorComponent,
              },
            ],
          },
        ],
      },
    ],
  },
];
