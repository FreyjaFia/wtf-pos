import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { Home } from '@features/home/home';
import { Login } from '@features/login/login';
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
    ],
  },
];
