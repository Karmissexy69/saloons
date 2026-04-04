package com.salonpos.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.notifications")
public class NotificationProperties {

    private String awsRegion;
    private String awsAccessKeyId;
    private String awsSecretAccessKey;
    private String emailProvider = "LOG";
    private String otpFromEmail;
    private String otpSenderName = "BrowPOS Login";
    private String appointmentFromEmail;
    private String appointmentSenderName = "BrowPOS Appointments";
    private long otpTtlSeconds = 300;
    private long customerRefreshTtlSeconds = 2592000;

    public String getAwsRegion() {
        return awsRegion;
    }

    public void setAwsRegion(String awsRegion) {
        this.awsRegion = awsRegion;
    }

    public String getAwsAccessKeyId() {
        return awsAccessKeyId;
    }

    public void setAwsAccessKeyId(String awsAccessKeyId) {
        this.awsAccessKeyId = awsAccessKeyId;
    }

    public String getAwsSecretAccessKey() {
        return awsSecretAccessKey;
    }

    public void setAwsSecretAccessKey(String awsSecretAccessKey) {
        this.awsSecretAccessKey = awsSecretAccessKey;
    }

    public String getEmailProvider() {
        return emailProvider;
    }

    public void setEmailProvider(String emailProvider) {
        this.emailProvider = emailProvider;
    }

    public String getOtpFromEmail() {
        return otpFromEmail;
    }

    public void setOtpFromEmail(String otpFromEmail) {
        this.otpFromEmail = otpFromEmail;
    }

    public String getOtpSenderName() {
        return otpSenderName;
    }

    public void setOtpSenderName(String otpSenderName) {
        this.otpSenderName = otpSenderName;
    }

    public String getAppointmentFromEmail() {
        return appointmentFromEmail;
    }

    public void setAppointmentFromEmail(String appointmentFromEmail) {
        this.appointmentFromEmail = appointmentFromEmail;
    }

    public String getAppointmentSenderName() {
        return appointmentSenderName;
    }

    public void setAppointmentSenderName(String appointmentSenderName) {
        this.appointmentSenderName = appointmentSenderName;
    }

    public long getOtpTtlSeconds() {
        return otpTtlSeconds;
    }

    public void setOtpTtlSeconds(long otpTtlSeconds) {
        this.otpTtlSeconds = otpTtlSeconds;
    }

    public long getCustomerRefreshTtlSeconds() {
        return customerRefreshTtlSeconds;
    }

    public void setCustomerRefreshTtlSeconds(long customerRefreshTtlSeconds) {
        this.customerRefreshTtlSeconds = customerRefreshTtlSeconds;
    }
}
