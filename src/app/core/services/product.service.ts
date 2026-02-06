import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';
import { ProductDto, ProductListDto, ProductTypeEnum } from '../../shared/models/product.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  getProducts(query?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string | null;
    type?: ProductTypeEnum | null;
    isAddOn?: boolean | null;
    isActive?: boolean | null;
  }): Observable<ProductListDto> {
    let params = new HttpParams();
    params = params.set('page', String(query?.page ?? 1));
    params = params.set('pageSize', String(query?.pageSize ?? 10));

    if (query?.searchTerm) {
      params = params.set('searchTerm', query.searchTerm);
    }

    if (query?.type) {
      params = params.set('type', String(query.type));
    }

    if (query?.isAddOn !== undefined && query?.isAddOn !== null) {
      params = params.set('isAddOn', String(query.isAddOn));
    }

    if (query?.isActive !== undefined && query?.isActive !== null) {
      params = params.set('isActive', String(query.isActive));
    }

    return this.http.get<ProductListDto>(this.baseUrl, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching products:', error);
        return throwError(() => new Error('Failed to fetch products. Please try again later.'));
      }),
    );
  }

  getProduct(id: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Error fetching product:', error);
        return throwError(() => new Error('Failed to fetch product. Please try again later.'));
      }),
    );
  }
}
