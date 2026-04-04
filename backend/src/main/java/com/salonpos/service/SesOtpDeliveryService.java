package com.salonpos.service;

import com.salonpos.config.NotificationProperties;
import com.salonpos.domain.CustomerOtpPurpose;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;

@Service
@ConditionalOnProperty(prefix = "app.notifications", name = "email-provider", havingValue = "SES")
public class SesOtpDeliveryService implements OtpDeliveryService {

    private final SesV2Client sesV2Client;
    private final NotificationProperties notificationProperties;

    public SesOtpDeliveryService(SesV2Client sesV2Client, NotificationProperties notificationProperties) {
        this.sesV2Client = sesV2Client;
        this.notificationProperties = notificationProperties;
    }

    @Override
    public void sendOtp(String email, String code, CustomerOtpPurpose purpose) {
        String fromEmail = resolveFromEmail();
        String subject = switch (purpose) {
            case LOGIN -> "Your BrowPOS login code";
            case APPOINTMENT_CANCELLATION -> "Your BrowPOS appointment cancellation code";
        };
        String bodyText = switch (purpose) {
            case LOGIN -> "Your BrowPOS login OTP is %s. It expires in 5 minutes.".formatted(code);
            case APPOINTMENT_CANCELLATION -> "Your BrowPOS appointment cancellation OTP is %s. It expires in 5 minutes.".formatted(code);
        };
        String html = """
            <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#1f2937;">
              <h2 style="margin:0 0 12px;">%s</h2>
              <p style="margin:0 0 16px;">Use the code below to continue. It expires in 5 minutes.</p>
              <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 20px;background:#f5efe8;border-radius:12px;display:inline-block;">%s</div>
              <p style="margin:16px 0 0;color:#6b7280;">If you did not request this code, you can ignore this email.</p>
            </div>
            """.formatted(subject, code);

        sesV2Client.sendEmail(SendEmailRequest.builder()
            .fromEmailAddress(fromEmail)
            .destination(Destination.builder().toAddresses(email).build())
            .content(EmailContent.builder()
                .simple(software.amazon.awssdk.services.sesv2.model.Message.builder()
                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                    .body(Body.builder()
                        .text(Content.builder().data(bodyText).charset("UTF-8").build())
                        .html(Content.builder().data(html).charset("UTF-8").build())
                        .build())
                    .build())
                .build())
            .build());
    }

    private String resolveFromEmail() {
        String fromEmail = notificationProperties.getOtpFromEmail();
        if (fromEmail == null || fromEmail.isBlank()) {
            fromEmail = notificationProperties.getAppointmentFromEmail();
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new IllegalStateException("OTP sender email is not configured.");
        }

        String senderName = notificationProperties.getOtpSenderName();
        return senderName == null || senderName.isBlank()
            ? fromEmail
            : "%s <%s>".formatted(senderName, fromEmail);
    }
}
