import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { Login } from './features/login/login';
import { Test } from './features/test/test';
import { authGuard } from './guards/auth-guard';
import { Layout } from './shared/layout/layout';
import { Orders } from './features/orders/orders';
import { NewOrder } from './features/orders/new-order/new-order';
import { OrderList } from './features/orders/order-list/order-list';

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
        path: 'test',
        component: Test,
      },
      {
        path: 'orders',
        component: Orders,
        children: [
          { path: 'new', component: NewOrder },
          { path: 'list', component: OrderList },
        ],
      },
    ],
  },
];
