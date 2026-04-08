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
    status: AlertStatus.OPEN,
    title: 'Test Alert',
    message: 'Test message',
    triggeredAt: new Date(),
    metadata: {}
  };

  const mockAlertDtoJson = {
    id: 1,
    alertRuleId: 1,
    alertRuleName: 'Test Rule',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Test Alert',
    description: 'Test message',
    createdAt: '2020-01-01T00:00:00.000Z'
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
      const subscription = service.getAlerts().subscribe({
        next: (alerts) => {
          expect(alerts.length).toBe(1);
          expect(alerts[0].id).toBe('1');
          expect(alerts[0].severity).toBe(AlertSeverity.HIGH);
          expect(alerts[0].status).toBe(AlertStatus.OPEN);
          expect(alerts[0].message).toBe('Test message');
        },
        error: () => fail('should not have failed')
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts`);
      expect(req.request.method).toBe('GET');
      req.flush({ content: [mockAlertDtoJson], totalElements: 1 });

      subscription.unsubscribe();
    }));

    it('should fetch alerts with filters', () => {
      const filter: AlertFilter = {
        severity: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        status: [AlertStatus.OPEN],
        search: 'test'
      };

      const subscription = service.getAlerts(filter).subscribe({
        next: (alerts) => {
          expect(alerts.length).toBe(1);
          expect(alerts[0].id).toBe('1');
        },
        error: () => fail('should not have failed')
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/alerts` &&
               request.method === 'GET' &&
               request.params.get('severity') === 'HIGH,CRITICAL' &&
               request.params.get('status') === 'OPEN' &&
               request.params.get('search') === 'test';
      });
      req.flush({ content: [mockAlertDtoJson] });
      
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
          expect(alert.id).toBe('1');
          expect(alert.status).toBe(AlertStatus.OPEN);
          expect(alert.message).toBe('Test message');
        },
        error: () => fail('should not have failed')
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAlertDtoJson);
    }));
  });

  describe('getStatistics', () => {
    it('should fetch alert statistics', () => {
      const subscription = service.getStatistics().subscribe({
        next: (stats) => {
          expect(stats.totalAlerts).toBe(10);
          expect(stats.activeAlerts).toBe(5);
          expect(stats.acknowledgedAlerts).toBe(3);
          expect(stats.resolvedAlerts).toBe(2);
        },
        error: () => fail('should not have failed')
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/statistics`);
      expect(req.request.method).toBe('GET');
      req.flush({ total: 10, open: 5, acknowledged: 3, resolved: 2, falsePositive: 0 });
      
      subscription.unsubscribe();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', () => {
      const subscription = service.acknowledgeAlert('1', { acknowledgedBy: 'user1', notes: 'Acknowledged' }).subscribe({
        next: (alert) => {
          expect(alert.status).toBe(AlertStatus.ACKNOWLEDGED);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/acknowledge`);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 1,
        alertRuleId: 1,
        alertRuleName: 'Test Rule',
        severity: 'HIGH',
        status: 'ACKNOWLEDGED',
        title: 'Test Alert',
        description: 'Test message',
        createdAt: '2020-01-01T00:00:00.000Z',
        acknowledgedBy: 'user1'
      });
      
      subscription.unsubscribe();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', () => {
      const subscription = service.resolveAlert('1', { resolvedBy: 'user1', resolution: 'Resolved' }).subscribe({
        next: (alert) => {
          expect(alert.status).toBe(AlertStatus.RESOLVED);
        },
        error: () => fail('should not have failed')
      });

      // The request should be made immediately when subscribe is called
      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/resolve`);
      expect(req.request.method).toBe('POST');
      req.flush({
        id: 1,
        alertRuleId: 1,
        alertRuleName: 'Test Rule',
        severity: 'HIGH',
        status: 'RESOLVED',
        title: 'Test Alert',
        description: 'Test message',
        createdAt: '2020-01-01T00:00:00.000Z',
        resolvedBy: 'user1'
      });
      
      subscription.unsubscribe();
    });
  });
});
