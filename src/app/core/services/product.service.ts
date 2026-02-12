import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment.development';
import { ProductDto, ProductListDto, ProductTypeEnum } from '@shared/models';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching products:', error);

        const errorMessage =
          error.status === 0
            ? 'Unable to connect to server. Please check your connection.'
            : 'Failed to fetch products. Please try again later.';

        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  getProduct(id: string): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.baseUrl}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching product:', error);

        const errorMessage =
          error.status === 404
            ? 'Product not found.'
            : error.status === 0
              ? 'Unable to connect to server. Please check your connection.'
              : 'Failed to fetch product. Please try again later.';

        return throwError(() => new Error(errorMessage));
      }),
    );
  }
}
