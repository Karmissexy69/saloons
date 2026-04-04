package com.salonpos.service;

import com.salonpos.domain.Appointment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "app.notifications", name = "email-provider", havingValue = "LOG", matchIfMissing = true)
public class LoggingAppointmentNotificationService implements AppointmentNotificationService {

    private static final Logger log = LoggerFactory.getLogger(LoggingAppointmentNotificationService.class);

    @Override
    public void sendBookingConfirmation(Appointment appointment) {
        log.info("Appointment confirmation email simulated for booking {}", appointment.getBookingReference());
    }

    @Override
    public void sendReminder(Appointment appointment) {
        log.info("Appointment reminder email simulated for booking {}", appointment.getBookingReference());
    }
}
