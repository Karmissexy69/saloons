package com.salonpos.service;

import com.salonpos.domain.Appointment;

public interface AppointmentNotificationService {

    void sendBookingConfirmation(Appointment appointment);

    void sendReminder(Appointment appointment);
}
