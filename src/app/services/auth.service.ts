import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isLoggedIn = new BehaviorSubject<boolean>(localStorage.getItem('loggedIn') === 'true');
  readonly isLoggedIn$ = this._isLoggedIn.asObservable();

  login() {
    localStorage.setItem('loggedIn', 'true');
    this._isLoggedIn.next(true);
  }

  logout() {
    localStorage.removeItem('loggedIn');
    this._isLoggedIn.next(false);
  }
}
