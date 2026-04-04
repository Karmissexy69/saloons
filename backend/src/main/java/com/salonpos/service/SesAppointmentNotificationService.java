package com.salonpos.service;

import com.salonpos.config.NotificationProperties;
import com.salonpos.domain.Appointment;
import com.salonpos.domain.Customer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.EmailTemplateContent;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

@Service
@ConditionalOnProperty(prefix = "app.notifications", name = "email-provider", havingValue = "SES")
public class SesAppointmentNotificationService implements AppointmentNotificationService {

    private final SesV2Client sesV2Client;
    private final NotificationProperties notificationProperties;
    private final AppointmentEmailTemplateRenderer templateRenderer;

    public SesAppointmentNotificationService(
        SesV2Client sesV2Client,
        NotificationProperties notificationProperties,
        AppointmentEmailTemplateRenderer templateRenderer
    ) {
        this.sesV2Client = sesV2Client;
        this.notificationProperties = notificationProperties;
        this.templateRenderer = templateRenderer;
    }

    @Override
    public void sendBookingConfirmation(Appointment appointment) {
        send(appointment, "Appointment Confirmation", templateRenderer.renderBookingConfirmation(appointment));
    }

    @Override
    public void sendReminder(Appointment appointment) {
        send(appointment, "Appointment Reminder", templateRenderer.renderReminder(appointment));
    }

    private void send(Appointment appointment, String subject, String html) {
        String to = recipientEmail(appointment);
        if (to == null || to.isBlank()) {
            return;
        }

        String fromEmail = notificationProperties.getAppointmentFromEmail();
        if (fromEmail == null || fromEmail.isBlank()) {
            return;
        }

        String senderName = notificationProperties.getAppointmentSenderName();
        String from = senderName == null || senderName.isBlank()
            ? fromEmail
            : "%s <%s>".formatted(senderName, fromEmail);

        sesV2Client.sendEmail(SendEmailRequest.builder()
            .fromEmailAddress(from)
            .destination(Destination.builder().toAddresses(to).build())
            .content(EmailContent.builder()
                .simple(software.amazon.awssdk.services.sesv2.model.Message.builder()
                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                    .body(Body.builder().html(Content.builder().data(html).charset("UTF-8").build()).build())
                    .build())
                .build())
            .build());
    }

    private String recipientEmail(Appointment appointment) {
        Customer customer = appointment.getCustomer();
        if (customer != null && customer.getEmail() != null && !customer.getEmail().isBlank()) {
            return customer.getEmail().trim();
        }
        return appointment.getGuestEmail();
    }
}
