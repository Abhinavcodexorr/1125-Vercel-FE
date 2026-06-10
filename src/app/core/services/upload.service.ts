import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RoomImage } from '../models/room.model';
import { environment } from '../../../environments/environment';

interface UploadImageResponse {
  url: string;
  file_name?: string;
  order?: number;
}

interface UploadApiBody {
  data?: {
    total?: number;
    images?: UploadImageResponse[];
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  /** POST /upload/room-image — auth added by interceptor */
  uploadRoomImages(files: File[], startOrder = 0): Observable<RoomImage[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('order', String(startOrder));

    return this.http
      .post<UploadApiBody>(`${environment.apiBaseUrl}/upload/room-image`, formData)
      .pipe(
        map((body) => {
          const images = body.data?.images ?? [];
          if (!images.length) {
            throw new Error('Upload succeeded but no image URLs were returned.');
          }
          return images.map((img, index) => ({
            url: img.url,
            order: img.order ?? startOrder + index,
          }));
        }),
        catchError((err) => {
          const message =
            err?.error?.message ?? err?.message ?? 'Failed to upload image(s).';
          return throwError(() => new Error(message));
        }),
      );
  }
}
