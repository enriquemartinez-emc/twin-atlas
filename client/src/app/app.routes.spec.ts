import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('routes', () => {
  const configure = () =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });

  it('sends the empty address to the scenes', async () => {
    configure();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/scenes');
  });

  it('shows a not-found page with a way back for an address the app does not know', async () => {
    configure();
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/no/such/page');

    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('This page does not exist');
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/scenes');
    expect(TestBed.inject(Title).getTitle()).toBe('Page not found · Twin Atlas');
  });

  it('does not take an address with extra parts for a scene', async () => {
    configure();
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/scenes/s1/extra');

    expect((harness.fixture.nativeElement as HTMLElement).textContent).toContain(
      'This page does not exist',
    );
  });
});
