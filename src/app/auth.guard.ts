import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export const requireAuth: CanActivateFn = async () => {
  const drive = inject(SupabaseService);
  const router = inject(Router);
  return await drive.getSession() ? true : router.createUrlTree(['/login']);
};

export const guestOnly: CanActivateFn = async () => {
  const drive = inject(SupabaseService);
  const router = inject(Router);
  return await drive.getSession() ? router.createUrlTree(['/']) : true;
};
