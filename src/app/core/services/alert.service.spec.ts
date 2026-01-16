import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AlertService } from './alert.service';
import { environment } from '../../../environments/environment';
import { Alert, AlertFilter } from '../../shared/models/alert.model';

describe('AlertService', () => {
  let service: AlertService;
  let httpMock: HttpTestingController;

  const mockAlert: Alert = {
    id: '1',
    ruleId: 'rule1',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Test Alert',
    message: 'Test message',
    source: 'test-source',
    timestamp: new Date(),
    acknowledgedAt: null,
    resolvedAt: null,
    metadata: {}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AlertService,
        provideHttpClient()
      ]
    });

    service = TestBed.inject(AlertService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAlerts', () => {
    it('should fetch all alerts', (done) => {
      const mockAlerts: Alert[] = [mockAlert];

      service.getAlerts().subscribe(alerts => {
        expect(alerts).toEqual(mockAlerts);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAlerts);
    });

    it('should fetch alerts with filters', (done) => {
      const filter: AlertFilter = {
        severity: ['HIGH', 'CRITICAL'],
        status: ['OPEN'],
        search: 'test'
      };

      service.getAlerts(filter).subscribe(alerts => {
        expect(alerts).toEqual([mockAlert]);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts?severity=HIGH,CRITICAL&status=OPEN&search=test`);
      expect(req.request.method).toBe('GET');
      req.flush([mockAlert]);
    });

    it('should handle errors', (done) => {
      service.getAlerts().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getAlertById', () => {
    it('should fetch alert by id', (done) => {
      service.getAlertById('1').subscribe(alert => {
        expect(alert).toEqual(mockAlert);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAlert);
    });
  });

  describe('getStatistics', () => {
    it('should fetch alert statistics', (done) => {
      const mockStats = {
        total: 10,
        open: 5,
        acknowledged: 3,
        resolved: 2,
        bySeverity: { HIGH: 5, MEDIUM: 3, LOW: 2 }
      };

      service.getStatistics().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', (done) => {
      const acknowledgedAlert = { ...mockAlert, status: 'ACKNOWLEDGED' as const };

      service.acknowledgeAlert('1', { note: 'Acknowledged' }).subscribe(alert => {
        expect(alert.status).toBe('ACKNOWLEDGED');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/acknowledge`);
      expect(req.request.method).toBe('POST');
      req.flush(acknowledgedAlert);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', (done) => {
      const resolvedAlert = { ...mockAlert, status: 'RESOLVED' as const };

      service.resolveAlert('1', { note: 'Resolved' }).subscribe(alert => {
        expect(alert.status).toBe('RESOLVED');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/resolve`);
      expect(req.request.method).toBe('POST');
      req.flush(resolvedAlert);
    });
  });
});
