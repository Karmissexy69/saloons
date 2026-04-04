package com.salonpos.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AppointmentReminderScheduler {

    private final AppointmentService appointmentService;

    public AppointmentReminderScheduler(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @Scheduled(fixedDelayString = "${app.notifications.reminder-check-interval-ms:300000}")
    public void sendDueReminders() {
        appointmentService.findReminderCandidates()
            .forEach(appointment -> appointmentService.sendReminder(appointment.getId()));
    }
}
