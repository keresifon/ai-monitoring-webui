import { TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertService } from './alert.service';
import { environment } from '../../../environments/environment';
import { Alert, AlertFilter, AlertSeverity, AlertStatus } from '../../shared/models/alert.model';

describe('AlertService', () => {
  let service: AlertService;
  let httpMock: HttpTestingController;

  const mockAlert: Alert = {
    id: '1',
    ruleId: 'rule1',
    ruleName: 'Test Rule',
    severity: AlertSeverity.HIGH,
    status: AlertStatus.ACTIVE,
    title: 'Test Alert',
    message: 'Test message',
    triggeredAt: new Date(),
    metadata: {}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AlertService
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
    it('should fetch all alerts', waitForAsync(() => {
      const mockAlerts: Alert[] = [mockAlert];

      const subscription = service.getAlerts().subscribe({
        next: (alerts) => {
          expect(alerts).toEqual(mockAlerts);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAlerts);
      
      subscription.unsubscribe();
    }));

    it('should fetch alerts with filters', () => {
      const filter: AlertFilter = {
        severity: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        status: [AlertStatus.ACTIVE],
        search: 'test'
      };

      const subscription = service.getAlerts(filter).subscribe({
        next: (alerts) => {
          expect(alerts).toEqual([mockAlert]);
        },
        error: () => fail('should not have failed')
      });

      // Use function matcher to match URL with query params
      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/alerts` &&
               request.method === 'GET' &&
               request.params.get('severity') === 'HIGH,CRITICAL' &&
               request.params.get('status') === 'ACTIVE' &&
               request.params.get('search') === 'test';
      });
      req.flush([mockAlert]);
      
      subscription.unsubscribe();
    });

    it('should handle errors', () => {
      const subscription = service.getAlerts().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        }
      });

      // The service uses retry(2), so we need to flush errors for initial request + 2 retries
      const req1 = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      req1.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
      
      // Handle retry attempts
      const req2 = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      req2.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
      
      const req3 = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      req3.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
      
      subscription.unsubscribe();
    });
  });

  describe('getAlertById', () => {
    it('should fetch alert by id', waitForAsync(() => {
      service.getAlertById('1').subscribe({
        next: (alert) => {
          expect(alert).toEqual(mockAlert);
        },
        error: () => fail('should not have failed')
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAlert);
    }));
  });

  describe('getStatistics', () => {
    it('should fetch alert statistics', () => {
      const mockStats = {
        totalAlerts: 10,
        activeAlerts: 5,
        acknowledgedAlerts: 3,
        resolvedAlerts: 2,
        criticalAlerts: 2,
        highAlerts: 3,
        mediumAlerts: 3,
        lowAlerts: 2
      };

      const subscription = service.getStatistics().subscribe({
        next: (stats) => {
          expect(stats).toEqual(mockStats);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
      
      subscription.unsubscribe();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', () => {
      const acknowledgedAlert = { ...mockAlert, status: AlertStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedBy: 'user1' };

      const subscription = service.acknowledgeAlert('1', { acknowledgedBy: 'user1', notes: 'Acknowledged' }).subscribe({
        next: (alert) => {
          expect(alert.status).toBe(AlertStatus.ACKNOWLEDGED);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/acknowledge`);
      expect(req.request.method).toBe('POST');
      req.flush(acknowledgedAlert);
      
      subscription.unsubscribe();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', () => {
      const resolvedAlert = { ...mockAlert, status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolvedBy: 'user1' };

      const subscription = service.resolveAlert('1', { resolvedBy: 'user1', resolution: 'Resolved' }).subscribe({
        next: (alert) => {
          expect(alert.status).toBe(AlertStatus.RESOLVED);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/resolve`);
      expect(req.request.method).toBe('POST');
      req.flush(resolvedAlert);
      
      subscription.unsubscribe();
    });
  });
});
