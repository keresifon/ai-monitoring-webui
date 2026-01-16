import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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
        severity: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
        status: [AlertStatus.ACTIVE],
        search: 'test'
      };

      service.getAlerts(filter).subscribe(alerts => {
        expect(alerts).toEqual([mockAlert]);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts?severity=HIGH,CRITICAL&status=ACTIVE&search=test`);
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
        totalAlerts: 10,
        activeAlerts: 5,
        acknowledgedAlerts: 3,
        resolvedAlerts: 2,
        criticalAlerts: 2,
        highAlerts: 3,
        mediumAlerts: 3,
        lowAlerts: 2
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
      const acknowledgedAlert = { ...mockAlert, status: AlertStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedBy: 'user1' };

      service.acknowledgeAlert('1', { acknowledgedBy: 'user1', notes: 'Acknowledged' }).subscribe(alert => {
        expect(alert.status).toBe(AlertStatus.ACKNOWLEDGED);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/acknowledge`);
      expect(req.request.method).toBe('POST');
      req.flush(acknowledgedAlert);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', (done) => {
      const resolvedAlert = { ...mockAlert, status: AlertStatus.RESOLVED, resolvedAt: new Date(), resolvedBy: 'user1' };

      service.resolveAlert('1', { resolvedBy: 'user1', resolution: 'Resolved' }).subscribe(alert => {
        expect(alert.status).toBe(AlertStatus.RESOLVED);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/alerts/1/resolve`);
      expect(req.request.method).toBe('POST');
      req.flush(resolvedAlert);
    });
  });
});
