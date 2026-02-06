import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

interface OrderDto {
  id: string;
  orderNumber: number;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  items: OrderItemDto[];
  customerId?: string;
  status: string;
}

interface OrderItemDto {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

@Component({
  selector: 'app-order-list',
  imports: [DatePipe],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderList {
  protected showTable = true;
  protected orders: OrderDto[] = [
    {
      id: '1',
      orderNumber: 1001,
      createdAt: new Date('2024-02-01T10:00:00'),
      createdBy: 'user-1',
      updatedAt: new Date('2024-02-01T12:00:00'),
      updatedBy: 'user-2',
      items: [
        { id: 'a', name: 'Latte', quantity: 2, price: 4.5 },
        { id: 'b', name: 'Bagel', quantity: 1, price: 2.5 },
      ],
      customerId: 'cust-1',
      status: 'Completed',
    },
    {
      id: '2',
      orderNumber: 1002,
      createdAt: new Date('2024-02-02T09:30:00'),
      createdBy: 'user-3',
      items: [{ id: 'c', name: 'Espresso', quantity: 1, price: 3.0 }],
      status: 'Pending',
    },
    {
      id: '3',
      orderNumber: 1003,
      createdAt: new Date('2024-02-03T11:15:00'),
      createdBy: 'user-2',
      items: [
        { id: 'd', name: 'Cappuccino', quantity: 1, price: 4.0 },
        { id: 'e', name: 'Croissant', quantity: 2, price: 2.0 },
      ],
      customerId: 'cust-2',
      status: 'Cancelled',
    },
    {
      id: '4',
      orderNumber: 1004,
      createdAt: new Date('2024-02-04T14:45:00'),
      createdBy: 'user-1',
      items: [{ id: 'f', name: 'Mocha', quantity: 1, price: 5.0 }],
      status: 'Completed',
    },
    {
      id: '5',
      orderNumber: 1005,
      createdAt: new Date('2024-02-05T08:20:00'),
      createdBy: 'user-4',
      items: [{ id: 'g', name: 'Americano', quantity: 2, price: 3.5 }],
      customerId: 'cust-3',
      status: 'Pending',
    },
  ];
}
